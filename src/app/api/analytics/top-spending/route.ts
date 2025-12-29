import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  const merchantLimit = parseInt(searchParams.get("merchantLimit") || "10");
  const transactionLimit = parseInt(searchParams.get("transactionLimit") || "10");

  // Build date filter
  const dateFilter: { gte?: Date; lte?: Date } = {};
  if (startDate) {
    dateFilter.gte = new Date(startDate);
  }
  if (endDate) {
    dateFilter.lte = new Date(endDate);
  }

  const dateCondition = Object.keys(dateFilter).length > 0
    ? { transactionDate: dateFilter }
    : {};

  try {
    // Get all debit transactions for analysis
    const transactions = await prisma.transaction.findMany({
      where: {
        userId: session.user.id,
        type: "DEBIT",
        ...dateCondition,
      },
      select: {
        id: true,
        description: true,
        amount: true,
        transactionDate: true,
        category: {
          select: { name: true, icon: true, color: true },
        },
      },
      orderBy: { amount: "asc" },
    });

    // Group by merchant (description) for top merchants
    const merchantMap = new Map<string, { total: number; count: number; lastDate: Date }>();

    // Note: DEBIT amounts are stored as negative values in DB, use Math.abs()
    for (const tx of transactions) {
      // Clean up description for better grouping
      const merchant = tx.description.trim().toUpperCase();
      const existing = merchantMap.get(merchant);

      if (existing) {
        existing.total += Math.abs(Number(tx.amount));
        existing.count += 1;
        if (new Date(tx.transactionDate) > existing.lastDate) {
          existing.lastDate = new Date(tx.transactionDate);
        }
      } else {
        merchantMap.set(merchant, {
          total: Math.abs(Number(tx.amount)),
          count: 1,
          lastDate: new Date(tx.transactionDate),
        });
      }
    }

    // Sort merchants by total spending
    const topMerchants = Array.from(merchantMap.entries())
      .map(([name, data]) => ({
        name,
        total: data.total,
        count: data.count,
        average: data.total / data.count,
        lastDate: data.lastDate.toISOString().split("T")[0],
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, merchantLimit);

    // Get biggest single transactions
    const biggestTransactions = transactions.slice(0, transactionLimit).map((tx) => ({
      id: tx.id,
      description: tx.description,
      amount: Math.abs(Number(tx.amount)),
      date: new Date(tx.transactionDate).toISOString().split("T")[0],
      category: tx.category ? {
        name: tx.category.name,
        icon: tx.category.icon,
        color: tx.category.color,
      } : null,
    }));

    // Calculate averages
    const totalSpending = transactions.reduce((sum, tx) => sum + Math.abs(Number(tx.amount)), 0);
    const transactionCount = transactions.length;

    // Calculate date range for period
    let periodDays = 30;
    if (startDate && endDate) {
      periodDays = Math.ceil(
        (new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)
      ) || 1;
    }

    const averages = {
      daily: totalSpending / periodDays,
      weekly: (totalSpending / periodDays) * 7,
      monthly: (totalSpending / periodDays) * 30,
      perTransaction: transactionCount > 0 ? totalSpending / transactionCount : 0,
    };

    // Frequent merchants (by transaction count)
    const frequentMerchants = Array.from(merchantMap.entries())
      .map(([name, data]) => ({
        name,
        count: data.count,
        total: data.total,
        average: data.total / data.count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return NextResponse.json({
      topMerchants,
      biggestTransactions,
      frequentMerchants,
      averages,
      totals: {
        spending: totalSpending,
        transactions: transactionCount,
        uniqueMerchants: merchantMap.size,
      },
      period: {
        startDate: startDate || null,
        endDate: endDate || null,
        days: periodDays,
      },
    });
  } catch (error) {
    console.error("Error fetching top spending:", error);
    return NextResponse.json(
      { error: "Failed to fetch top spending data" },
      { status: 500 }
    );
  }
}
