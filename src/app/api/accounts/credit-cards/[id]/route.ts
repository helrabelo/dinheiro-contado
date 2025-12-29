import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const { id } = await params;

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const card = await prisma.creditCard.findUnique({
      where: { id },
    });

    if (!card) {
      return NextResponse.json(
        { error: "Cartao nao encontrado" },
        { status: 404 }
      );
    }

    if (card.userId !== session.user.id) {
      return NextResponse.json(
        { error: "Sem permissao" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { isActive, nickname, closingDay, dueDay } = body;

    const updated = await prisma.creditCard.update({
      where: { id },
      data: {
        ...(isActive !== undefined && { isActive }),
        ...(nickname !== undefined && { nickname }),
        ...(closingDay !== undefined && { closingDay }),
        ...(dueDay !== undefined && { dueDay }),
      },
    });

    return NextResponse.json({ success: true, card: updated });
  } catch (error) {
    console.error("Update credit card error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const { id } = await params;

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const card = await prisma.creditCard.findUnique({
      where: { id },
      include: {
        _count: {
          select: { statements: true, transactions: true },
        },
      },
    });

    if (!card) {
      return NextResponse.json(
        { error: "Cartao nao encontrado" },
        { status: 404 }
      );
    }

    if (card.userId !== session.user.id) {
      return NextResponse.json(
        { error: "Sem permissao" },
        { status: 403 }
      );
    }

    // Warn if has data but allow deletion
    if (card._count.statements > 0 || card._count.transactions > 0) {
      // First unlink statements and transactions
      await prisma.statement.updateMany({
        where: { creditCardId: id },
        data: { creditCardId: null },
      });

      await prisma.transaction.updateMany({
        where: { creditCardId: id },
        data: { creditCardId: null },
      });
    }

    await prisma.creditCard.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete credit card error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
