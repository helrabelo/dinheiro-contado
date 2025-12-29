import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { TransactionType } from "@prisma/client";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const year = parseInt(searchParams.get("year") || new Date().getFullYear().toString());
  const type = searchParams.get("type") || "all"; // all, debit, credit

  // Calculate date range for the year
  const startDate = new Date(year, 0, 1);
  const endDate = new Date(year, 11, 31, 23, 59, 59);

  // Build type filter with proper enum typing
  const typeFilter: { type?: TransactionType } = {};
  if (type === "debit") {
    typeFilter.type = TransactionType.DEBIT;
  } else if (type === "credit") {
    typeFilter.type = TransactionType.CREDIT;
  }

  try {
    // Get all transactions for the year
    const transactions = await prisma.transaction.findMany({
      where: {
        userId: session.user.id,
        transactionDate: { gte: startDate, lte: endDate },
        ...typeFilter,
      },
      select: {
        amount: true,
        type: true,
        transactionDate: true,
      },
    });

    // Group by date
    // Note: DEBIT amounts are stored as negative values in DB, use Math.abs()
    const dailyData = new Map<string, { spending: number; income: number; count: number }>();

    for (const tx of transactions) {
      const dateKey = new Date(tx.transactionDate).toISOString().split("T")[0];
      const existing = dailyData.get(dateKey) || { spending: 0, income: 0, count: 0 };

      if (tx.type === "DEBIT") {
        existing.spending += Math.abs(Number(tx.amount));
      } else {
        existing.income += Math.abs(Number(tx.amount));
      }
      existing.count += 1;

      dailyData.set(dateKey, existing);
    }

    // Convert to array format for heatmap
    const heatmapData = Array.from(dailyData.entries()).map(([date, data]) => ({
      date,
      spending: data.spending,
      income: data.income,
      count: data.count,
      net: data.income - data.spending,
    }));

    // Calculate statistics
    const allSpending = heatmapData.map((d) => d.spending).filter((s) => s > 0);
    const maxSpending = allSpending.length > 0 ? Math.max(...allSpending) : 0;
    const avgSpending = allSpending.length > 0
      ? allSpending.reduce((a, b) => a + b, 0) / allSpending.length
      : 0;

    // Calculate intensity levels (for color scaling)
    const p25 = percentile(allSpending, 25);
    const p50 = percentile(allSpending, 50);
    const p75 = percentile(allSpending, 75);

    // Monthly aggregation
    const monthlyData = new Map<string, { spending: number; income: number; count: number }>();

    for (const [date, data] of dailyData.entries()) {
      const monthKey = date.substring(0, 7); // YYYY-MM
      const existing = monthlyData.get(monthKey) || { spending: 0, income: 0, count: 0 };
      existing.spending += data.spending;
      existing.income += data.income;
      existing.count += data.count;
      monthlyData.set(monthKey, existing);
    }

    const monthlyAggregation = Array.from(monthlyData.entries())
      .map(([month, data]) => ({
        month,
        spending: data.spending,
        income: data.income,
        count: data.count,
        net: data.income - data.spending,
      }))
      .sort((a, b) => a.month.localeCompare(b.month));

    // Find highest and lowest spending days
    const sortedBySpending = [...heatmapData].sort((a, b) => b.spending - a.spending);
    const highestSpendingDays = sortedBySpending.slice(0, 5);
    const lowestSpendingDays = sortedBySpending.filter((d) => d.spending > 0).slice(-5).reverse();

    // Day of week analysis
    const dayOfWeekData = new Map<number, { total: number; count: number }>();
    for (const item of heatmapData) {
      const dayOfWeek = new Date(item.date).getDay();
      const existing = dayOfWeekData.get(dayOfWeek) || { total: 0, count: 0 };
      existing.total += item.spending;
      existing.count += 1;
      dayOfWeekData.set(dayOfWeek, existing);
    }

    const dayOfWeekAverages = Array.from({ length: 7 }, (_, i) => {
      const data = dayOfWeekData.get(i) || { total: 0, count: 0 };
      return {
        day: i,
        dayName: ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"][i],
        average: data.count > 0 ? data.total / data.count : 0,
        total: data.total,
        count: data.count,
      };
    });

    return NextResponse.json({
      year,
      data: heatmapData,
      stats: {
        maxSpending,
        avgSpending,
        totalDays: heatmapData.length,
        daysWithSpending: allSpending.length,
        percentiles: { p25, p50, p75 },
      },
      monthlyAggregation,
      highlights: {
        highestSpendingDays,
        lowestSpendingDays,
      },
      dayOfWeekAnalysis: dayOfWeekAverages,
    });
  } catch (error) {
    console.error("Error fetching spending heatmap:", error);
    return NextResponse.json(
      { error: "Failed to fetch heatmap data" },
      { status: 500 }
    );
  }
}

function percentile(arr: number[], p: number): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(idx);
  const upper = Math.ceil(idx);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (idx - lower) * (sorted[upper] - sorted[lower]);
}
