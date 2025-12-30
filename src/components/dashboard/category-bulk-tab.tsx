"use client";

import { useState, useEffect, useCallback, useRef } from "react";

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

const PAGE_SIZE = 50;

interface CategoryBulkTabProps {
  initialCategories?: Category[];
  initialPatterns?: Pattern[];
  initialUncategorizedCount?: number;
}

export function CategoryBulkTab({
  initialCategories = [],
  initialPatterns = [],
  initialUncategorizedCount = 0,
}: CategoryBulkTabProps) {
  // Data state
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [patterns, setPatterns] = useState<Pattern[]>(initialPatterns);
  const [totalUncategorized, setTotalUncategorized] = useState(initialUncategorizedCount);
  const [loading, setLoading] = useState(!initialCategories.length);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [includeAll, setIncludeAll] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Preview state
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [previewMatches, setPreviewMatches] = useState<PreviewMatch[]>([]);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // Apply state
  const [applying, setApplying] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Refs
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Fetch patterns and categories on mount if not provided
  useEffect(() => {
    if (initialCategories.length && initialPatterns.length) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        const response = await fetch("/api/transactions/batch-categorize");
        if (!response.ok) throw new Error("Failed to fetch data");
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

    fetchData();
  }, [initialCategories.length, initialPatterns.length]);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch preview when debounced query changes (category not required for preview)
  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setPreview(null);
      setPreviewMatches([]);
      return;
    }

    const fetchPreview = async () => {
      setLoadingPreview(true);
      setError(null);

      try {
        const response = await fetch("/api/transactions/batch-categorize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            search: debouncedQuery.trim(),
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
        console.error(err);
        setError("Erro ao buscar transacoes");
      } finally {
        setLoadingPreview(false);
      }
    };

    fetchPreview();
  }, [debouncedQuery, includeAll]);

  // Load more matches
  const loadMoreMatches = useCallback(async () => {
    if (!preview || !preview.hasMore || loadingMore) return;

    setLoadingMore(true);

    try {
      const response = await fetch("/api/transactions/batch-categorize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          search: preview.searchTerm,
          categoryId: preview.categoryId,
          preview: true,
          includeAll,
          offset: previewMatches.length,
          limit: PAGE_SIZE,
        }),
      });

      if (!response.ok) throw new Error("Failed to load more");
      const data = await response.json();

      setPreviewMatches((prev) => [...prev, ...data.matches]);
      setPreview((prev) => (prev ? { ...prev, hasMore: data.hasMore } : null));
    } catch (err) {
      console.error("Error loading more:", err);
    } finally {
      setLoadingMore(false);
    }
  }, [preview, previewMatches.length, loadingMore, includeAll]);

  // Handle scroll for infinite loading
  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container || !preview?.hasMore || loadingMore) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    if (scrollHeight - scrollTop - clientHeight < 100) {
      loadMoreMatches();
    }
  }, [preview?.hasMore, loadingMore, loadMoreMatches]);

  // Handle pattern chip click
  const handlePatternClick = (pattern: string) => {
    setSearchQuery(pattern);
    searchInputRef.current?.focus();
  };

  // Apply categorization
  const handleApply = async () => {
    if (!preview || !selectedCategory) return;

    setApplying(true);
    setError(null);

    try {
      const response = await fetch("/api/transactions/batch-categorize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          search: preview.searchTerm,
          categoryId: selectedCategory,
          preview: false,
          includeAll,
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
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-10 bg-gray-200 rounded w-full"></div>
          <div className="h-20 bg-gray-100 rounded"></div>
          <div className="h-40 bg-gray-100 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
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
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center justify-between">
          <span className="text-red-700">{error}</span>
          <button
            onClick={() => setError(null)}
            className="text-red-600 hover:text-red-800 text-xl"
          >
            ×
          </button>
        </div>
      )}

      {/* Search Input */}
      <div>
        <div className="relative">
          <svg
            className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
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
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar transacoes por descricao..."
            className="w-full pl-12 pr-4 py-3 text-lg border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        <div className="mt-2 flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={includeAll}
              onChange={(e) => setIncludeAll(e.target.checked)}
              className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
            />
            Incluir ja categorizadas
          </label>
          <span className="text-sm text-gray-500">
            {totalUncategorized.toLocaleString("pt-BR")} sem categoria
          </span>
        </div>
      </div>

      {/* Pattern Chips */}
      {patterns.length > 0 && (
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">
            Padroes detectados:
          </p>
          <div className="flex flex-wrap gap-2">
            {patterns.slice(0, 12).map((p) => (
              <button
                key={p.pattern}
                onClick={() => handlePatternClick(p.pattern)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition ${
                  searchQuery === p.pattern
                    ? "bg-emerald-100 text-emerald-700 ring-2 ring-emerald-500"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                <span className="font-mono">{p.pattern}</span>
                <span className="text-xs opacity-70">{p.count}</span>
              </button>
            ))}
            {patterns.length > 12 && (
              <span className="px-3 py-1.5 text-sm text-gray-500">
                +{patterns.length - 12} mais
              </span>
            )}
          </div>
        </div>
      )}

      {/* Category Selector */}
      <div>
        <p className="text-sm font-medium text-gray-700 mb-2">
          Categorizar como:
        </p>
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

      {/* Preview Section */}
      {loadingPreview && (
        <div className="bg-gray-50 rounded-xl p-8 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-gray-300 border-t-emerald-600"></div>
          <p className="mt-2 text-gray-600">Buscando transacoes...</p>
        </div>
      )}

      {preview && !loadingPreview && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {/* Preview Header */}
          <div className="p-4 border-b border-gray-200 bg-blue-50">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-blue-900">
                  {preview.matchCount.toLocaleString("pt-BR")} transacao(es) encontrada(s)
                </h2>
                <p className="text-sm text-blue-700 mt-1">
                  Buscando por &ldquo;{preview.searchTerm}&rdquo;
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

          {/* Preview Table */}
          {previewMatches.length > 0 && (
            <div
              ref={scrollContainerRef}
              onScroll={handleScroll}
              className="max-h-80 overflow-y-auto"
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

              {/* Loading More */}
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
            </div>
          )}

          {/* Apply Button */}
          <div className="p-4 border-t border-gray-200 flex items-center justify-between gap-3">
            {!selectedCategory && (
              <p className="text-sm text-amber-600">
                Selecione uma categoria acima para categorizar
              </p>
            )}
            {selectedCategory && <div />}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setPreview(null);
                  setPreviewMatches([]);
                  setSearchQuery("");
                }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleApply}
                disabled={applying || preview.matchCount === 0 || !selectedCategory}
                className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {applying
                  ? "Aplicando..."
                  : `Categorizar ${preview.matchCount.toLocaleString("pt-BR")} transacao(es)`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Empty State - when nothing is searched */}
      {!searchQuery && !preview && !loadingPreview && (
        <div className="bg-gray-50 rounded-xl p-8 text-center">
          <span className="text-4xl">🔍</span>
          <p className="mt-2 text-gray-600">
            Busque por um termo ou clique em um padrao acima
          </p>
        </div>
      )}

      {/* Empty Results */}
      {searchQuery && preview && preview.matchCount === 0 && (
        <div className="bg-gray-50 rounded-xl p-8 text-center">
          <span className="text-4xl">🔍</span>
          <p className="mt-2 text-gray-600">
            Nenhuma transacao encontrada para &ldquo;{searchQuery}&rdquo;
          </p>
          <button
            onClick={() => setSearchQuery("")}
            className="mt-2 text-emerald-600 hover:text-emerald-700"
          >
            Limpar busca
          </button>
        </div>
      )}

      {/* Tips */}
      <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
        <h3 className="font-medium text-gray-900 mb-2 text-sm">Dicas</h3>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• Busque por <strong>IFD</strong> para encontrar transacoes do iFood</li>
          <li>• Busque por <strong>UBER</strong> para corridas e Uber Eats</li>
          <li>• Clique nos padroes detectados para buscar automaticamente</li>
        </ul>
      </div>
    </div>
  );
}
