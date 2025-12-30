"use client";

import Link from "next/link";
import { usePrivacyMode } from "@/contexts/privacy-mode-context";

interface Transaction {
  id: string;
  description: string;
  transactionDate: string;
  amount: number;
  type: string;
  category: {
    name: string;
    icon: string | null;
  } | null;
}

interface RecentTransactionsProps {
  transactions: Transaction[];
}

export function RecentTransactions({ transactions }: RecentTransactionsProps) {
  const { formatCurrency } = usePrivacyMode();

  if (transactions.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-xl p-6 border border-gray-200">
      <div className="flex items-center justify-end mb-4">
        <Link
          href="/dashboard/transactions"
          className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
        >
          Ver todas &rarr;
        </Link>
      </div>
      <div className="space-y-3">
        {transactions.map((tx) => (
          <div
            key={tx.id}
            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  tx.type === "CREDIT" ? "bg-green-100" : "bg-red-100"
                }`}
              >
                <span>
                  {tx.category?.icon || (tx.type === "CREDIT" ? "+" : "-")}
                </span>
              </div>
              <div>
                <p className="font-medium text-gray-900">{tx.description}</p>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <span>
                    {new Date(tx.transactionDate).toLocaleDateString("pt-BR")}
                  </span>
                  {tx.category ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-200 text-gray-700 rounded-full text-xs">
                      <span>{tx.category.icon}</span>
                      <span>{tx.category.name}</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-200 text-gray-500 rounded-full text-xs">
                      <span>?</span>
                      <span>Sem categoria</span>
                    </span>
                  )}
                </div>
              </div>
            </div>
            <p
              className={`font-medium ${
                tx.type === "CREDIT" ? "text-green-600" : "text-gray-900"
              }`}
            >
              {tx.type === "CREDIT" ? "+" : "-"} {formatCurrency(tx.amount)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
