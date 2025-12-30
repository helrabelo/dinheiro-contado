import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { TransactionFilters } from "@/components/dashboard/transaction-filters";
import { TransactionList } from "@/components/dashboard/transaction-list";
import { TransactionsStats } from "@/components/dashboard/transactions-stats";
import { UploadButton } from "@/components/dashboard/upload-button";
import { Prisma } from "@prisma/client";

const ITEMS_PER_PAGE = 50;

interface SearchParams {
  search?: string;
  type?: string;
  categoryId?: string;
  startDate?: string;
  endDate?: string;
  minAmount?: string;
  maxAmount?: string;
  hasInstallments?: string;
  statementId?: string;
  page?: string;
}

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await auth();
  const params = await searchParams;

  // Parse pagination
  const currentPage = Math.max(1, parseInt(params.page || "1", 10));
  const skip = (currentPage - 1) * ITEMS_PER_PAGE;

  // Build where clause from filters
  const where: Prisma.TransactionWhereInput = {
    userId: session?.user?.id || "",
  };

  if (params.type && params.type !== "ALL") {
    where.type = params.type as "CREDIT" | "DEBIT" | "TRANSFER";
  }

  if (params.categoryId && params.categoryId !== "ALL") {
    if (params.categoryId === "UNCATEGORIZED") {
      where.categoryId = null;
    } else {
      where.categoryId = params.categoryId;
    }
  }

  if (params.startDate || params.endDate) {
    where.transactionDate = {};
    if (params.startDate) {
      where.transactionDate.gte = new Date(params.startDate);
    }
    if (params.endDate) {
      where.transactionDate.lte = new Date(params.endDate);
    }
  }

  if (params.minAmount || params.maxAmount) {
    where.amount = {};
    if (params.minAmount) {
      // Use negative value for debits since they're stored as negative
      where.amount.lte = -parseFloat(params.minAmount);
    }
    if (params.maxAmount) {
      where.amount.gte = -parseFloat(params.maxAmount);
    }
  }

  if (params.statementId) {
    where.statementId = params.statementId;
  }

  if (params.hasInstallments === "YES") {
    where.installmentTotal = { not: null };
  } else if (params.hasInstallments === "NO") {
    where.installmentTotal = null;
  }

  if (params.search) {
    where.OR = [
      { description: { contains: params.search, mode: "insensitive" } },
    ];
  }

  // Date ranges for stats
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfYear = new Date(now.getFullYear(), 0, 1);

  // Build filtered where clauses for year/month (respecting search filters)
  const whereYear: Prisma.TransactionWhereInput = {
    ...where,
    transactionDate: { gte: startOfYear },
  };
  const whereMonth: Prisma.TransactionWhereInput = {
    ...where,
    transactionDate: { gte: startOfMonth },
  };

  const [
    transactions,
    filteredCount,
    filteredDebits,
    filteredCredits,
    yearDebits,
    monthDebits,
    categories,
  ] = await Promise.all([
    prisma.transaction.findMany({
      where,
      orderBy: { transactionDate: "desc" },
      include: {
        statement: {
          select: {
            originalFileName: true,
          },
        },
        category: {
          select: {
            name: true,
            icon: true,
            color: true,
          },
        },
      },
      skip,
      take: ITEMS_PER_PAGE,
    }),
    // Count for filtered results
    prisma.transaction.count({ where }),
    // Sum of debits for filtered results
    prisma.transaction.aggregate({
      where: { ...where, type: "DEBIT" },
      _sum: { amount: true },
    }),
    // Sum of credits for filtered results
    prisma.transaction.aggregate({
      where: { ...where, type: "CREDIT" },
      _sum: { amount: true },
    }),
    // Year debits (with search filter applied)
    prisma.transaction.aggregate({
      where: { ...whereYear, type: "DEBIT" },
      _sum: { amount: true },
    }),
    // Month debits (with search filter applied)
    prisma.transaction.aggregate({
      where: { ...whereMonth, type: "DEBIT" },
      _sum: { amount: true },
    }),
    // Get all categories for the filter dropdown and inline editing
    prisma.category.findMany({
      where: {
        OR: [{ userId: session?.user?.id }, { isSystem: true }],
      },
      orderBy: { name: "asc" },
      select: { id: true, name: true, icon: true, color: true },
    }),
  ]);

  // Serialize transactions for client component (Decimal -> number, Date -> ISO string)
  const serializedTransactions = transactions.map((tx) => ({
    ...tx,
    amount: Math.abs(Number(tx.amount)),
    transactionDate: tx.transactionDate.toISOString(),
  }));

  // Calculate totals correctly (use Math.abs since debits are negative in DB)
  const totalDebits = Math.abs(Number(filteredDebits._sum.amount) || 0);
  const totalCredits = Math.abs(Number(filteredCredits._sum.amount) || 0);
  const filteredTotal = totalDebits - totalCredits; // Net spending (positive = spent more)

  const lastYearTotal = Math.abs(Number(yearDebits._sum.amount) || 0);
  const lastMonthTotal = Math.abs(Number(monthDebits._sum.amount) || 0);

  // Pagination calculations
  const totalPages = Math.ceil(filteredCount / ITEMS_PER_PAGE);
  const hasNextPage = currentPage < totalPages;
  const hasPrevPage = currentPage > 1;

  // Build pagination URL helper
  const buildPageUrl = (page: number) => {
    const urlParams = new URLSearchParams();
    if (params.search) urlParams.set("search", params.search);
    if (params.type && params.type !== "ALL") urlParams.set("type", params.type);
    if (params.categoryId && params.categoryId !== "ALL") urlParams.set("categoryId", params.categoryId);
    if (params.startDate) urlParams.set("startDate", params.startDate);
    if (params.endDate) urlParams.set("endDate", params.endDate);
    if (params.minAmount) urlParams.set("minAmount", params.minAmount);
    if (params.maxAmount) urlParams.set("maxAmount", params.maxAmount);
    if (params.hasInstallments && params.hasInstallments !== "ALL") urlParams.set("hasInstallments", params.hasInstallments);
    if (page > 1) urlParams.set("page", String(page));
    const queryString = urlParams.toString();
    return `/dashboard/transactions${queryString ? `?${queryString}` : ""}`;
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Transacoes</h1>
          <p className="text-gray-600">
            {filteredCount.toLocaleString("pt-BR")} transacao(es) encontrada(s)
          </p>
        </div>
        <UploadButton />
      </div>

      {/* Stats */}
      <TransactionsStats
        totalDebits={totalDebits}
        totalCredits={totalCredits}
        yearTotal={lastYearTotal}
        monthTotal={lastMonthTotal}
        year={now.getFullYear()}
        monthName={now.toLocaleDateString("pt-BR", { month: "long" })}
      />

      {/* Filters */}
      <TransactionFilters
        search={params.search}
        type={params.type}
        categoryId={params.categoryId}
        startDate={params.startDate}
        endDate={params.endDate}
        minAmount={params.minAmount}
        maxAmount={params.maxAmount}
        hasInstallments={params.hasInstallments}
        categories={categories}
      />

      {/* Transaction List */}
      {transactions.length === 0 ? (
        <div className="bg-white rounded-xl p-8 border border-gray-200 text-center">
          <span className="text-6xl">💳</span>
          <h3 className="mt-4 text-lg font-medium text-gray-900">
            Nenhuma transacao encontrada
          </h3>
          <p className="mt-2 text-gray-600">
            {params.search || params.type || params.startDate || params.categoryId || params.hasInstallments
              ? "Tente ajustar os filtros de busca."
              : "Envie um extrato para ver suas transacoes."}
          </p>
          <div className="mt-4">
            <UploadButton className="px-6 py-3">
              Enviar Extrato
            </UploadButton>
          </div>
        </div>
      ) : (
        <>
          <TransactionList transactions={serializedTransactions} categories={categories} />

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between bg-white rounded-xl p-4 border border-gray-200">
              <div className="text-sm text-gray-600">
                Mostrando {skip + 1}-{Math.min(skip + ITEMS_PER_PAGE, filteredCount)} de{" "}
                {filteredCount.toLocaleString("pt-BR")}
              </div>
              <div className="flex items-center gap-2">
                {hasPrevPage ? (
                  <Link
                    href={buildPageUrl(currentPage - 1)}
                    className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
                  >
                    Anterior
                  </Link>
                ) : (
                  <span className="px-4 py-2 text-gray-400 bg-gray-50 rounded-lg cursor-not-allowed">
                    Anterior
                  </span>
                )}

                <div className="flex items-center gap-1">
                  {/* Show page numbers */}
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum: number;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    return (
                      <Link
                        key={pageNum}
                        href={buildPageUrl(pageNum)}
                        className={`w-10 h-10 flex items-center justify-center rounded-lg transition ${
                          pageNum === currentPage
                            ? "bg-emerald-600 text-white"
                            : "text-gray-700 hover:bg-gray-100"
                        }`}
                      >
                        {pageNum}
                      </Link>
                    );
                  })}
                </div>

                {hasNextPage ? (
                  <Link
                    href={buildPageUrl(currentPage + 1)}
                    className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
                  >
                    Proxima
                  </Link>
                ) : (
                  <span className="px-4 py-2 text-gray-400 bg-gray-50 rounded-lg cursor-not-allowed">
                    Proxima
                  </span>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
