import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

type GroupBy = "day" | "week" | "month" | "year";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  const groupBy = (searchParams.get("groupBy") as GroupBy) || "month";

  // Build date filter
  const dateFilter: { gte?: Date; lte?: Date } = {};
  if (startDate) {
    dateFilter.gte = new Date(startDate);
  }
  if (endDate) {
    dateFilter.lte = new Date(endDate);
  }

  try {
    // Get all transactions in the period
    const transactions = await prisma.transaction.findMany({
      where: {
        userId: session.user.id,
        ...(Object.keys(dateFilter).length > 0 && { transactionDate: dateFilter }),
      },
      select: {
        transactionDate: true,
        amount: true,
        type: true,
      },
      orderBy: { transactionDate: "asc" },
    });

    // Group transactions by period
    const groupedData = new Map<
      string,
      { credits: number; debits: number; net: number; count: number }
    >();

    transactions.forEach((tx) => {
      const date = new Date(tx.transactionDate);
      let key: string;

      switch (groupBy) {
        case "day":
          key = date.toISOString().split("T")[0];
          break;
        case "week":
          // Get ISO week
          const d = new Date(date);
          d.setHours(0, 0, 0, 0);
          d.setDate(d.getDate() + 4 - (d.getDay() || 7));
          const yearStart = new Date(d.getFullYear(), 0, 1);
          const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
          key = `${d.getFullYear()}-W${String(weekNo).padStart(2, "0")}`;
          break;
        case "month":
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
          break;
        case "year":
          key = String(date.getFullYear());
          break;
        default:
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      }

      const current = groupedData.get(key) || { credits: 0, debits: 0, net: 0, count: 0 };
      // Note: DEBIT amounts are stored as negative values in DB, use Math.abs()
      const amount = Math.abs(Number(tx.amount));

      if (tx.type === "CREDIT") {
        current.credits += amount;
      } else {
        current.debits += amount;
      }
      current.net = current.credits - current.debits;
      current.count += 1;

      groupedData.set(key, current);
    });

    // Convert to array and format for Recharts
    const data = Array.from(groupedData.entries()).map(([period, values]) => ({
      period,
      label: formatPeriodLabel(period, groupBy),
      credits: Math.round(values.credits * 100) / 100,
      debits: Math.round(values.debits * 100) / 100,
      net: Math.round(values.net * 100) / 100,
      count: values.count,
    }));

    // Calculate totals and averages
    const totals = {
      credits: data.reduce((sum, d) => sum + d.credits, 0),
      debits: data.reduce((sum, d) => sum + d.debits, 0),
      net: data.reduce((sum, d) => sum + d.net, 0),
      count: data.reduce((sum, d) => sum + d.count, 0),
    };

    const averages = {
      credits: data.length > 0 ? totals.credits / data.length : 0,
      debits: data.length > 0 ? totals.debits / data.length : 0,
      net: data.length > 0 ? totals.net / data.length : 0,
    };

    return NextResponse.json({
      data,
      totals,
      averages,
      groupBy,
      period: {
        startDate: startDate || null,
        endDate: endDate || null,
      },
    });
  } catch (error) {
    console.error("Error fetching spending over time:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics data" },
      { status: 500 }
    );
  }
}

function formatPeriodLabel(period: string, groupBy: GroupBy): string {
  switch (groupBy) {
    case "day":
      return new Date(period).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "short",
      });
    case "week":
      return period.replace("-W", " Sem ");
    case "month":
      const [year, month] = period.split("-");
      const monthNames = [
        "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
        "Jul", "Ago", "Set", "Out", "Nov", "Dez",
      ];
      return `${monthNames[parseInt(month) - 1]} ${year}`;
    case "year":
      return period;
    default:
      return period;
  }
}
