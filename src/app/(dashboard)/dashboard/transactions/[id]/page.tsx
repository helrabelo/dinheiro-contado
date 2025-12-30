import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { notFound } from "next/navigation";
import { InlineCategorySelector } from "@/components/dashboard/inline-category-selector";

export default async function TransactionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  const { id } = await params;

  const [transaction, categories] = await Promise.all([
    prisma.transaction.findFirst({
      where: {
        id,
        userId: session?.user?.id,
      },
      include: {
        statement: {
          select: {
            id: true,
            originalFileName: true,
            bank: true,
            periodStart: true,
            periodEnd: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
            icon: true,
            color: true,
          },
        },
        creditCard: {
          select: {
            id: true,
            issuer: true,
            cardName: true,
            lastFour: true,
          },
        },
        bankAccount: {
          select: {
            id: true,
            bankName: true,
            nickname: true,
            lastFour: true,
          },
        },
      },
    }),
    prisma.category.findMany({
      where: {
        OR: [{ userId: session?.user?.id }, { isSystem: true }],
      },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        icon: true,
        color: true,
      },
    }),
  ]);

  if (!transaction) {
    notFound();
  }

  const amount = Number(transaction.amount);
  const isPositive = transaction.type === "CREDIT";

  // Format date for display
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("pt-BR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  // Find related installments if this is an installment transaction
  let relatedInstallments: Array<{
    id: string;
    transactionDate: Date;
    amount: number;
    installmentCurrent: number | null;
    installmentTotal: number | null;
  }> = [];

  if (transaction.installmentTotal && transaction.installmentTotal > 1) {
    const baseDescription = transaction.description
      .replace(/\s*\(?(\d+)[/\\](\d+)\)?.*$/i, "")
      .trim();

    const related = await prisma.transaction.findMany({
      where: {
        userId: session?.user?.id,
        id: { not: transaction.id },
        installmentTotal: { not: null },
        description: { contains: baseDescription },
      },
      orderBy: { transactionDate: "asc" },
      select: {
        id: true,
        transactionDate: true,
        amount: true,
        installmentCurrent: true,
        installmentTotal: true,
      },
      take: 20,
    });

    relatedInstallments = related.map((tx) => ({
      ...tx,
      amount: Number(tx.amount),
    }));
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/transactions"
          className="p-2 hover:bg-gray-100 rounded-lg transition"
        >
          &larr; Voltar
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">
            {transaction.description}
          </h1>
          <p className="text-gray-600">
            {formatDate(transaction.transactionDate)}
          </p>
        </div>
        <div className="text-right">
          <p
            className={`text-3xl font-bold ${
              isPositive ? "text-green-600" : "text-red-600"
            }`}
          >
            {isPositive ? "+" : "-"} R${" "}
            {Math.abs(amount).toLocaleString("pt-BR", {
              minimumFractionDigits: 2,
            })}
          </p>
          <p className="text-sm text-gray-500">
            {transaction.type === "CREDIT"
              ? "Credito"
              : transaction.type === "DEBIT"
                ? "Debito"
                : "Transferencia"}
          </p>
        </div>
      </div>

      {/* Main Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Category - Editable */}
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <p className="text-sm text-gray-600 mb-2">Categoria</p>
          <InlineCategorySelector
            transactionId={transaction.id}
            currentCategory={transaction.category}
            categories={categories}
          />
        </div>

        {/* Source */}
        <InfoCard
          label="Origem"
          value={
            transaction.creditCard
              ? `${transaction.creditCard.issuer} ****${transaction.creditCard.lastFour}`
              : transaction.bankAccount
                ? `${transaction.bankAccount.bankName} ****${transaction.bankAccount.lastFour}`
                : "Nao identificado"
          }
          icon="🏦"
        />

        {/* Statement */}
        {transaction.statement && (
          <InfoCard
            label="Extrato"
            value={transaction.statement.originalFileName}
            icon="📄"
            href={`/dashboard/statements/${transaction.statement.id}`}
          />
        )}

        {/* Installments */}
        {transaction.installmentCurrent && transaction.installmentTotal && (
          <InfoCard
            label="Parcela"
            value={`${transaction.installmentCurrent} de ${transaction.installmentTotal}`}
            icon="📊"
          />
        )}

        {/* International */}
        {transaction.isInternational && (
          <InfoCard label="Tipo" value="Internacional" icon="🌍" />
        )}
      </div>

      {/* Original Description */}
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Detalhes da Transacao
        </h2>
        <div className="space-y-4">
          <div>
            <p className="text-sm text-gray-600">Descricao Original</p>
            <p className="font-mono text-sm bg-gray-50 p-3 rounded-lg mt-1">
              {transaction.originalDescription}
            </p>
          </div>
          {transaction.merchantName && (
            <div>
              <p className="text-sm text-gray-600">Estabelecimento</p>
              <p className="font-medium text-gray-900">
                {transaction.merchantName}
              </p>
            </div>
          )}
          {transaction.notes && (
            <div>
              <p className="text-sm text-gray-600">Notas</p>
              <p className="text-gray-900">{transaction.notes}</p>
            </div>
          )}
        </div>
      </div>

      {/* Related Installments */}
      {relatedInstallments.length > 0 && (
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Outras Parcelas
          </h2>
          <div className="space-y-2">
            {relatedInstallments.map((tx) => (
              <Link
                key={tx.id}
                href={`/dashboard/transactions/${tx.id}`}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition"
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-600">
                    {tx.installmentCurrent}/{tx.installmentTotal}
                  </span>
                  <span className="text-sm text-gray-500">
                    {new Date(tx.transactionDate).toLocaleDateString("pt-BR", {
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </div>
                <span className="font-medium text-gray-900">
                  R${" "}
                  {Math.abs(tx.amount).toLocaleString("pt-BR", {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Metadata */}
      <div className="text-center text-sm text-gray-500">
        <p>
          ID: {transaction.id} | Criado em{" "}
          {new Date(transaction.createdAt).toLocaleDateString("pt-BR")}
        </p>
      </div>
    </div>
  );
}

function InfoCard({
  label,
  value,
  icon,
  href,
}: {
  label: string;
  value: string;
  icon: string;
  href?: string;
}) {
  const content = (
    <div className="flex items-center gap-3">
      <span className="text-2xl">{icon}</span>
      <div>
        <p className="text-sm text-gray-600">{label}</p>
        <p className="font-medium text-gray-900 truncate">{value}</p>
      </div>
    </div>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="bg-white rounded-xl p-4 border border-gray-200 hover:border-emerald-300 hover:bg-emerald-50 transition"
      >
        {content}
      </Link>
    );
  }

  return (
    <div className="bg-white rounded-xl p-4 border border-gray-200">
      {content}
    </div>
  );
}
