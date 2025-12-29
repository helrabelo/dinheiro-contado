import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

// Bank detection patterns for filenames
const BANK_PATTERNS: Record<string, RegExp[]> = {
  nubank: [/nubank/i, /nu_/i, /\bnu\b/i],
  inter: [/inter/i, /banco.?inter/i],
  btg: [/btg/i, /btg.?pactual/i],
  santander: [/santander/i, /sant_/i],
  itau: [/itau/i, /ita[uú]/i],
  bradesco: [/bradesco/i],
  mercadopago: [/mercado.?pago/i, /mp_/i],
};

function detectBankFromFilename(filename: string): string | null {
  const lower = filename.toLowerCase();
  for (const [bank, patterns] of Object.entries(BANK_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(lower)) {
        return bank;
      }
    }
  }
  return null;
}

export async function POST() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all statements without bank info
    const statements = await prisma.statement.findMany({
      where: {
        userId: session.user.id,
        bank: null,
      },
      select: {
        id: true,
        originalFileName: true,
      },
    });

    const results = {
      total: statements.length,
      updated: 0,
      failed: 0,
      byBank: {} as Record<string, number>,
    };

    for (const statement of statements) {
      const detectedBank = detectBankFromFilename(statement.originalFileName);

      if (detectedBank) {
        await prisma.statement.update({
          where: { id: statement.id },
          data: { bank: detectedBank },
        });

        results.updated++;
        results.byBank[detectedBank] = (results.byBank[detectedBank] || 0) + 1;
      } else {
        results.failed++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Backfilled ${results.updated} of ${results.total} statements`,
      results,
    });
  } catch (error) {
    console.error("Backfill error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET to check status
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const stats = await prisma.statement.groupBy({
      by: ["bank"],
      where: { userId: session.user.id },
      _count: true,
    });

    const creditCards = await prisma.creditCard.findMany({
      where: { userId: session.user.id },
      select: {
        id: true,
        issuer: true,
        cardName: true,
        lastFour: true,
        _count: {
          select: { statements: true },
        },
      },
    });

    return NextResponse.json({
      statementsByBank: stats,
      creditCards,
    });
  } catch (error) {
    console.error("Stats error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
