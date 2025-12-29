import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import Link from "next/link";

export default async function StatementsPage() {
  const session = await auth();

  const statements = await prisma.statement.findMany({
    where: { userId: session?.user?.id },
    orderBy: { createdAt: "desc" },
    include: {
      creditCard: true,
      bankAccount: true,
    },
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Extratos</h1>
          <p className="text-gray-600">
            {statements.length} extrato(s) enviado(s)
          </p>
        </div>
        <Link
          href="/dashboard/statements/upload"
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition"
        >
          + Novo Extrato
        </Link>
      </div>

      {/* Statements list */}
      {statements.length === 0 ? (
        <div className="bg-white rounded-xl p-8 border border-gray-200 text-center">
          <span className="text-6xl">📄</span>
          <h3 className="mt-4 text-lg font-medium text-gray-900">
            Nenhum extrato ainda
          </h3>
          <p className="mt-2 text-gray-600">
            Envie seu primeiro extrato para comecar a analisar suas financas.
          </p>
          <Link
            href="/dashboard/statements/upload"
            className="inline-block mt-4 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition"
          >
            Enviar Primeiro Extrato
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Arquivo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tipo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Periodo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Data Upload
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acoes
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {statements.map((statement) => (
                <tr key={statement.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <Link
                      href={`/dashboard/statements/${statement.id}`}
                      className="flex items-center gap-3 hover:text-emerald-600 transition"
                    >
                      <span className="text-2xl">📄</span>
                      <div>
                        <p className="font-medium text-gray-900 hover:text-emerald-600">
                          {statement.originalFileName}
                        </p>
                        <p className="text-sm text-gray-500">
                          {(statement.fileSizeBytes / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    </Link>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        statement.statementType === "CREDIT_CARD"
                          ? "bg-purple-100 text-purple-800"
                          : "bg-blue-100 text-blue-800"
                      }`}
                    >
                      {statement.statementType === "CREDIT_CARD"
                        ? "Cartao"
                        : "Conta"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {statement.periodStart && statement.periodEnd
                      ? `${new Date(statement.periodStart).toLocaleDateString(
                          "pt-BR"
                        )} - ${new Date(statement.periodEnd).toLocaleDateString(
                          "pt-BR"
                        )}`
                      : "-"}
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={statement.status} />
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {new Date(statement.createdAt).toLocaleDateString("pt-BR")}
                  </td>
                  <td className="px-6 py-4">
                    <Link
                      href={`/dashboard/statements/${statement.id}`}
                      className="text-emerald-600 hover:text-emerald-700 font-medium"
                    >
                      Ver detalhes
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    PENDING: "bg-yellow-100 text-yellow-800",
    PROCESSING: "bg-blue-100 text-blue-800",
    COMPLETED: "bg-green-100 text-green-800",
    FAILED: "bg-red-100 text-red-800",
    NEEDS_REVIEW: "bg-orange-100 text-orange-800",
  };

  const labels: Record<string, string> = {
    PENDING: "Pendente",
    PROCESSING: "Processando",
    COMPLETED: "Concluido",
    FAILED: "Erro",
    NEEDS_REVIEW: "Revisar",
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
        styles[status] || "bg-gray-100 text-gray-800"
      }`}
    >
      {labels[status] || status}
    </span>
  );
}
