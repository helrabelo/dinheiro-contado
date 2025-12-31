"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { usePrivacyMode } from "@/contexts/privacy-mode-context";
import Link from "next/link";

interface DayData {
  date: string;
  spending: number;
  income: number;
  count: number;
  net: number;
}

interface CalendarData {
  data: DayData[];
  stats: {
    maxSpending: number;
    avgSpending: number;
    totalDays: number;
    daysWithSpending: number;
  };
}

type ViewMode = "week" | "month" | "year";

const MONTHS_PT = [
  "Janeiro", "Fevereiro", "Marco", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

const MONTHS_SHORT_PT = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez"
];

const DAYS_PT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];

export function SpendingCalendar() {
  const [data, setData] = useState<CalendarData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<DayData | null>(null);
  const { formatCurrency, isPrivate } = usePrivacyMode();

  // Calculate date range based on view mode
  const dateRange = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    if (viewMode === "week") {
      const startOfWeek = new Date(currentDate);
      startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      return { start: startOfWeek, end: endOfWeek };
    } else if (viewMode === "month") {
      const start = new Date(year, month, 1);
      const end = new Date(year, month + 1, 0);
      return { start, end };
    } else {
      const start = new Date(year, 0, 1);
      const end = new Date(year, 11, 31);
      return { start, end };
    }
  }, [viewMode, currentDate]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    const startStr = dateRange.start.toISOString().split("T")[0];
    const endStr = dateRange.end.toISOString().split("T")[0];

    try {
      const response = await fetch(
        `/api/analytics/spending-calendar?startDate=${startStr}&endDate=${endStr}`
      );
      if (!response.ok) throw new Error("Failed to fetch data");

      const result = await response.json();
      setData(result);
    } catch (err) {
      setError("Erro ao carregar dados");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const navigate = (direction: "prev" | "next" | "today") => {
    if (direction === "today") {
      setCurrentDate(new Date());
      return;
    }

    const delta = direction === "prev" ? -1 : 1;
    const newDate = new Date(currentDate);

    if (viewMode === "week") {
      newDate.setDate(newDate.getDate() + delta * 7);
    } else if (viewMode === "month") {
      newDate.setMonth(newDate.getMonth() + delta);
    } else {
      newDate.setFullYear(newDate.getFullYear() + delta);
    }

    setCurrentDate(newDate);
  };

  const getTitle = () => {
    if (viewMode === "week") {
      const start = new Date(currentDate);
      start.setDate(currentDate.getDate() - currentDate.getDay());
      const end = new Date(start);
      end.setDate(start.getDate() + 6);

      const formatDate = (d: Date) =>
        d.toLocaleDateString("pt-BR", { day: "numeric", month: "short" });

      return `${formatDate(start)} - ${formatDate(end)}`;
    } else if (viewMode === "month") {
      return `${MONTHS_PT[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
    } else {
      return String(currentDate.getFullYear());
    }
  };

  const dataMap = useMemo(() => {
    if (!data) return new Map<string, DayData>();
    return new Map(data.data.map((d) => [d.date, d]));
  }, [data]);

  // Calculate spending intensity for color coding
  const getSpendingIntensity = (spending: number): string => {
    if (!data || spending === 0) return "";
    const max = data.stats.maxSpending;
    if (max === 0) return "";

    const ratio = spending / max;
    if (ratio <= 0.25) return "bg-red-100 text-red-700";
    if (ratio <= 0.5) return "bg-red-200 text-red-800";
    if (ratio <= 0.75) return "bg-red-300 text-red-900";
    return "bg-red-400 text-white";
  };

  // Week View Component
  const WeekView = () => {
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());

    const days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      return date;
    });

    const weekTotal = days.reduce((sum, date) => {
      const dateStr = date.toISOString().split("T")[0];
      const dayData = dataMap.get(dateStr);
      return sum + (dayData?.spending || 0);
    }, 0);

    return (
      <div className="space-y-4">
        {/* Week header */}
        <div className="text-center text-sm text-gray-600">
          Total da semana: {isPrivate ? "R$ *****" : formatCurrency(weekTotal)}
        </div>

        {/* Days */}
        <div className="grid grid-cols-7 gap-2">
          {days.map((date) => {
            const dateStr = date.toISOString().split("T")[0];
            const dayData = dataMap.get(dateStr);
            const isToday = dateStr === new Date().toISOString().split("T")[0];
            const isFuture = date > new Date();

            return (
              <div
                key={dateStr}
                onClick={() => dayData && setSelectedDay(dayData)}
                className={`p-3 rounded-lg border transition cursor-pointer ${
                  isToday
                    ? "border-emerald-500 bg-emerald-50"
                    : "border-gray-200 hover:border-gray-300"
                } ${isFuture ? "opacity-50" : ""}`}
              >
                <div className="text-xs text-gray-500 text-center mb-1">
                  {DAYS_PT[date.getDay()]}
                </div>
                <div className="text-lg font-semibold text-center text-gray-900">
                  {date.getDate()}
                </div>
                {dayData && dayData.spending > 0 ? (
                  <div className="mt-2 space-y-1">
                    <div
                      className={`text-center text-sm font-medium rounded px-1 py-0.5 ${getSpendingIntensity(
                        dayData.spending
                      )}`}
                    >
                      {isPrivate ? "***" : formatCurrency(dayData.spending)}
                    </div>
                    <div className="text-xs text-gray-500 text-center">
                      {dayData.count} {dayData.count === 1 ? "transacao" : "transacoes"}
                    </div>
                  </div>
                ) : (
                  <div className="mt-2 text-center text-sm text-gray-400">-</div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Month View Component
  const MonthView = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startPadding = firstDay.getDay();
    const daysInMonth = lastDay.getDate();

    const monthTotal = data?.data.reduce((sum, d) => sum + d.spending, 0) || 0;

    // Create calendar grid
    const calendarDays: (Date | null)[] = [];

    // Add empty slots for days before the first of the month
    for (let i = 0; i < startPadding; i++) {
      calendarDays.push(null);
    }

    // Add days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      calendarDays.push(new Date(year, month, i));
    }

    return (
      <div className="space-y-4">
        {/* Month header */}
        <div className="text-center text-sm text-gray-600">
          Total do mes: {isPrivate ? "R$ *****" : formatCurrency(monthTotal)}
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1">
          {DAYS_PT.map((day) => (
            <div key={day} className="text-center text-xs font-medium text-gray-500 py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((date, idx) => {
            if (!date) {
              return <div key={`empty-${idx}`} className="p-2" />;
            }

            const dateStr = date.toISOString().split("T")[0];
            const dayData = dataMap.get(dateStr);
            const isToday = dateStr === new Date().toISOString().split("T")[0];
            const isFuture = date > new Date();

            return (
              <div
                key={dateStr}
                onClick={() => dayData && setSelectedDay(dayData)}
                className={`min-h-[80px] p-2 rounded-lg border transition ${
                  dayData ? "cursor-pointer hover:shadow-md" : ""
                } ${
                  isToday
                    ? "border-emerald-500 bg-emerald-50"
                    : "border-gray-100 hover:border-gray-200"
                } ${isFuture ? "opacity-50 bg-gray-50" : ""}`}
              >
                <div
                  className={`text-sm font-medium ${
                    isToday ? "text-emerald-700" : "text-gray-700"
                  }`}
                >
                  {date.getDate()}
                </div>
                {dayData && dayData.spending > 0 && (
                  <div className="mt-1">
                    <div
                      className={`text-xs font-medium rounded px-1 py-0.5 text-center ${getSpendingIntensity(
                        dayData.spending
                      )}`}
                    >
                      {isPrivate ? "***" : formatCurrency(dayData.spending)}
                    </div>
                    <div className="text-[10px] text-gray-400 text-center mt-0.5">
                      {dayData.count}x
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Year View Component
  const YearView = () => {
    const year = currentDate.getFullYear();

    // Group data by month
    const monthlyData = useMemo(() => {
      const months = Array.from({ length: 12 }, (_, i) => ({
        month: i,
        spending: 0,
        income: 0,
        count: 0,
      }));

      data?.data.forEach((d) => {
        const date = new Date(d.date);
        if (date.getFullYear() === year) {
          const monthIdx = date.getMonth();
          months[monthIdx].spending += d.spending;
          months[monthIdx].income += d.income;
          months[monthIdx].count += d.count;
        }
      });

      return months;
    }, [data, year]);

    const yearTotal = monthlyData.reduce((sum, m) => sum + m.spending, 0);
    const maxMonthSpending = Math.max(...monthlyData.map((m) => m.spending));

    return (
      <div className="space-y-4">
        {/* Year header */}
        <div className="text-center text-sm text-gray-600">
          Total do ano: {isPrivate ? "R$ *****" : formatCurrency(yearTotal)}
        </div>

        {/* Monthly grid */}
        <div className="grid grid-cols-3 md:grid-cols-4 gap-4">
          {monthlyData.map((monthData, idx) => {
            const isCurrentMonth =
              idx === new Date().getMonth() && year === new Date().getFullYear();
            const barHeight =
              maxMonthSpending > 0
                ? (monthData.spending / maxMonthSpending) * 100
                : 0;

            return (
              <div
                key={idx}
                onClick={() => {
                  setCurrentDate(new Date(year, idx, 1));
                  setViewMode("month");
                }}
                className={`p-4 rounded-lg border transition cursor-pointer hover:shadow-md ${
                  isCurrentMonth
                    ? "border-emerald-500 bg-emerald-50"
                    : "border-gray-200"
                }`}
              >
                <div className="text-sm font-medium text-gray-700 mb-2">
                  {MONTHS_SHORT_PT[idx]}
                </div>

                {/* Mini bar chart */}
                <div className="h-12 flex items-end mb-2">
                  <div
                    className="w-full bg-gradient-to-t from-red-400 to-red-200 rounded-t transition-all"
                    style={{ height: `${Math.max(barHeight, 4)}%` }}
                  />
                </div>

                <div className="text-lg font-semibold text-gray-900">
                  {isPrivate ? "***" : formatCurrency(monthData.spending)}
                </div>
                <div className="text-xs text-gray-500">
                  {monthData.count} transacoes
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-64 bg-gray-100 rounded"></div>
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

  return (
    <div className="bg-white rounded-xl p-6 border border-gray-200">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Calendario de Gastos
          </h2>
          {/* View mode toggle */}
          <div className="flex items-center bg-gray-100 rounded-lg p-1">
            {(["week", "month", "year"] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-3 py-1 text-sm rounded-md transition ${
                  viewMode === mode
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                {mode === "week" ? "Semana" : mode === "month" ? "Mes" : "Ano"}
              </button>
            ))}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate("prev")}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={() => navigate("today")}
            className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition"
          >
            Hoje
          </button>
          <span className="text-gray-900 font-medium min-w-[180px] text-center">
            {getTitle()}
          </span>
          <button
            onClick={() => navigate("next")}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Calendar Content */}
      {viewMode === "week" && <WeekView />}
      {viewMode === "month" && <MonthView />}
      {viewMode === "year" && <YearView />}

      {/* Selected Day Modal */}
      {selectedDay && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {new Date(selectedDay.date).toLocaleDateString("pt-BR", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </h3>
              <button
                onClick={() => setSelectedDay(null)}
                className="p-1 text-gray-500 hover:bg-gray-100 rounded"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">Gastos</span>
                <span className="text-lg font-semibold text-red-600">
                  {isPrivate ? "R$ *****" : formatCurrency(selectedDay.spending)}
                </span>
              </div>
              {selectedDay.income > 0 && (
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">Receitas</span>
                  <span className="text-lg font-semibold text-green-600">
                    {isPrivate ? "R$ *****" : formatCurrency(selectedDay.income)}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">Transacoes</span>
                <span className="text-gray-900 font-medium">{selectedDay.count}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-gray-600">Saldo do dia</span>
                <span
                  className={`text-lg font-semibold ${
                    selectedDay.net >= 0 ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {isPrivate ? "R$ *****" : formatCurrency(selectedDay.net)}
                </span>
              </div>
            </div>

            <Link
              href={`/dashboard/transactions?startDate=${selectedDay.date}&endDate=${selectedDay.date}`}
              className="mt-4 block w-full py-2 px-4 bg-emerald-600 text-white text-center font-medium rounded-lg hover:bg-emerald-700 transition"
            >
              Ver transacoes do dia
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
