"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface CreditCard {
  id: string;
  issuer: string;
  cardName: string;
  lastFour: string | null;
  nickname: string | null;
  closingDay: number | null;
  dueDay: number | null;
  creditLimit: number | null; // Converted from Decimal
  isActive: boolean;
  _count: {
    statements: number;
    transactions: number;
  };
}

interface CreditCardListProps {
  cards: CreditCard[];
}

export function CreditCardList({ cards }: CreditCardListProps) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este cartao?")) {
      return;
    }

    setDeletingId(id);
    try {
      const response = await fetch(`/api/accounts/credit-cards/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        alert(data.error || "Erro ao excluir cartao");
        return;
      }

      router.refresh();
    } catch {
      alert("Erro ao excluir cartao");
    } finally {
      setDeletingId(null);
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/accounts/credit-cards/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !currentStatus }),
      });

      if (!response.ok) {
        const data = await response.json();
        alert(data.error || "Erro ao atualizar cartao");
        return;
      }

      router.refresh();
    } catch {
      alert("Erro ao atualizar cartao");
    }
  };

  return (
    <div className="divide-y divide-gray-100">
      {cards.map((card) => (
        <div
          key={card.id}
          className={`px-6 py-4 flex items-center justify-between ${
            !card.isActive ? "opacity-50" : ""
          }`}
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-8 bg-gradient-to-r from-gray-700 to-gray-900 rounded-md flex items-center justify-center">
              <span className="text-white text-xs font-mono">
                {card.lastFour ? `••${card.lastFour}` : "••••"}
              </span>
            </div>
            <div>
              <p className="font-medium text-gray-900">
                {card.nickname || `${card.issuer} ${card.cardName}`}
              </p>
              <div className="flex items-center gap-3 text-sm text-gray-500">
                <span>{card.issuer}</span>
                {card.closingDay && (
                  <span>Fecha dia {card.closingDay}</span>
                )}
                {card.dueDay && (
                  <span>Vence dia {card.dueDay}</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right text-sm text-gray-500">
              <p>{card._count.statements} extrato(s)</p>
              <p>{card._count.transactions} transacao(es)</p>
            </div>

            <button
              onClick={() => handleToggleActive(card.id, card.isActive)}
              className={`px-3 py-1 text-sm rounded-lg transition ${
                card.isActive
                  ? "text-yellow-600 hover:bg-yellow-50"
                  : "text-green-600 hover:bg-green-50"
              }`}
            >
              {card.isActive ? "Desativar" : "Ativar"}
            </button>

            <button
              onClick={() => handleDelete(card.id)}
              disabled={deletingId === card.id}
              className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded-lg transition disabled:opacity-50"
            >
              {deletingId === card.id ? "..." : "Excluir"}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
