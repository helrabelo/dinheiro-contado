import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: categoryId } = await params;
    const { searchParams } = new URL(request.url);

    // Parse query params
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, parseInt(searchParams.get("limit") || "25", 10));
    const search = searchParams.get("search") || "";
    const type = searchParams.get("type") || "ALL";
    const sortField = searchParams.get("sortField") || "date";
    const sortOrder = searchParams.get("sortOrder") || "desc";

    const skip = (page - 1) * limit;

    // Verify category exists and user has access
    const category = await prisma.category.findFirst({
      where: {
        id: categoryId,
        OR: [{ userId: session.user.id }, { isSystem: true }],
      },
    });

    if (!category) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    // Build where clause
    const where: Prisma.TransactionWhereInput = {
      userId: session.user.id,
      categoryId,
    };

    if (type !== "ALL") {
      where.type = type as "DEBIT" | "CREDIT" | "TRANSFER";
    }

    if (search) {
      where.description = { contains: search, mode: "insensitive" };
    }

    // Build orderBy
    const orderBy: Prisma.TransactionOrderByWithRelationInput =
      sortField === "amount"
        ? { amount: sortOrder as "asc" | "desc" }
        : { transactionDate: sortOrder as "asc" | "desc" };

    // Fetch transactions and count in parallel
    const [transactions, totalCount] = await Promise.all([
      prisma.transaction.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        select: {
          id: true,
          description: true,
          amount: true,
          type: true,
          transactionDate: true,
          installmentCurrent: true,
          installmentTotal: true,
        },
      }),
      prisma.transaction.count({ where }),
    ]);

    // Serialize for client
    const serializedTransactions = transactions.map((tx) => ({
      id: tx.id,
      description: tx.description,
      amount: Math.abs(Number(tx.amount)),
      type: tx.type,
      transactionDate: tx.transactionDate.toISOString(),
      installmentCurrent: tx.installmentCurrent,
      installmentTotal: tx.installmentTotal,
    }));

    return NextResponse.json({
      transactions: serializedTransactions,
      totalCount,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit),
    });
  } catch (error) {
    console.error("Error fetching category transactions:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
