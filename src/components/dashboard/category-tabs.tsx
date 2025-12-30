"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

export type CategoryTabType = "manage" | "categorize";

interface CategoryTabsProps {
  activeTab: CategoryTabType;
  uncategorizedCount: number;
  onTabChange?: (tab: CategoryTabType) => void;
}

export function CategoryTabs({
  activeTab,
  uncategorizedCount,
  onTabChange,
}: CategoryTabsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleTabClick = useCallback(
    (tab: CategoryTabType) => {
      // Update URL with tab state
      const params = new URLSearchParams(searchParams.toString());
      if (tab === "manage") {
        params.delete("tab");
      } else {
        params.set("tab", tab);
      }
      const newUrl = params.toString()
        ? `/dashboard/categories?${params.toString()}`
        : "/dashboard/categories";
      router.push(newUrl, { scroll: false });

      onTabChange?.(tab);
    },
    [router, searchParams, onTabChange]
  );

  return (
    <div className="flex border-b border-gray-200">
      {/* Manage Tab */}
      <button
        onClick={() => handleTabClick("manage")}
        className={`flex-1 px-6 py-4 text-sm font-medium transition relative ${
          activeTab === "manage"
            ? "text-emerald-700"
            : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
        }`}
      >
        <span className="flex items-center justify-center gap-2">
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
            />
          </svg>
          Gerenciar
        </span>
        {activeTab === "manage" && (
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500" />
        )}
      </button>

      {/* Categorize Tab */}
      <button
        onClick={() => handleTabClick("categorize")}
        className={`flex-1 px-6 py-4 text-sm font-medium transition relative ${
          activeTab === "categorize"
            ? "text-emerald-700"
            : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
        }`}
      >
        <span className="flex items-center justify-center gap-2">
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
            />
          </svg>
          Categorizar
          {uncategorizedCount > 0 && (
            <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-medium bg-orange-100 text-orange-700 rounded-full">
              {uncategorizedCount > 999
                ? `${(uncategorizedCount / 1000).toFixed(1)}k`
                : uncategorizedCount.toLocaleString("pt-BR")}
            </span>
          )}
        </span>
        {activeTab === "categorize" && (
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500" />
        )}
      </button>
    </div>
  );
}
