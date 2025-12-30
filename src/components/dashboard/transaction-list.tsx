"use client";

import Link from "next/link";
import { useState, useRef, useEffect, useCallback } from "react";

interface Category {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
}

interface Transaction {
  id: string;
  transactionDate: string; // ISO string for serialization
  description: string;
  originalDescription: string;
  amount: number; // Converted from Decimal
  type: string;
  installmentCurrent: number | null;
  installmentTotal: number | null;
  isInternational: boolean;
  statementId: string;
  statement: {
    originalFileName: string;
  } | null;
  category: {
    name: string;
    icon: string | null;
    color: string | null;
  } | null;
}

interface TransactionListProps {
  transactions: Transaction[];
  categories?: Category[];
  onCategoryChange?: (transactionId: string, categoryId: string | null) => void;
}

// Format date consistently to avoid hydration mismatch
function formatDatePtBR(dateKey: string): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  const weekdays = ["domingo", "segunda-feira", "terca-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sabado"];
  const months = ["janeiro", "fevereiro", "marco", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

  // Create date at noon UTC to avoid timezone issues
  const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  const weekday = weekdays[date.getUTCDay()];
  const monthName = months[month - 1];

  return `${weekday}, ${day} de ${monthName} de ${year}`;
}

export function TransactionList({ transactions, categories, onCategoryChange }: TransactionListProps) {
  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);

  // Track local category updates for optimistic UI
  const [localCategories, setLocalCategories] = useState<Record<string, Category | null>>({});

  // Bulk action state
  const [showBulkDropdown, setShowBulkDropdown] = useState(false);
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);
  const bulkDropdownRef = useRef<HTMLDivElement>(null);

  // Close bulk dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (bulkDropdownRef.current && !bulkDropdownRef.current.contains(event.target as Node)) {
        setShowBulkDropdown(false);
      }
    };

    if (showBulkDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showBulkDropdown]);

  // Get effective category for a transaction (local override or original)
  const getCategory = (tx: Transaction): Category | null => {
    if (tx.id in localCategories) {
      return localCategories[tx.id];
    }
    return tx.category ? { id: "", ...tx.category } : null;
  };

  // Handle single category change from child
  const handleCategoryChange = async (transactionId: string, category: Category | null) => {
    // Optimistic update
    setLocalCategories(prev => ({ ...prev, [transactionId]: category }));

    // Call parent handler if provided
    if (onCategoryChange) {
      onCategoryChange(transactionId, category?.id || null);
    }
  };

  // Toggle selection for a single transaction
  const toggleSelection = useCallback((id: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  // Select all visible transactions
  const selectAll = useCallback(() => {
    setSelectedIds(new Set(transactions.map(tx => tx.id)));
  }, [transactions]);

  // Clear selection
  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
    setSelectionMode(false);
  }, []);

  // Handle bulk category update
  const handleBulkCategoryUpdate = async (category: Category | null) => {
    if (selectedIds.size === 0) return;

    setShowBulkDropdown(false);
    setIsBulkUpdating(true);

    try {
      const response = await fetch("/api/transactions/bulk-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transactionIds: Array.from(selectedIds),
          categoryId: category?.id || null,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update");
      }

      // Optimistic update for all selected
      const updates: Record<string, Category | null> = {};
      selectedIds.forEach(id => {
        updates[id] = category;
      });
      setLocalCategories(prev => ({ ...prev, ...updates }));

      // Clear selection after successful update
      clearSelection();
    } catch (err) {
      console.error("Bulk update error:", err);
      alert("Erro ao atualizar transacoes");
    } finally {
      setIsBulkUpdating(false);
    }
  };

  // Group transactions by date using ISO string date portion
  const grouped = transactions.reduce(
    (acc, tx) => {
      // Extract YYYY-MM-DD from ISO string directly to avoid timezone issues
      const dateKey = tx.transactionDate.split("T")[0];
      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      acc[dateKey].push(tx);
      return acc;
    },
    {} as Record<string, Transaction[]>
  );

  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  // Calculate selected amount
  const selectedAmount = transactions
    .filter(tx => selectedIds.has(tx.id))
    .reduce((sum, tx) => sum + tx.amount, 0);

  return (
    <div className="space-y-6">
      {/* Selection toolbar */}
      {categories && categories.length > 0 && (
        <div className="flex items-center justify-between bg-white rounded-xl border border-gray-200 px-4 py-2">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                if (selectionMode) {
                  clearSelection();
                } else {
                  setSelectionMode(true);
                }
              }}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition ${
                selectionMode
                  ? "bg-emerald-100 text-emerald-700"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              {selectionMode ? "Cancelar selecao" : "Selecionar"}
            </button>
            {selectionMode && (
              <button
                onClick={selectAll}
                className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition"
              >
                Selecionar todos ({transactions.length})
              </button>
            )}
          </div>
          {selectedIds.size > 0 && (
            <span className="text-sm text-gray-500">
              {selectedIds.size} selecionada(s) • R$ {selectedAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </span>
          )}
        </div>
      )}

      {sortedDates.map((dateKey) => {
        const dateTransactions = grouped[dateKey];
        const dayTotal = dateTransactions.reduce((sum, tx) => {
          return tx.type === "CREDIT" ? sum + tx.amount : sum - tx.amount;
        }, 0);

        // Check if all transactions in this day are selected
        const allDaySelected = dateTransactions.every(tx => selectedIds.has(tx.id));
        const someDaySelected = dateTransactions.some(tx => selectedIds.has(tx.id));

        return (
          <div key={dateKey} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {/* Date header */}
            <div className="px-6 py-3 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
              <div className="flex items-center gap-3">
                {selectionMode && (
                  <button
                    onClick={() => {
                      if (allDaySelected) {
                        // Deselect all from this day
                        setSelectedIds(prev => {
                          const newSet = new Set(prev);
                          dateTransactions.forEach(tx => newSet.delete(tx.id));
                          return newSet;
                        });
                      } else {
                        // Select all from this day
                        setSelectedIds(prev => {
                          const newSet = new Set(prev);
                          dateTransactions.forEach(tx => newSet.add(tx.id));
                          return newSet;
                        });
                      }
                    }}
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center transition ${
                      allDaySelected
                        ? "bg-emerald-500 border-emerald-500 text-white"
                        : someDaySelected
                          ? "bg-emerald-100 border-emerald-500"
                          : "border-gray-300 hover:border-gray-400"
                    }`}
                  >
                    {allDaySelected && (
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                    {someDaySelected && !allDaySelected && (
                      <div className="w-2 h-2 bg-emerald-500 rounded-sm"></div>
                    )}
                  </button>
                )}
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900">
                    {formatDatePtBR(dateKey)}
                  </span>
                  <span className="text-sm text-gray-500">
                    ({dateTransactions.length}{" "}
                    {dateTransactions.length === 1 ? "transacao" : "transacoes"})
                  </span>
                </div>
              </div>
              <span
                className={`font-medium ${
                  dayTotal >= 0 ? "text-green-600" : "text-red-600"
                }`}
              >
                {dayTotal >= 0 ? "+" : ""}R${" "}
                {dayTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </span>
            </div>

            {/* Transactions */}
            <div className="divide-y divide-gray-100">
              {dateTransactions.map((tx) => (
                <TransactionRow
                  key={tx.id}
                  transaction={tx}
                  category={getCategory(tx)}
                  categories={categories}
                  onCategoryChange={handleCategoryChange}
                  selectionMode={selectionMode}
                  isSelected={selectedIds.has(tx.id)}
                  onToggleSelect={() => toggleSelection(tx.id)}
                />
              ))}
            </div>
          </div>
        );
      })}

      {/* Floating action bar */}
      {selectedIds.size > 0 && categories && categories.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
          <div className="bg-gray-900 text-white rounded-xl shadow-2xl px-6 py-4 flex items-center gap-4">
            <span className="text-sm">
              <span className="font-bold">{selectedIds.size}</span> transacao(es) selecionada(s)
            </span>
            <div className="h-6 w-px bg-gray-700"></div>
            <div className="relative" ref={bulkDropdownRef}>
              <button
                onClick={() => setShowBulkDropdown(!showBulkDropdown)}
                disabled={isBulkUpdating}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-lg transition flex items-center gap-2 disabled:opacity-50"
              >
                {isBulkUpdating ? (
                  <>
                    <span className="animate-spin">⏳</span>
                    Atualizando...
                  </>
                ) : (
                  <>
                    Categorizar
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </>
                )}
              </button>

              {showBulkDropdown && (
                <div className="absolute bottom-full mb-2 left-0 bg-white border border-gray-200 rounded-lg shadow-xl py-1 min-w-[200px] max-h-64 overflow-y-auto">
                  <button
                    onClick={() => handleBulkCategoryUpdate(null)}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2 text-gray-500"
                  >
                    <span className="w-5 text-center">✕</span>
                    <span>Remover categoria</span>
                  </button>
                  <div className="border-t border-gray-100 my-1"></div>
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => handleBulkCategoryUpdate(cat)}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2 text-gray-900"
                    >
                      <span className="w-5 text-center">{cat.icon || "📁"}</span>
                      <span>{cat.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={clearSelection}
              className="px-3 py-2 text-gray-400 hover:text-white transition"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

interface TransactionRowProps {
  transaction: Transaction;
  category: Category | null;
  categories?: Category[];
  onCategoryChange?: (transactionId: string, category: Category | null) => void;
  selectionMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: () => void;
}

function TransactionRow({
  transaction: tx,
  category,
  categories,
  onCategoryChange,
  selectionMode = false,
  isSelected = false,
  onToggleSelect,
}: TransactionRowProps) {
  const amount = tx.amount; // Already a number from serialization
  const isPositive = tx.type === "CREDIT";
  const [showDropdown, setShowDropdown] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showDropdown]);

  const handleCategorySelect = async (newCategory: Category | null) => {
    setShowDropdown(false);
    setIsUpdating(true);
    setError(null);

    try {
      const response = await fetch(`/api/transactions/${tx.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoryId: newCategory?.id || null }),
      });

      if (!response.ok) {
        throw new Error("Failed to update");
      }

      // Call parent handler for optimistic UI
      if (onCategoryChange) {
        onCategoryChange(tx.id, newCategory);
      }
    } catch (err) {
      setError("Erro");
      console.error("Category update error:", err);
      // Revert after 2 seconds
      setTimeout(() => setError(null), 2000);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div
      className={`px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition ${
        isSelected ? "bg-emerald-50" : ""
      }`}
      onClick={selectionMode ? onToggleSelect : undefined}
      style={selectionMode ? { cursor: "pointer" } : undefined}
    >
      <div className="flex items-center gap-4">
        {/* Selection checkbox */}
        {selectionMode && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleSelect?.();
            }}
            className={`w-5 h-5 rounded border-2 flex items-center justify-center transition flex-shrink-0 ${
              isSelected
                ? "bg-emerald-500 border-emerald-500 text-white"
                : "border-gray-300 hover:border-gray-400"
            }`}
          >
            {isSelected && (
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            )}
          </button>
        )}

        {/* Icon */}
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
            category
              ? ""
              : tx.type === "CREDIT"
                ? "bg-green-100"
                : tx.type === "TRANSFER"
                  ? "bg-blue-100"
                  : "bg-red-100"
          }`}
          style={category?.color ? { backgroundColor: category.color + "20" } : undefined}
        >
          <span className="text-lg">
            {category?.icon ||
              (tx.type === "CREDIT" ? "+" : tx.type === "TRANSFER" ? "~" : "-")}
          </span>
        </div>

        {/* Description */}
        <div className="flex-1 min-w-0">
          {selectionMode ? (
            <p className="font-medium text-gray-900">
              {tx.description}
              {tx.installmentCurrent && tx.installmentTotal && (
                <span className="ml-2 text-sm text-gray-500">
                  ({tx.installmentCurrent}/{tx.installmentTotal})
                </span>
              )}
            </p>
          ) : (
            <Link
              href={`/dashboard/transactions/${tx.id}`}
              className="font-medium text-gray-900 hover:text-emerald-600 transition"
            >
              {tx.description}
              {tx.installmentCurrent && tx.installmentTotal && (
                <span className="ml-2 text-sm text-gray-500">
                  ({tx.installmentCurrent}/{tx.installmentTotal})
                </span>
              )}
            </Link>
          )}
          <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
            {/* Category badge with dropdown */}
            {categories && categories.length > 0 && !selectionMode ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowDropdown(!showDropdown);
                  }}
                  disabled={isUpdating}
                  className={`px-2 py-0.5 rounded-full text-xs transition flex items-center gap-1 ${
                    isUpdating
                      ? "opacity-50 cursor-wait"
                      : "hover:ring-2 hover:ring-offset-1 hover:ring-gray-300 cursor-pointer"
                  } ${error ? "ring-2 ring-red-300" : ""}`}
                  style={{
                    backgroundColor: category?.color
                      ? category.color + "20"
                      : "#f3f4f6",
                    color: category?.color || "#6b7280",
                  }}
                  title="Clique para alterar categoria"
                >
                  {isUpdating ? (
                    <span className="animate-pulse">...</span>
                  ) : (
                    <>
                      {category?.icon && <span>{category.icon}</span>}
                      <span>{category?.name || "Sem categoria"}</span>
                      <svg className="w-3 h-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </>
                  )}
                </button>

                {/* Dropdown */}
                {showDropdown && (
                  <div className="absolute left-0 top-full mt-1 z-50 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[180px] max-h-64 overflow-y-auto">
                    {/* Remove category option */}
                    <button
                      onClick={() => handleCategorySelect(null)}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2 text-gray-500"
                    >
                      <span className="w-5 text-center">✕</span>
                      <span>Sem categoria</span>
                    </button>
                    <div className="border-t border-gray-100 my-1"></div>
                    {categories.map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => handleCategorySelect(cat)}
                        className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2 ${
                          category?.name === cat.name ? "bg-emerald-50" : ""
                        }`}
                      >
                        <span className="w-5 text-center">{cat.icon || "📁"}</span>
                        <span>{cat.name}</span>
                        {category?.name === cat.name && (
                          <svg className="w-4 h-4 ml-auto text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              // Static badge in selection mode or when no categories
              category && (
                <span
                  className="px-2 py-0.5 rounded-full text-xs"
                  style={{
                    backgroundColor: category.color
                      ? category.color + "20"
                      : "#f3f4f6",
                    color: category.color || "#6b7280",
                  }}
                >
                  {category.icon && <span className="mr-1">{category.icon}</span>}
                  {category.name}
                </span>
              )
            )}
            {!category && selectionMode && (
              <span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-500">
                Sem categoria
              </span>
            )}
            {tx.isInternational && (
              <span className="px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-700">
                Internacional
              </span>
            )}
            {tx.statement && !selectionMode && (
              <span className="text-gray-400 truncate max-w-[200px]">
                {tx.statement.originalFileName}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Amount */}
      <div className="text-right flex-shrink-0 ml-4">
        <p
          className={`font-medium ${isPositive ? "text-green-600" : "text-gray-900"}`}
        >
          {isPositive ? "+" : "-"} R${" "}
          {Math.abs(amount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
        </p>
        <p className="text-xs text-gray-500">{tx.type === "CREDIT" ? "Credito" : tx.type === "DEBIT" ? "Debito" : "Transferencia"}</p>
      </div>
    </div>
  );
}
