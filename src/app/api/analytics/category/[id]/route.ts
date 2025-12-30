import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: categoryId } = await params;
  const searchParams = request.nextUrl.searchParams;
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  // Build date filter
  const dateFilter: { gte?: Date; lte?: Date } = {};
  if (startDate) {
    dateFilter.gte = new Date(startDate);
  }
  if (endDate) {
    dateFilter.lte = new Date(endDate);
  }

  try {
    // Get category details
    const category = await prisma.category.findFirst({
      where: {
        id: categoryId,
        OR: [{ userId: session.user.id }, { isSystem: true }],
      },
    });

    if (!category) {
      return NextResponse.json({ error: "Categoria nao encontrada" }, { status: 404 });
    }

    // Get transactions in this category
    const transactions = await prisma.transaction.findMany({
      where: {
        userId: session.user.id,
        categoryId: categoryId,
        ...(Object.keys(dateFilter).length > 0 && { transactionDate: dateFilter }),
      },
      orderBy: { transactionDate: "desc" },
      select: {
        id: true,
        description: true,
        amount: true,
        type: true,
        transactionDate: true,
      },
    });

    // Calculate totals
    // Note: DEBIT amounts are stored as negative values in DB, use Math.abs()
    const totals = {
      credits: 0,
      debits: 0,
      count: transactions.length,
    };

    transactions.forEach((tx) => {
      if (tx.type === "CREDIT") {
        totals.credits += Math.abs(Number(tx.amount));
      } else {
        totals.debits += Math.abs(Number(tx.amount));
      }
    });

    // Group by month for trend chart
    const monthlyData = new Map<string, { credits: number; debits: number; count: number }>();

    transactions.forEach((tx) => {
      const date = new Date(tx.transactionDate);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const current = monthlyData.get(key) || { credits: 0, debits: 0, count: 0 };
      const amount = Math.abs(Number(tx.amount));

      if (tx.type === "CREDIT") {
        current.credits += amount;
      } else {
        current.debits += amount;
      }
      current.count += 1;

      monthlyData.set(key, current);
    });

    // Convert to array sorted by month
    const monthlyTrend = Array.from(monthlyData.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([period, values]) => {
        const [year, month] = period.split("-");
        const monthNames = [
          "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
          "Jul", "Ago", "Set", "Out", "Nov", "Dez",
        ];
        return {
          period,
          label: `${monthNames[parseInt(month) - 1]} ${year}`,
          credits: Math.round(values.credits * 100) / 100,
          debits: Math.round(values.debits * 100) / 100,
          total: Math.round((values.debits + values.credits) * 100) / 100,
          count: values.count,
        };
      });

    // Get top merchants (descriptions) in this category
    const merchantCounts = new Map<string, { count: number; total: number }>();

    transactions.forEach((tx) => {
      // Extract merchant from description (first part before common separators)
      const description = tx.description.toUpperCase();
      const current = merchantCounts.get(description) || { count: 0, total: 0 };
      current.count += 1;
      current.total += Math.abs(Number(tx.amount));
      merchantCounts.set(description, current);
    });

    const topMerchants = Array.from(merchantCounts.entries())
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 10)
      .map(([name, data]) => ({
        name,
        count: data.count,
        total: Math.round(data.total * 100) / 100,
      }));

    // Format transactions for response (limit to recent 50)
    const recentTransactions = transactions.slice(0, 50).map((tx) => ({
      id: tx.id,
      description: tx.description,
      amount: Math.abs(Number(tx.amount)),
      type: tx.type,
      date: tx.transactionDate.toISOString().split("T")[0],
    }));

    // Get highest and lowest transactions (debits only for spending categories)
    const debitTransactions = transactions.filter((tx) => tx.type === "DEBIT");
    const sortedByAmount = [...debitTransactions].sort(
      (a, b) => Math.abs(Number(b.amount)) - Math.abs(Number(a.amount))
    );

    const highestTransaction = sortedByAmount[0]
      ? {
          id: sortedByAmount[0].id,
          description: sortedByAmount[0].description,
          amount: Math.abs(Number(sortedByAmount[0].amount)),
          date: sortedByAmount[0].transactionDate.toISOString().split("T")[0],
        }
      : null;

    const lowestTransaction = sortedByAmount[sortedByAmount.length - 1]
      ? {
          id: sortedByAmount[sortedByAmount.length - 1].id,
          description: sortedByAmount[sortedByAmount.length - 1].description,
          amount: Math.abs(Number(sortedByAmount[sortedByAmount.length - 1].amount)),
          date: sortedByAmount[sortedByAmount.length - 1].transactionDate.toISOString().split("T")[0],
        }
      : null;

    // Get most common transactions (by description pattern)
    const descriptionCounts = new Map<string, { count: number; totalAmount: number; lastDate: string }>();
    debitTransactions.forEach((tx) => {
      const desc = tx.description.trim();
      const current = descriptionCounts.get(desc) || { count: 0, totalAmount: 0, lastDate: "" };
      current.count += 1;
      current.totalAmount += Math.abs(Number(tx.amount));
      const txDate = tx.transactionDate.toISOString().split("T")[0];
      if (!current.lastDate || txDate > current.lastDate) {
        current.lastDate = txDate;
      }
      descriptionCounts.set(desc, current);
    });

    const mostCommonTransactions = Array.from(descriptionCounts.entries())
      .filter(([, data]) => data.count >= 2) // At least 2 occurrences to be "common"
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 5)
      .map(([description, data]) => ({
        description,
        count: data.count,
        totalAmount: Math.round(data.totalAmount * 100) / 100,
        averageAmount: Math.round((data.totalAmount / data.count) * 100) / 100,
        lastDate: data.lastDate,
      }));

    return NextResponse.json({
      category: {
        id: category.id,
        name: category.name,
        icon: category.icon,
        color: category.color,
      },
      totals: {
        credits: Math.round(totals.credits * 100) / 100,
        debits: Math.round(totals.debits * 100) / 100,
        net: Math.round((totals.credits - totals.debits) * 100) / 100,
        count: totals.count,
      },
      monthlyTrend,
      topMerchants,
      recentTransactions,
      transactionInsights: {
        highest: highestTransaction,
        lowest: lowestTransaction,
        mostCommon: mostCommonTransactions,
      },
      period: {
        startDate: startDate || null,
        endDate: endDate || null,
      },
    });
  } catch (error) {
    console.error("Error fetching category analytics:", error);
    return NextResponse.json(
      { error: "Failed to fetch category data" },
      { status: 500 }
    );
  }
}
