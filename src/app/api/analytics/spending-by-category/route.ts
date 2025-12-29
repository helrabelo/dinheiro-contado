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
  const limit = parseInt(searchParams.get("limit") || "10");

  // Build date filter
  const dateFilter: { gte?: Date; lte?: Date } = {};
  if (startDate) {
    dateFilter.gte = new Date(startDate);
  }
  if (endDate) {
    dateFilter.lte = new Date(endDate);
  }

  try {
    // Get spending grouped by category
    const spendingByCategory = await prisma.transaction.groupBy({
      by: ["categoryId"],
      where: {
        userId: session.user.id,
        type: "DEBIT",
        ...(Object.keys(dateFilter).length > 0 && { transactionDate: dateFilter }),
      },
      _sum: { amount: true },
      _count: true,
      orderBy: { _sum: { amount: "desc" } },
      take: limit,
    });

    // Get category details
    const categoryIds = spendingByCategory
      .map((s) => s.categoryId)
      .filter((id): id is string => id !== null);

    const categories = await prisma.category.findMany({
      where: { id: { in: categoryIds } },
      select: { id: true, name: true, icon: true, color: true },
    });

    const categoryLookup = new Map(categories.map((c) => [c.id, c]));

    // Calculate total for percentages
    // Note: DEBIT amounts are stored as negative values in DB, use Math.abs()
    const total = spendingByCategory.reduce(
      (sum, item) => sum + Math.abs(Number(item._sum.amount || 0)),
      0
    );

    // Get uncategorized amount
    const uncategorizedSpending = spendingByCategory.find((s) => s.categoryId === null);
    const uncategorizedAmount = Math.abs(Number(uncategorizedSpending?._sum.amount || 0));

    // Format response
    const data = spendingByCategory
      .filter((item) => item.categoryId !== null)
      .map((item) => {
        const category = categoryLookup.get(item.categoryId!);
        const amount = Math.abs(Number(item._sum.amount || 0));
        return {
          categoryId: item.categoryId,
          name: category?.name || "Desconhecido",
          icon: category?.icon || "📦",
          color: category?.color || "#6b7280",
          amount,
          count: item._count,
          percentage: total > 0 ? (amount / total) * 100 : 0,
        };
      });

    // Add uncategorized if exists
    if (uncategorizedAmount > 0) {
      data.push({
        categoryId: null,
        name: "Sem categoria",
        icon: "❓",
        color: "#9ca3af",
        amount: uncategorizedAmount,
        count: uncategorizedSpending?._count || 0,
        percentage: total > 0 ? (uncategorizedAmount / total) * 100 : 0,
      });
    }

    return NextResponse.json({
      data,
      total,
      period: {
        startDate: startDate || null,
        endDate: endDate || null,
      },
    });
  } catch (error) {
    console.error("Error fetching spending by category:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics data" },
      { status: 500 }
    );
  }
}
