import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { parseStatement, checkParserHealth } from "@/lib/parser";
import crypto from "crypto";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const bank = formData.get("bank") as string | null;
    const statementType = formData.get("statementType") as string | null;
    const password = formData.get("password") as string | null;

    if (!file || !bank || !statementType) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate file type
    const validTypes = ["application/pdf", "text/csv"];
    if (
      !validTypes.includes(file.type) &&
      !file.name.endsWith(".pdf") &&
      !file.name.endsWith(".csv")
    ) {
      return NextResponse.json(
        { error: "Invalid file type. Only PDF and CSV are supported." },
        { status: 400 }
      );
    }

    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 10MB." },
        { status: 400 }
      );
    }

    // Calculate file hash for deduplication
    const buffer = Buffer.from(await file.arrayBuffer());
    const fileHash = crypto.createHash("sha256").update(buffer).digest("hex");

    // Check for duplicate
    const existing = await prisma.statement.findUnique({
      where: {
        userId_fileHash: {
          userId: session.user.id,
          fileHash,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        {
          error: "This file has already been uploaded.",
          statementId: existing.id,
        },
        { status: 409 }
      );
    }

    // For now, store file path as placeholder
    // TODO: Implement S3/R2 upload
    const storagePath = `uploads/${session.user.id}/${fileHash}${file.name.substring(file.name.lastIndexOf("."))}`;

    // Create statement record with PROCESSING status
    const statement = await prisma.statement.create({
      data: {
        userId: session.user.id,
        originalFileName: file.name,
        storagePath,
        fileHash,
        fileSizeBytes: file.size,
        statementType: statementType as
          | "CREDIT_CARD"
          | "CHECKING_ACCOUNT"
          | "SAVINGS_ACCOUNT",
        periodStart: new Date(),
        periodEnd: new Date(),
        status: "PROCESSING",
      },
    });

    // Check if parser service is available
    const parserHealthy = await checkParserHealth();

    if (!parserHealthy) {
      // Mark as pending if parser is not available
      await prisma.statement.update({
        where: { id: statement.id },
        data: {
          status: "PENDING",
          errorMessage: "Parser service not available. Will retry later.",
        },
      });

      return NextResponse.json({
        success: true,
        statementId: statement.id,
        message:
          "File uploaded. Parser service unavailable - processing will be retried.",
        status: "PENDING",
      });
    }

    // Call parser service
    const parseResult = await parseStatement(
      buffer,
      file.name,
      bank,
      password || undefined
    );

    if (!parseResult.success) {
      // Update statement with error
      await prisma.statement.update({
        where: { id: statement.id },
        data: {
          status: "FAILED",
          errorMessage: parseResult.error_message || "Unknown parsing error",
          parserVersion: parseResult.parser_version,
        },
      });

      return NextResponse.json({
        success: false,
        statementId: statement.id,
        message: parseResult.error_message || "Failed to parse statement",
        status: "FAILED",
      });
    }

    // Create transactions from parse result
    const transactionPromises = parseResult.transactions.map((tx) => {
      // Create a hash for deduplication
      const txHash = crypto
        .createHash("sha256")
        .update(
          `${tx.date}|${tx.amount}|${tx.original_description}|${statement.id}`
        )
        .digest("hex");

      return prisma.transaction.create({
        data: {
          userId: session.user.id,
          statementId: statement.id,
          transactionDate: new Date(tx.date),
          description: tx.description,
          originalDescription: tx.original_description,
          amount: tx.amount,
          type: tx.type,
          installmentCurrent: tx.installment_current,
          installmentTotal: tx.installment_total,
          isInternational: tx.is_international,
          transactionHash: txHash,
        },
      });
    });

    await Promise.all(transactionPromises);

    // Update statement with success
    await prisma.statement.update({
      where: { id: statement.id },
      data: {
        status: "COMPLETED",
        parserVersion: parseResult.parser_version,
        parsedAt: new Date(),
        totalAmount: parseResult.total_amount,
        periodStart: parseResult.period_start
          ? new Date(parseResult.period_start)
          : undefined,
        periodEnd: parseResult.period_end
          ? new Date(parseResult.period_end)
          : undefined,
      },
    });

    return NextResponse.json({
      success: true,
      statementId: statement.id,
      message: `Successfully parsed ${parseResult.transactions.length} transactions`,
      status: "COMPLETED",
      transactionCount: parseResult.transactions.length,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
