"use client";

import { useEffect, useState, useCallback } from "react";

interface CategoryBreakdown {
  categoryId: string | null;
  name: string;
  icon: string;
  color: string;
  amount: number;
  count: number;
}

interface PeriodData {
  credits: number;
  debits: number;
  net: number;
  count: number;
  categoryBreakdown: CategoryBreakdown[];
}

interface ComparisonData {
  currentPeriod: PeriodData;
  previousPeriod: PeriodData;
  changes: {
    credits: { value: number; percentage: number };
    debits: { value: number; percentage: number };
    net: { value: number; percentage: number };
    count: { value: number; percentage: number };
  };
  period: {
    current: { startDate: string; endDate: string };
    previous: { startDate: string; endDate: string };
  };
}

type ComparisonType = "month" | "year";

export function PeriodComparisonCard() {
  const [data, setData] = useState<ComparisonData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [comparisonType, setComparisonType] = useState<ComparisonType>("month");

  const fetchData = useCallback(async (type: ComparisonType) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/analytics/period-comparison?comparison=${type}`);
      if (!response.ok) throw new Error("Failed to fetch data");

      const result = await response.json();
      setData(result);
    } catch (err) {
      setError("Erro ao carregar dados");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(comparisonType);
  }, [fetchData, comparisonType]);

  const formatCurrency = (value: number) => {
    return `R$ ${Math.abs(value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
  };

  const formatPercentage = (value: number) => {
    const sign = value >= 0 ? "+" : "";
    return `${sign}${value.toFixed(1)}%`;
  };

  const formatDateRange = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const options: Intl.DateTimeFormatOptions = { day: "2-digit", month: "short" };

    if (startDate.getMonth() === endDate.getMonth()) {
      return `${startDate.toLocaleDateString("pt-BR", options)} - ${endDate.getDate()}`;
    }
    return `${startDate.toLocaleDateString("pt-BR", options)} - ${endDate.toLocaleDateString("pt-BR", options)}`;
  };

  const getComparisonLabel = () => {
    return comparisonType === "month"
      ? { current: "Este mes", previous: "Mes passado" }
      : { current: "Este ano", previous: "Ano passado" };
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="h-32 bg-gray-100 rounded"></div>
            <div className="h-32 bg-gray-100 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  if (!data) return null;

  const labels = getComparisonLabel();

  return (
    <div className="bg-white rounded-xl p-6 border border-gray-200">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Comparativo de Periodos
          </h2>
          <p className="text-sm text-gray-500">
            {labels.current} vs {labels.previous}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setComparisonType("month")}
            className={`px-3 py-1.5 text-sm rounded-lg transition ${
              comparisonType === "month"
                ? "bg-emerald-100 text-emerald-700"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            Mensal
          </button>
          <button
            onClick={() => setComparisonType("year")}
            className={`px-3 py-1.5 text-sm rounded-lg transition ${
              comparisonType === "year"
                ? "bg-emerald-100 text-emerald-700"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            Anual
          </button>
        </div>
      </div>

      {/* Main comparison cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Credits */}
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border border-green-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-green-800">Creditos</span>
            <ChangeIndicator value={data.changes.credits.percentage} inverted={false} />
          </div>
          <p className="text-2xl font-bold text-green-700">
            {formatCurrency(data.currentPeriod.credits)}
          </p>
          <p className="text-sm text-green-600 mt-1">
            Era {formatCurrency(data.previousPeriod.credits)}
          </p>
        </div>

        {/* Debits */}
        <div className="bg-gradient-to-br from-red-50 to-rose-50 rounded-xl p-4 border border-red-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-red-800">Debitos</span>
            <ChangeIndicator value={data.changes.debits.percentage} inverted={true} />
          </div>
          <p className="text-2xl font-bold text-red-700">
            {formatCurrency(data.currentPeriod.debits)}
          </p>
          <p className="text-sm text-red-600 mt-1">
            Era {formatCurrency(data.previousPeriod.debits)}
          </p>
        </div>

        {/* Net */}
        <div className={`rounded-xl p-4 border ${
          data.currentPeriod.net >= 0
            ? "bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-100"
            : "bg-gradient-to-br from-orange-50 to-amber-50 border-orange-100"
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className={`text-sm font-medium ${
              data.currentPeriod.net >= 0 ? "text-blue-800" : "text-orange-800"
            }`}>
              Saldo
            </span>
            <ChangeIndicator value={data.changes.net.percentage} inverted={false} />
          </div>
          <p className={`text-2xl font-bold ${
            data.currentPeriod.net >= 0 ? "text-blue-700" : "text-orange-700"
          }`}>
            {data.currentPeriod.net >= 0 ? "+" : "-"}{formatCurrency(data.currentPeriod.net)}
          </p>
          <p className={`text-sm mt-1 ${
            data.currentPeriod.net >= 0 ? "text-blue-600" : "text-orange-600"
          }`}>
            Era {data.previousPeriod.net >= 0 ? "+" : "-"}{formatCurrency(data.previousPeriod.net)}
          </p>
        </div>
      </div>

      {/* Category comparison */}
      {data.currentPeriod.categoryBreakdown.length > 0 && (
        <div className="border-t border-gray-100 pt-4">
          <h3 className="text-sm font-medium text-gray-700 mb-3">
            Top categorias ({labels.current})
          </h3>
          <div className="space-y-2">
            {data.currentPeriod.categoryBreakdown.slice(0, 3).map((cat) => {
              const prevCat = data.previousPeriod.categoryBreakdown.find(
                (p) => p.categoryId === cat.categoryId
              );
              const prevAmount = prevCat?.amount || 0;
              const change = prevAmount > 0
                ? ((cat.amount - prevAmount) / prevAmount) * 100
                : cat.amount > 0 ? 100 : 0;

              return (
                <div
                  key={cat.categoryId || "uncategorized"}
                  className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    <span>{cat.icon}</span>
                    <span className="text-sm font-medium text-gray-700">{cat.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-900">{formatCurrency(cat.amount)}</span>
                    <ChangeIndicator value={change} inverted={true} size="sm" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Period dates */}
      <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-2 gap-4 text-xs text-gray-500">
        <div>
          <span className="font-medium">{labels.current}:</span>{" "}
          {formatDateRange(data.period.current.startDate, data.period.current.endDate)}
        </div>
        <div>
          <span className="font-medium">{labels.previous}:</span>{" "}
          {formatDateRange(data.period.previous.startDate, data.period.previous.endDate)}
        </div>
      </div>
    </div>
  );
}

interface ChangeIndicatorProps {
  value: number;
  inverted?: boolean; // For debits, increase is bad
  size?: "sm" | "md";
}

function ChangeIndicator({ value, inverted = false, size = "md" }: ChangeIndicatorProps) {
  const isPositive = inverted ? value < 0 : value > 0;
  const isNegative = inverted ? value > 0 : value < 0;

  const baseClasses = size === "sm" ? "text-xs px-1.5 py-0.5" : "text-sm px-2 py-1";

  if (Math.abs(value) < 0.1) {
    return (
      <span className={`${baseClasses} rounded-full bg-gray-100 text-gray-600 font-medium`}>
        0%
      </span>
    );
  }

  const sign = value >= 0 ? "+" : "";

  return (
    <span
      className={`${baseClasses} rounded-full font-medium ${
        isPositive
          ? "bg-green-100 text-green-700"
          : isNegative
          ? "bg-red-100 text-red-700"
          : "bg-gray-100 text-gray-600"
      }`}
    >
      {sign}{value.toFixed(1)}%
    </span>
  );
}
