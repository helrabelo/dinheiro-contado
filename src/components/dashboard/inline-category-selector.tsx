"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Category {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
}

interface InlineCategorySelectorProps {
  transactionId: string;
  currentCategory: Category | null;
  categories: Category[];
}

export function InlineCategorySelector({
  transactionId,
  currentCategory,
  categories,
}: InlineCategorySelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(
    currentCategory
  );
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setSearch("");
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filter categories by search
  const filteredCategories = categories.filter((cat) =>
    cat.name.toLowerCase().includes(search.toLowerCase())
  );

  async function handleSelectCategory(category: Category | null) {
    setIsLoading(true);

    try {
      const response = await fetch(`/api/transactions/${transactionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoryId: category?.id || null }),
      });

      if (!response.ok) {
        throw new Error("Failed to update category");
      }

      setSelectedCategory(category);
      setIsOpen(false);
      setSearch("");
      router.refresh();
    } catch (error) {
      console.error("Error updating category:", error);
      alert("Erro ao atualizar categoria");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Current category badge - clickable */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg transition w-full text-left ${
          isLoading
            ? "opacity-50 cursor-wait"
            : "hover:bg-gray-50 cursor-pointer"
        }`}
        style={{
          backgroundColor: selectedCategory?.color
            ? selectedCategory.color + "20"
            : "#f3f4f6",
        }}
      >
        <span className="text-xl">
          {selectedCategory?.icon || "📁"}
        </span>
        <span
          className="font-medium"
          style={{
            color: selectedCategory?.color || "#6b7280",
          }}
        >
          {selectedCategory?.name || "Sem categoria"}
        </span>
        <svg
          className={`w-4 h-4 ml-auto transition ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 mt-2 w-full min-w-[250px] bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden">
          {/* Search input */}
          <div className="p-2 border-b border-gray-100">
            <input
              type="text"
              placeholder="Buscar categoria..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              autoFocus
            />
          </div>

          {/* Category list */}
          <div className="max-h-[300px] overflow-y-auto">
            {/* Clear category option */}
            <button
              onClick={() => handleSelectCategory(null)}
              className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition text-left ${
                !selectedCategory ? "bg-emerald-50" : ""
              }`}
            >
              <span className="text-xl">🚫</span>
              <span className="text-gray-600">Sem categoria</span>
              {!selectedCategory && (
                <span className="ml-auto text-emerald-600">✓</span>
              )}
            </button>

            {filteredCategories.length === 0 && search && (
              <div className="px-4 py-3 text-sm text-gray-500 text-center">
                Nenhuma categoria encontrada
              </div>
            )}

            {filteredCategories.map((category) => (
              <button
                key={category.id}
                onClick={() => handleSelectCategory(category)}
                className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition text-left ${
                  selectedCategory?.id === category.id ? "bg-emerald-50" : ""
                }`}
              >
                <span
                  className="w-8 h-8 rounded-full flex items-center justify-center text-lg"
                  style={{
                    backgroundColor: category.color
                      ? category.color + "20"
                      : "#f3f4f6",
                  }}
                >
                  {category.icon || "📁"}
                </span>
                <span
                  className="font-medium"
                  style={{ color: category.color || "#374151" }}
                >
                  {category.name}
                </span>
                {selectedCategory?.id === category.id && (
                  <span className="ml-auto text-emerald-600">✓</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
