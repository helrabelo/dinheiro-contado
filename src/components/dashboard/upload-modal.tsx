"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { FileUpload } from "./file-upload";

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

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

type Step = "file" | "details" | "uploading" | "success" | "error";

export function UploadModal({ isOpen, onClose, onSuccess }: UploadModalProps) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("file");
  const [file, setFile] = useState<File | null>(null);
  const [bank, setBank] = useState("");
  const [statementType, setStatementType] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setStep("file");
        setFile(null);
        setBank("");
        setStatementType("");
        setPassword("");
        setError("");
      }, 300);
    }
  }, [isOpen]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && step !== "uploading") {
        onClose();
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose, step]);

  const handleFileSelect = useCallback((selectedFile: File) => {
    setFile(selectedFile);
    setStep("details");
  }, []);

  const handleUpload = async () => {
    if (!file || !bank || !statementType) {
      setError("Preencha todos os campos obrigatorios");
      return;
    }

    setStep("uploading");
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

      setStep("success");
      setTimeout(() => {
        onClose();
        if (onSuccess) {
          onSuccess();
        } else {
          router.push("/dashboard/statements");
          router.refresh();
        }
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao fazer upload");
      setStep("error");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={step !== "uploading" ? onClose : undefined}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Enviar Extrato</h2>
            <p className="text-sm text-gray-500">
              {step === "file" && "Selecione seu arquivo"}
              {step === "details" && "Configure os detalhes"}
              {step === "uploading" && "Processando..."}
              {step === "success" && "Upload concluido!"}
              {step === "error" && "Erro no upload"}
            </p>
          </div>
          {step !== "uploading" && (
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition text-gray-500"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Step: File Selection */}
          {step === "file" && (
            <div className="space-y-4">
              <FileUpload onFileSelect={handleFileSelect} />
            </div>
          )}

          {/* Step: Details */}
          {step === "details" && file && (
            <div className="space-y-6">
              {/* Selected file */}
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-3">
                <span className="text-2xl">📄</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-emerald-900 truncate">{file.name}</p>
                  <p className="text-sm text-emerald-700">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                <button
                  onClick={() => {
                    setFile(null);
                    setStep("file");
                  }}
                  className="text-emerald-700 hover:text-emerald-900 p-1"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Bank selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Banco *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {BANKS.map((b) => (
                    <button
                      key={b.id}
                      onClick={() => setBank(b.id)}
                      className={`p-3 rounded-lg border-2 transition text-center ${
                        bank === b.id
                          ? "border-emerald-500 bg-emerald-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <span className="text-xl">{b.icon}</span>
                      <p className="mt-1 text-xs font-medium text-gray-900">{b.name}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Statement type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo de extrato *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {STATEMENT_TYPES.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setStatementType(t.id)}
                      className={`p-3 rounded-lg border-2 transition flex items-center gap-2 ${
                        statementType === t.id
                          ? "border-emerald-500 bg-emerald-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <span className="text-xl">{t.icon}</span>
                      <p className="text-sm font-medium text-gray-900">{t.name}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Senha do PDF (opcional)
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Deixe em branco se nao tiver senha"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition text-sm"
                />
              </div>

              {/* Error */}
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {error}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setFile(null);
                    setStep("file");
                  }}
                  className="flex-1 py-2 px-4 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition"
                >
                  Voltar
                </button>
                <button
                  onClick={handleUpload}
                  disabled={!bank || !statementType}
                  className="flex-1 py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Enviar
                </button>
              </div>
            </div>
          )}

          {/* Step: Uploading */}
          {step === "uploading" && (
            <div className="py-12 text-center">
              <div className="inline-block w-12 h-12 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mb-4" />
              <p className="text-gray-700 font-medium">Processando seu extrato...</p>
              <p className="text-sm text-gray-500 mt-1">Isso pode levar alguns segundos</p>
            </div>
          )}

          {/* Step: Success */}
          {step === "success" && (
            <div className="py-12 text-center">
              <span className="text-6xl">✅</span>
              <p className="text-gray-900 font-medium mt-4">Upload realizado com sucesso!</p>
              <p className="text-sm text-gray-500 mt-1">Redirecionando...</p>
            </div>
          )}

          {/* Step: Error */}
          {step === "error" && (
            <div className="py-8 text-center space-y-4">
              <span className="text-6xl">❌</span>
              <div>
                <p className="text-gray-900 font-medium">Erro ao enviar extrato</p>
                <p className="text-sm text-red-600 mt-1">{error}</p>
              </div>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={onClose}
                  className="py-2 px-4 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition"
                >
                  Fechar
                </button>
                <button
                  onClick={() => setStep("details")}
                  className="py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition"
                >
                  Tentar novamente
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
