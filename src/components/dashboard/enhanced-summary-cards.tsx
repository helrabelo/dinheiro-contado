"use client";

import { useEffect, useState, useCallback } from "react";

interface SummaryStats {
  averages: {
    monthly: number;
    daily: number;
  };
  highestMonth: {
    month: string;
    monthLabel: string;
    amount: number;
  } | null;
  velocity: {
    trend: "up" | "down" | "stable";
    change: number;
    last30Days: number;
    prev30Days: number;
  };
  mostCommonCategory: {
    name: string;
    icon: string;
    color: string;
    count: number;
    percentage: number;
  } | null;
  currentMonth: {
    spending: number;
    lastMonth: number;
    projected: number;
    daysIntoMonth: number;
    percentOfLastMonth: number;
  };
  ratios: {
    creditDebit: number;
    savingsRate: number;
  };
  totals: {
    transactionsThisYear: number;
    debitsThisYear: number;
    creditsThisYear: number;
  };
}

export function EnhancedSummaryCards() {
  const [data, setData] = useState<SummaryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/analytics/summary-stats");
      if (!response.ok) throw new Error("Failed to fetch data");
      const result = await response.json();
      setData(result);
    } catch (err) {
      setError("Erro ao carregar estatisticas");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const formatCurrency = (value: number) => {
    return `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
  };

  const formatCompactCurrency = (value: number) => {
    if (value >= 1000) {
      return `R$ ${(value / 1000).toFixed(1)}k`;
    }
    return formatCurrency(value);
  };

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl p-4 border border-gray-200 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-2/3 mb-2"></div>
            <div className="h-8 bg-gray-100 rounded w-1/2"></div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl p-6 border border-red-200">
        <div className="flex flex-col items-center justify-center text-center">
          <span className="text-3xl mb-3">⚠️</span>
          <p className="text-red-600 font-medium mb-2">{error}</p>
          <p className="text-sm text-gray-500 mb-4">
            Nao foi possivel carregar as estatisticas do dashboard.
          </p>
          <button
            onClick={fetchData}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition text-sm font-medium"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const getTrendIcon = (trend: "up" | "down" | "stable") => {
    switch (trend) {
      case "up":
        return "📈";
      case "down":
        return "📉";
      case "stable":
        return "➡️";
    }
  };

  const getTrendLabel = (trend: "up" | "down" | "stable") => {
    switch (trend) {
      case "up":
        return "Em alta";
      case "down":
        return "Em queda";
      case "stable":
        return "Estavel";
    }
  };

  const getTrendColor = (trend: "up" | "down" | "stable") => {
    switch (trend) {
      case "up":
        return "text-red-600"; // Red because spending up is bad
      case "down":
        return "text-green-600";
      case "stable":
        return "text-gray-600";
    }
  };

  return (
    <div className="space-y-4">
      {/* Main stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Average Monthly Spending */}
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">💰</span>
            <span className="text-sm text-gray-500">Media mensal</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {formatCompactCurrency(data.averages.monthly)}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            ~{formatCurrency(data.averages.daily)}/dia
          </p>
        </div>

        {/* Spending Velocity */}
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">{getTrendIcon(data.velocity.trend)}</span>
            <span className="text-sm text-gray-500">Tendencia</span>
          </div>
          <p className={`text-2xl font-bold ${getTrendColor(data.velocity.trend)}`}>
            {getTrendLabel(data.velocity.trend)}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {data.velocity.change >= 0 ? "+" : ""}
            {data.velocity.change.toFixed(1)}% vs 30 dias
          </p>
        </div>

        {/* Most Common Category */}
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">🏷️</span>
            <span className="text-sm text-gray-500">Top categoria</span>
          </div>
          {data.mostCommonCategory ? (
            <>
              <div className="flex items-center gap-2">
                <span>{data.mostCommonCategory.icon}</span>
                <p className="text-lg font-bold text-gray-900 truncate">
                  {data.mostCommonCategory.name}
                </p>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {data.mostCommonCategory.count} transacoes ({data.mostCommonCategory.percentage.toFixed(0)}%)
              </p>
            </>
          ) : (
            <p className="text-gray-400">Sem dados</p>
          )}
        </div>

        {/* Highest Month */}
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">🔥</span>
            <span className="text-sm text-gray-500">Maior mes</span>
          </div>
          {data.highestMonth ? (
            <>
              <p className="text-xl font-bold text-red-600">
                {formatCompactCurrency(data.highestMonth.amount)}
              </p>
              <p className="text-xs text-gray-500 mt-1 capitalize">
                {data.highestMonth.monthLabel}
              </p>
            </>
          ) : (
            <p className="text-gray-400">Sem dados</p>
          )}
        </div>
      </div>

      {/* Secondary stats row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Current Month Progress */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-blue-800">Este mes</span>
            <span className="text-xs text-blue-600">
              Dia {data.currentMonth.daysIntoMonth}
            </span>
          </div>
          <p className="text-2xl font-bold text-blue-700">
            {formatCurrency(data.currentMonth.spending)}
          </p>
          <div className="mt-2">
            <div className="flex items-center justify-between text-xs text-blue-600 mb-1">
              <span>vs mes passado</span>
              <span>{data.currentMonth.percentOfLastMonth.toFixed(0)}%</span>
            </div>
            <div className="h-2 bg-blue-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all"
                style={{
                  width: `${Math.min(data.currentMonth.percentOfLastMonth, 100)}%`,
                }}
              />
            </div>
          </div>
          <p className="text-xs text-blue-600 mt-2">
            Projecao: {formatCurrency(data.currentMonth.projected)}
          </p>
        </div>

        {/* Savings Rate */}
        <div className={`rounded-xl p-4 border ${
          data.ratios.savingsRate >= 0
            ? "bg-gradient-to-br from-green-50 to-emerald-50 border-green-100"
            : "bg-gradient-to-br from-red-50 to-rose-50 border-red-100"
        }`}>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">💵</span>
            <span className={`text-sm font-medium ${
              data.ratios.savingsRate >= 0 ? "text-green-800" : "text-red-800"
            }`}>
              Taxa de poupanca
            </span>
          </div>
          <p className={`text-2xl font-bold ${
            data.ratios.savingsRate >= 0 ? "text-green-700" : "text-red-700"
          }`}>
            {data.ratios.savingsRate.toFixed(1)}%
          </p>
          <p className={`text-xs mt-1 ${
            data.ratios.savingsRate >= 0 ? "text-green-600" : "text-red-600"
          }`}>
            {data.ratios.savingsRate >= 0
              ? "Voce esta economizando!"
              : "Gastos excedem receitas"}
          </p>
        </div>

        {/* Year Totals */}
        <div className="bg-gradient-to-br from-gray-50 to-slate-50 rounded-xl p-4 border border-gray-200">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">📊</span>
            <span className="text-sm font-medium text-gray-700">
              Resumo {new Date().getFullYear()}
            </span>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">Creditos</span>
              <span className="text-sm font-medium text-green-600">
                {formatCompactCurrency(data.totals.creditsThisYear)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">Debitos</span>
              <span className="text-sm font-medium text-red-600">
                {formatCompactCurrency(data.totals.debitsThisYear)}
              </span>
            </div>
            <div className="flex items-center justify-between pt-1 border-t border-gray-200">
              <span className="text-xs text-gray-500">Saldo</span>
              <span className={`text-sm font-bold ${
                data.totals.creditsThisYear - data.totals.debitsThisYear >= 0
                  ? "text-green-600"
                  : "text-red-600"
              }`}>
                {data.totals.creditsThisYear - data.totals.debitsThisYear >= 0 ? "+" : ""}
                {formatCompactCurrency(
                  data.totals.creditsThisYear - data.totals.debitsThisYear
                )}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
