import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

// Pattern detection - extracts common prefixes from transaction descriptions
function detectPatterns(descriptions: string[]): Map<string, { pattern: string; count: number; examples: string[] }> {
  const patterns = new Map<string, { pattern: string; count: number; examples: string[] }>();

  for (const desc of descriptions) {
    // Try different pattern strategies
    const cleanDesc = desc.toUpperCase().trim();

    // Strategy 1: Look for common prefixes (first word or first N chars before space/*)
    const firstWordMatch = cleanDesc.match(/^([A-Z0-9]+[\*\s])/);
    if (firstWordMatch) {
      const prefix = firstWordMatch[1].replace(/[\*\s]+$/, "");
      if (prefix.length >= 2) {
        const existing = patterns.get(prefix);
        if (existing) {
          existing.count++;
          if (existing.examples.length < 3 && !existing.examples.includes(desc)) {
            existing.examples.push(desc);
          }
        } else {
          patterns.set(prefix, { pattern: prefix, count: 1, examples: [desc] });
        }
        continue;
      }
    }

    // Strategy 2: First 3-6 characters as prefix
    const shortPrefix = cleanDesc.substring(0, Math.min(6, cleanDesc.length)).replace(/\s+$/, "");
    if (shortPrefix.length >= 3) {
      const existing = patterns.get(shortPrefix);
      if (existing) {
        existing.count++;
        if (existing.examples.length < 3 && !existing.examples.includes(desc)) {
          existing.examples.push(desc);
        }
      } else {
        patterns.set(shortPrefix, { pattern: shortPrefix, count: 1, examples: [desc] });
      }
    }
  }

  return patterns;
}

// GET - Get patterns from uncategorized transactions
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  try {
    // Get all uncategorized transactions
    const uncategorized = await prisma.transaction.findMany({
      where: {
        userId: session.user.id,
        categoryId: null,
      },
      select: {
        id: true,
        description: true,
        amount: true,
        transactionDate: true,
      },
      orderBy: { transactionDate: "desc" },
    });

    // Detect patterns
    const descriptions = uncategorized.map((tx) => tx.description);
    const patternsMap = detectPatterns(descriptions);

    // Filter to only patterns with 2+ occurrences and sort by count
    const significantPatterns = Array.from(patternsMap.values())
      .filter((p) => p.count >= 2)
      .sort((a, b) => b.count - a.count)
      .slice(0, 50); // Limit to top 50 patterns

    // Get categories for suggestions
    const categories = await prisma.category.findMany({
      where: {
        OR: [{ userId: session.user.id }, { isSystem: true }],
      },
      orderBy: { name: "asc" },
      select: { id: true, name: true, icon: true, color: true },
    });

    return NextResponse.json({
      totalUncategorized: uncategorized.length,
      patterns: significantPatterns,
      categories,
    });
  } catch (error) {
    console.error("Error detecting patterns:", error);
    return NextResponse.json(
      { error: "Erro ao detectar padroes" },
      { status: 500 }
    );
  }
}

// POST - Apply batch categorization by pattern or search
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { pattern, search, categoryId, preview, includeAll, offset = 0, limit = 50 } = body as {
      pattern?: string;
      search?: string;
      categoryId?: string;
      preview?: boolean;
      includeAll?: boolean; // Include already categorized transactions
      offset?: number;
      limit?: number;
    };

    const searchTerm = search || pattern;

    if (!searchTerm) {
      return NextResponse.json(
        { error: "Termo de busca e obrigatorio" },
        { status: 400 }
      );
    }

    // Category is only required when applying (not preview)
    if (!preview && !categoryId) {
      return NextResponse.json(
        { error: "Categoria e obrigatoria para aplicar" },
        { status: 400 }
      );
    }

    // Verify category exists if provided
    let category = null;
    if (categoryId) {
      category = await prisma.category.findFirst({
        where: {
          id: categoryId,
          OR: [{ userId: session.user.id }, { isSystem: true }],
        },
      });

      if (!category) {
        return NextResponse.json(
          { error: "Categoria nao encontrada" },
          { status: 404 }
        );
      }
    }

    // Build where clause based on search type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const whereClause: any = {
      userId: session.user.id,
    };

    // Only filter uncategorized if not includeAll
    if (!includeAll) {
      whereClause.categoryId = null;
    }

    // Handle pattern (e.g., "IFD*") vs search (contains)
    if (pattern) {
      // Pattern matching - startsWith
      const cleanPattern = pattern.replace(/\*+$/, "");
      whereClause.description = {
        startsWith: cleanPattern,
        mode: "insensitive",
      };
    } else if (search) {
      // Search - contains anywhere
      whereClause.description = {
        contains: search,
        mode: "insensitive",
      };
    }

    // If preview mode, return paginated results
    if (preview) {
      // Get total count and total amount first
      const [totalCount, totalAmountResult] = await Promise.all([
        prisma.transaction.count({ where: whereClause }),
        prisma.transaction.aggregate({
          where: whereClause,
          _sum: { amount: true },
        }),
      ]);

      // Get paginated transactions
      const matchingTransactions = await prisma.transaction.findMany({
        where: whereClause,
        select: {
          id: true,
          description: true,
          amount: true,
          transactionDate: true,
          category: {
            select: {
              name: true,
            },
          },
        },
        orderBy: { transactionDate: "desc" },
        skip: offset,
        take: limit,
      });

      return NextResponse.json({
        searchTerm,
        categoryId: categoryId || null,
        categoryName: category?.name || null,
        matchCount: totalCount,
        matches: matchingTransactions.map((tx) => ({
          id: tx.id,
          description: tx.description,
          amount: Math.abs(Number(tx.amount)),
          date: tx.transactionDate.toISOString().split("T")[0],
          currentCategory: tx.category?.name || null,
        })),
        totalAmount: Math.abs(Number(totalAmountResult._sum.amount) || 0),
        hasMore: offset + matchingTransactions.length < totalCount,
        offset,
      });
    }

    // For applying, get all matching transaction IDs
    const matchingTransactions = await prisma.transaction.findMany({
      where: whereClause,
      select: { id: true },
    });

    // Apply categorization (category is guaranteed to exist here due to earlier check)
    const result = await prisma.transaction.updateMany({
      where: {
        id: { in: matchingTransactions.map((tx) => tx.id) },
      },
      data: {
        categoryId: category!.id,
      },
    });

    return NextResponse.json({
      success: true,
      searchTerm,
      categoryName: category!.name,
      updatedCount: result.count,
    });
  } catch (error) {
    console.error("Error batch categorizing:", error);
    return NextResponse.json(
      { error: "Erro ao categorizar em lote" },
      { status: 500 }
    );
  }
}
