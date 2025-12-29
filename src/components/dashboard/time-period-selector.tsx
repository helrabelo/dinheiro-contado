"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback, useState } from "react";

export type TimePeriod = "all" | "year" | "6months" | "3months" | "month" | "lastMonth" | "custom";

interface TimePeriodOption {
  value: TimePeriod;
  label: string;
  getDateRange: () => { startDate: Date; endDate: Date };
}

const periodOptions: TimePeriodOption[] = [
  {
    value: "all",
    label: "Todo periodo",
    getDateRange: () => ({
      startDate: new Date(2000, 0, 1),
      endDate: new Date(),
    }),
  },
  {
    value: "year",
    label: "Este ano",
    getDateRange: () => ({
      startDate: new Date(new Date().getFullYear(), 0, 1),
      endDate: new Date(),
    }),
  },
  {
    value: "6months",
    label: "Ultimos 6 meses",
    getDateRange: () => ({
      startDate: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000),
      endDate: new Date(),
    }),
  },
  {
    value: "3months",
    label: "Ultimos 3 meses",
    getDateRange: () => ({
      startDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
      endDate: new Date(),
    }),
  },
  {
    value: "month",
    label: "Este mes",
    getDateRange: () => ({
      startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
      endDate: new Date(),
    }),
  },
  {
    value: "lastMonth",
    label: "Mes passado",
    getDateRange: () => {
      const now = new Date();
      return {
        startDate: new Date(now.getFullYear(), now.getMonth() - 1, 1),
        endDate: new Date(now.getFullYear(), now.getMonth(), 0),
      };
    },
  },
];

interface TimePeriodSelectorProps {
  onPeriodChange?: (startDate: Date, endDate: Date, period: TimePeriod) => void;
  defaultPeriod?: TimePeriod;
  persistInUrl?: boolean;
  compact?: boolean;
}

export function TimePeriodSelector({
  onPeriodChange,
  defaultPeriod = "month",
  persistInUrl = true,
  compact = false,
}: TimePeriodSelectorProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Read initial values from URL or use defaults
  const urlPeriod = searchParams.get("period") as TimePeriod | null;
  const urlStartDate = searchParams.get("startDate");
  const urlEndDate = searchParams.get("endDate");

  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>(
    urlPeriod || defaultPeriod
  );
  const [customStartDate, setCustomStartDate] = useState(urlStartDate || "");
  const [customEndDate, setCustomEndDate] = useState(urlEndDate || "");
  const [showCustomPicker, setShowCustomPicker] = useState(selectedPeriod === "custom");

  const updateUrl = useCallback(
    (period: TimePeriod, startDate?: string, endDate?: string) => {
      if (!persistInUrl) return;

      const params = new URLSearchParams(searchParams.toString());
      params.set("period", period);

      if (period === "custom" && startDate && endDate) {
        params.set("startDate", startDate);
        params.set("endDate", endDate);
      } else {
        params.delete("startDate");
        params.delete("endDate");
      }

      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams, persistInUrl]
  );

  const handlePeriodChange = useCallback(
    (period: TimePeriod) => {
      setSelectedPeriod(period);
      setShowCustomPicker(period === "custom");

      if (period === "custom") {
        return; // Wait for custom date selection
      }

      const option = periodOptions.find((o) => o.value === period);
      if (option) {
        const { startDate, endDate } = option.getDateRange();
        updateUrl(period);
        onPeriodChange?.(startDate, endDate, period);
      }
    },
    [updateUrl, onPeriodChange]
  );

  const applyCustomDates = useCallback(() => {
    if (customStartDate && customEndDate) {
      const startDate = new Date(customStartDate);
      const endDate = new Date(customEndDate);
      updateUrl("custom", customStartDate, customEndDate);
      onPeriodChange?.(startDate, endDate, "custom");
    }
  }, [customStartDate, customEndDate, updateUrl, onPeriodChange]);

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <select
          value={selectedPeriod}
          onChange={(e) => handlePeriodChange(e.target.value as TimePeriod)}
          className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition bg-white text-gray-900"
        >
          {periodOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
          <option value="custom">Periodo personalizado</option>
        </select>
        {showCustomPicker && (
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              className="px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition bg-white text-gray-900"
            />
            <span className="text-gray-500">-</span>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              className="px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition bg-white text-gray-900"
            />
            <button
              onClick={applyCustomDates}
              disabled={!customStartDate || !customEndDate}
              className="px-3 py-1.5 text-sm bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              Aplicar
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl p-4 border border-gray-200">
      <div className="flex flex-wrap gap-2">
        {periodOptions.map((option) => (
          <button
            key={option.value}
            onClick={() => handlePeriodChange(option.value)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              selectedPeriod === option.value
                ? "bg-emerald-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {option.label}
          </button>
        ))}
        <button
          onClick={() => handlePeriodChange("custom")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            selectedPeriod === "custom"
              ? "bg-emerald-600 text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          Personalizado
        </button>
      </div>

      {showCustomPicker && (
        <div className="flex flex-wrap items-center gap-4 mt-4 pt-4 border-t border-gray-200">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Data Inicio</label>
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition bg-white text-gray-900"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Data Fim</label>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition bg-white text-gray-900"
            />
          </div>
          <div className="pt-6">
            <button
              onClick={applyCustomDates}
              disabled={!customStartDate || !customEndDate}
              className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              Aplicar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper function to get date range from period
export function getDateRangeFromPeriod(period: TimePeriod, customStart?: string, customEnd?: string) {
  if (period === "custom" && customStart && customEnd) {
    return {
      startDate: new Date(customStart),
      endDate: new Date(customEnd),
    };
  }

  const option = periodOptions.find((o) => o.value === period);
  if (option) {
    return option.getDateRange();
  }

  // Default to "month"
  return periodOptions.find((o) => o.value === "month")!.getDateRange();
}
