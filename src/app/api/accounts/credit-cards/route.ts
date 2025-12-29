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
    const { issuer, cardName, lastFour, nickname, closingDay, dueDay, creditLimit } = body;

    if (!issuer) {
      return NextResponse.json(
        { error: "Emissor e obrigatorio" },
        { status: 400 }
      );
    }

    const card = await prisma.creditCard.create({
      data: {
        userId: session.user.id,
        issuer,
        cardName: cardName || "Principal",
        lastFour: lastFour || null,
        nickname: nickname || null,
        closingDay: closingDay || null,
        dueDay: dueDay || null,
        creditLimit: creditLimit || null,
        isActive: true,
      },
    });

    return NextResponse.json({ success: true, card });
  } catch (error) {
    console.error("Create credit card error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
