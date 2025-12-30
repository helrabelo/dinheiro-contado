"use client";

import { useState, useEffect, useRef } from "react";

const PRESET_COLORS = [
  "#ef4444", // red
  "#f97316", // orange
  "#eab308", // yellow
  "#22c55e", // green
  "#14b8a6", // teal
  "#3b82f6", // blue
  "#8b5cf6", // purple
  "#ec4899", // pink
  "#6b7280", // gray
];

const PRESET_ICONS = [
  "🛒", "🍔", "🚗", "🏠", "💊", "🎬", "✈️", "👕", "📱", "💼",
  "🎓", "🏋️", "🎁", "💡", "🔧", "📦", "🎵", "📚", "🐕", "🌿",
  "💰", "🏦", "🎮", "☕", "🍺", "🍕", "🚌", "⛽", "🏥", "💇",
];

export interface CategoryEditData {
  id?: string;
  name: string;
  icon: string | null;
  color: string | null;
  isSystem?: boolean;
  transactionCount?: number;
}

interface CategoryEditModalProps {
  isOpen: boolean;
  category?: CategoryEditData | null;
  onClose: () => void;
  onSave: (category: CategoryEditData) => Promise<void>;
  onDelete?: (categoryId: string) => Promise<void>;
}

export function CategoryEditModal({
  isOpen,
  category,
  onClose,
  onSave,
  onDelete,
}: CategoryEditModalProps) {
  const [name, setName] = useState("");
  const [icon, setIcon] = useState<string | null>(null);
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  const isEditMode = !!category?.id;
  const canDelete = isEditMode && !category?.isSystem && (category?.transactionCount ?? 0) === 0;

  // Initialize form when category changes
  useEffect(() => {
    if (category) {
      setName(category.name);
      setIcon(category.icon);
      setColor(category.color || PRESET_COLORS[0]);
    } else {
      setName("");
      setIcon(null);
      setColor(PRESET_COLORS[0]);
    }
    setError("");
    setShowDeleteConfirm(false);
  }, [category, isOpen]);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        if (showDeleteConfirm) {
          setShowDeleteConfirm(false);
        } else {
          onClose();
        }
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose, showDeleteConfirm]);

  // Handle click outside
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setError("Nome da categoria e obrigatorio");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      await onSave({
        id: category?.id,
        name: name.trim(),
        icon,
        color,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar categoria");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!category?.id || !onDelete) return;

    setIsDeleting(true);
    setError("");

    try {
      await onDelete(category.id);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao excluir categoria");
      setShowDeleteConfirm(false);
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div
        ref={modalRef}
        className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            {isEditMode ? "Editar Categoria" : "Nova Categoria"}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Delete Confirmation */}
        {showDeleteConfirm ? (
          <div className="p-6 space-y-4">
            <div className="text-center">
              <div className="text-4xl mb-3">⚠️</div>
              <h3 className="text-lg font-medium text-gray-900">
                Excluir &ldquo;{category?.name}&rdquo;?
              </h3>
              <p className="text-gray-600 mt-2">
                Esta acao nao pode ser desfeita.
              </p>
            </div>
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition disabled:opacity-50"
              >
                {isDeleting ? "Excluindo..." : "Excluir"}
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-4 space-y-4">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nome *
              </label>
              <input
                ref={inputRef}
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Alimentacao, Transporte..."
                disabled={category?.isSystem}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
              {category?.isSystem && (
                <p className="text-xs text-gray-500 mt-1">
                  Categorias do sistema nao podem ser editadas
                </p>
              )}
            </div>

            {/* Icon selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Icone
              </label>
              <div className="flex flex-wrap gap-1.5">
                {PRESET_ICONS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setIcon(emoji)}
                    disabled={category?.isSystem}
                    className={`w-9 h-9 rounded-lg border-2 text-lg transition ${
                      icon === emoji
                        ? "border-emerald-500 bg-emerald-50"
                        : "border-gray-200 hover:border-gray-300"
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            {/* Color selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cor
              </label>
              <div className="flex gap-2">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    disabled={category?.isSystem}
                    className={`w-8 h-8 rounded-full border-2 transition ${
                      color === c ? "border-gray-900 scale-110" : "border-transparent"
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            {/* Preview */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Preview
              </label>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-lg"
                  style={{ backgroundColor: `${color}20` }}
                >
                  {icon || "🏷️"}
                </div>
                <span className="font-medium text-gray-900">
                  {name || "Nova Categoria"}
                </span>
                <div
                  className="w-4 h-4 rounded-full ml-auto"
                  style={{ backgroundColor: color }}
                />
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between pt-2">
              {/* Delete button (edit mode only) */}
              {isEditMode && onDelete && (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={!canDelete || isSubmitting}
                  className={`px-4 py-2 text-sm rounded-lg transition ${
                    canDelete
                      ? "text-red-600 hover:bg-red-50"
                      : "text-gray-400 cursor-not-allowed"
                  }`}
                  title={
                    !canDelete
                      ? category?.isSystem
                        ? "Categorias do sistema nao podem ser excluidas"
                        : "Categoria possui transacoes"
                      : ""
                  }
                >
                  Excluir
                </button>
              )}

              {/* Spacer when no delete button */}
              {(!isEditMode || !onDelete) && <div />}

              {/* Save/Cancel */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !name.trim() || category?.isSystem}
                  className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting
                    ? "Salvando..."
                    : isEditMode
                    ? "Salvar"
                    : "Criar"}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
