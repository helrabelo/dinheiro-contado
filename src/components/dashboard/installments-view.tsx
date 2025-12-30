"use client";

import Link from "next/link";
import { usePrivacyMode } from "@/contexts/privacy-mode-context";

interface InstallmentGroup {
  key: string;
  description: string;
  amount: number;
  totalInstallments: number;
  paidInstallments: number;
  totalPaid: number;
  totalAmount: number;
  transactions: {
    id: string;
    transactionDate: string;
    installmentCurrent: number;
    installmentTotal: number;
    amount: number;
    category: { name: string; icon: string | null; color: string | null } | null;
  }[];
}

interface InstallmentsViewProps {
  groups: InstallmentGroup[];
  totalPending: number;
  totalPaid: number;
  totalOverall: number;
}

export function InstallmentsView({
  groups,
  totalPending,
  totalPaid,
  totalOverall,
}: InstallmentsViewProps) {
  const { formatCurrency } = usePrivacyMode();

  return (
    <div className="space-y-8">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <p className="text-sm text-gray-600">Total Parcelado</p>
          <p className="text-2xl font-bold text-gray-900">
            {formatCurrency(totalOverall)}
          </p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <p className="text-sm text-gray-600">Total Pago</p>
          <p className="text-2xl font-bold text-emerald-600">
            {formatCurrency(totalPaid)}
          </p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <p className="text-sm text-gray-600">Restante</p>
          <p className="text-2xl font-bold text-orange-600">
            {formatCurrency(totalPending)}
          </p>
        </div>
      </div>

      {/* Installment Groups */}
      {groups.length === 0 ? (
        <div className="bg-white rounded-xl p-8 border border-gray-200 text-center">
          <span className="text-6xl">????</span>
          <h3 className="mt-4 text-lg font-medium text-gray-900">
            Nenhum parcelamento encontrado
          </h3>
          <p className="mt-2 text-gray-600">
            Parcelamentos serao detectados automaticamente ao importar extratos.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map((group) => {
            const progress =
              (group.paidInstallments / group.totalInstallments) * 100;
            const isComplete =
              group.paidInstallments >= group.totalInstallments;

            return (
              <div
                key={group.key}
                className="bg-white rounded-xl border border-gray-200 overflow-hidden"
              >
                <div className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 truncate">
                        {group.description || "Parcelamento"}
                      </h3>
                      <p className="text-sm text-gray-500 mt-1">
                        {formatCurrency(group.amount)} por parcela
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">
                        {formatCurrency(group.totalPaid)}
                        <span className="text-gray-400 font-normal">
                          {" / "}
                          {formatCurrency(group.totalAmount)}
                        </span>
                      </p>
                      <p className="text-sm text-gray-500">
                        {group.paidInstallments}/{group.totalInstallments}{" "}
                        parcelas
                      </p>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="mt-3">
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all ${
                          isComplete ? "bg-emerald-500" : "bg-blue-500"
                        }`}
                        style={{ width: `${Math.min(progress, 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Transaction list */}
                  <details className="mt-4">
                    <summary className="text-sm text-gray-500 cursor-pointer hover:text-gray-700">
                      Ver parcelas ({group.transactions.length})
                    </summary>
                    <div className="mt-2 space-y-2">
                      {group.transactions
                        .sort(
                          (a, b) => a.installmentCurrent - b.installmentCurrent
                        )
                        .map((tx) => (
                          <Link
                            key={tx.id}
                            href={`/dashboard/transactions/${tx.id}`}
                            className="flex items-center justify-between p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
                          >
                            <div className="flex items-center gap-3">
                              <span className="text-xs font-medium text-gray-500 w-12">
                                {tx.installmentCurrent}/{tx.installmentTotal}
                              </span>
                              <span className="text-sm text-gray-600">
                                {new Date(tx.transactionDate).toLocaleDateString(
                                  "pt-BR"
                                )}
                              </span>
                              {tx.category && (
                                <span
                                  className="text-xs px-2 py-0.5 rounded-full"
                                  style={{
                                    backgroundColor: tx.category.color
                                      ? `${tx.category.color}20`
                                      : "#e5e7eb",
                                    color: tx.category.color || "#374151",
                                  }}
                                >
                                  {tx.category.icon} {tx.category.name}
                                </span>
                              )}
                            </div>
                            <span className="text-sm font-medium text-gray-900">
                              {formatCurrency(tx.amount)}
                            </span>
                          </Link>
                        ))}
                    </div>
                  </details>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
