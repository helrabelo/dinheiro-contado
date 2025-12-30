import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { CategoriesPageClient } from "./categories-page-client";

interface CategoriesPageProps {
  searchParams: Promise<{ tab?: string }>;
}

export default async function CategoriesPage({ searchParams }: CategoriesPageProps) {
  const session = await auth();
  const userId = session?.user?.id || "";
  const params = await searchParams;

  // Fetch categories with transaction counts and total spent
  const [categoriesWithStats, uncategorizedCount, patterns] = await Promise.all([
    prisma.category.findMany({
      where: {
        OR: [{ userId }, { isSystem: true }],
      },
      orderBy: [{ isSystem: "desc" }, { name: "asc" }],
      include: {
        _count: {
          select: { transactions: true },
        },
        transactions: {
          where: {
            userId,
            type: "DEBIT",
          },
          select: {
            amount: true,
          },
        },
      },
    }),
    prisma.transaction.count({
      where: {
        userId,
        categoryId: null,
      },
    }),
    // Fetch top patterns for the bulk tab
    prisma.$queryRaw<Array<{ pattern: string; count: bigint }>>`
      SELECT
        SUBSTRING(description FROM '^([^*]+)') as pattern,
        COUNT(*) as count
      FROM "Transaction"
      WHERE "userId" = ${userId}
        AND "categoryId" IS NULL
        AND description ~ '^[A-Z]{2,}[*]'
      GROUP BY SUBSTRING(description FROM '^([^*]+)')
      HAVING COUNT(*) >= 3
      ORDER BY count DESC
      LIMIT 20
    `.catch(() => []),
  ]);

  // Transform categories to include totalSpent
  const categories = categoriesWithStats.map((cat) => ({
    id: cat.id,
    name: cat.name,
    icon: cat.icon,
    color: cat.color,
    isSystem: cat.isSystem,
    _count: cat._count,
    totalSpent: cat.transactions.reduce((sum, tx) => sum + Math.abs(Number(tx.amount)), 0),
  }));

  // Calculate total spent across all categories
  const totalSpent = categories.reduce((sum, cat) => sum + (cat.totalSpent || 0), 0);

  // Transform patterns for the bulk tab
  const formattedPatterns = patterns.map((p) => ({
    pattern: p.pattern,
    count: Number(p.count),
    examples: [],
  }));

  // Get active tab from URL
  const activeTab = params.tab === "categorize" ? "categorize" : "manage";

  return (
    <CategoriesPageClient
      categories={categories}
      uncategorizedCount={uncategorizedCount}
      totalSpent={totalSpent}
      patterns={formattedPatterns}
      initialTab={activeTab}
    />
  );
}
