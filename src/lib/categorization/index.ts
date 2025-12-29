/**
 * Auto-categorization service for Brazilian transactions
 * Uses keyword matching to assign categories to transactions
 */

import { prisma } from "@/lib/db";

// Category patterns for common Brazilian merchants
// Format: categoryName -> [keywords to match in description]
export const CATEGORY_PATTERNS: Record<string, string[]> = {
  // Alimentacao
  Alimentacao: [
    "ifood",
    "rappi",
    "uber eats",
    "zé delivery",
    "aiqfome",
    "restaurante",
    "lanchonete",
    "pizzaria",
    "padaria",
    "cafe",
    "bar ",
    "boteco",
    "mcdonald",
    "burger king",
    "subway",
    "starbucks",
    "outback",
    "madero",
    "coco bambu",
    "sushi",
    "acai",
  ],

  // Supermercado
  Supermercado: [
    "supermercado",
    "mercado",
    "extra",
    "carrefour",
    "atacadao",
    "assai",
    "pao de acucar",
    "big",
    "nacional",
    "zaffari",
    "dia",
    "fort atacadista",
    "mart minas",
    "angeloni",
    "bistek",
    "hipermercado",
  ],

  // Transporte
  Transporte: [
    "uber",
    "99",
    "99app",
    "cabify",
    "indriver",
    "taxi",
    "blablacar",
    "buser",
    "clickbus",
    "guichevirtual",
    "onibus",
    "metrô",
    "metro",
    "cptm",
    "bilhete unico",
    "sem parar",
    "conectcar",
    "veloe",
    "move mais",
    "estacionamento",
    "parking",
    "estapar",
  ],

  // Combustivel
  Combustivel: [
    "shell",
    "ipiranga",
    "br petrobras",
    "ale",
    "repsol",
    "posto",
    "gas station",
    "combustivel",
    "gasolina",
    "etanol",
    "gnv",
  ],

  // Saude
  Saude: [
    "farmacia",
    "drogaria",
    "droga",
    "drogasil",
    "pacheco",
    "pague menos",
    "raia",
    "panvel",
    "sao joao",
    "laboratorio",
    "lab ",
    "fleury",
    "hermes pardini",
    "hospital",
    "clinica",
    "consultorio",
    "medico",
    "dentista",
    "odonto",
    "psicolog",
    "terapeuta",
    "fisioterapia",
    "unimed",
    "amil",
    "bradesco saude",
    "sulamerica",
    "hapvida",
    "notredame",
  ],

  // Streaming
  Streaming: [
    "netflix",
    "spotify",
    "amazon prime",
    "disney",
    "hbo",
    "max",
    "globoplay",
    "paramount",
    "apple tv",
    "apple music",
    "youtube premium",
    "deezer",
    "tidal",
    "crunchyroll",
    "twitch",
  ],

  // Servicos Digitais
  "Servicos Digitais": [
    "google",
    "apple",
    "microsoft",
    "adobe",
    "dropbox",
    "notion",
    "slack",
    "zoom",
    "figma",
    "canva",
    "chatgpt",
    "openai",
    "anthropic",
    "aws",
    "vercel",
    "heroku",
    "digital ocean",
    "github",
    "gitlab",
  ],

  // Educacao
  Educacao: [
    "udemy",
    "coursera",
    "alura",
    "rocketseat",
    "origamid",
    "escola",
    "faculdade",
    "universidade",
    "curso",
    "livro",
    "livraria",
    "saraiva",
    "amazon kindle",
    "audible",
  ],

  // Compras Online
  "Compras Online": [
    "amazon",
    "mercado livre",
    "magalu",
    "magazine luiza",
    "americanas",
    "submarino",
    "shopee",
    "shein",
    "aliexpress",
    "casas bahia",
    "ponto frio",
    "kabum",
    "terabyte",
    "pichau",
  ],

  // Vestuario
  Vestuario: [
    "renner",
    "c&a",
    "riachuelo",
    "marisa",
    "zara",
    "h&m",
    "forever 21",
    "centauro",
    "netshoes",
    "nike",
    "adidas",
    "puma",
    "decathlon",
    "hering",
    "lojas",
  ],

  // Moradia
  Moradia: [
    "aluguel",
    "condominio",
    "iptu",
    "luz",
    "energia",
    "enel",
    "cemig",
    "copel",
    "celesc",
    "agua",
    "sabesp",
    "copasa",
    "sanepar",
    "gas ",
    "comgas",
    "naturgy",
    "internet",
    "claro",
    "vivo",
    "tim",
    "oi ",
    "net ",
    "sky",
  ],

  // Lazer
  Lazer: [
    "cinema",
    "cinemark",
    "cinepolis",
    "uci",
    "kinoplex",
    "teatro",
    "show",
    "ingresso",
    "sympla",
    "eventbrite",
    "ticketmaster",
    "parque",
    "museu",
    "zoo",
    "praia",
    "viagem",
    "hotel",
    "airbnb",
    "booking",
    "decolar",
    "latam",
    "gol",
    "azul",
  ],

  // Pets
  Pets: [
    "pet",
    "petshop",
    "petz",
    "cobasi",
    "veterinario",
    "vet ",
    "racao",
    "canil",
  ],

  // Beleza
  Beleza: [
    "salao",
    "barbearia",
    "manicure",
    "estetica",
    "spa",
    "massagem",
    "boticario",
    "natura",
    "avon",
    "sephora",
    "mac cosmetics",
  ],

  // Jogos
  Jogos: [
    "steam",
    "playstation",
    "xbox",
    "nintendo",
    "epic games",
    "riot",
    "blizzard",
    "ea games",
    "ubisoft",
    "game",
    "jogo",
  ],

  // Financeiro
  Financeiro: [
    "iof",
    "juros",
    "tarifa",
    "anuidade",
    "ted",
    "doc",
    "pix",
    "transferencia",
    "saque",
    "investimento",
    "cdb",
    "tesouro",
    "acao",
    "fundo",
    "b3",
    "xp",
    "rico",
    "inter invest",
    "nuinvest",
  ],
};

