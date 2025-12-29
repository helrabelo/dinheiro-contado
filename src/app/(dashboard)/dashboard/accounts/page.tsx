import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { BankAccountList } from "@/components/dashboard/bank-account-list";
import { CreditCardList } from "@/components/dashboard/credit-card-list";
import { AddAccountForm } from "@/components/dashboard/add-account-form";

export default async function AccountsPage() {
  const session = await auth();

  const [bankAccounts, creditCards] = await Promise.all([
    prisma.bankAccount.findMany({
      where: { userId: session?.user?.id },
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { statements: true, transactions: true },
        },
      },
    }),
    prisma.creditCard.findMany({
      where: { userId: session?.user?.id },
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { statements: true, transactions: true },
        },
      },
    }),
  ]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Contas e Cartoes</h1>
        <p className="text-gray-600">
          Gerencie suas contas bancarias e cartoes de credito
        </p>
      </div>

      {/* Add new account/card */}
      <AddAccountForm />

      {/* Credit Cards */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center gap-3">
          <span className="text-2xl">💳</span>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Cartoes de Credito
            </h2>
            <p className="text-sm text-gray-600">
              {creditCards.length} cartao(oes) cadastrado(s)
            </p>
          </div>
        </div>

        {creditCards.length === 0 ? (
          <div className="p-8 text-center">
            <span className="text-4xl">💳</span>
            <p className="mt-2 text-gray-600">
              Nenhum cartao cadastrado ainda.
            </p>
          </div>
        ) : (
          <CreditCardList cards={creditCards} />
        )}
      </div>

      {/* Bank Accounts */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center gap-3">
          <span className="text-2xl">🏦</span>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Contas Bancarias
            </h2>
            <p className="text-sm text-gray-600">
              {bankAccounts.length} conta(s) cadastrada(s)
            </p>
          </div>
        </div>

        {bankAccounts.length === 0 ? (
          <div className="p-8 text-center">
            <span className="text-4xl">🏦</span>
            <p className="mt-2 text-gray-600">
              Nenhuma conta bancaria cadastrada ainda.
            </p>
          </div>
        ) : (
          <BankAccountList accounts={bankAccounts} />
        )}
      </div>
    </div>
  );
}
