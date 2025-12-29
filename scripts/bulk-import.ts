/**
 * Bulk Import Script
 * Imports all 144 PDFs from financial-analyzer to the user's account
 */

import { PrismaClient } from "@prisma/client";
import { readFileSync, readdirSync } from "fs";
import { createHash } from "crypto";
import path from "path";

const prisma = new PrismaClient();

const PDF_DIR = "/Users/helrabelo/code/personal/financial-analyzer/pdfs";
const PARSER_URL = "http://localhost:8000/parse";
const USER_ID = "cmjpsv53q000012xoffypfws3";

interface ParsedTransaction {
  date: string;
  description: string;
  original_description: string;
  amount: number;
  type: "CREDIT" | "DEBIT";
  installment_current?: number;
  installment_total?: number;
  is_international: boolean;
}

interface ParseResult {
  success: boolean;
  bank: string;
  statement_type: string;
  period_start?: string;
  period_end?: string;
  total_amount?: number;
  transactions: ParsedTransaction[];
  parser_version: string;
  error_message?: string;
}

async function parseFile(
  filePath: string,
  bank: string = "auto"
): Promise<ParseResult> {
  const formData = new FormData();
  const buffer = readFileSync(filePath);
  const blob = new Blob([buffer], { type: "application/pdf" });
  formData.append("file", blob, path.basename(filePath));

  const response = await fetch(`${PARSER_URL}?bank=${bank}`, {
    method: "POST",
    body: formData,
  });

  return response.json();
}

function sanitizeString(str: string): string {
  // Remove null bytes and other invalid UTF-8 characters
  return str.replace(/\x00/g, "").replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "");
}

function extractPeriodFromFilename(filename: string): { year: number; month: number } {
  // Format: fatura-YYYY-MM-bank.pdf
  const match = filename.match(/fatura-(\d{4})-(\d{2})/);
  if (match) {
    return { year: parseInt(match[1]), month: parseInt(match[2]) };
  }
  return { year: 2024, month: 1 };
}

async function main() {
  console.log("Starting bulk import...\n");

  // Get all PDFs
  const files = readdirSync(PDF_DIR)
    .filter((f) => f.endsWith(".pdf"))
    .sort();

  console.log(`Found ${files.length} PDFs to import\n`);

  let imported = 0;
  let skipped = 0;
  let failed = 0;
  let totalTransactions = 0;

  for (const file of files) {
    const filePath = path.join(PDF_DIR, file);
    const buffer = readFileSync(filePath);
    const fileHash = createHash("sha256").update(buffer).digest("hex");

    // Check if already imported
    const existing = await prisma.statement.findUnique({
      where: {
        userId_fileHash: {
          userId: USER_ID,
          fileHash,
        },
      },
    });

    if (existing) {
      console.log(`  SKIP: ${file} (already imported)`);
      skipped++;
      continue;
    }

    // Parse the file
    const result = await parseFile(filePath);

    if (!result.success) {
      console.log(`  FAIL: ${file} - ${result.error_message}`);
      failed++;
      continue;
    }

    // Extract period from filename
    const { year, month } = extractPeriodFromFilename(file);
    const periodStart = new Date(year, month - 1, 1);
    const periodEnd = new Date(year, month, 0);

    // Create statement
    const statement = await prisma.statement.create({
      data: {
        userId: USER_ID,
        originalFileName: file,
        storagePath: `imports/${USER_ID}/${fileHash}.pdf`,
        fileHash,
        fileSizeBytes: buffer.length,
        statementType: "CREDIT_CARD",
        periodStart,
        periodEnd,
        totalAmount: result.total_amount,
        status: "COMPLETED",
        parserVersion: result.parser_version,
        parsedAt: new Date(),
      },
    });

    // Create transactions
    for (const tx of result.transactions) {
      const description = sanitizeString(tx.description);
      const originalDescription = sanitizeString(tx.original_description);

      const txHash = createHash("sha256")
        .update(`${tx.date}|${tx.amount}|${originalDescription}|${statement.id}`)
        .digest("hex");

      await prisma.transaction.create({
        data: {
          userId: USER_ID,
          statementId: statement.id,
          transactionDate: new Date(tx.date),
          description,
          originalDescription,
          amount: tx.amount,
          type: tx.type,
          installmentCurrent: tx.installment_current,
          installmentTotal: tx.installment_total,
          isInternational: tx.is_international,
          transactionHash: txHash,
        },
      });
    }

    totalTransactions += result.transactions.length;
    imported++;
    console.log(`  OK: ${file} - ${result.bank} - ${result.transactions.length} txs`);
  }

  console.log("\n" + "=".repeat(50));
  console.log("IMPORT COMPLETE");
  console.log("=".repeat(50));
  console.log(`Imported: ${imported}`);
  console.log(`Skipped:  ${skipped}`);
  console.log(`Failed:   ${failed}`);
  console.log(`Total Transactions: ${totalTransactions}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
