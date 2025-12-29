/**
 * Parser Service Client
 * Communicates with the FastAPI parser microservice
 */

export interface ParsedTransaction {
  date: string;
  description: string;
  original_description: string;
  amount: number;
  type: "CREDIT" | "DEBIT" | "TRANSFER";
  installment_current?: number;
  installment_total?: number;
  is_international: boolean;
}

export interface ParseResult {
  success: boolean;
  bank: string;
  statement_type: string;
  period_start?: string;
  period_end?: string;
  total_amount?: number;
  card_last_four?: string;
  transactions: ParsedTransaction[];
  parser_version: string;
  error_message?: string;
}

const PARSER_URL = process.env.PARSER_SERVICE_URL || "http://localhost:8000";
const USE_MOCK_PARSER = process.env.USE_MOCK_PARSER === "true";

/**
 * Mock parser for testing without the Python service
 */
function getMockParseResult(bank: string): ParseResult {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Generate mock transactions
  const mockTransactions: ParsedTransaction[] = [
    {
      date: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      description: "Supermercado Extra",
      original_description: "EXTRA HIPERMERCADOS",
      amount: 287.45,
      type: "DEBIT",
      is_international: false,
    },
    {
      date: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      description: "Netflix",
      original_description: "NETFLIX.COM",
      amount: 55.9,
      type: "DEBIT",
      is_international: true,
    },
    {
      date: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      description: "iFood",
      original_description: "IFOOD *RESTAURANTE",
      amount: 89.0,
      type: "DEBIT",
      installment_current: 1,
      installment_total: 3,
      is_international: false,
    },
    {
      date: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      description: "Posto Shell",
      original_description: "SHELL POSTO CENTRAL",
      amount: 250.0,
      type: "DEBIT",
      is_international: false,
    },
    {
      date: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000).toISOString(),
      description: "Pagamento Recebido",
      original_description: "PAGAMENTO FATURA",
      amount: 1500.0,
      type: "CREDIT",
      is_international: false,
    },
  ];

  return {
    success: true,
    bank,
    statement_type: "CREDIT_CARD",
    period_start: thirtyDaysAgo.toISOString(),
    period_end: now.toISOString(),
    total_amount: mockTransactions
      .filter((t) => t.type === "DEBIT")
      .reduce((sum, t) => sum + t.amount, 0),
    transactions: mockTransactions,
    parser_version: "mock-0.1.0",
  };
}

export async function parseStatement(
  file: Buffer,
  fileName: string,
  bank: string = "auto",
  password?: string
): Promise<ParseResult> {
  // Use mock parser for testing
  if (USE_MOCK_PARSER) {
    console.log("[Parser] Using mock parser for testing");
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 500));
    return getMockParseResult(bank);
  }

  const formData = new FormData();
  // Convert Buffer to Uint8Array for Blob compatibility
  const uint8Array = new Uint8Array(file);
  const blob = new Blob([uint8Array], { type: "application/pdf" });
  formData.append("file", blob, fileName);
  formData.append("bank", bank);
  if (password) {
    formData.append("password", password);
  }

  try {
    const response = await fetch(`${PARSER_URL}/parse`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      return {
        success: false,
        bank,
        statement_type: "UNKNOWN",
        transactions: [],
        parser_version: "0.0.0",
        error_message: error.detail || `Parser error: ${response.status}`,
      };
    }

    return await response.json();
  } catch (error) {
    return {
      success: false,
      bank,
      statement_type: "UNKNOWN",
      transactions: [],
      parser_version: "0.0.0",
      error_message:
        error instanceof Error
          ? `Connection error: ${error.message}`
          : "Unknown error connecting to parser",
    };
  }
}

export async function checkParserHealth(): Promise<boolean> {
  // Mock parser is always healthy
  if (USE_MOCK_PARSER) {
    return true;
  }

  try {
    const response = await fetch(`${PARSER_URL}/health`);
    if (!response.ok) return false;
    const data = await response.json();
    return data.status === "healthy";
  } catch {
    return false;
  }
}
