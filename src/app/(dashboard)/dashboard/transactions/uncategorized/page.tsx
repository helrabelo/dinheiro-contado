"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";

interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: string;
  date: string;
  statementName: string | null;
}

interface Category {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
}

export default function UncategorizedTransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);

  // Category assignment state
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch initial data
  const fetchTransactions = useCallback(async (reset = false) => {
    if (reset) {
      setLoading(true);
      setTransactions([]);
      setNextCursor(null);
      setSelectedIds(new Set());
      setSelectAll(false);
    } else {
      setLoadingMore(true);
    }
    setError(null);

    try {
      const params = new URLSearchParams();
      if (!reset && nextCursor) {
        params.set("cursor", nextCursor);
      }
      if (debouncedSearch) {
        params.set("search", debouncedSearch);
      }

      const response = await fetch(`/api/transactions/uncategorized?${params}`);
      if (!response.ok) throw new Error("Failed to fetch");

      const data = await response.json();

      if (reset) {
        setTransactions(data.transactions);
        setCategories(data.categories);
      } else {
        setTransactions((prev) => [...prev, ...data.transactions]);
      }

      setTotalCount(data.totalCount);
      setHasMore(data.hasMore);
      setNextCursor(data.nextCursor);
    } catch (err) {
      setError("Erro ao carregar transacoes");
      console.error(err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [nextCursor, debouncedSearch]);

  // Initial fetch and search change
  useEffect(() => {
    fetchTransactions(true);
  }, [debouncedSearch]);

  // Scroll handler for infinite loading
  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container || !hasMore || loadingMore || loading) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    if (scrollHeight - scrollTop - clientHeight < 200) {
      fetchTransactions(false);
    }
  }, [hasMore, loadingMore, loading, fetchTransactions]);

  // Toggle single selection
  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
    setSelectAll(false);
  };

  // Toggle select all visible
  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedIds(new Set());
      setSelectAll(false);
    } else {
      setSelectedIds(new Set(transactions.map((t) => t.id)));
      setSelectAll(true);
    }
  };

  // Apply category to selected transactions
  const handleApplyCategory = async () => {
    if (!selectedCategory || selectedIds.size === 0) return;

    setApplying(true);
    setError(null);

    try {
      const response = await fetch("/api/transactions/bulk-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transactionIds: Array.from(selectedIds),
          categoryId: selectedCategory,
        }),
      });

      if (!response.ok) throw new Error("Failed to update");

      const data = await response.json();
      const categoryName = categories.find((c) => c.id === selectedCategory)?.name || "categoria";

      setSuccessMessage(`${data.updatedCount} transacoes categorizadas como "${categoryName}"`);

      // Remove categorized transactions from list
      setTransactions((prev) => prev.filter((t) => !selectedIds.has(t.id)));
      setTotalCount((prev) => prev - selectedIds.size);
      setSelectedIds(new Set());
      setSelectAll(false);
      setSelectedCategory(null);
    } catch (err) {
      setError("Erro ao categorizar transacoes");
      console.error(err);
    } finally {
      setApplying(false);
    }
  };

  const formatCurrency = (value: number) => {
    return `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
  };

  const selectedCount = selectedIds.size;
  const selectedTotal = transactions
    .filter((t) => selectedIds.has(t.id))
    .reduce((sum, t) => sum + t.amount, 0);

  if (loading && transactions.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/transactions" className="text-gray-400 hover:text-gray-600">
            ← Voltar
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Transacoes Sem Categoria</h1>
        </div>
        <div className="bg-white rounded-xl p-8 border border-gray-200">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-gray-200 rounded w-1/3"></div>
            <div className="h-40 bg-gray-100 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/transactions" className="text-gray-400 hover:text-gray-600">
            ← Voltar
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Transacoes Sem Categoria</h1>
            <p className="text-gray-600">
              {totalCount.toLocaleString("pt-BR")} transacoes para categorizar
            </p>
          </div>
        </div>
        <Link
          href="/dashboard/categories/batch"
          className="px-4 py-2 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 font-medium rounded-lg transition"
        >
          Categorizar por Padrao
        </Link>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">✓</span>
            <span className="text-green-800">{successMessage}</span>
          </div>
          <button
            onClick={() => setSuccessMessage(null)}
            className="text-green-600 hover:text-green-800 text-xl"
          >
            ×
          </button>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Search */}
      <div className="bg-white rounded-xl p-4 border border-gray-200">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Buscar nas transacoes sem categoria..."
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
        />
      </div>

      {/* Selection Bar */}
      {selectedCount > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 sticky top-0 z-20">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <span className="text-blue-800 font-medium">
                {selectedCount} selecionada(s)
              </span>
              <span className="text-blue-600 text-sm">
                Total: {formatCurrency(selectedTotal)}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <select
                value={selectedCategory || ""}
                onChange={(e) => setSelectedCategory(e.target.value || null)}
                className="px-4 py-2 border border-blue-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Selecione uma categoria...</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.icon} {cat.name}
                  </option>
                ))}
              </select>

              <button
                onClick={handleApplyCategory}
                disabled={!selectedCategory || applying}
                className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {applying ? "Aplicando..." : "Categorizar"}
              </button>

              <button
                onClick={() => {
                  setSelectedIds(new Set());
                  setSelectAll(false);
                }}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
              >
                Limpar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Transactions List */}
      {transactions.length === 0 && !loading ? (
        <div className="bg-white rounded-xl p-8 border border-gray-200 text-center">
          <span className="text-6xl">🎉</span>
          <h3 className="mt-4 text-lg font-medium text-gray-900">
            {debouncedSearch ? "Nenhuma transacao encontrada" : "Todas as transacoes estao categorizadas!"}
          </h3>
          <p className="mt-2 text-gray-600">
            {debouncedSearch
              ? "Tente uma busca diferente."
              : "Parabens! Voce categorizou todas as suas transacoes."}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {/* Table Header */}
          <div className="bg-gray-50 border-b border-gray-200 px-4 py-3 flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={selectAll && transactions.length > 0}
                onChange={toggleSelectAll}
                className="w-5 h-5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
              />
              <span className="text-sm text-gray-600">Selecionar todos</span>
            </label>
            <span className="text-sm text-gray-500">
              ({transactions.length} carregadas de {totalCount})
            </span>
          </div>

          {/* Scrollable List */}
          <div
            ref={scrollContainerRef}
            onScroll={handleScroll}
            className="max-h-[600px] overflow-y-auto"
          >
            <div className="divide-y divide-gray-100">
              {transactions.map((tx) => (
                <div
                  key={tx.id}
                  onClick={() => toggleSelection(tx.id)}
                  className={`flex items-center gap-4 px-4 py-3 cursor-pointer transition ${
                    selectedIds.has(tx.id)
                      ? "bg-emerald-50 hover:bg-emerald-100"
                      : "hover:bg-gray-50"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.has(tx.id)}
                    onChange={() => toggleSelection(tx.id)}
                    onClick={(e) => e.stopPropagation()}
                    className="w-5 h-5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />

                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">
                      {tx.description}
                    </p>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <span>{new Date(tx.date).toLocaleDateString("pt-BR")}</span>
                      {tx.statementName && (
                        <>
                          <span>•</span>
                          <span className="truncate max-w-[200px]">{tx.statementName}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="text-right">
                    <p className={`font-medium ${tx.type === "CREDIT" ? "text-green-600" : "text-gray-900"}`}>
                      {tx.type === "CREDIT" ? "+" : "-"} {formatCurrency(tx.amount)}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Loading More */}
            {loadingMore && (
              <div className="p-4 text-center">
                <div className="inline-block animate-spin rounded-full h-5 w-5 border-2 border-gray-300 border-t-emerald-600"></div>
                <span className="ml-2 text-sm text-gray-500">Carregando mais...</span>
              </div>
            )}

            {/* Load More Hint */}
            {hasMore && !loadingMore && (
              <div className="p-3 text-center text-sm text-gray-500 bg-gray-50">
                Role para carregar mais transacoes
              </div>
            )}

            {/* All Loaded */}
            {!hasMore && transactions.length > 0 && (
              <div className="p-3 text-center text-sm text-gray-500 bg-gray-50">
                Todas as {totalCount} transacoes carregadas
              </div>
            )}
          </div>
        </div>
      )}

      {/* Quick Category Buttons */}
      {selectedCount > 0 && (
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Categorias Rapidas</h3>
          <div className="flex flex-wrap gap-2">
            {categories.slice(0, 12).map((cat) => (
              <button
                key={cat.id}
                onClick={() => {
                  setSelectedCategory(cat.id);
                  handleApplyCategory();
                }}
                disabled={applying}
                className="px-4 py-2 rounded-lg border border-gray-200 hover:border-emerald-500 hover:bg-emerald-50 transition flex items-center gap-2 disabled:opacity-50"
              >
                <span>{cat.icon || "📁"}</span>
                <span className="text-sm font-medium text-gray-700">{cat.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Keyboard Shortcuts Help */}
      <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
        <h3 className="font-medium text-gray-900 mb-2">Dicas</h3>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• Clique em uma transacao para seleciona-la</li>
          <li>• Use &quot;Selecionar todos&quot; para marcar todas as transacoes visiveis</li>
          <li>• Role ate o final para carregar mais transacoes automaticamente</li>
          <li>• Use o botao &quot;Categorizar por Padrao&quot; para categorizar em lote por texto</li>
        </ul>
      </div>
    </div>
  );
}
