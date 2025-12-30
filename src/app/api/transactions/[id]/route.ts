import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

// GET - Fetch single transaction with full details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  try {
    const { id } = await params;

    const transaction = await prisma.transaction.findFirst({
      where: {
        id,
        userId: session.user.id,
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
    });

    if (!transaction) {
      return NextResponse.json(
        { error: "Transacao nao encontrada" },
        { status: 404 }
      );
    }

    // Serialize for client (Decimal -> number, Date -> ISO string)
    const serialized = {
      ...transaction,
      amount: Number(transaction.amount),
      transactionDate: transaction.transactionDate.toISOString(),
      postingDate: transaction.postingDate?.toISOString() || null,
      createdAt: transaction.createdAt.toISOString(),
      updatedAt: transaction.updatedAt.toISOString(),
      statement: transaction.statement
        ? {
            ...transaction.statement,
            periodStart: transaction.statement.periodStart.toISOString(),
            periodEnd: transaction.statement.periodEnd.toISOString(),
          }
        : null,
    };

    return NextResponse.json({ transaction: serialized });
  } catch (error) {
    console.error("Error fetching transaction:", error);
    return NextResponse.json(
      { error: "Erro ao buscar transacao" },
      { status: 500 }
    );
  }
}

// PATCH - Update transaction category and notes
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const { categoryId, notes } = body as { categoryId?: string | null; notes?: string };

    // Verify transaction belongs to user
    const transaction = await prisma.transaction.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!transaction) {
      return NextResponse.json(
        { error: "Transacao nao encontrada" },
        { status: 404 }
      );
    }

    // If categoryId provided, verify it exists and belongs to user or is system
    if (categoryId) {
      const category = await prisma.category.findFirst({
        where: {
          id: categoryId,
          OR: [{ userId: session.user.id }, { isSystem: true }],
        },
      });

      if (!category) {
        return NextResponse.json(
          { error: "Categoria nao encontrada" },
          { status: 404 }
        );
      }
    }

    // Update transaction
    const updated = await prisma.transaction.update({
      where: { id },
      data: {
        ...(categoryId !== undefined && { categoryId: categoryId || null }),
        ...(notes !== undefined && { notes }),
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            icon: true,
            color: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      transaction: {
        id: updated.id,
        categoryId: updated.categoryId,
        category: updated.category,
      },
    });
  } catch (error) {
    console.error("Error updating transaction:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar transacao" },
      { status: 500 }
    );
  }
}
