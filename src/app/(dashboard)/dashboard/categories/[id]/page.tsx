import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { CategoryDetailCharts } from "./category-detail-charts";

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function CategoryDetailPage({ params, searchParams }: Props) {
  const session = await auth();
  const { id } = await params;
  const search = await searchParams;

  // Get category details
  const category = await prisma.category.findFirst({
    where: {
      id,
      OR: [{ userId: session?.user?.id }, { isSystem: true }],
    },
  });

  if (!category) {
    notFound();
  }

  // Get transaction counts
  const [totalCount, debitCount, creditCount] = await Promise.all([
    prisma.transaction.count({
      where: { userId: session?.user?.id, categoryId: id },
    }),
    prisma.transaction.count({
      where: { userId: session?.user?.id, categoryId: id, type: "DEBIT" },
    }),
    prisma.transaction.count({
      where: { userId: session?.user?.id, categoryId: id, type: "CREDIT" },
    }),
  ]);

  // Get date range for all transactions in this category
  const dateRange = await prisma.transaction.aggregate({
    where: { userId: session?.user?.id, categoryId: id },
    _min: { transactionDate: true },
    _max: { transactionDate: true },
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/categories"
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <svg
              className="w-5 h-5 text-gray-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </Link>
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center text-2xl"
            style={{ backgroundColor: `${category.color}20` }}
          >
            {category.icon}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{category.name}</h1>
            <p className="text-gray-600">
              {totalCount.toLocaleString("pt-BR")} transacoes
            </p>
          </div>
        </div>
        <Link
          href={`/dashboard/transactions?categoryId=${id}`}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition"
        >
          Ver Transacoes
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <p className="text-sm text-gray-600">Total de Transacoes</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {totalCount.toLocaleString("pt-BR")}
          </p>
        </div>
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <p className="text-sm text-gray-600">Debitos</p>
          <p className="text-2xl font-bold text-red-600 mt-1">
            {debitCount.toLocaleString("pt-BR")}
          </p>
        </div>
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <p className="text-sm text-gray-600">Creditos</p>
          <p className="text-2xl font-bold text-green-600 mt-1">
            {creditCount.toLocaleString("pt-BR")}
          </p>
        </div>
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <p className="text-sm text-gray-600">Periodo</p>
          <p className="text-lg font-medium text-gray-900 mt-1">
            {dateRange._min.transactionDate
              ? new Date(dateRange._min.transactionDate).toLocaleDateString("pt-BR", {
                  month: "short",
                  year: "numeric",
                })
              : "-"}{" "}
            -{" "}
            {dateRange._max.transactionDate
              ? new Date(dateRange._max.transactionDate).toLocaleDateString("pt-BR", {
                  month: "short",
                  year: "numeric",
                })
              : "-"}
          </p>
        </div>
      </div>

      {/* Charts and Details */}
      {totalCount > 0 && (
        <CategoryDetailCharts categoryId={id} categoryColor={category.color || "#10b981"} />
      )}

      {/* Empty State */}
      {totalCount === 0 && (
        <div className="bg-white rounded-xl p-8 border border-gray-200 text-center">
          <span className="text-6xl">{category.icon}</span>
          <h3 className="mt-4 text-lg font-medium text-gray-900">
            Nenhuma transacao nesta categoria
          </h3>
          <p className="mt-2 text-gray-600">
            As transacoes serao exibidas aqui quando forem categorizadas.
          </p>
          <Link
            href="/dashboard/transactions"
            className="inline-block mt-4 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition"
          >
            Ver Transacoes
          </Link>
        </div>
      )}
    </div>
  );
}
