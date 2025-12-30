import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

// PATCH - Update transaction category
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
    const { categoryId } = body as { categoryId: string | null };

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
      data: { categoryId: categoryId || null },
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
