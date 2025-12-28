"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileUpload } from "@/components/dashboard/file-upload";
import Link from "next/link";

const BANKS = [
  { id: "nubank", name: "Nubank", icon: "💜" },
  { id: "inter", name: "Inter", icon: "🧡" },
  { id: "btg", name: "BTG Pactual", icon: "💙" },
  { id: "santander", name: "Santander", icon: "❤️" },
  { id: "itau", name: "Itau", icon: "🧡" },
  { id: "bradesco", name: "Bradesco", icon: "❤️" },
];

const STATEMENT_TYPES = [
  { id: "CREDIT_CARD", name: "Fatura de Cartao", icon: "💳" },
  { id: "CHECKING_ACCOUNT", name: "Extrato Conta Corrente", icon: "🏦" },
];

export default function UploadPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [bank, setBank] = useState("");
  const [statementType, setStatementType] = useState("");
  const [password, setPassword] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");

  const handleUpload = async () => {
    if (!file || !bank || !statementType) {
      setError("Preencha todos os campos obrigatorios");
      return;
    }

    setIsUploading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("bank", bank);
      formData.append("statementType", statementType);
      if (password) {
        formData.append("password", password);
      }

      const response = await fetch("/api/statements/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Erro ao fazer upload");
      }

      router.push("/dashboard/statements");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao fazer upload");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/statements"
          className="p-2 hover:bg-gray-100 rounded-lg transition"
        >
          ← Voltar
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Enviar Extrato</h1>
          <p className="text-gray-600">
            Faca upload do seu extrato ou fatura
          </p>
        </div>
      </div>

      {/* File upload */}
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          1. Selecione o arquivo
        </h2>
        <FileUpload onFileSelect={setFile} />
        {file && (
          <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-3">
            <span className="text-2xl">📄</span>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-emerald-900 truncate">
                {file.name}
              </p>
              <p className="text-sm text-emerald-700">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
            <button
              onClick={() => setFile(null)}
              className="text-emerald-700 hover:text-emerald-900"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {/* Bank selection */}
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          2. Selecione o banco
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {BANKS.map((b) => (
            <button
              key={b.id}
              onClick={() => setBank(b.id)}
              className={`p-4 rounded-lg border-2 transition ${
                bank === b.id
                  ? "border-emerald-500 bg-emerald-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <span className="text-2xl">{b.icon}</span>
              <p className="mt-1 font-medium text-gray-900">{b.name}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Statement type */}
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          3. Tipo de extrato
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {STATEMENT_TYPES.map((t) => (
            <button
              key={t.id}
              onClick={() => setStatementType(t.id)}
              className={`p-4 rounded-lg border-2 transition flex items-center gap-3 ${
                statementType === t.id
                  ? "border-emerald-500 bg-emerald-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <span className="text-2xl">{t.icon}</span>
              <p className="font-medium text-gray-900">{t.name}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Password (optional) */}
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          4. Senha do PDF (opcional)
        </h2>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Deixe em branco se nao tiver senha"
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
        />
        <p className="mt-2 text-sm text-gray-500">
          A senha nao sera armazenada, apenas usada para abrir o PDF.
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* Submit */}
      <button
        onClick={handleUpload}
        disabled={isUploading || !file || !bank || !statementType}
        className="w-full py-4 px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isUploading ? "Enviando..." : "Enviar Extrato"}
      </button>
    </div>
  );
}