export interface CategorizationResult {
  transactionId: string;
  description: string;
  matchedCategory: string | null;
  matchedKeyword: string | null;
  confidence: "high" | "medium" | "low" | null;
}

/**
 * Find matching category for a transaction description
 */
export function findCategory(
  description: string
): { category: string; keyword: string; confidence: "high" | "medium" | "low" } | null {
  const lower = description.toLowerCase();

  for (const [category, keywords] of Object.entries(CATEGORY_PATTERNS)) {
    for (const keyword of keywords) {
      if (lower.includes(keyword.toLowerCase())) {
        // Determine confidence based on keyword specificity
        let confidence: "high" | "medium" | "low" = "medium";

        // High confidence for very specific keywords
        if (keyword.length > 6 || keyword.includes(" ")) {
          confidence = "high";
        }
        // Low confidence for short/generic keywords
        else if (keyword.length <= 3) {
          confidence = "low";
        }

        return { category, keyword, confidence };
      }
    }
  }

  return null;
}

/**
 * Categorize multiple transactions
 */
export function categorizeTransactions(
  transactions: Array<{ id: string; description: string }>
): CategorizationResult[] {
  return transactions.map((tx) => {
    const match = findCategory(tx.description);
    return {
      transactionId: tx.id,
      description: tx.description,
      matchedCategory: match?.category || null,
      matchedKeyword: match?.keyword || null,
      confidence: match?.confidence || null,
    };
  });
}

/**
 * Get or create a category by name for a user
 * Returns the category ID
 */
export async function getOrCreateCategoryId(
  userId: string,
  categoryName: string
): Promise<string> {
  // First, look for existing category (user's own or system)
  const existing = await prisma.category.findFirst({
    where: {
      name: categoryName,
      OR: [{ userId }, { isSystem: true }],
    },
    select: { id: true },
  });

  if (existing) {
    return existing.id;
  }

  // Create new category for user
  const newCategory = await prisma.category.create({
    data: {
      userId,
      name: categoryName,
      isSystem: false,
    },
  });

  return newCategory.id;
}

/**
 * Build a category cache for a list of transactions
 * Returns a Map of categoryName -> categoryId
 */
export async function buildCategoryCache(
  userId: string,
  transactions: Array<{ description: string; original_description: string }>
): Promise<Map<string, string>> {
  const categoryCache = new Map<string, string>();
  const uniqueCategories = new Set<string>();

  // Find all unique categories needed
  for (const tx of transactions) {
    const match =
      findCategory(tx.original_description) || findCategory(tx.description);
    if (match) {
      uniqueCategories.add(match.category);
    }
  }

  // Get or create all categories at once
  for (const categoryName of uniqueCategories) {
    const categoryId = await getOrCreateCategoryId(userId, categoryName);
    categoryCache.set(categoryName, categoryId);
  }

  return categoryCache;
}
