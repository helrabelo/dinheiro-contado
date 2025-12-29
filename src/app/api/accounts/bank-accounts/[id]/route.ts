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

    const account = await prisma.bankAccount.findUnique({
      where: { id },
    });

    if (!account) {
      return NextResponse.json(
        { error: "Conta nao encontrada" },
        { status: 404 }
      );
    }

    if (account.userId !== session.user.id) {
      return NextResponse.json(
        { error: "Sem permissao" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { isActive, nickname } = body;

    const updated = await prisma.bankAccount.update({
      where: { id },
      data: {
        ...(isActive !== undefined && { isActive }),
        ...(nickname !== undefined && { nickname }),
      },
    });

    return NextResponse.json({ success: true, account: updated });
  } catch (error) {
    console.error("Update bank account error:", error);
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

    const account = await prisma.bankAccount.findUnique({
      where: { id },
      include: {
        _count: {
          select: { statements: true, transactions: true },
        },
      },
    });

    if (!account) {
      return NextResponse.json(
        { error: "Conta nao encontrada" },
        { status: 404 }
      );
    }

    if (account.userId !== session.user.id) {
      return NextResponse.json(
        { error: "Sem permissao" },
        { status: 403 }
      );
    }

    // Unlink statements and transactions before deletion
    if (account._count.statements > 0 || account._count.transactions > 0) {
      await prisma.statement.updateMany({
        where: { bankAccountId: id },
        data: { bankAccountId: null },
      });

      await prisma.transaction.updateMany({
        where: { bankAccountId: id },
        data: { bankAccountId: null },
      });
    }

    await prisma.bankAccount.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete bank account error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
