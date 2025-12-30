import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { CategorizationButton } from "@/components/dashboard/categorization-button";
import { SpendingByCategoryChart } from "@/components/dashboard/spending-by-category-chart";
import { SpendingOverTimeChart } from "@/components/dashboard/spending-over-time-chart";
import { TopSpendingAnalysis } from "@/components/dashboard/top-spending-analysis";
import { SpendingHeatmap } from "@/components/dashboard/spending-heatmap";
import { EnhancedSummaryCards } from "@/components/dashboard/enhanced-summary-cards";

export default async function DashboardPage() {
  const session = await auth();

  // Get user stats and recent data
  const [
    statementsCount,
    transactionsCount,
    categoriesCount,
    recentTransactions,
    monthlyStats,
    pendingStatements,
    uncategorizedCount,
  ] = await Promise.all([
    prisma.statement.count({ where: { userId: session?.user?.id } }),
    prisma.transaction.count({ where: { userId: session?.user?.id } }),
    prisma.category.count({
      where: { OR: [{ userId: session?.user?.id }, { isSystem: true }] },
    }),
    prisma.transaction.findMany({
      where: { userId: session?.user?.id },
      orderBy: { transactionDate: "desc" },
      take: 5,
      include: {
        category: {
          select: { name: true, icon: true },
        },
      },
    }),
    // Get monthly spending for the last 30 days
    prisma.transaction.aggregate({
      where: {
        userId: session?.user?.id,
        transactionDate: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        },
      },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.statement.findMany({
      where: {
        userId: session?.user?.id,
        status: { in: ["PENDING", "PROCESSING"] },
      },
      take: 5,
    }),
    // Uncategorized transactions
    prisma.transaction.count({
      where: {
        userId: session?.user?.id,
        categoryId: null,
      },
    }),
  ]);

  // Calculate totals for the month
  const monthlyTransactions = await prisma.transaction.findMany({
    where: {
      userId: session?.user?.id,
      transactionDate: {
        gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      },
    },
    select: { amount: true, type: true },
  });

  const monthlyCredits = monthlyTransactions
    .filter((t) => t.type === "CREDIT")
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const monthlyDebits = monthlyTransactions
    .filter((t) => t.type === "DEBIT")
    .reduce((sum, t) => sum + Number(t.amount), 0);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">
          Bem-vindo, {session?.user?.name || "Usuario"}!
        </p>
      </div>

      {/* Alerts */}
      <div className="space-y-3">
        {/* Pending statements alert */}
        {pendingStatements.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">⏳</span>
              <div>
                <p className="font-medium text-yellow-900">
                  {pendingStatements.length} extrato(s) aguardando processamento
                </p>
                <p className="text-sm text-yellow-700">
                  Inicie o servico de parsing para processar os extratos pendentes.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Uncategorized transactions alert */}
        {uncategorizedCount > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🏷️</span>
                <div>
                  <p className="font-medium text-blue-900">
                    {uncategorizedCount.toLocaleString("pt-BR")} transacoes sem categoria
                  </p>
                  <p className="text-sm text-blue-700">
                    Categorize manualmente ou use padroes de texto.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href="/dashboard/transactions/uncategorized"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition"
                >
                  Categorizar
                </Link>
                <Link
                  href="/dashboard/categories/batch"
                  className="px-4 py-2 text-blue-700 hover:bg-blue-100 text-sm font-medium rounded-lg transition"
                >
                  Por Padrao
                </Link>
                <CategorizationButton count={uncategorizedCount} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Enhanced Summary Cards (Phase 2) */}
      {transactionsCount > 0 && <EnhancedSummaryCards />}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="Extratos"
          value={statementsCount}
          icon="📄"
          href="/dashboard/statements"
        />
        <StatCard
          title="Transacoes"
          value={transactionsCount}
          icon="💳"
          href="/dashboard/transactions"
        />
        <StatCard
          title="Categorias"
          value={categoriesCount}
          icon="🏷️"
          href="/dashboard/categories"
        />
      </div>

      {/* Charts Section */}
      {transactionsCount > 0 && (
        <>
          {/* Spending Over Time Chart */}
          <SpendingOverTimeChart />

          {/* Spending by Category Chart */}
          <SpendingByCategoryChart />

          {/* Top Spending Analysis (Phase 2) */}
          <TopSpendingAnalysis />

          {/* Spending Heatmap (Phase 2) */}
          <SpendingHeatmap />
        </>
      )}

      {/* Recent transactions */}
      {recentTransactions.length > 0 && (
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Transacoes Recentes
            </h2>
            <Link
              href="/dashboard/transactions"
              className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
            >
              Ver todas &rarr;
            </Link>
          </div>
          <div className="space-y-3">
            {recentTransactions.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      tx.type === "CREDIT" ? "bg-green-100" : "bg-red-100"
                    }`}
                  >
                    <span>{tx.category?.icon || (tx.type === "CREDIT" ? "+" : "-")}</span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{tx.description}</p>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <span>
                        {new Date(tx.transactionDate).toLocaleDateString("pt-BR")}
                      </span>
                      {tx.category ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-200 text-gray-700 rounded-full text-xs">
                          <span>{tx.category.icon}</span>
                          <span>{tx.category.name}</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-200 text-gray-500 rounded-full text-xs">
                          <span>❓</span>
                          <span>Sem categoria</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <p
                  className={`font-medium ${
                    tx.type === "CREDIT" ? "text-green-600" : "text-gray-900"
                  }`}
                >
                  {tx.type === "CREDIT" ? "+" : "-"} R${" "}
                  {Math.abs(Number(tx.amount)).toLocaleString("pt-BR", {
                    minimumFractionDigits: 2,
                  })}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick actions */}
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Acoes Rapidas
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            href="/dashboard/statements/upload"
            className="flex items-center gap-4 p-4 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition"
          >
            <span className="text-3xl">📤</span>
            <div>
              <p className="font-medium text-emerald-900">Enviar Extrato</p>
              <p className="text-sm text-emerald-700">
                Faca upload de PDF ou CSV
              </p>
            </div>
          </Link>
          <Link
            href="/dashboard/categories/batch"
            className="flex items-center gap-4 p-4 bg-purple-50 hover:bg-purple-100 rounded-lg transition"
          >
            <span className="text-3xl">🏷️</span>
            <div>
              <p className="font-medium text-purple-900">Categorizar em Lote</p>
              <p className="text-sm text-purple-700">
                Buscar e categorizar rapidamente
              </p>
            </div>
          </Link>
          <Link
            href="/dashboard/transactions"
            className="flex items-center gap-4 p-4 bg-blue-50 hover:bg-blue-100 rounded-lg transition"
          >
            <span className="text-3xl">💳</span>
            <div>
              <p className="font-medium text-blue-900">Ver Transacoes</p>
              <p className="text-sm text-blue-700">
                Analise seus gastos e receitas
              </p>
            </div>
          </Link>
        </div>
      </div>

      {/* Empty state for new users */}
      {statementsCount === 0 && (
        <div className="bg-white rounded-xl p-8 border border-gray-200 text-center">
          <span className="text-6xl">📊</span>
          <h3 className="mt-4 text-lg font-medium text-gray-900">
            Nenhum extrato ainda
          </h3>
          <p className="mt-2 text-gray-600">
            Comece enviando seu primeiro extrato bancario ou fatura de cartao.
          </p>
          <Link
            href="/dashboard/statements/upload"
            className="inline-block mt-4 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition"
          >
            Enviar Primeiro Extrato
          </Link>
        </div>
      )}
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
  href,
}: {
  title: string;
  value: number;
  icon: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="bg-white rounded-xl p-6 border border-gray-200 hover:border-emerald-300 transition"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
        </div>
        <span className="text-4xl">{icon}</span>
      </div>
    </Link>
  );
}
