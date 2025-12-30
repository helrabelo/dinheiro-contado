"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CategoryEditModal, CategoryEditData } from "@/components/dashboard/category-edit-modal";

interface CategoryDetailHeaderProps {
  category: {
    id: string;
    name: string;
    icon: string | null;
    color: string | null;
    isSystem: boolean;
  };
  totalCount: number;
  transactionCount: number;
}

export function CategoryDetailHeader({
  category,
  totalCount,
  transactionCount,
}: CategoryDetailHeaderProps) {
  const router = useRouter();
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  const handleSave = async (data: CategoryEditData) => {
    const response = await fetch(`/api/categories/${category.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: data.name,
        icon: data.icon,
        color: data.color,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Erro ao atualizar categoria");
    }

    router.refresh();
  };

  const handleDelete = async (categoryId: string) => {
    const response = await fetch(`/api/categories/${categoryId}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Erro ao excluir categoria");
    }

    router.push("/dashboard/categories");
  };

  const canEdit = !category.isSystem;
  const canDelete = !category.isSystem && transactionCount === 0;

  return (
    <>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/categories"
            className="p-2 hover:bg-gray-100 rounded-lg transition"
            title="Voltar"
          >
            <svg
              className="w-5 h-5 text-gray-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </Link>
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center text-2xl"
            style={{ backgroundColor: `${category.color || "#10b981"}20` }}
          >
            {category.icon || "🏷️"}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900">{category.name}</h1>
              {category.isSystem && (
                <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded">
                  Sistema
                </span>
              )}
            </div>
            <p className="text-gray-600">
              {totalCount.toLocaleString("pt-BR")} transacao(es)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Edit Button */}
          {canEdit && (
            <button
              onClick={() => setEditModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg transition"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
              Editar
            </button>
          )}

          {/* View Transactions Button */}
          <Link
            href={`/dashboard/transactions?categoryId=${category.id}`}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition"
          >
            Ver Transacoes
          </Link>

          {/* More Menu */}
          <div className="relative">
            <button
              onClick={() => setShowMoreMenu(!showMoreMenu)}
              className="p-2 border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg transition"
            >
              <svg
                className="w-5 h-5"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
              </svg>
            </button>

            {showMoreMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowMoreMenu(false)}
                />
                <div className="absolute right-0 top-12 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                  <Link
                    href={`/dashboard/categories?tab=categorize`}
                    className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                    onClick={() => setShowMoreMenu(false)}
                  >
                    Categorizar em lote
                  </Link>
                  {canDelete && (
                    <button
                      onClick={() => {
                        setShowMoreMenu(false);
                        if (confirm("Tem certeza que deseja excluir esta categoria?")) {
                          handleDelete(category.id);
                        }
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                    >
                      Excluir categoria
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      <CategoryEditModal
        isOpen={editModalOpen}
        category={{
          id: category.id,
          name: category.name,
          icon: category.icon,
          color: category.color,
          isSystem: category.isSystem,
          transactionCount: transactionCount,
        }}
        onClose={() => setEditModalOpen(false)}
        onSave={handleSave}
        onDelete={handleDelete}
      />
    </>
  );
}
