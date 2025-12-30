"use client";

import { useEffect, useState, useCallback } from "react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { TimePeriodSelector, getDateRangeFromPeriod, type TimePeriod } from "@/components/dashboard/time-period-selector";

interface MonthlyData {
  period: string;
  label: string;
  credits: number;
  debits: number;
  total: number;
  count: number;
}

interface Merchant {
  name: string;
  count: number;
  total: number;
}

interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: string;
  date: string;
}

interface TransactionHighlight {
  id: string;
  description: string;
  amount: number;
  date: string;
}

interface CommonTransaction {
  description: string;
  count: number;
  totalAmount: number;
  averageAmount: number;
  lastDate: string;
}

interface TransactionInsights {
  highest: TransactionHighlight | null;
  lowest: TransactionHighlight | null;
  mostCommon: CommonTransaction[];
}

interface CategoryData {
  category: {
    id: string;
    name: string;
    icon: string;
    color: string;
  };
  totals: {
    credits: number;
    debits: number;
    net: number;
    count: number;
  };
  monthlyTrend: MonthlyData[];
  topMerchants: Merchant[];
  recentTransactions: Transaction[];
  transactionInsights: TransactionInsights;
  period: {
    startDate: string | null;
    endDate: string | null;
  };
}

interface Props {
  categoryId: string;
  categoryColor: string;
}

export function CategoryDetailCharts({ categoryId, categoryColor }: Props) {
  const [data, setData] = useState<CategoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (startDate: Date, endDate: Date) => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        startDate: startDate.toISOString().split("T")[0],
        endDate: endDate.toISOString().split("T")[0],
      });

      const response = await fetch(`/api/analytics/category/${categoryId}?${params}`);
      if (!response.ok) throw new Error("Failed to fetch data");

      const result = await response.json();
      setData(result);
    } catch (err) {
      setError("Erro ao carregar dados");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [categoryId]);

  useEffect(() => {
    const { startDate, endDate } = getDateRangeFromPeriod("all");
    fetchData(startDate, endDate);
  }, [fetchData]);

  const handlePeriodChange = (startDate: Date, endDate: Date) => {
    fetchData(startDate, endDate);
  };

  const formatCurrency = (value: number) => {
    return `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="h-64 bg-gray-100 rounded"></div>
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

  return (
    <div className="space-y-6">
      {/* Period Selector and Totals */}
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Resumo do Periodo
            </h2>
          </div>
          <TimePeriodSelector
            onPeriodChange={handlePeriodChange}
            defaultPeriod="all"
            persistInUrl={false}
            compact
          />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-500">Total Gastos</p>
            <p className="text-xl font-bold text-red-600">
              {formatCurrency(data.totals.debits)}
            </p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-500">Total Creditos</p>
            <p className="text-xl font-bold text-green-600">
              {formatCurrency(data.totals.credits)}
            </p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-500">Transacoes</p>
            <p className="text-xl font-bold text-gray-900">
              {data.totals.count.toLocaleString("pt-BR")}
            </p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-500">Media por Transacao</p>
            <p className="text-xl font-bold text-gray-900">
              {data.totals.count > 0
                ? formatCurrency(data.totals.debits / data.totals.count)
                : "R$ 0,00"}
            </p>
          </div>
        </div>
      </div>

      {/* Monthly Trend Chart */}
      {data.monthlyTrend.length > 0 && (
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Gastos ao Longo do Tempo
          </h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.monthlyTrend}>
                <defs>
                  <linearGradient id="colorCategory" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={categoryColor} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={categoryColor} stopOpacity={0} />
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
                  tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
                  tick={{ fill: "#6b7280", fontSize: 12 }}
                  tickLine={false}
                  axisLine={{ stroke: "#e5e7eb" }}
                  width={70}
                />
                <Tooltip
                  formatter={(value) => [formatCurrency(Number(value)), "Gastos"]}
                  contentStyle={{
                    backgroundColor: "white",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="debits"
                  stroke={categoryColor}
                  strokeWidth={2}
                  fill="url(#colorCategory)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Top Merchants */}
      {data.topMerchants.length > 0 && (
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Principais Estabelecimentos
          </h2>
          <div className="space-y-3">
            {data.topMerchants.map((merchant, index) => {
              const maxTotal = data.topMerchants[0]?.total || 1;
              const percentage = (merchant.total / maxTotal) * 100;

              return (
                <div key={merchant.name} className="flex items-center gap-3">
                  <span className="w-6 text-sm text-gray-400 text-right">
                    {index + 1}.
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-900 truncate">
                        {merchant.name}
                      </span>
                      <span className="text-sm text-gray-600 ml-2 whitespace-nowrap">
                        {formatCurrency(merchant.total)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden mr-3">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${percentage}%`,
                            backgroundColor: categoryColor,
                          }}
                        />
                      </div>
                      <span>{merchant.count} transacoes</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Transaction Insights */}
      {(data.transactionInsights.highest || data.transactionInsights.mostCommon.length > 0) && (
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Destaques das Transações
          </h2>

          {/* Highest and Lowest */}
          {(data.transactionInsights.highest || data.transactionInsights.lowest) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {data.transactionInsights.highest && (
                <div className="p-4 bg-red-50 border border-red-100 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">📈</span>
                    <span className="text-sm font-medium text-red-800">Maior Gasto</span>
                  </div>
                  <p className="text-xl font-bold text-red-700">
                    {formatCurrency(data.transactionInsights.highest.amount)}
                  </p>
                  <p className="text-sm text-red-600 truncate mt-1">
                    {data.transactionInsights.highest.description}
                  </p>
                  <p className="text-xs text-red-500 mt-1">
                    {new Date(data.transactionInsights.highest.date).toLocaleDateString("pt-BR")}
                  </p>
                </div>
              )}
              {data.transactionInsights.lowest && (
                <div className="p-4 bg-green-50 border border-green-100 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">📉</span>
                    <span className="text-sm font-medium text-green-800">Menor Gasto</span>
                  </div>
                  <p className="text-xl font-bold text-green-700">
                    {formatCurrency(data.transactionInsights.lowest.amount)}
                  </p>
                  <p className="text-sm text-green-600 truncate mt-1">
                    {data.transactionInsights.lowest.description}
                  </p>
                  <p className="text-xs text-green-500 mt-1">
                    {new Date(data.transactionInsights.lowest.date).toLocaleDateString("pt-BR")}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Most Common */}
          {data.transactionInsights.mostCommon.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                <span>🔄</span>
                Transações Mais Frequentes
              </h3>
              <div className="space-y-2">
                {data.transactionInsights.mostCommon.map((item, index) => (
                  <div
                    key={item.description}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-medium flex items-center justify-center">
                        {item.count}×
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {item.description}
                        </p>
                        <p className="text-xs text-gray-500">
                          Média: {formatCurrency(item.averageAmount)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right ml-3">
                      <p className="text-sm font-medium text-gray-900">
                        {formatCurrency(item.totalAmount)}
                      </p>
                      <p className="text-xs text-gray-500">total</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Recent Transactions */}
      {data.recentTransactions.length > 0 && (
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Transações Recentes
          </h2>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {data.recentTransactions.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">
                    {tx.description}
                  </p>
                  <p className="text-sm text-gray-500">
                    {new Date(tx.date).toLocaleDateString("pt-BR")}
                  </p>
                </div>
                <p
                  className={`font-medium ml-4 ${
                    tx.type === "CREDIT" ? "text-green-600" : "text-gray-900"
                  }`}
                >
                  {tx.type === "CREDIT" ? "+" : "-"} {formatCurrency(tx.amount)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
