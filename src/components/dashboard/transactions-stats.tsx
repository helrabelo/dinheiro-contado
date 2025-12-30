"use client";

import { usePrivacyMode } from "@/contexts/privacy-mode-context";

interface TransactionsStatsProps {
  totalDebits: number;
  totalCredits: number;
  yearTotal: number;
  monthTotal: number;
  year: number;
  monthName: string;
}

export function TransactionsStats({
  totalDebits,
  totalCredits,
  yearTotal,
  monthTotal,
  year,
  monthName,
}: TransactionsStatsProps) {
  const { formatCurrency } = usePrivacyMode();

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="bg-white rounded-xl p-4 border border-gray-200">
        <p className="text-sm text-gray-600">Total Gastos</p>
        <p className="text-2xl font-bold text-red-600">
          {formatCurrency(totalDebits)}
        </p>
        <p className="text-xs text-gray-500 mt-1">
          Creditos: {formatCurrency(totalCredits)}
        </p>
      </div>
      <div className="bg-white rounded-xl p-4 border border-gray-200">
        <p className="text-sm text-gray-600">Gastos {year}</p>
        <p className="text-2xl font-bold text-red-600">
          {formatCurrency(yearTotal)}
        </p>
        <p className="text-xs text-gray-500 mt-1">desde janeiro</p>
      </div>
      <div className="bg-white rounded-xl p-4 border border-gray-200">
        <p className="text-sm text-gray-600">{monthName}</p>
        <p className="text-2xl font-bold text-orange-600">
          {formatCurrency(monthTotal)}
        </p>
        <p className="text-xs text-gray-500 mt-1">mes atual</p>
      </div>
    </div>
  );
}
