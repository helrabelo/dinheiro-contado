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

  const [transactions, stats] = await Promise.all([
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
    prisma.transaction.aggregate({
      where,
      _sum: { amount: true },
      _count: true,
    }),
  ]);

  // Calculate totals by type
  const creditTotal =
    transactions
      .filter((t) => t.type === "CREDIT")
      .reduce((sum, t) => sum + Number(t.amount), 0) || 0;

  const debitTotal =
    transactions
      .filter((t) => t.type === "DEBIT")
      .reduce((sum, t) => sum + Number(t.amount), 0) || 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Transacoes</h1>
          <p className="text-gray-600">
            {stats._count} transacao(es) encontrada(s)
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
          <p className="text-sm text-gray-600">Total Creditos</p>
          <p className="text-2xl font-bold text-green-600">
            R$ {creditTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <p className="text-sm text-gray-600">Total Debitos</p>
          <p className="text-2xl font-bold text-red-600">
            R$ {debitTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <p className="text-sm text-gray-600">Saldo</p>
          <p
            className={`text-2xl font-bold ${
              creditTotal - debitTotal >= 0 ? "text-green-600" : "text-red-600"
            }`}
          >
            R${" "}
            {(creditTotal - debitTotal).toLocaleString("pt-BR", {
              minimumFractionDigits: 2,
            })}
          </p>
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
        <TransactionList transactions={transactions} />
      )}
    </div>
  );
}
