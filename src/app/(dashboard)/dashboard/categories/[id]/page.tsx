import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { CategoryDetailCharts } from "./category-detail-charts";
import { CategoryDetailHeader } from "./category-detail-header";
import { CategoryTransactionList } from "./category-transaction-list";
import { CategoryDetailStats } from "./category-detail-stats";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function CategoryDetailPage({ params }: Props) {
  const session = await auth();
  const { id } = await params;
  const userId = session?.user?.id || "";

  // Get category details
  const category = await prisma.category.findFirst({
    where: {
      id,
      OR: [{ userId }, { isSystem: true }],
    },
  });

  if (!category) {
    notFound();
  }

  // Get transaction stats
  const [totalCount, debitCount, creditCount, totalSpent] = await Promise.all([
    prisma.transaction.count({
      where: { userId, categoryId: id },
    }),
    prisma.transaction.count({
      where: { userId, categoryId: id, type: "DEBIT" },
    }),
    prisma.transaction.count({
      where: { userId, categoryId: id, type: "CREDIT" },
    }),
    prisma.transaction.aggregate({
      where: { userId, categoryId: id },
      _sum: { amount: true },
    }),
  ]);

  // Get date range for all transactions in this category
  const dateRange = await prisma.transaction.aggregate({
    where: { userId, categoryId: id },
    _min: { transactionDate: true },
    _max: { transactionDate: true },
  });

  return (
    <div className="space-y-8">
      {/* Header with Edit */}
      <CategoryDetailHeader
        category={{
          id: category.id,
          name: category.name,
          icon: category.icon,
          color: category.color,
          isSystem: category.isSystem,
        }}
        totalCount={totalCount}
        transactionCount={totalCount}
      />

      {/* Summary Cards */}
      <CategoryDetailStats
        totalCount={totalCount}
        debitCount={debitCount}
        creditCount={creditCount}
        totalSpent={Math.abs(Number(totalSpent._sum.amount) || 0)}
        dateRangeMin={dateRange._min.transactionDate?.toISOString() || null}
        dateRangeMax={dateRange._max.transactionDate?.toISOString() || null}
      />

      {/* Charts and Details */}
      {totalCount > 0 && (
        <CategoryDetailCharts categoryId={id} categoryColor={category.color || "#10b981"} />
      )}

      {/* Full Transaction List with Filters */}
      {totalCount > 0 && (
        <CategoryTransactionList
          categoryId={id}
          categoryColor={category.color || "#10b981"}
        />
      )}

      {/* Empty State */}
      {totalCount === 0 && (
        <div className="bg-white rounded-xl p-8 border border-gray-200 text-center">
          <span className="text-6xl">{category.icon || "🏷️"}</span>
          <h3 className="mt-4 text-lg font-medium text-gray-900">
            Nenhuma transacao nesta categoria
          </h3>
          <p className="mt-2 text-gray-600">
            As transacoes serao exibidas aqui quando forem categorizadas.
          </p>
          <Link
            href="/dashboard/categories?tab=categorize"
            className="inline-block mt-4 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition"
          >
            Categorizar Transacoes
          </Link>
        </div>
      )}
    </div>
  );
}
