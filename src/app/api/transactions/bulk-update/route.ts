import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

// POST - Bulk update transaction categories
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { transactionIds, categoryId } = body as {
      transactionIds: string[];
      categoryId: string | null;
    };

    if (!transactionIds || !Array.isArray(transactionIds) || transactionIds.length === 0) {
      return NextResponse.json(
        { error: "IDs de transacoes sao obrigatorios" },
        { status: 400 }
      );
    }

    // Verify all transactions belong to user
    const transactionCount = await prisma.transaction.count({
      where: {
        id: { in: transactionIds },
        userId: session.user.id,
      },
    });

    if (transactionCount !== transactionIds.length) {
      return NextResponse.json(
        { error: "Uma ou mais transacoes nao encontradas" },
        { status: 404 }
      );
    }

    // If categoryId provided, verify it exists and belongs to user or is system
    let category = null;
    if (categoryId) {
      category = await prisma.category.findFirst({
        where: {
          id: categoryId,
          OR: [{ userId: session.user.id }, { isSystem: true }],
        },
        select: { id: true, name: true, icon: true, color: true },
      });

      if (!category) {
        return NextResponse.json(
          { error: "Categoria nao encontrada" },
          { status: 404 }
        );
      }
    }

    // Update all transactions
    const result = await prisma.transaction.updateMany({
      where: {
        id: { in: transactionIds },
        userId: session.user.id,
      },
      data: { categoryId: categoryId || null },
    });

    return NextResponse.json({
      success: true,
      updatedCount: result.count,
      category,
    });
  } catch (error) {
    console.error("Error bulk updating transactions:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar transacoes" },
      { status: 500 }
    );
  }
}
