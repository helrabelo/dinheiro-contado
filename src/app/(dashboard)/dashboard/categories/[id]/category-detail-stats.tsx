"use client";

import { usePrivacyMode } from "@/contexts/privacy-mode-context";

interface CategoryDetailStatsProps {
  totalCount: number;
  debitCount: number;
  creditCount: number;
  totalSpent: number;
  dateRangeMin: string | null;
  dateRangeMax: string | null;
}

export function CategoryDetailStats({
  totalCount,
  debitCount,
  creditCount,
  totalSpent,
  dateRangeMin,
  dateRangeMax,
}: CategoryDetailStatsProps) {
  const { formatCurrency } = usePrivacyMode();

  const formatDateShort = (dateStr: string | null) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("pt-BR", {
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <p className="text-sm text-gray-600">Total de Transacoes</p>
        <p className="text-2xl font-bold text-gray-900 mt-1">
          {totalCount.toLocaleString("pt-BR")}
        </p>
      </div>
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <p className="text-sm text-gray-600">Debitos</p>
        <p className="text-2xl font-bold text-red-600 mt-1">
          {debitCount.toLocaleString("pt-BR")}
        </p>
      </div>
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <p className="text-sm text-gray-600">Creditos</p>
        <p className="text-2xl font-bold text-green-600 mt-1">
          {creditCount.toLocaleString("pt-BR")}
        </p>
      </div>
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <p className="text-sm text-gray-600">Total Gasto</p>
        <p className="text-2xl font-bold text-gray-900 mt-1">
          {formatCurrency(totalSpent)}
        </p>
      </div>
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <p className="text-sm text-gray-600">Periodo</p>
        <p className="text-lg font-medium text-gray-900 mt-1">
          {formatDateShort(dateRangeMin)} - {formatDateShort(dateRangeMax)}
        </p>
      </div>
    </div>
  );
}
