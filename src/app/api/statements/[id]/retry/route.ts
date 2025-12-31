import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { parseStatement, checkParserHealth } from "@/lib/parser";
import { buildCategoryCache, findCategory } from "@/lib/categorization";
import crypto from "crypto";
import fs from "fs/promises";
import path from "path";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    // Get the statement
    const statement = await prisma.statement.findUnique({
      where: { id, userId: session.user.id },
    });

    if (!statement) {
      return NextResponse.json({ error: "Statement not found" }, { status: 404 });
    }

    if (statement.status !== "FAILED" && statement.status !== "PENDING") {
      return NextResponse.json(
        { error: "Only FAILED or PENDING statements can be retried" },
        { status: 400 }
      );
    }

    // Check parser health
    const parserHealthy = await checkParserHealth();
    if (!parserHealthy) {
      return NextResponse.json(
        { error: "Parser service not available" },
        { status: 503 }
      );
    }

    // Read the file from storage
    // For now, check local uploads directory
    const uploadsDir = path.join(process.cwd(), "uploads");
    const filePath = path.join(uploadsDir, statement.storagePath.replace("uploads/", ""));

    let buffer: Buffer;
    try {
      buffer = await fs.readFile(filePath);
    } catch {
      return NextResponse.json(
        { error: "Original file not found. Please re-upload the statement." },
        { status: 404 }
      );
    }

    // Update status to processing
    await prisma.statement.update({
      where: { id },
      data: { status: "PROCESSING", errorMessage: null },
    });

    // Get password from request body if provided
    const body = await request.json().catch(() => ({}));
    const password = body.password as string | undefined;

    // Parse the statement
    const parseResult = await parseStatement(
      buffer,
      statement.originalFileName,
      statement.bank || "unknown",
      password
    );

    if (!parseResult.success) {
      await prisma.statement.update({
        where: { id },
        data: {
          status: "FAILED",
          errorMessage: parseResult.error_message || "Unknown parsing error",
          parserVersion: parseResult.parser_version,
        },
      });

      return NextResponse.json({
        success: false,
        message: parseResult.error_message || "Failed to parse statement",
        status: "FAILED",
      });
    }

    // Delete existing transactions for this statement
    await prisma.transaction.deleteMany({
      where: { statementId: id },
    });

    // Build category cache
    const categoryCache = await buildCategoryCache(
      session.user.id,
      parseResult.transactions
    );

    // Prepare transactions
    let categorizedCount = 0;
    const transactionsToCreate = parseResult.transactions.map((tx) => {
      const txHash = crypto
        .createHash("sha256")
        .update(`${tx.date}|${tx.amount}|${tx.original_description}|${id}`)
        .digest("hex");

      const match =
        findCategory(tx.original_description) || findCategory(tx.description);
      const categoryId = match ? categoryCache.get(match.category) : null;
      if (categoryId) categorizedCount++;

      return {
        userId: session.user.id,
        statementId: id,
        transactionDate: new Date(tx.date),
        description: tx.description,
        originalDescription: tx.original_description,
        amount: tx.amount,
        type: tx.type as "CREDIT" | "DEBIT" | "TRANSFER",
        installmentCurrent: tx.installment_current,
        installmentTotal: tx.installment_total,
        isInternational: tx.is_international,
        transactionHash: txHash,
        categoryId,
      };
    });

    // Create transactions
    await prisma.transaction.createMany({
      data: transactionsToCreate,
      skipDuplicates: true,
    });

    // Update statement
    await prisma.statement.update({
      where: { id },
      data: {
        status: "COMPLETED",
        parserVersion: parseResult.parser_version,
        parsedAt: new Date(),
        totalAmount: parseResult.total_amount,
        cardLastFour: parseResult.card_last_four,
        periodStart: parseResult.period_start
          ? new Date(parseResult.period_start)
          : undefined,
        periodEnd: parseResult.period_end
          ? new Date(parseResult.period_end)
          : undefined,
        errorMessage: null,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Successfully parsed ${parseResult.transactions.length} transactions (${categorizedCount} categorized)`,
      status: "COMPLETED",
      transactionCount: parseResult.transactions.length,
      categorizedCount,
    });
  } catch (error) {
    console.error("Retry error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
