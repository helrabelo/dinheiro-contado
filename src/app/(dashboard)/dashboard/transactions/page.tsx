import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { TransactionFilters } from "@/components/dashboard/transaction-filters";
import { TransactionList } from "@/components/dashboard/transaction-list";
import { Prisma } from "@prisma/client";

interface SearchParams {
  search?: string;
  type?: string;
  startDate?: string;
  endDate?: string;
  minAmount?: string;
  maxAmount?: string;
  statementId?: string;
}

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await auth();
  const params = await searchParams;

  // Build where clause from filters
  const where: Prisma.TransactionWhereInput = {
    userId: session?.user?.id || "",
  };

  if (params.type && params.type !== "ALL") {
    where.type = params.type as "CREDIT" | "DEBIT" | "TRANSFER";
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
      where.amount.gte = parseFloat(params.minAmount);
    }
    if (params.maxAmount) {
      where.amount.lte = parseFloat(params.maxAmount);
    }
  }

  if (params.statementId) {
    where.statementId = params.statementId;
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
      take: 100,
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
  ]);

  // Serialize transactions for client component (Decimal -> number, Date -> ISO string)
  const serializedTransactions = transactions.map((tx) => ({
    ...tx,
    amount: Number(tx.amount),
    transactionDate: tx.transactionDate.toISOString(),
  }));

  // Calculate totals correctly
  const totalDebits = Number(filteredDebits._sum.amount) || 0;
  const totalCredits = Number(filteredCredits._sum.amount) || 0;
  const filteredTotal = totalDebits - totalCredits; // Net spending (positive = spent more)

  const lastYearTotal = Number(yearDebits._sum.amount) || 0;
  const lastMonthTotal = Number(monthDebits._sum.amount) || 0;

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
        <Link
          href="/dashboard/statements/upload"
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition"
        >
          + Novo Extrato
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <p className="text-sm text-gray-600">Total Encontrado</p>
          <p className="text-2xl font-bold text-gray-900">
            R$ {filteredTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-gray-500 mt-1">{filteredCount.toLocaleString("pt-BR")} transacoes</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <p className="text-sm text-gray-600">Gastos {now.getFullYear()}</p>
          <p className="text-2xl font-bold text-red-600">
            R$ {lastYearTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-gray-500 mt-1">desde janeiro</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <p className="text-sm text-gray-600">
            {now.toLocaleDateString("pt-BR", { month: "long" })}
          </p>
          <p className="text-2xl font-bold text-orange-600">
            R$ {lastMonthTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-gray-500 mt-1">mes atual</p>
        </div>
      </div>

      {/* Filters */}
      <TransactionFilters
        search={params.search}
        type={params.type}
        startDate={params.startDate}
        endDate={params.endDate}
        minAmount={params.minAmount}
        maxAmount={params.maxAmount}
      />

      {/* Transaction List */}
      {transactions.length === 0 ? (
        <div className="bg-white rounded-xl p-8 border border-gray-200 text-center">
          <span className="text-6xl">💳</span>
          <h3 className="mt-4 text-lg font-medium text-gray-900">
            Nenhuma transacao encontrada
          </h3>
          <p className="mt-2 text-gray-600">
            {params.search || params.type || params.startDate
              ? "Tente ajustar os filtros de busca."
              : "Envie um extrato para ver suas transacoes."}
          </p>
          <Link
            href="/dashboard/statements/upload"
            className="inline-block mt-4 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition"
          >
            Enviar Extrato
          </Link>
        </div>
      ) : (
        <TransactionList transactions={serializedTransactions} />
      )}
    </div>
  );
}
