"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const BANKS = [
  { code: "260", name: "Nubank" },
  { code: "077", name: "Inter" },
  { code: "208", name: "BTG Pactual" },
  { code: "033", name: "Santander" },
  { code: "341", name: "Itau" },
  { code: "237", name: "Bradesco" },
  { code: "001", name: "Banco do Brasil" },
  { code: "104", name: "Caixa" },
];

type AccountType = "credit_card" | "bank_account";

export function AddAccountForm() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [accountType, setAccountType] = useState<AccountType>("credit_card");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Credit card fields
  const [issuer, setIssuer] = useState("");
  const [cardName, setCardName] = useState("");
  const [lastFour, setLastFour] = useState("");
  const [nickname, setNickname] = useState("");
  const [closingDay, setClosingDay] = useState("");
  const [dueDay, setDueDay] = useState("");

  // Bank account fields
  const [bankCode, setBankCode] = useState("");
  const [bankAccountType, setBankAccountType] = useState("checking");

  const resetForm = () => {
    setIssuer("");
    setCardName("");
    setLastFour("");
    setNickname("");
    setClosingDay("");
    setDueDay("");
    setBankCode("");
    setBankAccountType("checking");
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      if (accountType === "credit_card") {
        if (!issuer) {
          throw new Error("Selecione o emissor do cartao");
        }

        const response = await fetch("/api/accounts/credit-cards", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            issuer,
            cardName: cardName || "Principal",
            lastFour: lastFour || null,
            nickname: nickname || null,
            closingDay: closingDay ? parseInt(closingDay) : null,
            dueDay: dueDay ? parseInt(dueDay) : null,
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Erro ao criar cartao");
        }
      } else {
        if (!bankCode) {
          throw new Error("Selecione o banco");
        }

        const bank = BANKS.find((b) => b.code === bankCode);

        const response = await fetch("/api/accounts/bank-accounts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            bankCode,
            bankName: bank?.name || bankCode,
            accountType: bankAccountType,
            lastFour: lastFour || null,
            nickname: nickname || null,
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Erro ao criar conta");
        }
      }

      resetForm();
      setIsOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) {
    return (
      <div className="flex gap-4">
        <button
          onClick={() => {
            setAccountType("credit_card");
            setIsOpen(true);
          }}
          className="flex-1 p-4 bg-white border-2 border-dashed border-gray-300 hover:border-emerald-500 rounded-xl transition flex items-center justify-center gap-3"
        >
          <span className="text-2xl">💳</span>
          <span className="font-medium text-gray-700">Adicionar Cartao</span>
        </button>
        <button
          onClick={() => {
            setAccountType("bank_account");
            setIsOpen(true);
          }}
          className="flex-1 p-4 bg-white border-2 border-dashed border-gray-300 hover:border-emerald-500 rounded-xl transition flex items-center justify-center gap-3"
        >
          <span className="text-2xl">🏦</span>
          <span className="font-medium text-gray-700">Adicionar Conta</span>
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl p-6 border border-gray-200">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900">
          {accountType === "credit_card"
            ? "Novo Cartao de Credito"
            : "Nova Conta Bancaria"}
        </h2>
        <button
          onClick={() => {
            resetForm();
            setIsOpen(false);
          }}
          className="text-gray-500 hover:text-gray-700"
        >
          Cancelar
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {accountType === "credit_card" ? (
          <>
            {/* Issuer */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Emissor *
              </label>
              <select
                value={issuer}
                onChange={(e) => setIssuer(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              >
                <option value="">Selecione...</option>
                {BANKS.map((bank) => (
                  <option key={bank.code} value={bank.name}>
                    {bank.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Card name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nome do Cartao
              </label>
              <input
                type="text"
                value={cardName}
                onChange={(e) => setCardName(e.target.value)}
                placeholder="Ex: Ultravioleta, Gold, Platinum..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Closing day */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Dia de Fechamento
                </label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={closingDay}
                  onChange={(e) => setClosingDay(e.target.value)}
                  placeholder="Ex: 15"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                />
              </div>

              {/* Due day */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Dia de Vencimento
                </label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={dueDay}
                  onChange={(e) => setDueDay(e.target.value)}
                  placeholder="Ex: 22"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                />
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Bank */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Banco *
              </label>
              <select
                value={bankCode}
                onChange={(e) => setBankCode(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              >
                <option value="">Selecione...</option>
                {BANKS.map((bank) => (
                  <option key={bank.code} value={bank.code}>
                    {bank.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Account type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipo de Conta
              </label>
              <select
                value={bankAccountType}
                onChange={(e) => setBankAccountType(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              >
                <option value="checking">Conta Corrente</option>
                <option value="savings">Poupanca</option>
              </select>
            </div>
          </>
        )}

        {/* Common fields */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ultimos 4 digitos
            </label>
            <input
              type="text"
              maxLength={4}
              value={lastFour}
              onChange={(e) => setLastFour(e.target.value.replace(/\D/g, ""))}
              placeholder="1234"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Apelido
            </label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="Ex: Cartao Principal"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
            />
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => {
              resetForm();
              setIsOpen(false);
            }}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition disabled:opacity-50"
          >
            {isSubmitting ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </form>
    </div>
  );
}
