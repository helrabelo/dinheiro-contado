"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";

interface Pattern {
  pattern: string;
  count: number;
  examples: string[];
}

interface Category {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
}

interface PreviewMatch {
  id: string;
  description: string;
  amount: number;
  date: string;
  currentCategory: string | null;
}

interface PreviewData {
  searchTerm: string;
  categoryId: string;
  categoryName: string;
  matchCount: number;
  totalAmount: number;
  hasMore: boolean;
}

type TabType = "search" | "patterns";

const PAGE_SIZE = 50;

export default function BatchCategorizationPage() {
  const [activeTab, setActiveTab] = useState<TabType>("search");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalUncategorized, setTotalUncategorized] = useState(0);
  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [includeAll, setIncludeAll] = useState(true); // Include already categorized

  // Selection state (for patterns tab)
  const [selectedPattern, setSelectedPattern] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Preview state
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [previewMatches, setPreviewMatches] = useState<PreviewMatch[]>([]);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // Apply state
  const [applying, setApplying] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Scroll ref for infinite scroll
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Fetch patterns on mount
  useEffect(() => {
    const fetchPatterns = async () => {
      try {
        const response = await fetch("/api/transactions/batch-categorize");
        if (!response.ok) throw new Error("Failed to fetch patterns");
        const data = await response.json();
        setTotalUncategorized(data.totalUncategorized);
        setPatterns(data.patterns);
        setCategories(data.categories);
      } catch (err) {
        setError("Erro ao carregar dados");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchPatterns();
  }, []);

  // Handle search preview
  const handleSearchPreview = async () => {
    if (!searchQuery.trim() || !selectedCategory) return;

    setLoadingPreview(true);
    setPreview(null);
    setPreviewMatches([]);
    setError(null);

    try {
      const response = await fetch("/api/transactions/batch-categorize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          search: searchQuery.trim(),
          categoryId: selectedCategory,
          preview: true,
          includeAll,
          offset: 0,
          limit: PAGE_SIZE,
        }),
      });

      if (!response.ok) throw new Error("Failed to fetch preview");
      const data = await response.json();
      setPreview({
        searchTerm: data.searchTerm,
        categoryId: data.categoryId,
        categoryName: data.categoryName,
        matchCount: data.matchCount,
        totalAmount: data.totalAmount,
        hasMore: data.hasMore,
      });
      setPreviewMatches(data.matches);
    } catch (err) {
      setError("Erro ao buscar transacoes");
      console.error(err);
    } finally {
      setLoadingPreview(false);
    }
  };

  // Handle pattern preview
  const handlePatternPreview = async () => {
    if (!selectedPattern || !selectedCategory) return;

    setLoadingPreview(true);
    setPreview(null);
    setPreviewMatches([]);
    setError(null);

    try {
      const response = await fetch("/api/transactions/batch-categorize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pattern: selectedPattern,
          categoryId: selectedCategory,
          preview: true,
          includeAll: false,
          offset: 0,
          limit: PAGE_SIZE,
        }),
      });

      if (!response.ok) throw new Error("Failed to fetch preview");
      const data = await response.json();
      setPreview({
        searchTerm: data.searchTerm,
        categoryId: data.categoryId,
        categoryName: data.categoryName,
        matchCount: data.matchCount,
        totalAmount: data.totalAmount,
        hasMore: data.hasMore,
      });
      setPreviewMatches(data.matches);
    } catch (err) {
      setError("Erro ao visualizar transacoes");
      console.error(err);
    } finally {
      setLoadingPreview(false);
    }
  };

  // Load more matches
  const loadMoreMatches = useCallback(async () => {
    if (!preview || !preview.hasMore || loadingMore) return;

    setLoadingMore(true);

    try {
      const isSearch = activeTab === "search";
      const response = await fetch("/api/transactions/batch-categorize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(isSearch
            ? { search: preview.searchTerm }
            : { pattern: preview.searchTerm }),
          categoryId: preview.categoryId,
          preview: true,
          includeAll: isSearch ? includeAll : false,
          offset: previewMatches.length,
          limit: PAGE_SIZE,
        }),
      });

      if (!response.ok) throw new Error("Failed to load more");
      const data = await response.json();

      setPreviewMatches((prev) => [...prev, ...data.matches]);
      setPreview((prev) => prev ? { ...prev, hasMore: data.hasMore } : null);
    } catch (err) {
      console.error("Error loading more:", err);
    } finally {
      setLoadingMore(false);
    }
  }, [preview, previewMatches.length, loadingMore, activeTab, includeAll]);

  // Handle scroll for infinite loading
  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container || !preview?.hasMore || loadingMore) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    // Load more when within 100px of bottom
    if (scrollHeight - scrollTop - clientHeight < 100) {
      loadMoreMatches();
    }
  }, [preview?.hasMore, loadingMore, loadMoreMatches]);

  // Apply categorization
  const handleApply = async () => {
    if (!preview) return;

    setApplying(true);
    setError(null);

    try {
      const isSearch = activeTab === "search";
      const response = await fetch("/api/transactions/batch-categorize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(isSearch
            ? { search: preview.searchTerm }
            : { pattern: preview.searchTerm }),
          categoryId: preview.categoryId,
          preview: false,
          includeAll: isSearch ? includeAll : false,
        }),
      });

      if (!response.ok) throw new Error("Failed to apply categorization");
      const data = await response.json();

      setSuccessMessage(
        `${data.updatedCount} transacoes categorizadas como "${data.categoryName}"`
      );

      // Reset
      setPreview(null);
      setPreviewMatches([]);
      setSelectedPattern(null);
      setSearchQuery("");

      // Refresh patterns
      const refreshResponse = await fetch("/api/transactions/batch-categorize");
      if (refreshResponse.ok) {
        const refreshData = await refreshResponse.json();
        setTotalUncategorized(refreshData.totalUncategorized);
        setPatterns(refreshData.patterns);
      }
    } catch (err) {
      setError("Erro ao aplicar categorizacao");
      console.error(err);
    } finally {
      setApplying(false);
    }
  };

  const formatCurrency = (value: number) => {
    return `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/categories" className="text-gray-400 hover:text-gray-600">
            ← Voltar
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Categorizacao em Lote</h1>
        </div>
        <div className="bg-white rounded-xl p-8 border border-gray-200">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-gray-200 rounded w-1/3"></div>
            <div className="h-40 bg-gray-100 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/categories" className="text-gray-400 hover:text-gray-600">
            ← Voltar
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Categorizacao em Lote</h1>
            <p className="text-gray-600">
              {totalUncategorized.toLocaleString("pt-BR")} transacoes sem categoria
            </p>
          </div>
        </div>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">✓</span>
            <span className="text-green-800">{successMessage}</span>
          </div>
          <button
            onClick={() => setSuccessMessage(null)}
            className="text-green-600 hover:text-green-800 text-xl"
          >
            ×
          </button>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Tab Switcher */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => {
              setActiveTab("search");
              setPreview(null);
            }}
            className={`flex-1 px-6 py-4 text-sm font-medium transition ${
              activeTab === "search"
                ? "bg-emerald-50 text-emerald-700 border-b-2 border-emerald-500"
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            🔍 Buscar e Recategorizar
          </button>
          <button
            onClick={() => {
              setActiveTab("patterns");
              setPreview(null);
            }}
            className={`flex-1 px-6 py-4 text-sm font-medium transition ${
              activeTab === "patterns"
                ? "bg-emerald-50 text-emerald-700 border-b-2 border-emerald-500"
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            🏷️ Padroes Detectados
          </button>
        </div>

        {/* Search Tab */}
        {activeTab === "search" && (
          <div className="p-6 space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Buscar transacoes contendo:
              </label>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && selectedCategory && handleSearchPreview()}
                  placeholder="Ex: IFD, UBER, MERCADO, etc."
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-lg"
                  autoFocus
                />
              </div>
              <div className="mt-2">
                <label className="flex items-center gap-2 text-sm text-gray-600">
                  <input
                    type="checkbox"
                    checked={includeAll}
                    onChange={(e) => setIncludeAll(e.target.checked)}
                    className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  Incluir transacoes ja categorizadas (recategorizar)
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nova categoria:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`p-3 rounded-lg border text-left transition ${
                      selectedCategory === cat.id
                        ? "bg-emerald-50 border-emerald-500 ring-2 ring-emerald-200"
                        : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{cat.icon || "📁"}</span>
                      <span className="text-sm font-medium text-gray-900 truncate">
                        {cat.name}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleSearchPreview}
              disabled={!searchQuery.trim() || !selectedCategory || loadingPreview}
              className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loadingPreview ? "Buscando..." : "Buscar Transacoes"}
            </button>
          </div>
        )}

        {/* Patterns Tab */}
        {activeTab === "patterns" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-gray-200">
            {/* Pattern List */}
            <div>
              <div className="p-4 bg-gray-50 border-b border-gray-200">
                <h3 className="font-medium text-gray-900">Padroes detectados</h3>
                <p className="text-sm text-gray-600">
                  Em transacoes sem categoria
                </p>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {patterns.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    <span className="text-4xl">🎉</span>
                    <p className="mt-2">Nenhum padrao detectado!</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {patterns.map((p) => (
                      <button
                        key={p.pattern}
                        onClick={() => setSelectedPattern(p.pattern)}
                        className={`w-full p-4 text-left transition ${
                          selectedPattern === p.pattern
                            ? "bg-emerald-50 border-l-4 border-emerald-500"
                            : "hover:bg-gray-50"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-sm font-medium text-gray-900">
                            {p.pattern}
                          </span>
                          <span className="text-sm text-gray-500">
                            {p.count} tx
                          </span>
                        </div>
                        <div className="mt-1 text-xs text-gray-500 truncate">
                          {p.examples[0]}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Category Selection */}
            <div>
              <div className="p-4 bg-gray-50 border-b border-gray-200">
                <h3 className="font-medium text-gray-900">Categoria destino</h3>
              </div>
              <div className="max-h-64 overflow-y-auto p-4">
                <div className="grid grid-cols-2 gap-2">
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`p-3 rounded-lg border text-left transition ${
                        selectedCategory === cat.id
                          ? "bg-emerald-50 border-emerald-500 ring-2 ring-emerald-200"
                          : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span>{cat.icon || "📁"}</span>
                        <span className="text-sm font-medium text-gray-900 truncate">
                          {cat.name}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
              <div className="p-4 border-t border-gray-200">
                <button
                  onClick={handlePatternPreview}
                  disabled={!selectedPattern || !selectedCategory || loadingPreview}
                  className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loadingPreview ? "Carregando..." : "Visualizar"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Preview Section */}
      {preview && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-200 bg-blue-50">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-blue-900">
                  {preview.matchCount} transacoes encontradas
                </h2>
                <p className="text-sm text-blue-700 mt-1">
                  &ldquo;{preview.searchTerm}&rdquo; → {preview.categoryName}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-blue-700">Total</p>
                <p className="text-lg font-bold text-blue-900">
                  {formatCurrency(preview.totalAmount)}
                </p>
              </div>
            </div>
          </div>

          {/* Preview List with Infinite Scroll */}
          <div
            ref={scrollContainerRef}
            onScroll={handleScroll}
            className="max-h-96 overflow-y-auto"
          >
            <table className="w-full">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                    Data
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                    Descricao
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                    Atual
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">
                    Valor
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {previewMatches.map((tx) => (
                  <tr key={tx.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-sm text-gray-500 whitespace-nowrap">
                      {new Date(tx.date).toLocaleDateString("pt-BR")}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-900 truncate max-w-xs">
                      {tx.description}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-500">
                      {tx.currentCategory ? (
                        <span className="px-2 py-0.5 bg-gray-100 rounded text-xs">
                          {tx.currentCategory}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-900 text-right whitespace-nowrap">
                      {formatCurrency(tx.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Loading More Indicator */}
            {loadingMore && (
              <div className="p-4 text-center">
                <div className="inline-block animate-spin rounded-full h-5 w-5 border-2 border-gray-300 border-t-emerald-600"></div>
                <span className="ml-2 text-sm text-gray-500">Carregando mais...</span>
              </div>
            )}

            {/* Progress indicator */}
            {!loadingMore && previewMatches.length < preview.matchCount && (
              <div className="p-3 text-center text-sm text-gray-500 bg-gray-50">
                Mostrando {previewMatches.length} de {preview.matchCount} • Role para carregar mais
              </div>
            )}

            {/* All loaded indicator */}
            {!preview.hasMore && previewMatches.length > 0 && (
              <div className="p-3 text-center text-sm text-gray-500 bg-gray-50">
                Todas as {preview.matchCount} transacoes carregadas
              </div>
            )}
          </div>

          {/* Apply Button */}
          <div className="p-4 border-t border-gray-200 flex justify-end gap-3">
            <button
              onClick={() => {
                setPreview(null);
                setPreviewMatches([]);
              }}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
            >
              Cancelar
            </button>
            <button
              onClick={handleApply}
              disabled={applying || preview.matchCount === 0}
              className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition disabled:opacity-50"
            >
              {applying
                ? "Aplicando..."
                : `Categorizar ${preview.matchCount} transacoes`}
            </button>
          </div>
        </div>
      )}

      {/* Tips */}
      <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
        <h3 className="font-medium text-gray-900 mb-2">Dicas</h3>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• Busque por <strong>IFD</strong> para encontrar transacoes do iFood</li>
          <li>• Busque por <strong>UBER</strong> para corridas e Uber Eats</li>
          <li>• Marque &ldquo;Incluir ja categorizadas&rdquo; para mover transacoes de uma categoria para outra</li>
          <li>• Use a aba Padroes para ver sugestoes automaticas</li>
        </ul>
      </div>
    </div>
  );
}
