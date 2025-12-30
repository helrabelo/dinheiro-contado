"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { CategoryCard, CategoryCardData } from "./category-card";
import { CategoryEditModal, CategoryEditData } from "./category-edit-modal";

type SortOption = "name-asc" | "name-desc" | "transactions" | "spent";

interface CategoryManageTabProps {
  categories: CategoryCardData[];
  totalSpent?: number;
}

export function CategoryManageTab({
  categories,
  totalSpent = 0,
}: CategoryManageTabProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("name-asc");
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryEditData | null>(null);

  // Calculate percent of total for each category
  const categoriesWithPercent = useMemo(() => {
    return categories.map((cat) => ({
      ...cat,
      percentOfTotal:
        totalSpent > 0 && cat.totalSpent
          ? (cat.totalSpent / totalSpent) * 100
          : undefined,
    }));
  }, [categories, totalSpent]);

  // Filter and sort categories
  const filteredCategories = useMemo(() => {
    let result = [...categoriesWithPercent];

    // Filter by search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (cat) =>
          cat.name.toLowerCase().includes(query) ||
          cat.icon?.includes(query)
      );
    }

    // Sort
    switch (sortBy) {
      case "name-asc":
        result.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
        break;
      case "name-desc":
        result.sort((a, b) => b.name.localeCompare(a.name, "pt-BR"));
        break;
      case "transactions":
        result.sort((a, b) => b._count.transactions - a._count.transactions);
        break;
      case "spent":
        result.sort((a, b) => (b.totalSpent ?? 0) - (a.totalSpent ?? 0));
        break;
    }

    // Always put system categories at the end
    result.sort((a, b) => {
      if (a.isSystem && !b.isSystem) return 1;
      if (!a.isSystem && b.isSystem) return -1;
      return 0;
    });

    return result;
  }, [categoriesWithPercent, searchQuery, sortBy]);

  // Separate user and system categories
  const userCategories = filteredCategories.filter((c) => !c.isSystem);
  const systemCategories = filteredCategories.filter((c) => c.isSystem);

  // Handle opening edit modal for new category
  const handleCreateNew = () => {
    setEditingCategory(null);
    setEditModalOpen(true);
  };

  // Handle opening edit modal for existing category
  const handleEdit = (category: CategoryCardData) => {
    setEditingCategory({
      id: category.id,
      name: category.name,
      icon: category.icon,
      color: category.color,
      isSystem: category.isSystem,
      transactionCount: category._count.transactions,
    });
    setEditModalOpen(true);
  };

  // Handle save (create or update)
  const handleSave = async (data: CategoryEditData) => {
    const url = data.id ? `/api/categories/${data.id}` : "/api/categories";
    const method = data.id ? "PUT" : "POST";

    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: data.name,
        icon: data.icon,
        color: data.color,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Erro ao salvar categoria");
    }

    router.refresh();
  };

  // Handle delete
  const handleDelete = async (categoryId: string) => {
    const response = await fetch(`/api/categories/${categoryId}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Erro ao excluir categoria");
    }

    router.refresh();
  };

  // Handle delete from card
  const handleDeleteFromCard = async (category: CategoryCardData) => {
    await handleDelete(category.id);
  };

  return (
    <div className="p-4 space-y-4">
      {/* Search and Sort Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="flex-1 relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar categoria..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Sort */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortOption)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition bg-white"
        >
          <option value="name-asc">Nome A-Z</option>
          <option value="name-desc">Nome Z-A</option>
          <option value="transactions">Mais transacoes</option>
          <option value="spent">Mais gastos</option>
        </select>

        {/* Add Button */}
        <button
          onClick={handleCreateNew}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition whitespace-nowrap"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          Nova
        </button>
      </div>

      {/* Results count */}
      <div className="text-sm text-gray-500">
        {filteredCategories.length === categories.length ? (
          <span>{categories.length} categoria(s)</span>
        ) : (
          <span>
            {filteredCategories.length} de {categories.length} categoria(s)
          </span>
        )}
      </div>

      {/* User Categories Grid */}
      {userCategories.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
            <span>Suas Categorias</span>
            <span className="text-gray-400">({userCategories.length})</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {userCategories.map((category) => (
              <CategoryCard
                key={category.id}
                category={category}
                editable
                onEdit={handleEdit}
                onDelete={handleDeleteFromCard}
              />
            ))}
          </div>
        </div>
      )}

      {/* System Categories Grid */}
      {systemCategories.length > 0 && (
        <div className={userCategories.length > 0 ? "mt-8" : ""}>
          <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
            <span>Categorias do Sistema</span>
            <span className="text-gray-400">({systemCategories.length})</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {systemCategories.map((category) => (
              <CategoryCard
                key={category.id}
                category={category}
                editable={false}
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {filteredCategories.length === 0 && (
        <div className="text-center py-12">
          {searchQuery ? (
            <>
              <span className="text-4xl">🔍</span>
              <p className="mt-2 text-gray-600">
                Nenhuma categoria encontrada para &ldquo;{searchQuery}&rdquo;
              </p>
              <button
                onClick={() => setSearchQuery("")}
                className="mt-2 text-emerald-600 hover:text-emerald-700"
              >
                Limpar busca
              </button>
            </>
          ) : (
            <>
              <span className="text-4xl">🏷️</span>
              <p className="mt-2 text-gray-600">
                Nenhuma categoria criada ainda.
              </p>
              <button
                onClick={handleCreateNew}
                className="mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition"
              >
                Criar primeira categoria
              </button>
            </>
          )}
        </div>
      )}

      {/* Edit Modal */}
      <CategoryEditModal
        isOpen={editModalOpen}
        category={editingCategory}
        onClose={() => setEditModalOpen(false)}
        onSave={handleSave}
        onDelete={handleDelete}
      />
    </div>
  );
}
