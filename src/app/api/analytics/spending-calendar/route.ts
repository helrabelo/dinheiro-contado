import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const startDateStr = searchParams.get("startDate");
  const endDateStr = searchParams.get("endDate");

  if (!startDateStr || !endDateStr) {
    return NextResponse.json(
      { error: "startDate and endDate are required" },
      { status: 400 }
    );
  }

  const startDate = new Date(startDateStr);
  const endDate = new Date(endDateStr);
  endDate.setHours(23, 59, 59, 999);

  try {
    // Get all transactions for the date range
    const transactions = await prisma.transaction.findMany({
      where: {
        userId: session.user.id,
        transactionDate: { gte: startDate, lte: endDate },
      },
      select: {
        amount: true,
        type: true,
        transactionDate: true,
      },
    });

    // Group by date
    const dailyData = new Map<
      string,
      { spending: number; income: number; count: number }
    >();

    for (const tx of transactions) {
      const dateKey = new Date(tx.transactionDate).toISOString().split("T")[0];
      const existing = dailyData.get(dateKey) || {
        spending: 0,
        income: 0,
        count: 0,
      };

      if (tx.type === "DEBIT") {
        existing.spending += Math.abs(Number(tx.amount));
      } else {
        existing.income += Math.abs(Number(tx.amount));
      }
      existing.count += 1;

      dailyData.set(dateKey, existing);
    }

    // Convert to array
    const calendarData = Array.from(dailyData.entries()).map(
      ([date, data]) => ({
        date,
        spending: data.spending,
        income: data.income,
        count: data.count,
        net: data.income - data.spending,
      })
    );

    // Calculate statistics
    const allSpending = calendarData
      .map((d) => d.spending)
      .filter((s) => s > 0);
    const maxSpending =
      allSpending.length > 0 ? Math.max(...allSpending) : 0;
    const avgSpending =
      allSpending.length > 0
        ? allSpending.reduce((a, b) => a + b, 0) / allSpending.length
        : 0;

    return NextResponse.json({
      data: calendarData,
      stats: {
        maxSpending,
        avgSpending,
        totalDays: calendarData.length,
        daysWithSpending: allSpending.length,
      },
    });
  } catch (error) {
    console.error("Error fetching calendar data:", error);
    return NextResponse.json(
      { error: "Failed to fetch calendar data" },
      { status: 500 }
    );
  }
}
