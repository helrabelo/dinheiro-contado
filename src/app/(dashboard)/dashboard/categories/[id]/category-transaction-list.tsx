"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: "DEBIT" | "CREDIT" | "TRANSFER";
  transactionDate: string;
  installmentCurrent: number | null;
  installmentTotal: number | null;
}

interface Props {
  categoryId: string;
  categoryColor: string;
}

type SortField = "date" | "amount";
type SortOrder = "asc" | "desc";
type TypeFilter = "ALL" | "DEBIT" | "CREDIT";

const ITEMS_PER_PAGE = 25;

export function CategoryTransactionList({ categoryId, categoryColor }: Props) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & sorting state
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("ALL");
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: String(currentPage),
        limit: String(ITEMS_PER_PAGE),
        sortField,
        sortOrder,
      });

      if (search) params.set("search", search);
      if (typeFilter !== "ALL") params.set("type", typeFilter);

      const response = await fetch(
        `/api/categories/${categoryId}/transactions?${params}`
      );

      if (!response.ok) throw new Error("Failed to fetch transactions");

      const data = await response.json();
      setTransactions(data.transactions);
      setTotalCount(data.totalCount);
    } catch (err) {
      setError("Erro ao carregar transacoes");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [categoryId, currentPage, search, typeFilter, sortField, sortOrder]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, typeFilter, sortField, sortOrder]);

  const formatCurrency = (value: number) => {
    return `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("pt-BR");
  };

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  const handleSortChange = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return "↕";
    return sortOrder === "asc" ? "↑" : "↓";
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Todas as Transacoes
          </h2>
          <span className="text-sm text-gray-500">
            {totalCount.toLocaleString("pt-BR")} transacao(es)
          </span>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search */}
          <div className="flex-1">
            <input
              type="text"
              placeholder="Buscar por descricao..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition bg-white text-gray-900 placeholder:text-gray-500"
            />
          </div>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition bg-white text-gray-900"
          >
            <option value="ALL">Todos os tipos</option>
            <option value="DEBIT">Debitos</option>
            <option value="CREDIT">Creditos</option>
          </select>

          {/* Sort Buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => handleSortChange("date")}
              className={`px-4 py-2 rounded-lg border transition flex items-center gap-2 ${
                sortField === "date"
                  ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                  : "border-gray-300 hover:bg-gray-50 text-gray-700"
              }`}
            >
              Data {getSortIcon("date")}
            </button>
            <button
              onClick={() => handleSortChange("amount")}
              className={`px-4 py-2 rounded-lg border transition flex items-center gap-2 ${
                sortField === "amount"
                  ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                  : "border-gray-300 hover:bg-gray-50 text-gray-700"
              }`}
            >
              Valor {getSortIcon("amount")}
            </button>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto"></div>
          <p className="mt-2 text-gray-500">Carregando...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="p-8 text-center">
          <p className="text-red-500">{error}</p>
          <button
            onClick={fetchTransactions}
            className="mt-2 text-emerald-600 hover:text-emerald-700"
          >
            Tentar novamente
          </button>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && transactions.length === 0 && (
        <div className="p-8 text-center">
          <span className="text-4xl">🔍</span>
          <p className="mt-2 text-gray-600">
            {search || typeFilter !== "ALL"
              ? "Nenhuma transacao encontrada com esses filtros"
              : "Nenhuma transacao nesta categoria"}
          </p>
        </div>
      )}

      {/* Transaction List */}
      {!loading && !error && transactions.length > 0 && (
        <>
          <div className="divide-y divide-gray-100">
            {transactions.map((tx) => (
              <Link
                key={tx.id}
                href={`/dashboard/transactions/${tx.id}`}
                className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                      tx.type === "CREDIT" ? "bg-green-100" : "bg-red-100"
                    }`}
                  >
                    <span
                      className={`text-sm font-medium ${
                        tx.type === "CREDIT" ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {tx.type === "CREDIT" ? "+" : "-"}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-900 truncate">
                      {tx.description}
                    </p>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <span>{formatDate(tx.transactionDate)}</span>
                      {tx.installmentTotal && (
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs">
                          {tx.installmentCurrent}/{tx.installmentTotal}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <p
                  className={`font-semibold whitespace-nowrap ml-4 ${
                    tx.type === "CREDIT" ? "text-green-600" : "text-gray-900"
                  }`}
                >
                  {tx.type === "CREDIT" ? "+" : "-"} {formatCurrency(tx.amount)}
                </p>
              </Link>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Pagina {currentPage} de {totalPages}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Anterior
                </button>

                {/* Page numbers */}
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum: number;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`w-10 h-10 flex items-center justify-center rounded-lg transition ${
                          pageNum === currentPage
                            ? "text-white"
                            : "text-gray-700 hover:bg-gray-100"
                        }`}
                        style={
                          pageNum === currentPage
                            ? { backgroundColor: categoryColor }
                            : undefined
                        }
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Proxima
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
