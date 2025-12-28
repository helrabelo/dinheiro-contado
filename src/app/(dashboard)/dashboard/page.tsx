import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import Link from "next/link";

export default async function DashboardPage() {
  const session = await auth();

  // Get user stats
  const [statementsCount, transactionsCount, categoriesCount] =
    await Promise.all([
      prisma.statement.count({ where: { userId: session?.user?.id } }),
      prisma.transaction.count({ where: { userId: session?.user?.id } }),
      prisma.category.count({
        where: { OR: [{ userId: session?.user?.id }, { isSystem: true }] },
      }),
    ]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">
          Bem-vindo, {session?.user?.name || "Usuario"}!
        </p>
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
            href="/dashboard/accounts"
            className="flex items-center gap-4 p-4 bg-blue-50 hover:bg-blue-100 rounded-lg transition"
          >
            <span className="text-3xl">🏦</span>
            <div>
              <p className="font-medium text-blue-900">Gerenciar Contas</p>
              <p className="text-sm text-blue-700">
                Adicione bancos e cartoes
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
