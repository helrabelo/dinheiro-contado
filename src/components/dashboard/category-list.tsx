"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface Category {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
  isSystem: boolean;
  _count: {
    transactions: number;
  };
}

interface CategoryListProps {
  categories: Category[];
  editable?: boolean;
}

export function CategoryList({ categories, editable = false }: CategoryListProps) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!confirm("Tem certeza que deseja excluir esta categoria?")) {
      return;
    }

    setDeletingId(id);
    try {
      const response = await fetch(`/api/categories/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        alert(data.error || "Erro ao excluir categoria");
        return;
      }

      router.refresh();
    } catch {
      alert("Erro ao excluir categoria");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="divide-y divide-gray-100">
      {categories.map((category) => (
        <Link
          key={category.id}
          href={`/dashboard/categories/${category.id}`}
          className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition"
        >
          <div className="flex items-center gap-4">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-lg"
              style={{
                backgroundColor: category.color
                  ? `${category.color}20`
                  : "#f3f4f6",
              }}
            >
              {category.icon || "🏷️"}
            </div>
            <div>
              <p className="font-medium text-gray-900">{category.name}</p>
              <p className="text-sm text-gray-500">
                {category._count.transactions} transacao(es)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {category.color && (
              <div
                className="w-6 h-6 rounded-full border border-gray-200"
                style={{ backgroundColor: category.color }}
                title={category.color}
              />
            )}
            <span className="text-gray-400 mr-2">→</span>
            {editable && (
              <button
                onClick={(e) => handleDelete(category.id, e)}
                disabled={deletingId === category.id || category._count.transactions > 0}
                className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                title={
                  category._count.transactions > 0
                    ? "Nao e possivel excluir categoria com transacoes"
                    : "Excluir categoria"
                }
              >
                {deletingId === category.id ? "..." : "Excluir"}
              </button>
            )}
          </div>
        </Link>
      ))}
    </div>
  );
}
