import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { CategoryList } from "@/components/dashboard/category-list";
import { CategoryForm } from "@/components/dashboard/category-form";
import Link from "next/link";

export default async function CategoriesPage() {
  const session = await auth();

  const [categories, uncategorizedCount] = await Promise.all([
    prisma.category.findMany({
      where: {
        OR: [{ userId: session?.user?.id }, { isSystem: true }],
      },
      orderBy: [{ isSystem: "desc" }, { name: "asc" }],
      include: {
        _count: {
          select: { transactions: true },
        },
      },
    }),
    prisma.transaction.count({
      where: {
        userId: session?.user?.id || "",
        categoryId: null,
      },
    }),
  ]);

  const userCategories = categories.filter((c) => !c.isSystem);
  const systemCategories = categories.filter((c) => c.isSystem);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Categorias</h1>
          <p className="text-gray-600">
            Organize suas transacoes por categoria
          </p>
        </div>
      </div>

      {/* Batch Categorization CTA */}
      {uncategorizedCount > 0 && (
        <Link
          href="/dashboard/categories/batch"
          className="block bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl p-6 text-white hover:from-blue-600 hover:to-indigo-700 transition"
        >
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <span>🏷️</span> Categorizacao em Lote
              </h2>
              <p className="text-blue-100 mt-1">
                {uncategorizedCount.toLocaleString("pt-BR")} transacoes sem categoria.
                Categorize por padroes como &ldquo;IFD*&rdquo; para iFood.
              </p>
            </div>
            <span className="text-2xl">→</span>
          </div>
        </Link>
      )}

      {/* Add new category */}
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Nova Categoria
        </h2>
        <CategoryForm />
      </div>

      {/* User categories */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Suas Categorias
          </h2>
          <p className="text-sm text-gray-600">
            {userCategories.length} categoria(s) personalizada(s)
          </p>
        </div>

        {userCategories.length === 0 ? (
          <div className="p-8 text-center">
            <span className="text-4xl">🏷️</span>
            <p className="mt-2 text-gray-600">
              Voce ainda nao criou nenhuma categoria.
            </p>
          </div>
        ) : (
          <CategoryList categories={userCategories} editable />
        )}
      </div>

      {/* System categories */}
      {systemCategories.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Categorias do Sistema
            </h2>
            <p className="text-sm text-gray-600">
              Categorias padrao disponiveis para todos
            </p>
          </div>
          <CategoryList categories={systemCategories} editable={false} />
        </div>
      )}
    </div>
  );
}
