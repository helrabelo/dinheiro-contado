/**
 * Backfill installment data from existing transaction descriptions
 *
 * Run with: npx tsx scripts/backfill-installments.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Pattern to match installments: "2/12", "PARCELA 2/12", "Parcela 02/12"
const INSTALLMENT_PATTERN = /(?:PARCELA\s+)?(\d{1,2})[/\\](\d{1,2})/i;

async function backfillInstallments() {
  console.log("Starting installment backfill...\n");

  // Get all transactions without installment data
  const transactions = await prisma.transaction.findMany({
    where: {
      installmentTotal: null,
    },
    select: {
      id: true,
      description: true,
      originalDescription: true,
    },
  });

  console.log(`Found ${transactions.length} transactions to check\n`);

  let updated = 0;
  let skipped = 0;

  for (const tx of transactions) {
    // Try original description first, then description
    const textToSearch = tx.originalDescription || tx.description;
    const match = INSTALLMENT_PATTERN.exec(textToSearch);

    if (match) {
      const installmentCurrent = parseInt(match[1], 10);
      const installmentTotal = parseInt(match[2], 10);

      // Validate: current should be <= total, total should be > 1
      if (installmentCurrent <= installmentTotal && installmentTotal > 1) {
        await prisma.transaction.update({
          where: { id: tx.id },
          data: {
            installmentCurrent,
            installmentTotal,
          },
        });
        updated++;

        if (updated % 100 === 0) {
          console.log(`Updated ${updated} transactions...`);
        }
      } else {
        skipped++;
      }
    }
  }

  console.log(`\nBackfill complete!`);
  console.log(`- Updated: ${updated} transactions`);
  console.log(`- Skipped (invalid pattern): ${skipped}`);
  console.log(`- No pattern found: ${transactions.length - updated - skipped}`);
}

backfillInstallments()
  .catch((e) => {
    console.error("Error during backfill:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
