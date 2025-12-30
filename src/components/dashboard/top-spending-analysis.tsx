"use client";

import { useEffect, useState, useCallback } from "react";
import { TimePeriodSelector, getDateRangeFromPeriod, type TimePeriod } from "./time-period-selector";
import { usePrivacyMode } from "@/contexts/privacy-mode-context";

interface Merchant {
  name: string;
  total: number;
  count: number;
  average: number;
  lastDate: string;
}

interface Transaction {
  id: string;
  description: string;
  amount: number;
  date: string;
  category: {
    name: string;
    icon: string;
    color: string;
  } | null;
}

interface TopSpendingData {
  topMerchants: Merchant[];
  biggestTransactions: Transaction[];
  frequentMerchants: Merchant[];
  averages: {
    daily: number;
    weekly: number;
    monthly: number;
    perTransaction: number;
  };
  totals: {
    spending: number;
    transactions: number;
    uniqueMerchants: number;
  };
  period: {
    startDate: string | null;
    endDate: string | null;
    days: number;
  };
}

type TabType = "merchants" | "transactions" | "frequent";

export function TopSpendingAnalysis() {
  const [data, setData] = useState<TopSpendingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPeriod, setCurrentPeriod] = useState<TimePeriod>("all");
  const [activeTab, setActiveTab] = useState<TabType>("merchants");
  const { formatCurrency } = usePrivacyMode();

  const fetchData = useCallback(async (startDate: Date, endDate: Date) => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        startDate: startDate.toISOString().split("T")[0],
        endDate: endDate.toISOString().split("T")[0],
        merchantLimit: "10",
        transactionLimit: "10",
      });

      const response = await fetch(`/api/analytics/top-spending?${params}`);
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

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
    });
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
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-100 rounded"></div>
            ))}
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
    <div className="bg-white rounded-xl p-6 border border-gray-200">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Analise de Gastos
          </h2>
          <p className="text-sm text-gray-500">{getPeriodLabel()}</p>
        </div>
        <TimePeriodSelector
          onPeriodChange={handlePeriodChange}
          defaultPeriod="all"
          persistInUrl={false}
          compact
        />
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-xs text-gray-500">Media diaria</p>
          <p className="text-lg font-semibold text-gray-900">
            {formatCurrency(data.averages.daily)}
          </p>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-xs text-gray-500">Media semanal</p>
          <p className="text-lg font-semibold text-gray-900">
            {formatCurrency(data.averages.weekly)}
          </p>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-xs text-gray-500">Por transacao</p>
          <p className="text-lg font-semibold text-gray-900">
            {formatCurrency(data.averages.perTransaction)}
          </p>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-xs text-gray-500">Estabelecimentos</p>
          <p className="text-lg font-semibold text-gray-900">
            {data.totals.uniqueMerchants}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-4">
        <button
          onClick={() => setActiveTab("merchants")}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition ${
            activeTab === "merchants"
              ? "border-emerald-500 text-emerald-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          Top Gastos
        </button>
        <button
          onClick={() => setActiveTab("transactions")}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition ${
            activeTab === "transactions"
              ? "border-emerald-500 text-emerald-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          Maiores Valores
        </button>
        <button
          onClick={() => setActiveTab("frequent")}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition ${
            activeTab === "frequent"
              ? "border-emerald-500 text-emerald-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          Mais Frequentes
        </button>
      </div>

      {/* Tab content */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {activeTab === "merchants" && (
          <>
            {data.topMerchants.length === 0 ? (
              <p className="text-center py-8 text-gray-500">
                Nenhum gasto encontrado no periodo.
              </p>
            ) : (
              data.topMerchants.map((merchant, index) => (
                <div
                  key={merchant.name}
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
                >
                  <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-sm">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate text-sm">
                      {merchant.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {merchant.count} transacoes - Media: {formatCurrency(merchant.average)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">
                      {formatCurrency(merchant.total)}
                    </p>
                    <p className="text-xs text-gray-500">
                      Ultimo: {formatDate(merchant.lastDate)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </>
        )}

        {activeTab === "transactions" && (
          <>
            {data.biggestTransactions.length === 0 ? (
              <p className="text-center py-8 text-gray-500">
                Nenhuma transacao encontrada no periodo.
              </p>
            ) : (
              data.biggestTransactions.map((tx, index) => (
                <div
                  key={tx.id}
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
                >
                  <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-red-700 font-bold text-sm">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate text-sm">
                      {tx.description}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span>{formatDate(tx.date)}</span>
                      {tx.category && (
                        <>
                          <span>-</span>
                          <span className="flex items-center gap-1">
                            {tx.category.icon} {tx.category.name}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <p className="font-semibold text-red-600">
                    {formatCurrency(tx.amount)}
                  </p>
                </div>
              ))
            )}
          </>
        )}

        {activeTab === "frequent" && (
          <>
            {data.frequentMerchants.length === 0 ? (
              <p className="text-center py-8 text-gray-500">
                Nenhum estabelecimento encontrado no periodo.
              </p>
            ) : (
              data.frequentMerchants.map((merchant, index) => (
                <div
                  key={merchant.name}
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
                >
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate text-sm">
                      {merchant.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      Total: {formatCurrency(merchant.total)} - Media: {formatCurrency(merchant.average)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-blue-600">
                      {merchant.count}x
                    </p>
                    <p className="text-xs text-gray-500">transacoes</p>
                  </div>
                </div>
              ))
            )}
          </>
        )}
      </div>

      {/* Total */}
      <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-between">
        <span className="text-gray-600">
          Total ({data.totals.transactions} transacoes)
        </span>
        <span className="text-xl font-bold text-gray-900">
          {formatCurrency(data.totals.spending)}
        </span>
      </div>
    </div>
  );
}
