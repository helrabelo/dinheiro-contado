import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

const PAGE_SIZE = 50;

// GET - Fetch uncategorized transactions with pagination
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const cursor = searchParams.get("cursor");
  const search = searchParams.get("search");

  try {
    // Build where clause
    const where = {
      userId: session.user.id,
      categoryId: null,
      ...(search && {
        description: { contains: search, mode: "insensitive" as const },
      }),
    };

    // Get total count
    const totalCount = await prisma.transaction.count({ where });

    // Get transactions with cursor-based pagination
    const transactions = await prisma.transaction.findMany({
      where,
      orderBy: { transactionDate: "desc" },
      take: PAGE_SIZE + 1, // Get one extra to check if there's more
      ...(cursor && {
        cursor: { id: cursor },
        skip: 1, // Skip the cursor item
      }),
      select: {
        id: true,
        description: true,
        amount: true,
        type: true,
        transactionDate: true,
        statement: {
          select: { originalFileName: true },
        },
      },
    });

    // Check if there are more items
    const hasMore = transactions.length > PAGE_SIZE;
    const items = hasMore ? transactions.slice(0, PAGE_SIZE) : transactions;
    const nextCursor = hasMore ? items[items.length - 1]?.id : null;

    // Serialize for client
    const serializedItems = items.map((tx) => ({
      id: tx.id,
      description: tx.description,
      amount: Math.abs(Number(tx.amount)),
      type: tx.type,
      date: tx.transactionDate.toISOString().split("T")[0],
      statementName: tx.statement?.originalFileName || null,
    }));

    // Get categories for the dropdown
    const categories = await prisma.category.findMany({
      where: {
        OR: [{ userId: session.user.id }, { isSystem: true }],
      },
      orderBy: { name: "asc" },
      select: { id: true, name: true, icon: true, color: true },
    });

    return NextResponse.json({
      transactions: serializedItems,
      totalCount,
      hasMore,
      nextCursor,
      categories,
    });
  } catch (error) {
    console.error("Error fetching uncategorized transactions:", error);
    return NextResponse.json(
      { error: "Erro ao buscar transacoes" },
      { status: 500 }
    );
  }
}
