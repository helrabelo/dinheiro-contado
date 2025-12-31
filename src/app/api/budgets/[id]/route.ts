import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

// DELETE a budget
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const budget = await prisma.budget.findUnique({
      where: { id },
    });

    if (!budget || budget.userId !== session.user.id) {
      return NextResponse.json({ error: "Budget not found" }, { status: 404 });
    }

    await prisma.budget.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting budget:", error);
    return NextResponse.json(
      { error: "Failed to delete budget" },
      { status: 500 }
    );
  }
}

// PATCH update a budget
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const budget = await prisma.budget.findUnique({
      where: { id },
    });

    if (!budget || budget.userId !== session.user.id) {
      return NextResponse.json({ error: "Budget not found" }, { status: 404 });
    }

    const body = await request.json();
    const { amount, alertAt80, alertAt100, isActive } = body;

    const updated = await prisma.budget.update({
      where: { id },
      data: {
        ...(amount !== undefined && { amount }),
        ...(alertAt80 !== undefined && { alertAt80 }),
        ...(alertAt100 !== undefined && { alertAt100 }),
        ...(isActive !== undefined && { isActive }),
      },
      include: { category: { select: { name: true, icon: true, color: true } } },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating budget:", error);
    return NextResponse.json(
      { error: "Failed to update budget" },
      { status: 500 }
    );
  }
}
