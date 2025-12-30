"use client";

import Link from "next/link";
import { useState, useRef, useEffect } from "react";

export interface CategoryCardData {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
  isSystem: boolean;
  _count: {
    transactions: number;
  };
  totalSpent?: number;
  percentOfTotal?: number;
}

interface CategoryCardProps {
  category: CategoryCardData;
  editable?: boolean;
  onEdit?: (category: CategoryCardData) => void;
  onDelete?: (category: CategoryCardData) => void;
}

export function CategoryCard({
  category,
  editable = false,
  onEdit,
  onDelete,
}: CategoryCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };

    if (showMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showMenu]);

  const handleMenuClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowMenu(!showMenu);
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowMenu(false);
    onEdit?.(category);
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowMenu(false);

    if (category._count.transactions > 0) {
      alert("Nao e possivel excluir categoria com transacoes");
      return;
    }

    if (!confirm("Tem certeza que deseja excluir esta categoria?")) {
      return;
    }

    setDeleting(true);
    onDelete?.(category);
  };

  const formatCurrency = (value: number) => {
    return `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
  };

  const canDelete = editable && category._count.transactions === 0;

  return (
    <Link
      href={`/dashboard/categories/${category.id}`}
      className={`group relative block bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md hover:border-gray-300 transition ${
        deleting ? "opacity-50 pointer-events-none" : ""
      }`}
    >
      {/* Header: Icon + Name + Menu */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-lg shrink-0"
            style={{
              backgroundColor: category.color
                ? `${category.color}20`
                : "#f3f4f6",
            }}
          >
            {category.icon || "🏷️"}
          </div>
          <div className="min-w-0">
            <h3 className="font-medium text-gray-900 truncate">
              {category.name}
            </h3>
            {category.isSystem && (
              <span className="text-xs text-gray-400">Sistema</span>
            )}
          </div>
        </div>

        {/* Actions Menu */}
        {editable && (
          <div className="relative" ref={menuRef}>
            <button
              onClick={handleMenuClick}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 opacity-0 group-hover:opacity-100 transition"
              aria-label="Acoes"
            >
              <svg
                className="w-5 h-5"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
              </svg>
            </button>

            {/* Dropdown Menu */}
            {showMenu && (
              <div className="absolute right-0 top-8 w-36 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                <button
                  onClick={handleEdit}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                >
                  Editar
                </button>
                <button
                  onClick={handleDelete}
                  disabled={!canDelete}
                  className={`w-full px-4 py-2 text-left text-sm ${
                    canDelete
                      ? "text-red-600 hover:bg-red-50"
                      : "text-gray-400 cursor-not-allowed"
                  }`}
                  title={
                    !canDelete
                      ? "Nao e possivel excluir categoria com transacoes"
                      : ""
                  }
                >
                  Excluir
                </button>
              </div>
            )}
          </div>
        )}

        {/* Color indicator for non-editable */}
        {!editable && category.color && (
          <div
            className="w-3 h-3 rounded-full shrink-0"
            style={{ backgroundColor: category.color }}
          />
        )}
      </div>

      {/* Divider */}
      <div
        className="h-0.5 my-3 rounded-full"
        style={{
          backgroundColor: category.color
            ? `${category.color}30`
            : "#e5e7eb",
        }}
      />

      {/* Stats */}
      <div className="space-y-1">
        <p className="text-sm text-gray-600">
          {category._count.transactions.toLocaleString("pt-BR")} transacao(es)
        </p>
        {category.totalSpent !== undefined && (
          <p className="text-sm font-medium text-gray-900">
            {formatCurrency(category.totalSpent)}
          </p>
        )}
      </div>

      {/* Progress Bar */}
      {category.percentOfTotal !== undefined && category.percentOfTotal > 0 && (
        <div className="mt-3">
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${Math.min(category.percentOfTotal, 100)}%`,
                backgroundColor: category.color || "#10b981",
              }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {category.percentOfTotal.toFixed(1)}% do total
          </p>
        </div>
      )}

      {/* Hover arrow indicator */}
      <div className="absolute right-4 bottom-4 text-gray-300 group-hover:text-gray-400 transition">
        →
      </div>
    </Link>
  );
}
