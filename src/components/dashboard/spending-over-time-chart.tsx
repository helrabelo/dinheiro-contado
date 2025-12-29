"use client";

import { useEffect, useState, useCallback } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  BarChart,
  Bar,
} from "recharts";
import { TimePeriodSelector, getDateRangeFromPeriod, type TimePeriod } from "./time-period-selector";

interface TimeSeriesData {
  period: string;
  label: string;
  credits: number;
  debits: number;
  net: number;
  count: number;
}

interface SpendingOverTimeData {
  data: TimeSeriesData[];
  totals: {
    credits: number;
    debits: number;
    net: number;
    count: number;
  };
  averages: {
    credits: number;
    debits: number;
    net: number;
  };
  groupBy: string;
  period: {
    startDate: string | null;
    endDate: string | null;
  };
}

type ChartType = "area" | "bar";

export function SpendingOverTimeChart() {
  const [data, setData] = useState<SpendingOverTimeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPeriod, setCurrentPeriod] = useState<TimePeriod>("all");
  const [chartType, setChartType] = useState<ChartType>("area");
  const [showCredits, setShowCredits] = useState(true);
  const [showDebits, setShowDebits] = useState(true);

  const fetchData = useCallback(async (startDate: Date, endDate: Date) => {
    setLoading(true);
    setError(null);

    try {
      // Determine groupBy based on date range
      const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      let groupBy = "month";
      if (days <= 31) groupBy = "day";
      else if (days <= 90) groupBy = "week";
      else if (days > 365) groupBy = "month";

      const params = new URLSearchParams({
        startDate: startDate.toISOString().split("T")[0],
        endDate: endDate.toISOString().split("T")[0],
        groupBy,
      });

      const response = await fetch(`/api/analytics/spending-over-time?${params}`);
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
    const { startDate, endDate } = getDateRangeFromPeriod("all");
    fetchData(startDate, endDate);
  }, [fetchData]);

  const handlePeriodChange = (startDate: Date, endDate: Date, period: TimePeriod) => {
    setCurrentPeriod(period);
    fetchData(startDate, endDate);
  };

  const formatCurrency = (value: number) => {
    return `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}`;
  };

  const formatTooltipValue = (value: number) => {
    return `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
  };

  const getPeriodLabel = () => {
    const labels: Record<TimePeriod, string> = {
      all: "Todo periodo",
      year: "Este ano",
      "6months": "Ultimos 6 meses",
      "3months": "Ultimos 3 meses",
      month: "Este mes",
      lastMonth: "Mes passado",
      custom: "Periodo personalizado",
    };
    return labels[currentPeriod];
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-64 bg-gray-100 rounded"></div>
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

  if (!data || data.data.length === 0) {
    return (
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Gastos ao Longo do Tempo
        </h2>
        <TimePeriodSelector
          onPeriodChange={handlePeriodChange}
          defaultPeriod="all"
          persistInUrl={false}
          compact
        />
        <div className="text-center py-8 text-gray-500">
          Nenhuma transacao encontrada no periodo selecionado.
        </div>
      </div>
    );
  }

  const Chart = chartType === "area" ? AreaChart : BarChart;

  return (
    <div className="bg-white rounded-xl p-6 border border-gray-200">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Gastos ao Longo do Tempo
          </h2>
          <p className="text-sm text-gray-500">{getPeriodLabel()}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setChartType("area")}
              className={`px-3 py-1 text-sm rounded-lg transition ${
                chartType === "area"
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              Area
            </button>
            <button
              onClick={() => setChartType("bar")}
              className={`px-3 py-1 text-sm rounded-lg transition ${
                chartType === "bar"
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              Barras
            </button>
          </div>
          <TimePeriodSelector
            onPeriodChange={handlePeriodChange}
            defaultPeriod="all"
            persistInUrl={false}
            compact
          />
        </div>
      </div>

      {/* Toggle buttons for credits/debits */}
      <div className="flex items-center gap-4 mb-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={showCredits}
            onChange={(e) => setShowCredits(e.target.checked)}
            className="rounded border-gray-300 text-green-600 focus:ring-green-500"
          />
          <span className="text-sm text-gray-600">Creditos</span>
          <span className="w-3 h-3 rounded-full bg-green-500"></span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={showDebits}
            onChange={(e) => setShowDebits(e.target.checked)}
            className="rounded border-gray-300 text-red-600 focus:ring-red-500"
          />
          <span className="text-sm text-gray-600">Debitos</span>
          <span className="w-3 h-3 rounded-full bg-red-500"></span>
        </label>
      </div>

      {/* Chart */}
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          {chartType === "area" ? (
            <AreaChart data={data.data}>
              <defs>
                <linearGradient id="colorCredits" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorDebits" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="label"
                tick={{ fill: "#6b7280", fontSize: 12 }}
                tickLine={false}
                axisLine={{ stroke: "#e5e7eb" }}
              />
              <YAxis
                tickFormatter={formatCurrency}
                tick={{ fill: "#6b7280", fontSize: 12 }}
                tickLine={false}
                axisLine={{ stroke: "#e5e7eb" }}
                width={80}
              />
              <Tooltip
                formatter={(value, name) => [
                  formatTooltipValue(Number(value)),
                  name === "credits" ? "Creditos" : "Debitos",
                ]}
                contentStyle={{
                  backgroundColor: "white",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                }}
              />
              {showCredits && (
                <Area
                  type="monotone"
                  dataKey="credits"
                  stroke="#22c55e"
                  strokeWidth={2}
                  fill="url(#colorCredits)"
                  name="Creditos"
                />
              )}
              {showDebits && (
                <Area
                  type="monotone"
                  dataKey="debits"
                  stroke="#ef4444"
                  strokeWidth={2}
                  fill="url(#colorDebits)"
                  name="Debitos"
                />
              )}
            </AreaChart>
          ) : (
            <BarChart data={data.data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="label"
                tick={{ fill: "#6b7280", fontSize: 12 }}
                tickLine={false}
                axisLine={{ stroke: "#e5e7eb" }}
              />
              <YAxis
                tickFormatter={formatCurrency}
                tick={{ fill: "#6b7280", fontSize: 12 }}
                tickLine={false}
                axisLine={{ stroke: "#e5e7eb" }}
                width={80}
              />
              <Tooltip
                formatter={(value, name) => [
                  formatTooltipValue(Number(value)),
                  name === "credits" ? "Creditos" : "Debitos",
                ]}
                contentStyle={{
                  backgroundColor: "white",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                }}
              />
              <Legend />
              {showCredits && (
                <Bar dataKey="credits" fill="#22c55e" name="Creditos" radius={[4, 4, 0, 0]} />
              )}
              {showDebits && (
                <Bar dataKey="debits" fill="#ef4444" name="Debitos" radius={[4, 4, 0, 0]} />
              )}
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Summary Stats */}
      <div className="mt-6 pt-4 border-t border-gray-200 grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <p className="text-sm text-gray-500">Total Creditos</p>
          <p className="text-lg font-semibold text-green-600">
            {formatTooltipValue(data.totals.credits)}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-500">Total Debitos</p>
          <p className="text-lg font-semibold text-red-600">
            {formatTooltipValue(data.totals.debits)}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-500">Media Mensal</p>
          <p className="text-lg font-semibold text-gray-900">
            {formatTooltipValue(data.averages.debits)}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-500">Saldo</p>
          <p
            className={`text-lg font-semibold ${
              data.totals.net >= 0 ? "text-green-600" : "text-red-600"
            }`}
          >
            {formatTooltipValue(data.totals.net)}
          </p>
        </div>
      </div>
    </div>
  );
}
