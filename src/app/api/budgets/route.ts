import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

// GET all budgets with spending data
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get current month dates
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Get all budgets with category info
    const budgets = await prisma.budget.findMany({
      where: {
        userId: session.user.id,
        isActive: true,
      },
      include: {
        category: {
          select: { id: true, name: true, icon: true, color: true },
        },
      },
    });

    // Get spending per category for this month
    const spending = await prisma.transaction.groupBy({
      by: ["categoryId"],
      where: {
        userId: session.user.id,
        type: "DEBIT",
        transactionDate: { gte: monthStart, lte: monthEnd },
        categoryId: { in: budgets.map((b) => b.categoryId) },
      },
      _sum: { amount: true },
    });

    const spendingMap = new Map(
      spending.map((s) => [s.categoryId, Math.abs(Number(s._sum.amount) || 0)])
    );

    // Build response with spending data
    const budgetsWithSpending = budgets.map((budget) => {
      const spent = spendingMap.get(budget.categoryId) || 0;
      const limit = Number(budget.amount);
      const percentage = limit > 0 ? (spent / limit) * 100 : 0;

      let status: "ok" | "warning" | "exceeded" = "ok";
      if (percentage >= 100) status = "exceeded";
      else if (percentage >= 80) status = "warning";

      return {
        id: budget.id,
        categoryId: budget.categoryId,
        category: budget.category,
        limit,
        spent,
        remaining: Math.max(0, limit - spent),
        percentage: Math.round(percentage * 10) / 10,
        status,
        alertAt80: budget.alertAt80,
        alertAt100: budget.alertAt100,
      };
    });

    // Sort by percentage (highest first)
    budgetsWithSpending.sort((a, b) => b.percentage - a.percentage);

    return NextResponse.json({
      budgets: budgetsWithSpending,
      period: {
        start: monthStart.toISOString(),
        end: monthEnd.toISOString(),
        month: now.toLocaleDateString("pt-BR", { month: "long", year: "numeric" }),
      },
    });
  } catch (error) {
    console.error("Error fetching budgets:", error);
    return NextResponse.json(
      { error: "Failed to fetch budgets" },
      { status: 500 }
    );
  }
}

// POST create a new budget
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { categoryId, amount, alertAt80 = true, alertAt100 = true } = body;

    if (!categoryId || !amount) {
      return NextResponse.json(
        { error: "categoryId and amount are required" },
        { status: 400 }
      );
    }

    // Check if budget already exists
    const existing = await prisma.budget.findUnique({
      where: {
        userId_categoryId: {
          userId: session.user.id,
          categoryId,
        },
      },
    });

    if (existing) {
      // Update existing budget
      const updated = await prisma.budget.update({
        where: { id: existing.id },
        data: { amount, alertAt80, alertAt100, isActive: true },
        include: { category: { select: { name: true, icon: true, color: true } } },
      });
      return NextResponse.json(updated);
    }

    // Create new budget
    const budget = await prisma.budget.create({
      data: {
        userId: session.user.id,
        categoryId,
        amount,
        alertAt80,
        alertAt100,
      },
      include: { category: { select: { name: true, icon: true, color: true } } },
    });

    return NextResponse.json(budget, { status: 201 });
  } catch (error) {
    console.error("Error creating budget:", error);
    return NextResponse.json(
      { error: "Failed to create budget" },
      { status: 500 }
    );
  }
}
