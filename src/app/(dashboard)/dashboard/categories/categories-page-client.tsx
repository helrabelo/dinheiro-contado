"use client";

import { useState } from "react";
import { CategoryTabs, CategoryTabType } from "@/components/dashboard/category-tabs";
import { CategoryManageTab } from "@/components/dashboard/category-manage-tab";
import { CategoryBulkTab } from "@/components/dashboard/category-bulk-tab";
import { CategoryCardData } from "@/components/dashboard/category-card";

interface Pattern {
  pattern: string;
  count: number;
  examples: string[];
}

interface CategoriesPageClientProps {
  categories: CategoryCardData[];
  uncategorizedCount: number;
  totalSpent: number;
  patterns: Pattern[];
  initialTab: CategoryTabType;
}

export function CategoriesPageClient({
  categories,
  uncategorizedCount,
  totalSpent,
  patterns,
  initialTab,
}: CategoriesPageClientProps) {
  const [activeTab, setActiveTab] = useState<CategoryTabType>(initialTab);

  // Transform categories for the bulk tab (just id, name, icon, color)
  const categoriesForBulk = categories.map((cat) => ({
    id: cat.id,
    name: cat.name,
    icon: cat.icon,
    color: cat.color,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Categorias</h1>
          <p className="text-gray-600">
            Organize e categorize suas transacoes
          </p>
        </div>
      </div>

      {/* Stats Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-lg">
              📊
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{categories.length}</p>
              <p className="text-sm text-gray-600">Categorias</p>
            </div>
          </div>
        </div>

        <div
          className={`rounded-xl p-4 border ${
            uncategorizedCount > 0
              ? "bg-orange-50 border-orange-200"
              : "bg-green-50 border-green-200"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${
                  uncategorizedCount > 0 ? "bg-orange-100" : "bg-green-100"
                }`}
              >
                {uncategorizedCount > 0 ? "⚠️" : "✓"}
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {uncategorizedCount.toLocaleString("pt-BR")}
                </p>
                <p className="text-sm text-gray-600">Sem categoria</p>
              </div>
            </div>
            {uncategorizedCount > 0 && activeTab !== "categorize" && (
              <button
                onClick={() => setActiveTab("categorize")}
                className="px-3 py-1.5 text-sm font-medium text-orange-700 hover:bg-orange-100 rounded-lg transition"
              >
                Categorizar →
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs Container */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <CategoryTabs
          activeTab={activeTab}
          uncategorizedCount={uncategorizedCount}
          onTabChange={setActiveTab}
        />

        {/* Tab Content */}
        {activeTab === "manage" && (
          <CategoryManageTab
            categories={categories}
            totalSpent={totalSpent}
          />
        )}

        {activeTab === "categorize" && (
          <CategoryBulkTab
            initialCategories={categoriesForBulk}
            initialPatterns={patterns}
            initialUncategorizedCount={uncategorizedCount}
          />
        )}
      </div>
    </div>
  );
}
