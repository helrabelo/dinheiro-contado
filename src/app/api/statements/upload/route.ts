import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
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
    // Password is received but not stored - would be used for PDF decryption
    // const password = formData.get("password") as string | null;

    if (!file || !bank || !statementType) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate file type
    const validTypes = ["application/pdf", "text/csv"];
    if (!validTypes.includes(file.type) && !file.name.endsWith(".pdf") && !file.name.endsWith(".csv")) {
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
        { error: "This file has already been uploaded." },
        { status: 409 }
      );
    }

    // For now, store file path as placeholder
    // TODO: Implement S3/R2 upload
    const storagePath = `uploads/${session.user.id}/${fileHash}${file.name.substring(file.name.lastIndexOf("."))}`;

    // Create statement record
    const statement = await prisma.statement.create({
      data: {
        userId: session.user.id,
        originalFileName: file.name,
        storagePath,
        fileHash,
        fileSizeBytes: file.size,
        statementType: statementType as "CREDIT_CARD" | "CHECKING_ACCOUNT" | "SAVINGS_ACCOUNT",
        periodStart: new Date(), // TODO: Extract from PDF
        periodEnd: new Date(), // TODO: Extract from PDF
        status: "PENDING",
      },
    });

    // TODO: Trigger async parsing job
    // For now, just return success

    return NextResponse.json({
      success: true,
      statementId: statement.id,
      message: "File uploaded successfully. Processing will begin shortly.",
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
