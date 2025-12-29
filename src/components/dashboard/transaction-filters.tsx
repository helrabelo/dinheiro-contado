"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";

interface Category {
  id: string;
  name: string;
  icon: string | null;
}

interface TransactionFiltersProps {
  search?: string;
  type?: string;
  categoryId?: string;
  startDate?: string;
  endDate?: string;
  minAmount?: string;
  maxAmount?: string;
  categories?: Category[];
}

export function TransactionFilters({
  search = "",
  type = "ALL",
  categoryId = "ALL",
  startDate = "",
  endDate = "",
  minAmount = "",
  maxAmount = "",
  categories = [],
}: TransactionFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [localSearch, setLocalSearch] = useState(search);
  const [localType, setLocalType] = useState(type);
  const [localCategoryId, setLocalCategoryId] = useState(categoryId);
  const [localStartDate, setLocalStartDate] = useState(startDate);
  const [localEndDate, setLocalEndDate] = useState(endDate);
  const [localMinAmount, setLocalMinAmount] = useState(minAmount);
  const [localMaxAmount, setLocalMaxAmount] = useState(maxAmount);
  const [isExpanded, setIsExpanded] = useState(false);

  const applyFilters = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());

    // Reset to page 1 when filters change
    params.delete("page");

    if (localSearch) params.set("search", localSearch);
    else params.delete("search");

    if (localType && localType !== "ALL") params.set("type", localType);
    else params.delete("type");

    if (localCategoryId && localCategoryId !== "ALL") params.set("categoryId", localCategoryId);
    else params.delete("categoryId");

    if (localStartDate) params.set("startDate", localStartDate);
    else params.delete("startDate");

    if (localEndDate) params.set("endDate", localEndDate);
    else params.delete("endDate");

    if (localMinAmount) params.set("minAmount", localMinAmount);
    else params.delete("minAmount");

    if (localMaxAmount) params.set("maxAmount", localMaxAmount);
    else params.delete("maxAmount");

    router.push(`/dashboard/transactions?${params.toString()}`);
  }, [
    router,
    searchParams,
    localSearch,
    localType,
    localCategoryId,
    localStartDate,
    localEndDate,
    localMinAmount,
    localMaxAmount,
  ]);

  const clearFilters = useCallback(() => {
    setLocalSearch("");
    setLocalType("ALL");
    setLocalCategoryId("ALL");
    setLocalStartDate("");
    setLocalEndDate("");
    setLocalMinAmount("");
    setLocalMaxAmount("");
    router.push("/dashboard/transactions");
  }, [router]);

  const hasFilters =
    localSearch ||
    (localType && localType !== "ALL") ||
    (localCategoryId && localCategoryId !== "ALL") ||
    localStartDate ||
    localEndDate ||
    localMinAmount ||
    localMaxAmount;

  return (
    <div className="bg-white rounded-xl p-4 border border-gray-200 space-y-4">
      {/* Search, Type, and Category - Always visible */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Buscar por descricao..."
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && applyFilters()}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition bg-white text-gray-900 placeholder:text-gray-500"
          />
        </div>
        <div className="w-full md:w-48">
          <select
            value={localType}
            onChange={(e) => setLocalType(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition bg-white text-gray-900"
          >
            <option value="ALL">Todos os tipos</option>
            <option value="DEBIT">Debitos</option>
            <option value="CREDIT">Creditos</option>
            <option value="TRANSFER">Transferencias</option>
          </select>
        </div>
        <div className="w-full md:w-56">
          <select
            value={localCategoryId}
            onChange={(e) => setLocalCategoryId(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition bg-white text-gray-900"
          >
            <option value="ALL">Todas as categorias</option>
            <option value="UNCATEGORIZED">Sem categoria</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.icon} {cat.name}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition flex items-center gap-2"
        >
          <span>Mais filtros</span>
          <span className={`transform transition ${isExpanded ? "rotate-180" : ""}`}>
            v
          </span>
        </button>
      </div>

      {/* Advanced filters - Expandable */}
      {isExpanded && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t border-gray-200">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Data Inicio</label>
            <input
              type="date"
              value={localStartDate}
              onChange={(e) => setLocalStartDate(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition bg-white text-gray-900"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Data Fim</label>
            <input
              type="date"
              value={localEndDate}
              onChange={(e) => setLocalEndDate(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition bg-white text-gray-900"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Valor Minimo</label>
            <input
              type="number"
              placeholder="R$ 0,00"
              value={localMinAmount}
              onChange={(e) => setLocalMinAmount(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition bg-white text-gray-900 placeholder:text-gray-500"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Valor Maximo</label>
            <input
              type="number"
              placeholder="R$ 0,00"
              value={localMaxAmount}
              onChange={(e) => setLocalMaxAmount(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition bg-white text-gray-900 placeholder:text-gray-500"
            />
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex justify-between items-center pt-4 border-t border-gray-200">
        <button
          onClick={clearFilters}
          disabled={!hasFilters}
          className="px-4 py-2 text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          Limpar filtros
        </button>
        <button
          onClick={applyFilters}
          className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition"
        >
          Aplicar
        </button>
      </div>
    </div>
  );
}
