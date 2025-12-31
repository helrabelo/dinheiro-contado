"use client";

import { useEffect, useState } from "react";
import { usePrivacyMode } from "@/contexts/privacy-mode-context";
import Link from "next/link";

interface BudgetItem {
  id: string;
  categoryId: string;
  category: { id: string; name: string; icon: string | null; color: string | null };
  limit: number;
  spent: number;
  remaining: number;
  percentage: number;
  status: "ok" | "warning" | "exceeded";
}

interface BudgetData {
  budgets: BudgetItem[];
  period: { month: string };
}

export function BudgetOverview() {
  const [data, setData] = useState<BudgetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { formatCurrency } = usePrivacyMode();

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/budgets");
        if (!res.ok) throw new Error("Failed to fetch");
        const json = await res.json();
        setData(json);
      } catch (err) {
        setError("Erro ao carregar orcamentos");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-16 bg-gray-200 rounded-lg" />
        <div className="h-16 bg-gray-200 rounded-lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>{error}</p>
      </div>
    );
  }

  if (!data || data.budgets.length === 0) {
    return (
      <div className="text-center py-8">
        <span className="text-4xl">💰</span>
        <p className="mt-2 text-gray-600">Nenhum orcamento definido</p>
        <p className="text-sm text-gray-500">
          Configure limites mensais para suas categorias.
        </p>
        <Link
          href="/dashboard/categories?tab=budgets"
          className="inline-block mt-4 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition"
        >
          Configurar Orcamentos
        </Link>
      </div>
    );
  }

  // Filter to show only warning/exceeded or top 5
  const alertBudgets = data.budgets.filter((b) => b.status !== "ok");
  const displayBudgets = alertBudgets.length > 0 ? alertBudgets : data.budgets.slice(0, 5);

  return (
    <div className="space-y-4">
      {/* Alert summary */}
      {alertBudgets.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <p className="text-sm text-amber-800">
            <span className="font-medium">{alertBudgets.length}</span> orcamento(s)
            precisam de atencao este mes
          </p>
        </div>
      )}

      {/* Budget progress bars */}
      <div className="space-y-3">
        {displayBudgets.map((budget) => (
          <div
            key={budget.id}
            className="bg-white rounded-lg border border-gray-200 p-4"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xl">{budget.category.icon || "📁"}</span>
                <span className="font-medium text-gray-900">
                  {budget.category.name}
                </span>
              </div>
              <div className="text-right">
                <span
                  className={`text-sm font-medium ${
                    budget.status === "exceeded"
                      ? "text-red-600"
                      : budget.status === "warning"
                      ? "text-amber-600"
                      : "text-gray-600"
                  }`}
                >
                  {formatCurrency(budget.spent)} / {formatCurrency(budget.limit)}
                </span>
              </div>
            </div>

            {/* Progress bar */}
            <div className="relative h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`absolute left-0 top-0 h-full rounded-full transition-all ${
                  budget.status === "exceeded"
                    ? "bg-red-500"
                    : budget.status === "warning"
                    ? "bg-amber-500"
                    : "bg-emerald-500"
                }`}
                style={{ width: `${Math.min(100, budget.percentage)}%` }}
              />
              {/* 80% marker */}
              <div
                className="absolute top-0 h-full w-0.5 bg-gray-300"
                style={{ left: "80%" }}
              />
            </div>

            <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
              <span>{budget.percentage.toFixed(0)}% usado</span>
              {budget.remaining > 0 ? (
                <span>Restam {formatCurrency(budget.remaining)}</span>
              ) : (
                <span className="text-red-600 font-medium">
                  Excedido em {formatCurrency(Math.abs(budget.remaining))}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {data.budgets.length > displayBudgets.length && (
        <Link
          href="/dashboard/categories?tab=budgets"
          className="block text-center text-sm text-emerald-600 hover:text-emerald-700"
        >
          Ver todos os {data.budgets.length} orcamentos
        </Link>
      )}
    </div>
  );
}
