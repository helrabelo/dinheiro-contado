import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

interface RecurringGroup {
  description: string;
  normalizedDescription: string;
  amount: number;
  frequency: "monthly" | "weekly" | "bi-weekly" | "irregular";
  occurrences: number;
  months: string[];
  lastSeen: string;
  nextExpected: string | null;
  category: { name: string; icon: string | null; color: string | null } | null;
  confidence: number; // 0-100
  annualCost: number;
}

function normalizeDescription(desc: string): string {
  return desc
    .replace(/\d{2}\/\d{2}/g, "") // Remove dates like 01/12
    .replace(/\*\d+/g, "") // Remove *1234 patterns
    .replace(/\d{4,}/g, "") // Remove long numbers
    .replace(/(?:PARCELA\s+)?\d{1,2}[/\\]\d{1,2}/gi, "") // Remove installments
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function calculateFrequency(dates: Date[]): "monthly" | "weekly" | "bi-weekly" | "irregular" {
  if (dates.length < 2) return "irregular";

  // Sort dates
  const sorted = [...dates].sort((a, b) => a.getTime() - b.getTime());

  // Calculate average days between transactions
  let totalDays = 0;
  for (let i = 1; i < sorted.length; i++) {
    totalDays += (sorted[i].getTime() - sorted[i - 1].getTime()) / (1000 * 60 * 60 * 24);
  }
  const avgDays = totalDays / (sorted.length - 1);

  if (avgDays >= 25 && avgDays <= 35) return "monthly";
  if (avgDays >= 5 && avgDays <= 9) return "weekly";
  if (avgDays >= 12 && avgDays <= 18) return "bi-weekly";
  return "irregular";
}

function calculateNextExpected(dates: Date[], frequency: string): string | null {
  if (frequency === "irregular" || dates.length === 0) return null;

  const sorted = [...dates].sort((a, b) => b.getTime() - a.getTime());
  const lastDate = sorted[0];

  const daysToAdd = frequency === "monthly" ? 30 : frequency === "weekly" ? 7 : 14;
  const nextDate = new Date(lastDate);
  nextDate.setDate(nextDate.getDate() + daysToAdd);

  return nextDate.toISOString().split("T")[0];
}

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const minOccurrences = parseInt(searchParams.get("minOccurrences") || "3");
  const monthsBack = parseInt(searchParams.get("monthsBack") || "12");

  try {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - monthsBack);

    // Get all debit transactions in the period (excluding installments)
    const transactions = await prisma.transaction.findMany({
      where: {
        userId: session.user.id,
        type: "DEBIT",
        transactionDate: { gte: startDate },
        installmentTotal: null, // Exclude installments
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
      orderBy: { transactionDate: "desc" },
    });

    // Group by normalized description + amount (with 5% tolerance)
    const groups = new Map<string, {
      description: string;
      normalizedDescription: string;
      amounts: number[];
      dates: Date[];
      category: { name: string; icon: string | null; color: string | null } | null;
    }>();

    for (const tx of transactions) {
      const normalized = normalizeDescription(tx.description);
      const amount = Math.abs(Number(tx.amount));

      // Find existing group with similar amount (within 5%)
      let foundKey: string | null = null;
      for (const [key, group] of groups) {
        if (group.normalizedDescription === normalized) {
          const avgAmount = group.amounts.reduce((a, b) => a + b, 0) / group.amounts.length;
          if (Math.abs(amount - avgAmount) / avgAmount <= 0.05) {
            foundKey = key;
            break;
          }
        }
      }

      if (foundKey) {
        const group = groups.get(foundKey)!;
        group.amounts.push(amount);
        group.dates.push(tx.transactionDate);
        if (!group.category && tx.category) {
          group.category = tx.category;
        }
      } else {
        const key = `${normalized}|${amount.toFixed(0)}`;
        groups.set(key, {
          description: tx.description,
          normalizedDescription: normalized,
          amounts: [amount],
          dates: [tx.transactionDate],
          category: tx.category,
        });
      }
    }

    // Filter to recurring (3+ occurrences) and build response
    const recurring: RecurringGroup[] = [];

    for (const group of groups.values()) {
      if (group.amounts.length < minOccurrences) continue;

      const avgAmount = group.amounts.reduce((a, b) => a + b, 0) / group.amounts.length;
      const frequency = calculateFrequency(group.dates);

      // Get unique months
      const months = [...new Set(group.dates.map(d =>
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
      ))].sort();

      // Calculate confidence based on regularity
      let confidence = Math.min(100, group.amounts.length * 15);
      if (frequency === "monthly") confidence += 20;
      if (frequency !== "irregular") confidence = Math.min(100, confidence);

      // Calculate annual cost
      const multiplier = frequency === "monthly" ? 12 : frequency === "weekly" ? 52 : frequency === "bi-weekly" ? 26 : months.length;
      const annualCost = avgAmount * multiplier;

      recurring.push({
        description: group.description
          .replace(/(?:PARCELA\s+)?\d{1,2}[/\\]\d{1,2}/gi, "")
          .trim(),
        normalizedDescription: group.normalizedDescription,
        amount: Math.round(avgAmount * 100) / 100,
        frequency,
        occurrences: group.amounts.length,
        months,
        lastSeen: group.dates.sort((a, b) => b.getTime() - a.getTime())[0].toISOString().split("T")[0],
        nextExpected: calculateNextExpected(group.dates, frequency),
        category: group.category,
        confidence,
        annualCost: Math.round(annualCost * 100) / 100,
      });
    }

    // Sort by annual cost (highest first)
    recurring.sort((a, b) => b.annualCost - a.annualCost);

    // Calculate summary stats
    const monthlyTotal = recurring
      .filter(r => r.frequency === "monthly")
      .reduce((sum, r) => sum + r.amount, 0);

    const annualTotal = recurring.reduce((sum, r) => sum + r.annualCost, 0);

    return NextResponse.json({
      recurring,
      summary: {
        count: recurring.length,
        monthlyTotal,
        annualTotal,
        topCategories: getTopCategories(recurring),
      },
    });
  } catch (error) {
    console.error("Error detecting recurring transactions:", error);
    return NextResponse.json(
      { error: "Failed to detect recurring transactions" },
      { status: 500 }
    );
  }
}

function getTopCategories(recurring: RecurringGroup[]): { name: string; total: number }[] {
  const categoryTotals = new Map<string, number>();

  for (const r of recurring) {
    const name = r.category?.name || "Sem categoria";
    categoryTotals.set(name, (categoryTotals.get(name) || 0) + r.annualCost);
  }

  return Array.from(categoryTotals.entries())
    .map(([name, total]) => ({ name, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);
}
