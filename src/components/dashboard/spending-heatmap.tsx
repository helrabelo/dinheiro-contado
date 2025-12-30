"use client";

import { useEffect, useState, useCallback } from "react";
import { usePrivacyMode } from "@/contexts/privacy-mode-context";

interface DayData {
  date: string;
  spending: number;
  income: number;
  count: number;
  net: number;
}

interface DayOfWeekData {
  day: number;
  dayName: string;
  average: number;
  total: number;
  count: number;
}

interface HeatmapData {
  year: number;
  data: DayData[];
  stats: {
    maxSpending: number;
    avgSpending: number;
    totalDays: number;
    daysWithSpending: number;
    percentiles: { p25: number; p50: number; p75: number };
  };
  monthlyAggregation: {
    month: string;
    spending: number;
    income: number;
    count: number;
    net: number;
  }[];
  highlights: {
    highestSpendingDays: DayData[];
    lowestSpendingDays: DayData[];
  };
  dayOfWeekAnalysis: DayOfWeekData[];
}

const MONTHS_PT = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez"
];

const DAYS_PT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];

export function SpendingHeatmap() {
  const [data, setData] = useState<HeatmapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [hoveredDay, setHoveredDay] = useState<DayData | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const { formatCurrency, isPrivate } = usePrivacyMode();

  const fetchData = useCallback(async (year: number) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/analytics/spending-heatmap?year=${year}`);
      if (!response.ok) throw new Error("Failed to fetch data");

      const result = await response.json();
      setData(result);
    } catch (err) {
      setError("Erro ao carregar dados");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(selectedYear);
  }, [fetchData, selectedYear]);

  const getIntensityLevel = (spending: number): number => {
    if (!data || spending === 0) return 0;
    const { p25, p50, p75 } = data.stats.percentiles;
    if (spending <= p25) return 1;
    if (spending <= p50) return 2;
    if (spending <= p75) return 3;
    return 4;
  };

  const getIntensityColor = (level: number): string => {
    const colors = [
      "bg-gray-100", // 0 - no spending
      "bg-red-200",  // 1 - low
      "bg-red-300",  // 2 - medium-low
      "bg-red-400",  // 3 - medium-high
      "bg-red-600",  // 4 - high
    ];
    return colors[level] || colors[0];
  };

  // Generate calendar grid
  const generateCalendarGrid = () => {
    if (!data) return [];

    const dataMap = new Map(data.data.map((d) => [d.date, d]));
    const year = selectedYear;
    const grid: { date: Date; data: DayData | null }[][] = [];

    // Start from the first day of the year
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31);

    // Find the first Sunday before or on Jan 1
    const firstSunday = new Date(startDate);
    firstSunday.setDate(firstSunday.getDate() - firstSunday.getDay());

    let currentDate = new Date(firstSunday);
    let currentWeek: { date: Date; data: DayData | null }[] = [];

    while (currentDate <= endDate || currentWeek.length > 0) {
      const dateStr = currentDate.toISOString().split("T")[0];
      const isInYear = currentDate.getFullYear() === year;

      currentWeek.push({
        date: new Date(currentDate),
        data: isInYear ? (dataMap.get(dateStr) || null) : null,
      });

      if (currentWeek.length === 7) {
        grid.push(currentWeek);
        currentWeek = [];
      }

      currentDate.setDate(currentDate.getDate() + 1);

      // Stop if we've passed the year and completed the week
      if (currentDate.getFullYear() > year && currentWeek.length === 0) {
        break;
      }
    }

    // Add remaining days if any
    if (currentWeek.length > 0) {
      grid.push(currentWeek);
    }

    return grid;
  };

  const handleMouseEnter = (
    day: { date: Date; data: DayData | null },
    e: React.MouseEvent
  ) => {
    if (day.data) {
      setHoveredDay(day.data);
      const rect = (e.target as HTMLElement).getBoundingClientRect();
      setTooltipPos({
        x: rect.left + rect.width / 2,
        y: rect.top,
      });
    }
  };

  const handleMouseLeave = () => {
    setHoveredDay(null);
  };

  const formatDateShort = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("pt-BR", { day: "numeric", month: "short" });
  };

  const currentYear = new Date().getFullYear();
  const availableYears = [currentYear - 2, currentYear - 1, currentYear];

  if (loading) {
    return (
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-32 bg-gray-100 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  if (!data) return null;

  const calendarGrid = generateCalendarGrid();

  return (
    <div className="bg-white rounded-xl p-6 border border-gray-200">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Mapa de Gastos
          </h2>
          <p className="text-sm text-gray-500">
            {data.stats.daysWithSpending} dias com gastos em {selectedYear}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {availableYears.map((year) => (
            <button
              key={year}
              onClick={() => setSelectedYear(year)}
              className={`px-3 py-1.5 text-sm rounded-lg transition ${
                selectedYear === year
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {year}
            </button>
          ))}
        </div>
      </div>

      {/* Calendar heatmap */}
      <div className="overflow-x-auto">
        <div className="min-w-[800px]">
          {/* Month labels */}
          <div className="flex mb-2 ml-8">
            {MONTHS_PT.map((month, i) => (
              <div key={month} className="flex-1 text-xs text-gray-500 text-center">
                {month}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="flex gap-1">
            {/* Day labels */}
            <div className="flex flex-col gap-1 pr-2">
              {DAYS_PT.map((day, i) => (
                <div
                  key={day}
                  className="h-3 text-xs text-gray-500 flex items-center justify-end"
                  style={{ visibility: i % 2 === 1 ? "visible" : "hidden" }}
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Weeks */}
            <div className="flex gap-1 flex-1">
              {calendarGrid.map((week, weekIdx) => (
                <div key={weekIdx} className="flex flex-col gap-1">
                  {week.map((day, dayIdx) => {
                    const isCurrentYear = day.date.getFullYear() === selectedYear;
                    const isFuture = day.date > new Date();
                    const spending = day.data?.spending || 0;
                    const level = getIntensityLevel(spending);

                    return (
                      <div
                        key={dayIdx}
                        className={`w-3 h-3 rounded-sm cursor-pointer transition-all ${
                          !isCurrentYear || isFuture
                            ? "bg-gray-50"
                            : getIntensityColor(level)
                        } ${hoveredDay?.date === day.data?.date ? "ring-2 ring-gray-400" : ""}`}
                        onMouseEnter={(e) => handleMouseEnter(day, e)}
                        onMouseLeave={handleMouseLeave}
                        title={
                          day.data
                            ? `${new Date(day.data.date).toLocaleDateString("pt-BR")}: ${isPrivate ? "R$ •••••" : formatCurrency(day.data.spending)}`
                            : ""
                        }
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center justify-end gap-2 mt-4 text-xs text-gray-500">
            <span>Menos</span>
            {[0, 1, 2, 3, 4].map((level) => (
              <div
                key={level}
                className={`w-3 h-3 rounded-sm ${getIntensityColor(level)}`}
              />
            ))}
            <span>Mais</span>
          </div>
        </div>
      </div>

      {/* Tooltip */}
      {hoveredDay && (
        <div
          className="fixed z-[9999] bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-xl pointer-events-none whitespace-nowrap"
          style={{
            left: tooltipPos.x,
            top: tooltipPos.y - 8,
            transform: "translate(-50%, -100%)",
          }}
        >
          <p className="font-semibold text-sm">
            {formatDateShort(hoveredDay.date)}: {formatCurrency(hoveredDay.spending)}
          </p>
          {hoveredDay.count > 0 && (
            <p className="text-gray-300 text-[10px] mt-0.5">{hoveredDay.count} transações</p>
          )}
          <div
            className="absolute left-1/2 bottom-0 -translate-x-1/2 translate-y-full border-4 border-transparent border-t-gray-900"
          />
        </div>
      )}

      {/* Day of week analysis */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <h3 className="text-sm font-medium text-gray-700 mb-3">
          Media por dia da semana
        </h3>
        <div className="grid grid-cols-7 gap-2">
          {data.dayOfWeekAnalysis.map((day) => {
            const maxAvg = Math.max(...data.dayOfWeekAnalysis.map((d) => d.average));
            const heightPercent = maxAvg > 0 ? (day.average / maxAvg) * 100 : 0;

            return (
              <div key={day.day} className="text-center">
                <div className="h-16 flex items-end justify-center mb-1">
                  <div
                    className="w-full bg-gradient-to-t from-red-400 to-red-200 rounded-t"
                    style={{ height: `${Math.max(heightPercent, 4)}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500">{day.dayName}</p>
                <p className="text-xs font-medium text-gray-700">
                  {formatCurrency(day.average).replace("R$ ", "")}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Highlights */}
      <div className="mt-6 pt-4 border-t border-gray-200 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">
            Dias com maior gasto
          </h3>
          <div className="space-y-1">
            {data.highlights.highestSpendingDays.slice(0, 3).map((day) => (
              <div
                key={day.date}
                className="flex items-center justify-between text-sm py-1"
              >
                <span className="text-gray-600">
                  {new Date(day.date).toLocaleDateString("pt-BR", {
                    day: "2-digit",
                    month: "short",
                  })}
                </span>
                <span className="font-medium text-red-600">
                  {formatCurrency(day.spending)}
                </span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">
            Estatisticas
          </h3>
          <div className="space-y-1 text-sm">
            <div className="flex items-center justify-between py-1">
              <span className="text-gray-600">Maior gasto diario</span>
              <span className="font-medium text-gray-900">
                {formatCurrency(data.stats.maxSpending)}
              </span>
            </div>
            <div className="flex items-center justify-between py-1">
              <span className="text-gray-600">Media diaria</span>
              <span className="font-medium text-gray-900">
                {formatCurrency(data.stats.avgSpending)}
              </span>
            </div>
            <div className="flex items-center justify-between py-1">
              <span className="text-gray-600">Dias com gastos</span>
              <span className="font-medium text-gray-900">
                {data.stats.daysWithSpending} / {data.stats.totalDays}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
