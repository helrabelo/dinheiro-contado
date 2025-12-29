"use client";

import { Decimal } from "@prisma/client/runtime/library";
import Link from "next/link";

interface Transaction {
  id: string;
  transactionDate: Date;
  description: string;
  originalDescription: string;
  amount: Decimal;
  type: string;
  installmentCurrent: number | null;
  installmentTotal: number | null;
  isInternational: boolean;
  statementId: string;
  statement: {
    originalFileName: string;
  } | null;
  category: {
    name: string;
    icon: string | null;
    color: string | null;
  } | null;
}

interface TransactionListProps {
  transactions: Transaction[];
}

export function TransactionList({ transactions }: TransactionListProps) {
  // Group transactions by date
  const grouped = transactions.reduce(
    (acc, tx) => {
      const dateKey = new Date(tx.transactionDate).toISOString().split("T")[0];
      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      acc[dateKey].push(tx);
      return acc;
    },
    {} as Record<string, Transaction[]>
  );

  const sortedDates = Object.keys(grouped).sort(
    (a, b) => new Date(b).getTime() - new Date(a).getTime()
  );

  return (
    <div className="space-y-6">
      {sortedDates.map((dateKey) => {
        const dateTransactions = grouped[dateKey];
        const date = new Date(dateKey);
        const dayTotal = dateTransactions.reduce((sum, tx) => {
          const amount = Number(tx.amount);
          return tx.type === "CREDIT" ? sum + amount : sum - amount;
        }, 0);

        return (
          <div key={dateKey} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {/* Date header */}
            <div className="px-6 py-3 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-900">
                  {date.toLocaleDateString("pt-BR", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </span>
                <span className="text-sm text-gray-500">
                  ({dateTransactions.length}{" "}
                  {dateTransactions.length === 1 ? "transacao" : "transacoes"})
                </span>
              </div>
              <span
                className={`font-medium ${
                  dayTotal >= 0 ? "text-green-600" : "text-red-600"
                }`}
              >
                {dayTotal >= 0 ? "+" : ""}R${" "}
                {dayTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </span>
            </div>

            {/* Transactions */}
            <div className="divide-y divide-gray-100">
              {dateTransactions.map((tx) => (
                <TransactionRow key={tx.id} transaction={tx} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TransactionRow({ transaction: tx }: { transaction: Transaction }) {
  const amount = Number(tx.amount);
  const isPositive = tx.type === "CREDIT";

  return (
    <Link
      href={`/dashboard/statements/${tx.statementId}`}
      className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition"
    >
      <div className="flex items-center gap-4">
        {/* Icon */}
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center ${
            tx.category
              ? ""
              : tx.type === "CREDIT"
                ? "bg-green-100"
                : tx.type === "TRANSFER"
                  ? "bg-blue-100"
                  : "bg-red-100"
          }`}
          style={tx.category?.color ? { backgroundColor: tx.category.color + "20" } : undefined}
        >
          <span className="text-lg">
            {tx.category?.icon ||
              (tx.type === "CREDIT" ? "+" : tx.type === "TRANSFER" ? "~" : "-")}
          </span>
        </div>

        {/* Description */}
        <div>
          <p className="font-medium text-gray-900">
            {tx.description}
            {tx.installmentCurrent && tx.installmentTotal && (
              <span className="ml-2 text-sm text-gray-500">
                ({tx.installmentCurrent}/{tx.installmentTotal})
              </span>
            )}
          </p>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            {tx.category && (
              <span
                className="px-2 py-0.5 rounded-full text-xs"
                style={{
                  backgroundColor: tx.category.color
                    ? tx.category.color + "20"
                    : "#f3f4f6",
                  color: tx.category.color || "#6b7280",
                }}
              >
                {tx.category.name}
              </span>
            )}
            {tx.isInternational && (
              <span className="px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-700">
                Internacional
              </span>
            )}
            {tx.statement && (
              <span className="text-gray-400 truncate max-w-[200px]">
                {tx.statement.originalFileName}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Amount */}
      <div className="text-right">
        <p
          className={`font-medium ${isPositive ? "text-green-600" : "text-gray-900"}`}
        >
          {isPositive ? "+" : "-"} R${" "}
          {Math.abs(amount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
        </p>
        <p className="text-xs text-gray-500">{tx.type === "CREDIT" ? "Credito" : tx.type === "DEBIT" ? "Debito" : "Transferencia"}</p>
      </div>
    </Link>
  );
}
