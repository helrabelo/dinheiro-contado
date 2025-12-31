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
    const yearStart = new Date(now.getFullYear(), 0, 1);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    // Run all aggregations in parallel instead of loading all transactions into memory
    const [
      monthlySpendingData,
      last30DaysAgg,
      prev30DaysAgg,
      categoryCountsData,
      thisMonthAgg,
      lastMonthAgg,
      typeTotals,
      transactionCount,
    ] = await Promise.all([
      // Monthly spending by month using raw SQL for date_trunc
      prisma.$queryRaw<Array<{ month: string; total: number }>>`
        SELECT
          TO_CHAR(DATE_TRUNC('month', "transactionDate"), 'YYYY-MM') as month,
          SUM(ABS(amount))::float as total
        FROM transactions
        WHERE "userId" = ${session.user.id}
        AND type = 'DEBIT'
        AND "transactionDate" >= ${yearStart}
        GROUP BY DATE_TRUNC('month', "transactionDate")
        ORDER BY month ASC
      `,

      // Last 30 days spending
      prisma.transaction.aggregate({
        where: {
          userId: session.user.id,
          type: "DEBIT",
          transactionDate: { gte: thirtyDaysAgo },
        },
        _sum: { amount: true },
      }),

      // Previous 30 days spending
      prisma.transaction.aggregate({
        where: {
          userId: session.user.id,
          type: "DEBIT",
          transactionDate: { gte: sixtyDaysAgo, lt: thirtyDaysAgo },
        },
        _sum: { amount: true },
      }),

      // Category counts - get most common
      prisma.transaction.groupBy({
        by: ["categoryId"],
        where: {
          userId: session.user.id,
          type: "DEBIT",
          transactionDate: { gte: yearStart },
          categoryId: { not: null },
        },
        _count: true,
        orderBy: { _count: { categoryId: "desc" } },
        take: 1,
      }),

      // This month spending
      prisma.transaction.aggregate({
        where: {
          userId: session.user.id,
          type: "DEBIT",
          transactionDate: { gte: thisMonthStart },
        },
        _sum: { amount: true },
      }),

      // Last month spending
      prisma.transaction.aggregate({
        where: {
          userId: session.user.id,
          type: "DEBIT",
          transactionDate: { gte: lastMonthStart, lte: lastMonthEnd },
        },
        _sum: { amount: true },
      }),

      // Type totals (credits and debits)
      prisma.transaction.groupBy({
        by: ["type"],
        where: {
          userId: session.user.id,
          transactionDate: { gte: yearStart },
        },
        _sum: { amount: true },
      }),

      // Total transaction count
      prisma.transaction.count({
        where: {
          userId: session.user.id,
          transactionDate: { gte: yearStart },
        },
      }),
    ]);

    // Process monthly spending data
    const monthlyValues = monthlySpendingData.map((m) => ({
      month: m.month,
      amount: m.total,
    }));

    const totalMonthlySpending = monthlyValues.reduce((sum, m) => sum + m.amount, 0);
    const avgMonthlySpending = monthlyValues.length > 0
      ? totalMonthlySpending / monthlyValues.length
      : 0;

    // Find highest spending month
    let highestMonth = { month: "", amount: 0 };
    for (const m of monthlyValues) {
      if (m.amount > highestMonth.amount) {
        highestMonth = { month: m.month, amount: m.amount };
      }
    }

    // Calculate velocity
    const last30DaysSpending = Math.abs(Number(last30DaysAgg._sum.amount) || 0);
    const prev30DaysSpending = Math.abs(Number(prev30DaysAgg._sum.amount) || 0);
    const velocityChange = prev30DaysSpending > 0
      ? ((last30DaysSpending - prev30DaysSpending) / prev30DaysSpending) * 100
      : 0;

    let velocityTrend: "up" | "down" | "stable";
    if (velocityChange > 5) velocityTrend = "up";
    else if (velocityChange < -5) velocityTrend = "down";
    else velocityTrend = "stable";

    // Get most common category details
    let mostCommonCategory = null;
    if (categoryCountsData.length > 0 && categoryCountsData[0].categoryId) {
      const cat = await prisma.category.findUnique({
        where: { id: categoryCountsData[0].categoryId },
        select: { name: true, icon: true, color: true },
      });
      if (cat) {
        const debitCount = typeTotals.find((t) => t.type === "DEBIT");
        const totalDebits = debitCount?._sum.amount
          ? Math.abs(Number(debitCount._sum.amount))
          : 0;
        mostCommonCategory = {
          ...cat,
          count: categoryCountsData[0]._count,
          percentage: totalDebits > 0
            ? (categoryCountsData[0]._count / transactionCount) * 100
            : 0,
        };
      }
    }

    // Calculate month spending values
    const thisMonthSpending = Math.abs(Number(thisMonthAgg._sum.amount) || 0);
    const lastMonthSpending = Math.abs(Number(lastMonthAgg._sum.amount) || 0);
    const daysIntoMonth = now.getDate();
    const projectedMonthlySpending = (thisMonthSpending / daysIntoMonth) * 30;

    // Calculate type totals
    const debitTotal = typeTotals.find((t) => t.type === "DEBIT");
    const creditTotal = typeTotals.find((t) => t.type === "CREDIT");
    const totalDebits = Math.abs(Number(debitTotal?._sum.amount) || 0);
    const totalCredits = Math.abs(Number(creditTotal?._sum.amount) || 0);
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
        transactionsThisYear: transactionCount,
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
