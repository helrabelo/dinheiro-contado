import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

interface PeriodData {
  credits: number;
  debits: number;
  net: number;
  count: number;
  categoryBreakdown: {
    categoryId: string | null;
    name: string;
    icon: string;
    color: string;
    amount: number;
    count: number;
  }[];
}

interface ComparisonResult {
  currentPeriod: PeriodData;
  previousPeriod: PeriodData;
  changes: {
    credits: { value: number; percentage: number };
    debits: { value: number; percentage: number };
    net: { value: number; percentage: number };
    count: { value: number; percentage: number };
  };
  period: {
    current: { startDate: string; endDate: string };
    previous: { startDate: string; endDate: string };
  };
}

async function getPeriodData(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<PeriodData> {
  const [transactions, categorySpending] = await Promise.all([
    prisma.transaction.findMany({
      where: {
        userId,
        transactionDate: { gte: startDate, lte: endDate },
      },
      select: { amount: true, type: true },
    }),
    // Note: Debits are stored as NEGATIVE numbers, so ASC gives us biggest expenses first
    prisma.transaction.groupBy({
      by: ["categoryId"],
      where: {
        userId,
        type: "DEBIT",
        transactionDate: { gte: startDate, lte: endDate },
      },
      _sum: { amount: true },
      _count: true,
      orderBy: { _sum: { amount: "asc" } },
      take: 5,
    }),
  ]);

  // Get category details
  const categoryIds = categorySpending
    .map((s) => s.categoryId)
    .filter((id): id is string => id !== null);

  const categories = await prisma.category.findMany({
    where: { id: { in: categoryIds } },
    select: { id: true, name: true, icon: true, color: true },
  });

  const categoryLookup = new Map(categories.map((c) => [c.id, c]));

  // Note: DEBIT amounts are stored as negative values in DB, use Math.abs()
  const credits = transactions
    .filter((t) => t.type === "CREDIT")
    .reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0);

  const debits = transactions
    .filter((t) => t.type === "DEBIT")
    .reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0);

  const categoryBreakdown = categorySpending.map((item) => {
    const category = item.categoryId ? categoryLookup.get(item.categoryId) : null;
    return {
      categoryId: item.categoryId,
      name: category?.name || "Sem categoria",
      icon: category?.icon || "❓",
      color: category?.color || "#9ca3af",
      amount: Math.abs(Number(item._sum.amount || 0)),
      count: item._count,
    };
  });

  return {
    credits,
    debits,
    net: credits - debits,
    count: transactions.length,
    categoryBreakdown,
  };
}

function calculateChange(current: number, previous: number) {
  const value = current - previous;
  const percentage = previous !== 0 ? ((current - previous) / previous) * 100 : 0;
  return { value, percentage };
}

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const comparison = searchParams.get("comparison") || "month"; // month, year, custom

  const now = new Date();
  let currentStart: Date;
  let currentEnd: Date;
  let previousStart: Date;
  let previousEnd: Date;

  switch (comparison) {
    case "year":
      // This year vs last year
      currentStart = new Date(now.getFullYear(), 0, 1);
      currentEnd = now;
      previousStart = new Date(now.getFullYear() - 1, 0, 1);
      previousEnd = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
      break;
    case "custom":
      // Custom date ranges from params
      const currentStartParam = searchParams.get("currentStart");
      const currentEndParam = searchParams.get("currentEnd");
      const previousStartParam = searchParams.get("previousStart");
      const previousEndParam = searchParams.get("previousEnd");

      if (!currentStartParam || !currentEndParam || !previousStartParam || !previousEndParam) {
        return NextResponse.json(
          { error: "Comparacao personalizada requer todas as datas" },
          { status: 400 }
        );
      }

      currentStart = new Date(currentStartParam);
      currentEnd = new Date(currentEndParam);
      previousStart = new Date(previousStartParam);
      previousEnd = new Date(previousEndParam);
      break;
    case "month":
    default:
      // This month vs last month
      currentStart = new Date(now.getFullYear(), now.getMonth(), 1);
      currentEnd = now;
      previousStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      previousEnd = new Date(now.getFullYear(), now.getMonth(), 0);
      break;
  }

  try {
    const [currentPeriod, previousPeriod] = await Promise.all([
      getPeriodData(session.user.id, currentStart, currentEnd),
      getPeriodData(session.user.id, previousStart, previousEnd),
    ]);

    const result: ComparisonResult = {
      currentPeriod,
      previousPeriod,
      changes: {
        credits: calculateChange(currentPeriod.credits, previousPeriod.credits),
        debits: calculateChange(currentPeriod.debits, previousPeriod.debits),
        net: calculateChange(currentPeriod.net, previousPeriod.net),
        count: calculateChange(currentPeriod.count, previousPeriod.count),
      },
      period: {
        current: {
          startDate: currentStart.toISOString().split("T")[0],
          endDate: currentEnd.toISOString().split("T")[0],
        },
        previous: {
          startDate: previousStart.toISOString().split("T")[0],
          endDate: previousEnd.toISOString().split("T")[0],
        },
      },
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching period comparison:", error);
    return NextResponse.json(
      { error: "Failed to fetch comparison data" },
      { status: 500 }
    );
  }
}
