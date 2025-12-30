import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const { id } = await params;

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, icon, color } = body;

    if (!name?.trim()) {
      return NextResponse.json(
        { error: "Nome da categoria e obrigatorio" },
        { status: 400 }
      );
    }

    // Find the category
    const category = await prisma.category.findUnique({
      where: { id },
    });

    if (!category) {
      return NextResponse.json(
        { error: "Categoria nao encontrada" },
        { status: 404 }
      );
    }

    // Check ownership
    if (category.userId !== session.user.id) {
      return NextResponse.json(
        { error: "Voce nao tem permissao para editar esta categoria" },
        { status: 403 }
      );
    }

    // Cannot edit system categories
    if (category.isSystem) {
      return NextResponse.json(
        { error: "Nao e possivel editar categorias do sistema" },
        { status: 403 }
      );
    }

    // Check for duplicate name
    const existingCategory = await prisma.category.findFirst({
      where: {
        userId: session.user.id,
        name: name.trim(),
        id: { not: id },
      },
    });

    if (existingCategory) {
      return NextResponse.json(
        { error: "Ja existe uma categoria com este nome" },
        { status: 400 }
      );
    }

    const updatedCategory = await prisma.category.update({
      where: { id },
      data: {
        name: name.trim(),
        icon: icon || null,
        color: color || null,
      },
    });

    return NextResponse.json(updatedCategory);
  } catch (error) {
    console.error("Update category error:", error);
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

    // Find the category
    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        _count: {
          select: { transactions: true },
        },
      },
    });

    if (!category) {
      return NextResponse.json(
        { error: "Categoria nao encontrada" },
        { status: 404 }
      );
    }

    // Check ownership
    if (category.userId !== session.user.id) {
      return NextResponse.json(
        { error: "Voce nao tem permissao para excluir esta categoria" },
        { status: 403 }
      );
    }

    // Cannot delete system categories
    if (category.isSystem) {
      return NextResponse.json(
        { error: "Nao e possivel excluir categorias do sistema" },
        { status: 403 }
      );
    }

    // Cannot delete if has transactions
    if (category._count.transactions > 0) {
      return NextResponse.json(
        { error: "Nao e possivel excluir categoria com transacoes associadas" },
        { status: 400 }
      );
    }

    await prisma.category.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete category error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
