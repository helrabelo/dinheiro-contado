"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface CategorizationButtonProps {
  count: number;
}

export function CategorizationButton({ count }: CategorizationButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [result, setResult] = useState<{
    categorized: number;
    byCategory: Record<string, number>;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCategorize = async () => {
    setShowConfirm(false);
    setIsLoading(true);
    setResult(null);
    setError(null);

    try {
      const response = await fetch("/api/transactions/categorize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dryRun: false, minConfidence: "low" }),
      });

      if (!response.ok) {
        throw new Error("Failed to categorize");
      }

      const data = await response.json();
      setResult({
        categorized: data.results.categorized,
        byCategory: data.results.byCategory,
      });

      // Refresh the page after a short delay
      setTimeout(() => {
        router.refresh();
      }, 2000);
    } catch (err) {
      console.error("Categorization error:", err);
      setError("Erro ao categorizar transacoes");
    } finally {
      setIsLoading(false);
    }
  };

  if (result) {
    return (
      <div className="text-sm text-green-700 font-medium">
        ✓ {result.categorized} categorizadas
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-red-600">{error}</span>
        <button
          onClick={() => setShowConfirm(true)}
          className="text-sm text-blue-600 hover:text-blue-700 underline"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  return (
    <>
      <button
        onClick={() => setShowConfirm(true)}
        disabled={isLoading}
        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
      >
        {isLoading ? "Categorizando..." : "Categorizar"}
      </button>

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md mx-4 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl">🏷️</span>
              <h3 className="text-lg font-semibold text-gray-900">
                Confirmar categorizacao
              </h3>
            </div>
            <p className="text-gray-600 mb-2">
              Esta acao ira categorizar automaticamente{" "}
              <span className="font-semibold text-gray-900">{count}</span>{" "}
              transacoes sem categoria usando regras de palavras-chave.
            </p>
            <p className="text-sm text-gray-500 mb-6">
              Voce pode editar categorias manualmente depois se necessario.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition text-sm font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={handleCategorize}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition text-sm font-medium"
              >
                Categorizar {count} transacoes
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
