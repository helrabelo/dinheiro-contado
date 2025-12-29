"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface CategorizationButtonProps {
  count: number;
}

export function CategorizationButton({ count }: CategorizationButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{
    categorized: number;
    byCategory: Record<string, number>;
  } | null>(null);

  const handleCategorize = async () => {
    setIsLoading(true);
    setResult(null);

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
    } catch (error) {
      console.error("Categorization error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (result) {
    return (
      <div className="text-sm text-blue-700">
        <span className="font-medium text-green-700">
          {result.categorized} categorizadas
        </span>
      </div>
    );
  }

  return (
    <button
      onClick={handleCategorize}
      disabled={isLoading}
      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
    >
      {isLoading ? "Categorizando..." : "Categorizar"}
    </button>
  );
}
