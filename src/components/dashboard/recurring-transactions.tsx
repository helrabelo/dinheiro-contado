"use client";

import { useEffect, useState } from "react";
import { usePrivacyMode } from "@/contexts/privacy-mode-context";

interface RecurringItem {
  description: string;
  amount: number;
  frequency: "monthly" | "weekly" | "bi-weekly" | "irregular";
  occurrences: number;
  lastSeen: string;
  nextExpected: string | null;
  category: { name: string; icon: string | null; color: string | null } | null;
  confidence: number;
  annualCost: number;
}

interface RecurringSummary {
  count: number;
  monthlyTotal: number;
  annualTotal: number;
}

const FREQUENCY_LABELS: Record<string, string> = {
  monthly: "Mensal",
  weekly: "Semanal",
  "bi-weekly": "Quinzenal",
  irregular: "Irregular",
};

const FREQUENCY_COLORS: Record<string, string> = {
  monthly: "bg-emerald-100 text-emerald-800",
  weekly: "bg-blue-100 text-blue-800",
  "bi-weekly": "bg-purple-100 text-purple-800",
  irregular: "bg-gray-100 text-gray-800",
};

export function RecurringTransactions() {
  const [data, setData] = useState<{
    recurring: RecurringItem[];
    summary: RecurringSummary;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isPrivate, formatCurrency: formatCurrencyFromContext } = usePrivacyMode();

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/analytics/recurring");
        if (!res.ok) throw new Error("Failed to fetch");
        const json = await res.json();
        setData(json);
      } catch (err) {
        setError("Erro ao carregar gastos recorrentes");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const formatCurrency = (value: number) => formatCurrencyFromContext(value);

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-20 bg-gray-200 rounded-lg" />
        <div className="h-16 bg-gray-200 rounded-lg" />
        <div className="h-16 bg-gray-200 rounded-lg" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>{error || "Nenhum dado disponível"}</p>
      </div>
    );
  }

  if (data.recurring.length === 0) {
    return (
      <div className="text-center py-8">
        <span className="text-4xl">🔄</span>
        <p className="mt-2 text-gray-600">
          Nenhum gasto recorrente detectado ainda.
        </p>
        <p className="text-sm text-gray-500">
          Continue importando seus extratos para identificar padrões.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl p-4 border border-emerald-200">
          <p className="text-sm text-emerald-700">Gastos Fixos Mensais</p>
          <p className="text-2xl font-bold text-emerald-900">
            {formatCurrency(data.summary.monthlyTotal)}
          </p>
        </div>
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
          <p className="text-sm text-blue-700">Custo Anual Estimado</p>
          <p className="text-2xl font-bold text-blue-900">
            {formatCurrency(data.summary.annualTotal)}
          </p>
        </div>
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 border border-purple-200">
          <p className="text-sm text-purple-700">Assinaturas Detectadas</p>
          <p className="text-2xl font-bold text-purple-900">
            {data.summary.count}
          </p>
        </div>
      </div>

      {/* Recurring items list */}
      <div className="space-y-3">
        {data.recurring.slice(0, 10).map((item, idx) => (
          <div
            key={idx}
            className="bg-white rounded-lg border border-gray-200 p-4 hover:border-emerald-300 transition"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-2xl flex-shrink-0">
                  {item.category?.icon || "🔄"}
                </span>
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 truncate">
                    {item.description}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        FREQUENCY_COLORS[item.frequency]
                      }`}
                    >
                      {FREQUENCY_LABELS[item.frequency]}
                    </span>
                    <span className="text-xs text-gray-500">
                      {item.occurrences}x detectado
                    </span>
                    {item.category && (
                      <span className="text-xs text-gray-500">
                        • {item.category.name}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="text-right flex-shrink-0 ml-4">
                <p className="font-semibold text-gray-900">
                  {formatCurrency(item.amount)}
                </p>
                <p className="text-xs text-gray-500">
                  {formatCurrency(item.annualCost)}/ano
                </p>
              </div>
            </div>
            {item.nextExpected && (
              <div className="mt-2 pt-2 border-t border-gray-100">
                <p className="text-xs text-gray-500">
                  Próxima cobrança esperada:{" "}
                  <span className="font-medium">
                    {new Date(item.nextExpected).toLocaleDateString("pt-BR")}
                  </span>
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      {data.recurring.length > 10 && (
        <p className="text-center text-sm text-gray-500">
          + {data.recurring.length - 10} outros gastos recorrentes
        </p>
      )}
    </div>
  );
}
