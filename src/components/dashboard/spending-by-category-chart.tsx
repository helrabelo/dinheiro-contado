"use client";

import { useEffect, useState, useCallback } from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import Link from "next/link";
import { TimePeriodSelector, getDateRangeFromPeriod, type TimePeriod } from "./time-period-selector";

interface CategorySpending {
  categoryId: string | null;
  name: string;
  icon: string;
  color: string;
  amount: number;
  count: number;
  percentage: number;
  [key: string]: string | number | null; // Index signature for Recharts compatibility
}

interface SpendingData {
  data: CategorySpending[];
  total: number;
  period: {
    startDate: string | null;
    endDate: string | null;
  };
}

export function SpendingByCategoryChart() {
  const [data, setData] = useState<SpendingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPeriod, setCurrentPeriod] = useState<TimePeriod>("month");

  const fetchData = useCallback(async (startDate: Date, endDate: Date) => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        startDate: startDate.toISOString().split("T")[0],
        endDate: endDate.toISOString().split("T")[0],
        limit: "10",
      });

      const response = await fetch(`/api/analytics/spending-by-category?${params}`);
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
    const { startDate, endDate } = getDateRangeFromPeriod("month");
    fetchData(startDate, endDate);
  }, [fetchData]);

  const handlePeriodChange = (startDate: Date, endDate: Date, period: TimePeriod) => {
    setCurrentPeriod(period);
    fetchData(startDate, endDate);
  };

  const formatCurrency = (value: number) => {
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
          Gastos por Categoria
        </h2>
        <TimePeriodSelector
          onPeriodChange={handlePeriodChange}
          defaultPeriod="month"
          persistInUrl={false}
          compact
        />
        <div className="text-center py-8 text-gray-500">
          Nenhum gasto encontrado no periodo selecionado.
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl p-6 border border-gray-200">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Gastos por Categoria
          </h2>
          <p className="text-sm text-gray-500">{getPeriodLabel()}</p>
        </div>
        <TimePeriodSelector
          onPeriodChange={handlePeriodChange}
          defaultPeriod="month"
          persistInUrl={false}
          compact
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie Chart */}
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data.data}
                dataKey="amount"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                label={({ name, payload }) => {
                  const pct = payload?.percentage ?? 0;
                  return pct > 5 ? `${name} (${pct.toFixed(0)}%)` : "";
                }}
                labelLine={false}
              >
                {data.data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value) => formatCurrency(Number(value))}
                contentStyle={{
                  backgroundColor: "white",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Category List */}
        <div className="space-y-3 max-h-80 overflow-y-auto">
          {data.data.map((item) => (
            <Link
              key={item.categoryId || "uncategorized"}
              href={
                item.categoryId
                  ? `/dashboard/categories/${item.categoryId}`
                  : "/dashboard/transactions?categoryId=null"
              }
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition group"
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-lg"
                style={{ backgroundColor: `${item.color}20` }}
              >
                {item.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-900 truncate group-hover:text-emerald-600">
                    {item.name}
                  </span>
                  <span className="text-gray-600 ml-2 whitespace-nowrap">
                    {formatCurrency(item.amount)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <span>{item.count} transacoes</span>
                  <span>{item.percentage.toFixed(1)}%</span>
                </div>
                <div className="mt-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${item.percentage}%`,
                      backgroundColor: item.color,
                    }}
                  />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Total */}
      <div className="mt-6 pt-4 border-t border-gray-200 flex items-center justify-between">
        <span className="text-gray-600">Total de gastos</span>
        <span className="text-xl font-bold text-gray-900">
          {formatCurrency(data.total)}
        </span>
      </div>
    </div>
  );
}
