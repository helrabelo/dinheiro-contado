import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { CategorizationButton } from "@/components/dashboard/categorization-button";

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
    spendingByCategory,
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
    // Spending by category (top 8)
    prisma.transaction.groupBy({
      by: ["categoryId"],
      where: {
        userId: session?.user?.id,
        type: "DEBIT",
        categoryId: { not: null },
        transactionDate: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        },
      },
      _sum: { amount: true },
      orderBy: { _sum: { amount: "desc" } },
      take: 8,
    }),
  ]);

  // Get category names for the spending chart
  const categoryIds = spendingByCategory
    .map((s) => s.categoryId)
    .filter((id): id is string => id !== null);

  const categories = await prisma.category.findMany({
    where: { id: { in: categoryIds } },
    select: { id: true, name: true, icon: true, color: true },
  });

  const categoryLookup = new Map(categories.map((c) => [c.id, c]));

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
                    Categorize automaticamente usando padroes de texto.
                  </p>
                </div>
              </div>
              <CategorizationButton count={uncategorizedCount} />
            </div>
          </div>
        )}
      </div>

      {/* Monthly Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <p className="text-sm text-gray-600">Creditos (30 dias)</p>
          <p className="text-2xl font-bold text-green-600 mt-1">
            R$ {monthlyCredits.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <p className="text-sm text-gray-600">Debitos (30 dias)</p>
          <p className="text-2xl font-bold text-red-600 mt-1">
            R$ {monthlyDebits.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <p className="text-sm text-gray-600">Saldo (30 dias)</p>
          <p
            className={`text-2xl font-bold mt-1 ${
              monthlyCredits - monthlyDebits >= 0 ? "text-green-600" : "text-red-600"
            }`}
          >
            R${" "}
            {(monthlyCredits - monthlyDebits).toLocaleString("pt-BR", {
              minimumFractionDigits: 2,
            })}
          </p>
        </div>
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <p className="text-sm text-gray-600">Transacoes (30 dias)</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {monthlyStats._count}
          </p>
        </div>
      </div>

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

      {/* Spending by Category */}
      {spendingByCategory.length > 0 && (
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Gastos por Categoria (30 dias)
            </h2>
            <Link
              href="/dashboard/categories"
              className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
            >
              Gerenciar &rarr;
            </Link>
          </div>
          <div className="space-y-3">
            {spendingByCategory.map((item) => {
              const category = item.categoryId
                ? categoryLookup.get(item.categoryId)
                : null;
              const amount = Number(item._sum.amount) || 0;
              const maxAmount = Number(spendingByCategory[0]?._sum?.amount) || 1;
              const percentage = (amount / maxAmount) * 100;

              return (
                <div key={item.categoryId || "unknown"} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm">
                    {category?.icon || "📦"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-900 truncate">
                        {category?.name || "Sem categoria"}
                      </span>
                      <span className="text-sm text-gray-600 ml-2">
                        R$ {amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${percentage}%`,
                          backgroundColor: category?.color || "#10b981",
                        }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
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
                    <p className="text-sm text-gray-500">
                      {new Date(tx.transactionDate).toLocaleDateString("pt-BR")}
                    </p>
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
