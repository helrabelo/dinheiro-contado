"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

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
];

export function CategoryForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("");
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setError("Nome da categoria e obrigatorio");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), icon, color }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Erro ao criar categoria");
      }

      setName("");
      setIcon("");
      setColor(PRESET_COLORS[0]);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar categoria");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Nome *
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex: Alimentacao, Transporte..."
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
        />
      </div>

      {/* Icon selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Icone
        </label>
        <div className="flex flex-wrap gap-2">
          {PRESET_ICONS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => setIcon(emoji)}
              className={`w-10 h-10 rounded-lg border-2 text-lg transition ${
                icon === emoji
                  ? "border-emerald-500 bg-emerald-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
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
              className={`w-8 h-8 rounded-full border-2 transition ${
                color === c ? "border-gray-900 scale-110" : "border-transparent"
              }`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </div>

      {/* Preview */}
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
      </div>

      {/* Error */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={isSubmitting || !name.trim()}
        className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting ? "Criando..." : "Criar Categoria"}
      </button>
    </form>
  );
}
