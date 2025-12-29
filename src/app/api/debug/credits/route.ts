import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get summary of CREDIT transactions
  const creditsByBank = await prisma.$queryRaw`
    SELECT
      s.bank,
      COUNT(*)::int as count,
      SUM(ABS(t.amount))::float as total,
      ARRAY_AGG(DISTINCT SUBSTRING(t.description, 1, 50)) as sample_descriptions
    FROM transactions t
    JOIN statements s ON t."statementId" = s.id
    WHERE t."userId" = ${session.user.id}
    AND t.type = 'CREDIT'
    GROUP BY s.bank
    ORDER BY total DESC
  `;

  // Get top 20 CREDIT transactions by amount
  const topCredits = await prisma.transaction.findMany({
    where: {
      userId: session.user.id,
      type: "CREDIT",
    },
    orderBy: { amount: "desc" },
    take: 20,
    select: {
      amount: true,
      description: true,
      originalDescription: true,
      transactionDate: true,
      statement: {
        select: { bank: true, originalFileName: true },
      },
    },
  });

  // Get counts by type
  const typeCounts = await prisma.transaction.groupBy({
    by: ["type"],
    where: { userId: session.user.id },
    _count: true,
    _sum: { amount: true },
  });

  return NextResponse.json({
    typeCounts: typeCounts.map((t) => ({
      type: t.type,
      count: t._count,
      total: Math.abs(Number(t._sum.amount) || 0),
    })),
    creditsByBank,
    topCredits: topCredits.map((t) => ({
      amount: Math.abs(Number(t.amount)),
      description: t.description,
      originalDescription: t.originalDescription,
      date: t.transactionDate,
      bank: t.statement?.bank,
      file: t.statement?.originalFileName,
    })),
  });
}
