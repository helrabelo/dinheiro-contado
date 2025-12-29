"""
Banco Inter credit card statement parser.

Format: "DD [de] MMM[.] YYYY Description [-/+] R$ Amount"
Uses GROSS validation - compares only expenses, ignoring advance payments from previous cycle.
"""
from __future__ import annotations

import re
from pathlib import Path
from typing import Optional

import pdfplumber

from .base import BaseParser, ParseResult, Transaction
from ..utils import (
    MONTH_MAP_LOWER,
    extract_year_from_filename,
    normalize_expense_amount,
    parse_brazilian_amount,
    validate_date,
)

# Pre-compiled regex pattern - consolidated with optional "de"
# Format: DD [de] MMM[.] YYYY Description [-/+] R$ Amount
TX_PATTERN = re.compile(
    r"(\d{2})\s+(?:de\s+)?(\w{3})\.?\s+(\d{4})\s+(.+?)\s+[-+]?\s*R\$\s+([\d.,]+)",
    re.IGNORECASE,
)

# Pattern for credit indicator
CREDIT_PATTERN = re.compile(r"\+\s*R\$")

# Pattern for card number lines to skip
CARD_NUMBER_PATTERN = re.compile(r"\d{4}\*{4}\d{4}")

SKIP_KEYWORDS = [
    "anuidade",
    "multa",
    "encargos",
    "mora",
    "total cartao",
]

ADVANCE_KEYWORDS = [
    "pagamento on line",
    "pagamento online",
    "pagto debito automatico",
    "pagto",
]

# Detection fingerprints (case-insensitive, covers old and new formats)
DETECTION_PHRASES = ["inter.co", "bancointer", "conta do inter", "banco inter"]


class InterParser(BaseParser):
    """Parser for Inter credit card statements"""

    BANK_NAME = "inter"
    PARSER_VERSION = "1.0.0"

    def parse(self, file_path: str, password: Optional[str] = None) -> ParseResult:
        """Parse Inter credit card PDF"""
        transactions: list[Transaction] = []
        path = Path(file_path)

        try:
            with pdfplumber.open(file_path, password=password) as pdf:
                fallback_year = extract_year_from_filename(path.name)

                for page in pdf.pages:
                    text = page.extract_text() or ""

                    for line in text.split("\n"):
                        match = TX_PATTERN.search(line)
                        if not match:
                            continue

                        day = int(match.group(1))
                        month_token = match.group(2).lower().replace(".", "")
                        year_str = match.group(3)
                        description = match.group(4).strip()
                        amount_str = match.group(5)

                        year = int(year_str) if year_str.isdigit() else fallback_year

                        # Cache lowercase for multiple checks
                        lower_desc = description.lower()
                        is_advance = any(token in lower_desc for token in ADVANCE_KEYWORDS)

                        # Skip credit/refund transactions (indicated by "+ R$" pattern)
                        # Note: advance payments also have "+" but are handled separately
                        if not is_advance and CREDIT_PATTERN.search(line):
                            continue

                        if not is_advance and any(skip in lower_desc for skip in SKIP_KEYWORDS):
                            continue

                        if CARD_NUMBER_PATTERN.match(description):
                            continue

                        month = MONTH_MAP_LOWER.get(month_token)
                        if not month:
                            continue

                        tx_date = validate_date(year, month, day)
                        if not tx_date:
                            continue

                        amount = parse_brazilian_amount(amount_str)

                        # Advance payments are CREDITS (positive), expenses are DEBITS (negative)
                        if is_advance:
                            tx_type = "CREDIT"
                            amount = abs(amount)  # Keep positive for advance payments
                        else:
                            tx_type = "DEBIT"
                            amount = normalize_expense_amount(amount)

                        transactions.append(
                            Transaction(
                                date=tx_date,
                                description=description,
                                original_description=description,
                                amount=amount,
                                type=tx_type,
                            )
                        )

            return ParseResult(
                success=True,
                bank=self.BANK_NAME,
                statement_type="CREDIT_CARD",
                transactions=transactions,
                parser_version=self.PARSER_VERSION,
                total_amount=sum(t.amount for t in transactions) if transactions else None,
            )

        except Exception as e:
            return self._create_error_result(str(e))

    def detect(self, file_path: str) -> bool:
        """Check if PDF is from Inter"""
        try:
            with pdfplumber.open(file_path) as pdf:
                if not pdf.pages:
                    return False

                # Check first 6 pages for fingerprints (case-insensitive)
                # Old formats have fingerprints on later pages
                full_text = ""
                for page in pdf.pages[:6]:
                    full_text += (page.extract_text() or "").lower()

                return any(phrase in full_text for phrase in DETECTION_PHRASES)
        except Exception:
            return False
