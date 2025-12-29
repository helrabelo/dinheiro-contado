import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();

    // Get all transactions for this year
    const yearStart = new Date(now.getFullYear(), 0, 1);
    const allTransactions = await prisma.transaction.findMany({
      where: {
        userId: session.user.id,
        transactionDate: { gte: yearStart },
      },
      select: {
        amount: true,
        type: true,
        transactionDate: true,
        categoryId: true,
      },
      orderBy: { transactionDate: "desc" },
    });

    // Monthly spending by month
    // Note: DEBIT amounts are stored as negative values in DB, use Math.abs()
    const monthlySpending = new Map<string, number>();
    for (const tx of allTransactions) {
      if (tx.type === "DEBIT") {
        const monthKey = new Date(tx.transactionDate).toISOString().substring(0, 7);
        monthlySpending.set(
          monthKey,
          (monthlySpending.get(monthKey) || 0) + Math.abs(Number(tx.amount))
        );
      }
    }

    const monthlyValues = Array.from(monthlySpending.entries())
      .sort((a, b) => a[0].localeCompare(b[0]));

    // Calculate average monthly spending
    const totalMonthlySpending = monthlyValues.reduce((sum, [, val]) => sum + val, 0);
    const avgMonthlySpending = monthlyValues.length > 0
      ? totalMonthlySpending / monthlyValues.length
      : 0;

    // Find highest spending month
    let highestMonth = { month: "", amount: 0 };
    for (const [month, amount] of monthlyValues) {
      if (amount > highestMonth.amount) {
        highestMonth = { month, amount };
      }
    }

    // Calculate spending velocity (trend)
    // Compare last 30 days to previous 30 days
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    const last30DaysSpending = allTransactions
      .filter((tx) => tx.type === "DEBIT" && new Date(tx.transactionDate) >= thirtyDaysAgo)
      .reduce((sum, tx) => sum + Math.abs(Number(tx.amount)), 0);

    const prev30DaysSpending = allTransactions
      .filter(
        (tx) =>
          tx.type === "DEBIT" &&
          new Date(tx.transactionDate) >= sixtyDaysAgo &&
          new Date(tx.transactionDate) < thirtyDaysAgo
      )
      .reduce((sum, tx) => sum + Math.abs(Number(tx.amount)), 0);

    const velocityChange = prev30DaysSpending > 0
      ? ((last30DaysSpending - prev30DaysSpending) / prev30DaysSpending) * 100
      : 0;

    let velocityTrend: "up" | "down" | "stable";
    if (velocityChange > 5) velocityTrend = "up";
    else if (velocityChange < -5) velocityTrend = "down";
    else velocityTrend = "stable";

    // Most common category
    const categoryCounts = new Map<string | null, number>();
    for (const tx of allTransactions.filter((t) => t.type === "DEBIT")) {
      categoryCounts.set(
        tx.categoryId,
        (categoryCounts.get(tx.categoryId) || 0) + 1
      );
    }

    let mostCommonCategoryId: string | null = null;
    let maxCount = 0;
    for (const [catId, count] of categoryCounts.entries()) {
      if (count > maxCount && catId !== null) {
        mostCommonCategoryId = catId;
        maxCount = count;
      }
    }

    let mostCommonCategory = null;
    if (mostCommonCategoryId) {
      const cat = await prisma.category.findUnique({
        where: { id: mostCommonCategoryId },
        select: { name: true, icon: true, color: true },
      });
      if (cat) {
        mostCommonCategory = {
          ...cat,
          count: maxCount,
          percentage: (maxCount / allTransactions.filter((t) => t.type === "DEBIT").length) * 100,
        };
      }
    }

    // Total spending this month vs last month
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    const thisMonthSpending = allTransactions
      .filter((tx) => tx.type === "DEBIT" && new Date(tx.transactionDate) >= thisMonthStart)
      .reduce((sum, tx) => sum + Math.abs(Number(tx.amount)), 0);

    const lastMonthSpending = allTransactions
      .filter(
        (tx) =>
          tx.type === "DEBIT" &&
          new Date(tx.transactionDate) >= lastMonthStart &&
          new Date(tx.transactionDate) <= lastMonthEnd
      )
      .reduce((sum, tx) => sum + Math.abs(Number(tx.amount)), 0);

    // Calculate how many days into the month
    const daysIntoMonth = now.getDate();
    const daysInLastMonth = lastMonthEnd.getDate();
    const projectedMonthlySpending = (thisMonthSpending / daysIntoMonth) * 30;

    // Credit vs Debit ratio
    const totalCredits = allTransactions
      .filter((tx) => tx.type === "CREDIT")
      .reduce((sum, tx) => sum + Math.abs(Number(tx.amount)), 0);

    const totalDebits = allTransactions
      .filter((tx) => tx.type === "DEBIT")
      .reduce((sum, tx) => sum + Math.abs(Number(tx.amount)), 0);

    const creditDebitRatio = totalDebits > 0 ? totalCredits / totalDebits : 0;

    return NextResponse.json({
      averages: {
        monthly: avgMonthlySpending,
        daily: avgMonthlySpending / 30,
      },
      highestMonth: highestMonth.month
        ? {
            month: highestMonth.month,
            monthLabel: new Date(highestMonth.month + "-01").toLocaleDateString("pt-BR", {
              month: "long",
              year: "numeric",
            }),
            amount: highestMonth.amount,
          }
        : null,
      velocity: {
        trend: velocityTrend,
        change: velocityChange,
        last30Days: last30DaysSpending,
        prev30Days: prev30DaysSpending,
      },
      mostCommonCategory,
      currentMonth: {
        spending: thisMonthSpending,
        lastMonth: lastMonthSpending,
        projected: projectedMonthlySpending,
        daysIntoMonth,
        percentOfLastMonth: lastMonthSpending > 0
          ? (thisMonthSpending / lastMonthSpending) * 100
          : 0,
      },
      ratios: {
        creditDebit: creditDebitRatio,
        savingsRate: totalCredits > 0 ? ((totalCredits - totalDebits) / totalCredits) * 100 : 0,
      },
      totals: {
        transactionsThisYear: allTransactions.length,
        debitsThisYear: totalDebits,
        creditsThisYear: totalCredits,
      },
    });
  } catch (error) {
    console.error("Error fetching summary stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch summary stats" },
      { status: 500 }
    );
  }
}
