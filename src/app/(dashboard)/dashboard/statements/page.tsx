import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { UploadButton } from "@/components/dashboard/upload-button";
import { RetryButton } from "@/components/dashboard/retry-button";

// Bank display names and icons
const BANK_INFO: Record<string, { name: string; icon: string }> = {
  nubank: { name: "Nubank", icon: "💜" },
  inter: { name: "Inter", icon: "🧡" },
  btg: { name: "BTG", icon: "💙" },
  santander: { name: "Santander", icon: "❤️" },
  itau: { name: "Itaú", icon: "🧡" },
  bradesco: { name: "Bradesco", icon: "❤️" },
  mercadopago: { name: "MercadoPago", icon: "💙" },
};

// Month names in Portuguese
const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function formatStatementTitle(statement: {
  bank: string | null;
  periodEnd: Date | null;
  originalFileName: string;
  cardLastFour: string | null;
}): { title: string; icon: string } {
  const bankInfo = statement.bank ? BANK_INFO[statement.bank] : null;

  if (bankInfo && statement.periodEnd) {
    const month = MONTH_NAMES[statement.periodEnd.getMonth()];
    const year = statement.periodEnd.getFullYear();
    const cardSuffix = statement.cardLastFour ? ` •${statement.cardLastFour}` : "";
    return {
      title: `${bankInfo.name} ${month} ${year}${cardSuffix}`,
      icon: bankInfo.icon,
    };
  }

  // Fallback to filename
  return {
    title: statement.originalFileName,
    icon: "📄",
  };
}

export default async function StatementsPage() {
  const session = await auth();

  const statements = await prisma.statement.findMany({
    where: { userId: session?.user?.id },
    orderBy: { periodEnd: "desc" }, // Order by period, newest first
    include: {
      creditCard: true,
      bankAccount: true,
      _count: {
        select: { transactions: true },
      },
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
        <UploadButton />
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
          <div className="mt-4">
            <UploadButton className="px-6 py-3">
              Enviar Primeiro Extrato
            </UploadButton>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fatura
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tipo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Valor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Transacoes
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acoes
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {statements.map((statement) => {
                const { title, icon } = formatStatementTitle(statement);
                return (
                  <tr key={statement.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <Link
                        href={`/dashboard/statements/${statement.id}`}
                        className="flex items-center gap-3 hover:text-emerald-600 transition"
                      >
                        <span className="text-2xl">{icon}</span>
                        <div>
                          <p className="font-medium text-gray-900 hover:text-emerald-600">
                            {title}
                          </p>
                          <p className="text-xs text-gray-500">
                            {statement.periodStart && statement.periodEnd
                              ? `${new Date(statement.periodStart).toLocaleDateString(
                                  "pt-BR"
                                )} - ${new Date(statement.periodEnd).toLocaleDateString(
                                  "pt-BR"
                                )}`
                              : statement.originalFileName}
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
                    <td className="px-6 py-4">
                      {statement.totalAmount ? (
                        <span className="text-sm font-medium text-gray-900">
                          R$ {Number(statement.totalAmount).toLocaleString("pt-BR", {
                            minimumFractionDigits: 2,
                          })}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {statement._count.transactions}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <StatusBadge status={statement.status} />
                        {statement.status === "FAILED" && statement.errorMessage && (
                          <span className="text-xs text-red-600 max-w-[200px] truncate" title={statement.errorMessage}>
                            {statement.errorMessage}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/dashboard/statements/${statement.id}`}
                          className="text-emerald-600 hover:text-emerald-700 font-medium"
                        >
                          Ver detalhes
                        </Link>
                        {(statement.status === "FAILED" || statement.status === "PENDING") && (
                          <RetryButton statementId={statement.id} />
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
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
