import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { CategoryList } from "@/components/dashboard/category-list";
import { CategoryForm } from "@/components/dashboard/category-form";

export default async function CategoriesPage() {
  const session = await auth();

  const categories = await prisma.category.findMany({
    where: {
      OR: [{ userId: session?.user?.id }, { isSystem: true }],
    },
    orderBy: [{ isSystem: "desc" }, { name: "asc" }],
    include: {
      _count: {
        select: { transactions: true },
      },
    },
  });

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
