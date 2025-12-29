import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { findCategory, CATEGORY_PATTERNS } from "@/lib/categorization";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { dryRun = false, minConfidence = "low" } = body;

    // Get uncategorized transactions
    const transactions = await prisma.transaction.findMany({
      where: {
        userId: session.user.id,
        categoryId: null,
      },
      select: {
        id: true,
        description: true,
        originalDescription: true,
      },
    });

    // Get or create categories
    const categoryMap = new Map<string, string>();

    // First, check which categories already exist
    const existingCategories = await prisma.category.findMany({
      where: {
        OR: [{ userId: session.user.id }, { isSystem: true }],
      },
      select: { id: true, name: true },
    });

    for (const cat of existingCategories) {
      categoryMap.set(cat.name.toLowerCase(), cat.id);
    }

    // Categorize transactions
    const results = {
      total: transactions.length,
      categorized: 0,
      skipped: 0,
      byCategory: {} as Record<string, number>,
      createdCategories: [] as string[],
    };

    const updates: Array<{ id: string; categoryId: string; categoryName: string }> = [];

    for (const tx of transactions) {
      // Try original description first, then cleaned description
      const match =
        findCategory(tx.originalDescription) || findCategory(tx.description);

      if (!match) {
        results.skipped++;
        continue;
      }

      // Filter by confidence
      if (minConfidence === "high" && match.confidence !== "high") {
        results.skipped++;
        continue;
      }
      if (
        minConfidence === "medium" &&
        match.confidence === "low"
      ) {
        results.skipped++;
        continue;
      }

      // Check if category exists, create if not
      let categoryId = categoryMap.get(match.category.toLowerCase());

      if (!categoryId && !dryRun) {
        // Create the category
        const newCategory = await prisma.category.create({
          data: {
            userId: session.user.id,
            name: match.category,
            isSystem: false,
          },
        });
        categoryId = newCategory.id;
        categoryMap.set(match.category.toLowerCase(), categoryId);
        results.createdCategories.push(match.category);
      }

      if (categoryId) {
        updates.push({
          id: tx.id,
          categoryId,
          categoryName: match.category,
        });
        results.byCategory[match.category] =
          (results.byCategory[match.category] || 0) + 1;
      }
    }

    // Apply updates if not dry run
    if (!dryRun && updates.length > 0) {
      // Update in batches of 100
      const batchSize = 100;
      for (let i = 0; i < updates.length; i += batchSize) {
        const batch = updates.slice(i, i + batchSize);
        await Promise.all(
          batch.map((update) =>
            prisma.transaction.update({
              where: { id: update.id },
              data: { categoryId: update.categoryId },
            })
          )
        );
      }
      results.categorized = updates.length;
    } else if (dryRun) {
      results.categorized = updates.length;
    }

    return NextResponse.json({
      success: true,
      dryRun,
      message: dryRun
        ? `Would categorize ${results.categorized} of ${results.total} transactions`
        : `Categorized ${results.categorized} of ${results.total} transactions`,
      results,
    });
  } catch (error) {
    console.error("Categorization error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET to see available categories and patterns
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get uncategorized transaction count
    const uncategorizedCount = await prisma.transaction.count({
      where: {
        userId: session.user.id,
        categoryId: null,
      },
    });

    // Get category counts
    const categoryCounts = await prisma.transaction.groupBy({
      by: ["categoryId"],
      where: {
        userId: session.user.id,
        categoryId: { not: null },
      },
      _count: true,
    });

    return NextResponse.json({
      uncategorizedCount,
      categoryCounts,
      availablePatterns: Object.keys(CATEGORY_PATTERNS),
    });
  } catch (error) {
    console.error("Stats error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
