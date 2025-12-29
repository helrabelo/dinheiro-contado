"""
Santander credit card statement parser.

Format: "[N] DD/MM DESCRIPTION [NN/NN] AMOUNT" (Multi-column layouts)
Uses text-based parsing with deduplication.
"""
from __future__ import annotations

import re
from pathlib import Path
from typing import Optional, Set, Tuple

import pdfplumber

from .base import BaseParser, ParseResult, Transaction
from ..utils import (
    extract_year_from_filename,
    normalize_expense_amount,
    parse_brazilian_amount,
    validate_date,
    validate_day_month,
)

# Pre-compiled regex patterns
# Pattern 1: N DD/MM DESCRIPTION [PARCELA] AMOUNT
TX_PATTERN_MAIN = re.compile(
    r"(?:^|\s)(\d{1,2}\s+)?(\d{2})/(\d{2})\s+([A-Z*@][A-Za-z0-9\s\-*/\.@]+?)\s+(?:\d{2}/\d{2}\s+)?([\d.]+,\d{2})(?:\s|$)",
    re.IGNORECASE,
)

# Pattern 2: Simpler fallback pattern
TX_PATTERN_SIMPLE = re.compile(
    r"(\d{2})/(\d{2})\s+([A-Z][A-Za-z0-9\s\-*/]+?)\s+([\d.]+,\d{2})"
)

# Lines containing these are summary/header lines, not transactions
SKIP_KEYWORDS = [
    "VALOR TOTAL",
    "TOTAL GERAL",
    "PAGAMENTO DE FATURA",
    "PAGAMENTO MINIMO",
    "PAGAMENTO TOTAL",
    "SALDO ANTERIOR",
    "TOTAL DE PAGAMENTOS",
    "TOTAL DE CREDITOS",
    "SALDO DESTA FATURA",
    "JUROS DE CREDITO",
    "Compra Data",
    "Parcela R$",
]

# Detection fingerprints (case-insensitive)
DETECTION_PHRASES = ["santander"]


class SantanderParser(BaseParser):
    """Parser for Santander credit card statements"""

    BANK_NAME = "santander"
    PARSER_VERSION = "1.0.0"

    def parse(self, file_path: str, password: Optional[str] = None) -> ParseResult:
        """Parse Santander credit card PDF.

        Santander format has:
        - Multi-column layouts (2-3 columns of transactions)
        - Format: [N] DD/MM DESCRIPTION [NN/NN] AMOUNT
        - N = installment number (optional, before date)
        - NN/NN = parcela info like "01/02" (optional)
        """
        transactions: list[Transaction] = []
        seen: Set[Tuple[int, int, float]] = set()  # (day, month, amount) for dedup
        path = Path(file_path)

        try:
            with pdfplumber.open(file_path, password=password) as pdf:
                year = extract_year_from_filename(path.name)

                for page in pdf.pages:
                    text = page.extract_text() or ""

                    for line in text.split("\n"):
                        stripped = line.strip()
                        if not stripped:
                            continue

                        # Skip header/summary lines
                        upper_line = stripped.upper()
                        if any(skip in upper_line for skip in SKIP_KEYWORDS):
                            continue

                        # Skip waived fees
                        if "ANUIDADE DIFERENCIADA" in upper_line and "0,00" in stripped:
                            continue

                        # Try main pattern (handles multi-column layouts)
                        matches = TX_PATTERN_MAIN.findall(stripped)

                        for match in matches:
                            _, day_str, month_str, description, amount_str = match

                            try:
                                day = int(day_str)
                                month = int(month_str)
                            except ValueError:
                                continue

                            if not validate_day_month(day, month):
                                continue

                            description = description.strip()
                            if not description or len(description) < 2:
                                continue

                            if "PAGAMENTO" in description.upper():
                                continue

                            try:
                                amount = parse_brazilian_amount(amount_str)
                            except ValueError:
                                continue

                            if amount == 0:
                                continue

                            amount = normalize_expense_amount(amount)

                            # Deduplicate by (day, month, amount)
                            key = (day, month, round(amount, 2))
                            if key in seen:
                                continue
                            seen.add(key)

                            tx_date = validate_date(year, month, day)
                            if not tx_date:
                                continue

                            transactions.append(
                                Transaction(
                                    date=tx_date,
                                    description=description,
                                    original_description=description,
                                    amount=amount,
                                    type="DEBIT",
                                )
                            )

                    # Fallback: simpler pattern for edge cases
                    simple_matches = TX_PATTERN_SIMPLE.findall(text)

                    for match in simple_matches:
                        day_str, month_str, description, amount_str = match

                        try:
                            day = int(day_str)
                            month = int(month_str)
                        except ValueError:
                            continue

                        if not validate_day_month(day, month):
                            continue

                        description = description.strip()
                        upper_desc = description.upper()

                        if any(skip in upper_desc for skip in SKIP_KEYWORDS):
                            continue
                        if "PAGAMENTO" in upper_desc:
                            continue
                        if not description or len(description) < 2:
                            continue

                        try:
                            amount = parse_brazilian_amount(amount_str)
                        except ValueError:
                            continue

                        if amount == 0:
                            continue

                        amount = normalize_expense_amount(amount)

                        # Deduplicate
                        key = (day, month, round(amount, 2))
                        if key in seen:
                            continue
                        seen.add(key)

                        tx_date = validate_date(year, month, day)
                        if not tx_date:
                            continue

                        transactions.append(
                            Transaction(
                                date=tx_date,
                                description=description,
                                original_description=description,
                                amount=amount,
                                type="DEBIT",
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
        """Check if PDF is from Santander"""
        try:
            with pdfplumber.open(file_path) as pdf:
                if not pdf.pages:
                    return False

                # Check first page for fingerprints (case-insensitive)
                text = (pdf.pages[0].extract_text() or "").lower()
                return any(phrase in text for phrase in DETECTION_PHRASES)
        except Exception:
            return False
