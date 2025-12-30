import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { InstallmentsView } from "@/components/dashboard/installments-view";

interface InstallmentGroup {
  key: string;
  description: string;
  amount: number;
  totalInstallments: number;
  paidInstallments: number;
  totalPaid: number;
  totalAmount: number;
  transactions: {
    id: string;
    transactionDate: string;
    installmentCurrent: number;
    installmentTotal: number;
    amount: number;
    category: { name: string; icon: string | null; color: string | null } | null;
  }[];
}

function normalizeDescription(desc: string): string {
  // Remove installment info and normalize for grouping
  return desc
    .replace(/(?:PARCELA\s+)?\d{1,2}[/\\]\d{1,2}/gi, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export default async function InstallmentsPage() {
  const session = await auth();

  // Get all transactions with installments
  const transactions = await prisma.transaction.findMany({
    where: {
      userId: session?.user?.id || "",
      installmentTotal: { not: null },
    },
    orderBy: { transactionDate: "desc" },
    include: {
      category: {
        select: { name: true, icon: true, color: true },
      },
    },
  });

  // Group by normalized description + amount
  const groupsMap = new Map<string, InstallmentGroup>();

  for (const tx of transactions) {
    const normalizedDesc = normalizeDescription(tx.description);
    const amount = Math.abs(Number(tx.amount));
    const key = `${normalizedDesc}|${amount.toFixed(2)}`;

    if (!groupsMap.has(key)) {
      groupsMap.set(key, {
        key,
        description: tx.description.replace(/(?:PARCELA\s+)?\d{1,2}[/\\]\d{1,2}/gi, "").trim(),
        amount,
        totalInstallments: tx.installmentTotal || 0,
        paidInstallments: 0,
        totalPaid: 0,
        totalAmount: amount * (tx.installmentTotal || 1),
        transactions: [],
      });
    }

    const group = groupsMap.get(key)!;
    group.paidInstallments++;
    group.totalPaid += amount;
    group.transactions.push({
      id: tx.id,
      transactionDate: tx.transactionDate.toISOString(),
      installmentCurrent: tx.installmentCurrent || 0,
      installmentTotal: tx.installmentTotal || 0,
      amount,
      category: tx.category,
    });
  }

  // Sort groups by total amount (highest first)
  const groups = Array.from(groupsMap.values()).sort(
    (a, b) => b.totalAmount - a.totalAmount
  );

  // Calculate totals
  const totalPending = groups.reduce(
    (sum, g) => sum + (g.totalAmount - g.totalPaid),
    0
  );
  const totalPaid = groups.reduce((sum, g) => sum + g.totalPaid, 0);
  const totalOverall = groups.reduce((sum, g) => sum + g.totalAmount, 0);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Parcelamentos</h1>
        <p className="text-gray-600">
          {groups.length} parcelamento(s) em andamento
        </p>
      </div>

      {/* Content with privacy-aware currency display */}
      <InstallmentsView
        groups={groups}
        totalPending={totalPending}
        totalPaid={totalPaid}
        totalOverall={totalOverall}
      />
    </div>
  );
}
