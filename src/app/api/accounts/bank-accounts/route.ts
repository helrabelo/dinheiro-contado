import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { bankCode, bankName, accountType, lastFour, nickname } = body;

    if (!bankCode || !bankName) {
      return NextResponse.json(
        { error: "Banco e obrigatorio" },
        { status: 400 }
      );
    }

    const account = await prisma.bankAccount.create({
      data: {
        userId: session.user.id,
        bankCode,
        bankName,
        accountType: accountType || "checking",
        lastFour: lastFour || null,
        nickname: nickname || null,
        isActive: true,
      },
    });

    return NextResponse.json({ success: true, account });
  } catch (error) {
    console.error("Create bank account error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
