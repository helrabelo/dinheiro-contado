/**
 * One-time script to re-categorize all transactions
 * Run with: npx tsx scripts/recategorize-all.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Copy of CATEGORY_PATTERNS from lib/categorization
const CATEGORY_PATTERNS: Record<string, string[]> = {
  Alimentacao: [
    "ifood", "rappi", "uber eats", "zé delivery", "aiqfome",
    "restaurante", "lanchonete", "pizzaria", "padaria", "cafe",
    "bar ", "boteco", "mcdonald", "burger king", "subway",
    "starbucks", "outback", "madero", "coco bambu", "sushi", "acai",
  ],
  Supermercado: [
    "supermercado", "mercado", "extra", "carrefour", "atacadao",
    "assai", "pao de acucar", "big", "nacional", "zaffari",
    "dia", "fort atacadista", "mart minas", "angeloni", "bistek", "hipermercado",
  ],
  Transporte: [
    "uber", "99", "99app", "cabify", "indriver", "taxi",
    "blablacar", "buser", "clickbus", "guichevirtual", "onibus",
    "metrô", "metro", "cptm", "bilhete unico", "sem parar",
    "conectcar", "veloe", "move mais", "estacionamento", "parking", "estapar",
  ],
  Combustivel: [
    "shell", "ipiranga", "br petrobras", "ale", "repsol",
    "posto", "gas station", "combustivel", "gasolina", "etanol", "gnv",
  ],
  Saude: [
    "farmacia", "drogaria", "droga", "drogasil", "pacheco",
    "pague menos", "raia", "panvel", "sao joao", "laboratorio",
    "lab ", "fleury", "hermes pardini", "hospital", "clinica",
    "consultorio", "medico", "dentista", "odonto", "psicolog",
    "terapeuta", "fisioterapia", "unimed", "amil", "bradesco saude",
    "sulamerica", "hapvida", "notredame",
  ],
  Streaming: [
    "netflix", "spotify", "amazon prime", "disney", "hbo",
    "max", "globoplay", "paramount", "apple tv", "apple music",
    "youtube premium", "deezer", "tidal", "crunchyroll", "twitch",
  ],
  "Servicos Digitais": [
    "google", "apple", "microsoft", "adobe", "dropbox",
    "notion", "slack", "zoom", "figma", "canva",
    "chatgpt", "openai", "anthropic", "aws", "vercel",
    "heroku", "digital ocean", "github", "gitlab",
  ],
  Educacao: [
    "udemy", "coursera", "alura", "rocketseat", "origamid",
    "escola", "faculdade", "universidade", "curso", "livro",
    "livraria", "saraiva", "amazon kindle", "audible",
  ],
  "Compras Online": [
    "amazon", "mercado livre", "magalu", "magazine luiza",
    "americanas", "submarino", "shopee", "shein", "aliexpress",
    "casas bahia", "ponto frio", "kabum", "terabyte", "pichau",
  ],
  Vestuario: [
    "renner", "c&a", "riachuelo", "marisa", "zara",
    "h&m", "forever 21", "centauro", "netshoes", "nike",
    "adidas", "puma", "decathlon", "hering", "lojas",
  ],
  Moradia: [
    "aluguel", "condominio", "iptu", "luz", "energia",
    "enel", "cemig", "copel", "celesc", "agua",
    "sabesp", "copasa", "sanepar", "gas ", "comgas",
    "naturgy", "internet", "claro", "vivo", "tim",
    "oi ", "net ", "sky",
  ],
  Lazer: [
    "cinema", "cinemark", "cinepolis", "uci", "kinoplex",
    "teatro", "show", "ingresso", "sympla", "eventbrite",
    "ticketmaster", "parque", "museu", "zoo", "praia",
    "viagem", "hotel", "airbnb", "booking", "decolar",
    "latam", "gol", "azul",
  ],
  Pets: [
    "pet", "petshop", "petz", "cobasi", "veterinario",
    "vet ", "racao", "canil",
  ],
  Beleza: [
    "salao", "barbearia", "manicure", "estetica", "spa",
    "massagem", "boticario", "natura", "avon", "sephora", "mac cosmetics",
  ],
  Jogos: [
    "steam", "playstation", "xbox", "nintendo", "epic games",
    "riot", "blizzard", "ea games", "ubisoft", "game", "jogo",
  ],
  Financeiro: [
    "iof", "juros", "tarifa", "anuidade", "ted",
    "doc", "pix", "transferencia", "saque", "investimento",
    "cdb", "tesouro", "acao", "fundo", "b3",
    "xp", "rico", "inter invest", "nuinvest",
  ],
};

function findCategory(
  description: string
): { category: string; keyword: string } | null {
  const lower = description.toLowerCase();

  for (const [category, keywords] of Object.entries(CATEGORY_PATTERNS)) {
    for (const keyword of keywords) {
      if (lower.includes(keyword.toLowerCase())) {
        return { category, keyword };
      }
    }
  }

  return null;
}

async function main() {
  console.log("Starting re-categorization of all transactions...\n");

  // Get the user (assuming single user for now)
  const user = await prisma.user.findFirst();
  if (!user) {
    console.error("No user found!");
    return;
  }
  console.log(`User: ${user.email}\n`);

  // Get all transactions
  const transactions = await prisma.transaction.findMany({
    where: { userId: user.id },
    select: {
      id: true,
      description: true,
      originalDescription: true,
    },
  });

  console.log(`Total transactions: ${transactions.length}\n`);

  // Build category cache
  const categoryCache = new Map<string, string>();
  const uniqueCategories = new Set<string>();

  // Find all unique categories needed
  for (const tx of transactions) {
    const match =
      findCategory(tx.originalDescription) || findCategory(tx.description);
    if (match) {
      uniqueCategories.add(match.category);
    }
  }

  console.log(`Categories needed: ${uniqueCategories.size}`);
  console.log(`Categories: ${Array.from(uniqueCategories).join(", ")}\n`);

  // Get or create all categories
  for (const categoryName of uniqueCategories) {
    let category = await prisma.category.findFirst({
      where: {
        name: categoryName,
        OR: [{ userId: user.id }, { isSystem: true }],
      },
    });

    if (!category) {
      category = await prisma.category.create({
        data: {
          userId: user.id,
          name: categoryName,
          isSystem: false,
        },
      });
      console.log(`Created category: ${categoryName}`);
    }

    categoryCache.set(categoryName, category.id);
  }

  // Categorize and update transactions
  const results = {
    total: transactions.length,
    categorized: 0,
    uncategorized: 0,
    byCategory: {} as Record<string, number>,
  };

  const batchSize = 100;
  const updates: Array<{ id: string; categoryId: string | null }> = [];

  for (const tx of transactions) {
    const match =
      findCategory(tx.originalDescription) || findCategory(tx.description);

    if (match) {
      const categoryId = categoryCache.get(match.category)!;
      updates.push({ id: tx.id, categoryId });
      results.categorized++;
      results.byCategory[match.category] =
        (results.byCategory[match.category] || 0) + 1;
    } else {
      updates.push({ id: tx.id, categoryId: null });
      results.uncategorized++;
    }
  }

  // Apply updates in batches
  console.log(`\nApplying updates in batches of ${batchSize}...`);
  for (let i = 0; i < updates.length; i += batchSize) {
    const batch = updates.slice(i, i + batchSize);
    await Promise.all(
      batch.map((update) =>
        prisma.transaction.update({
          where: { id: update.id },
          data: { categoryId: update.categoryId },
        })
      )
    );
    process.stdout.write(`\rProcessed ${Math.min(i + batchSize, updates.length)} / ${updates.length}`);
  }

  console.log("\n\n=== Results ===");
  console.log(`Total transactions: ${results.total}`);
  console.log(`Categorized: ${results.categorized}`);
  console.log(`Uncategorized: ${results.uncategorized}`);
  console.log(`\nBy category:`);

  const sorted = Object.entries(results.byCategory).sort((a, b) => b[1] - a[1]);
  for (const [category, count] of sorted) {
    console.log(`  ${category}: ${count}`);
  }

  await prisma.$disconnect();
}

main().catch(console.error);
