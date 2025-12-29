"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface BankAccount {
  id: string;
  bankCode: string;
  bankName: string;
  accountType: string;
  nickname: string | null;
  lastFour: string | null;
  isActive: boolean;
  _count: {
    statements: number;
    transactions: number;
  };
}

interface BankAccountListProps {
  accounts: BankAccount[];
}

export function BankAccountList({ accounts }: BankAccountListProps) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta conta?")) {
      return;
    }

    setDeletingId(id);
    try {
      const response = await fetch(`/api/accounts/bank-accounts/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        alert(data.error || "Erro ao excluir conta");
        return;
      }

      router.refresh();
    } catch {
      alert("Erro ao excluir conta");
    } finally {
      setDeletingId(null);
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/accounts/bank-accounts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !currentStatus }),
      });

      if (!response.ok) {
        const data = await response.json();
        alert(data.error || "Erro ao atualizar conta");
        return;
      }

      router.refresh();
    } catch {
      alert("Erro ao atualizar conta");
    }
  };

  const accountTypeLabels: Record<string, string> = {
    checking: "Conta Corrente",
    savings: "Poupanca",
  };

  return (
    <div className="divide-y divide-gray-100">
      {accounts.map((account) => (
        <div
          key={account.id}
          className={`px-6 py-4 flex items-center justify-between ${
            !account.isActive ? "opacity-50" : ""
          }`}
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-blue-700 font-medium text-sm">
                {account.bankName.substring(0, 2).toUpperCase()}
              </span>
            </div>
            <div>
              <p className="font-medium text-gray-900">
                {account.nickname || account.bankName}
              </p>
              <div className="flex items-center gap-3 text-sm text-gray-500">
                <span>{account.bankName}</span>
                <span>{accountTypeLabels[account.accountType] || account.accountType}</span>
                {account.lastFour && (
                  <span>Final {account.lastFour}</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right text-sm text-gray-500">
              <p>{account._count.statements} extrato(s)</p>
              <p>{account._count.transactions} transacao(es)</p>
            </div>

            <button
              onClick={() => handleToggleActive(account.id, account.isActive)}
              className={`px-3 py-1 text-sm rounded-lg transition ${
                account.isActive
                  ? "text-yellow-600 hover:bg-yellow-50"
                  : "text-green-600 hover:bg-green-50"
              }`}
            >
              {account.isActive ? "Desativar" : "Ativar"}
            </button>

            <button
              onClick={() => handleDelete(account.id)}
              disabled={deletingId === account.id}
              className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded-lg transition disabled:opacity-50"
            >
              {deletingId === account.id ? "..." : "Excluir"}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
