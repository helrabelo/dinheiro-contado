"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface RetryButtonProps {
  statementId: string;
  className?: string;
}

export function RetryButton({ statementId, className = "" }: RetryButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleRetry = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/statements/${statementId}/retry`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Erro ao reprocessar");
        return;
      }

      // Refresh the page to show updated status
      router.refresh();
    } catch (err) {
      setError("Erro de conexao");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="inline-flex items-center gap-2">
      <button
        onClick={handleRetry}
        disabled={loading}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition ${
          loading
            ? "bg-gray-100 text-gray-400 cursor-not-allowed"
            : "bg-amber-100 text-amber-700 hover:bg-amber-200"
        } ${className}`}
      >
        {loading ? (
          <>
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            Reprocessando...
          </>
        ) : (
          <>
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Tentar Novamente
          </>
        )}
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
