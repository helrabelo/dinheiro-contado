import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TransactionList } from "@/components/dashboard/transaction-list";

export default async function StatementDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  const { id } = await params;

  const statement = await prisma.statement.findUnique({
    where: {
      id,
      userId: session?.user?.id,
    },
    include: {
      creditCard: true,
      bankAccount: true,
      transactions: {
        orderBy: { transactionDate: "desc" },
        include: {
          category: {
            select: {
              name: true,
              icon: true,
              color: true,
            },
          },
        },
      },
    },
  });

  if (!statement) {
    notFound();
  }

  // Calculate totals
  const creditTotal = statement.transactions
    .filter((t) => t.type === "CREDIT")
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const debitTotal = statement.transactions
    .filter((t) => t.type === "DEBIT")
    .reduce((sum, t) => sum + Number(t.amount), 0);

  // Add statement info to transactions for display
  const transactionsWithStatement = statement.transactions.map((tx) => ({
    ...tx,
    statement: {
      originalFileName: statement.originalFileName,
    },
  }));

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/statements"
          className="p-2 hover:bg-gray-100 rounded-lg transition"
        >
          &larr; Voltar
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">
            {statement.originalFileName}
          </h1>
          <p className="text-gray-600">
            Enviado em{" "}
            {new Date(statement.createdAt).toLocaleDateString("pt-BR", {
              day: "numeric",
              month: "long",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>
        <StatusBadge status={statement.status} />
      </div>

      {/* Statement Info */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <InfoCard
          label="Tipo"
          value={
            statement.statementType === "CREDIT_CARD"
              ? "Fatura de Cartao"
              : "Extrato Bancario"
          }
          icon="📄"
        />
        <InfoCard
          label="Periodo"
          value={
            statement.periodStart && statement.periodEnd
              ? `${new Date(statement.periodStart).toLocaleDateString("pt-BR")} - ${new Date(statement.periodEnd).toLocaleDateString("pt-BR")}`
              : "Nao identificado"
          }
          icon="📅"
        />
        <InfoCard
          label="Transacoes"
          value={statement.transactions.length.toString()}
          icon="💳"
        />
        <InfoCard
          label="Total Fatura"
          value={
            statement.totalAmount
              ? `R$ ${Number(statement.totalAmount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
              : "N/A"
          }
          icon="💰"
        />
      </div>

      {/* Processing Status for non-completed */}
      {statement.status !== "COMPLETED" && (
        <div
          className={`p-4 rounded-xl border ${
            statement.status === "FAILED"
              ? "bg-red-50 border-red-200"
              : statement.status === "PROCESSING"
                ? "bg-blue-50 border-blue-200"
                : "bg-yellow-50 border-yellow-200"
          }`}
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">
              {statement.status === "FAILED"
                ? "!"
                : statement.status === "PROCESSING"
                  ? "..."
                  : "!"}
            </span>
            <div>
              <p
                className={`font-medium ${
                  statement.status === "FAILED"
                    ? "text-red-900"
                    : statement.status === "PROCESSING"
                      ? "text-blue-900"
                      : "text-yellow-900"
                }`}
              >
                {statement.status === "FAILED"
                  ? "Erro ao processar"
                  : statement.status === "PROCESSING"
                    ? "Processando..."
                    : "Aguardando processamento"}
              </p>
              {statement.errorMessage && (
                <p
                  className={`text-sm ${
                    statement.status === "FAILED" ? "text-red-700" : "text-gray-700"
                  }`}
                >
                  {statement.errorMessage}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Summary Stats */}
      {statement.transactions.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <p className="text-sm text-gray-600">Creditos</p>
            <p className="text-2xl font-bold text-green-600">
              R$ {creditTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <p className="text-sm text-gray-600">Debitos</p>
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
      )}

      {/* Transactions */}
      {statement.transactions.length > 0 ? (
        <TransactionList transactions={transactionsWithStatement} />
      ) : (
        statement.status === "COMPLETED" && (
          <div className="bg-white rounded-xl p-8 border border-gray-200 text-center">
            <span className="text-6xl">?</span>
            <h3 className="mt-4 text-lg font-medium text-gray-900">
              Nenhuma transacao encontrada
            </h3>
            <p className="mt-2 text-gray-600">
              O processamento foi concluido, mas nenhuma transacao foi extraida.
            </p>
          </div>
        )
      )}

      {/* Parser info */}
      {statement.parserVersion && (
        <div className="text-center text-sm text-gray-500">
          Processado com parser v{statement.parserVersion}
          {statement.parsedAt &&
            ` em ${new Date(statement.parsedAt).toLocaleDateString("pt-BR", {
              day: "numeric",
              month: "long",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}`}
        </div>
      )}
    </div>
  );
}

function InfoCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: string;
}) {
  return (
    <div className="bg-white rounded-xl p-4 border border-gray-200">
      <div className="flex items-center gap-3">
        <span className="text-2xl">{icon}</span>
        <div>
          <p className="text-sm text-gray-600">{label}</p>
          <p className="font-medium text-gray-900">{value}</p>
        </div>
      </div>
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
      className={`px-3 py-1 rounded-full text-sm font-medium ${
        styles[status] || "bg-gray-100 text-gray-800"
      }`}
    >
      {labels[status] || status}
    </span>
  );
}
