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
    const { name, icon, color } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Nome da categoria e obrigatorio" },
        { status: 400 }
      );
    }

    // Check for duplicate name
    const existing = await prisma.category.findFirst({
      where: {
        userId: session.user.id,
        name: name.trim(),
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Ja existe uma categoria com este nome" },
        { status: 409 }
      );
    }

    const category = await prisma.category.create({
      data: {
        userId: session.user.id,
        name: name.trim(),
        icon: icon || null,
        color: color || null,
        isSystem: false,
      },
    });

    return NextResponse.json({ success: true, category });
  } catch (error) {
    console.error("Create category error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const categories = await prisma.category.findMany({
      where: {
        OR: [{ userId: session.user.id }, { isSystem: true }],
      },
      orderBy: [{ isSystem: "desc" }, { name: "asc" }],
    });

    return NextResponse.json({ categories });
  } catch (error) {
    console.error("Get categories error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
