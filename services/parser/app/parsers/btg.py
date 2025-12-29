"""
BTG credit card statement parser.

Format: "DD Mon Description R$ XXX,XX" (Title-case months)
Handles international currency conversions and section skipping.
"""
from __future__ import annotations

import re
from pathlib import Path
from typing import Optional

import pdfplumber

from .base import BaseParser, ParseResult, Transaction
from ..utils import (
    MONTH_MAP_TITLE,
    extract_month_from_filename,
    extract_year_from_filename,
    normalize_expense_amount,
    parse_brazilian_amount,
    validate_date,
)

# Pre-compiled regex patterns
TX_PATTERN = re.compile(r"(\d{2})\s+([A-Z][a-z]{2})\s+(.+?)\s+R\$\s+([\d.,]+)")
CONVERSION_PATTERN = re.compile(r"Conversao para Real\s*-?\s*R\$\s*([\d.,]+)", re.IGNORECASE)
AMOUNT_ONLY_PATTERN = re.compile(r"^R\$\s*[\d.,]+$")
DATE_ONLY_PATTERN = re.compile(r"^\d{2}/\d{2}$")

SKIP_KEYWORDS = [
    "pagamento",
    "multa",
    "encargos",
    "mora",
    "btg go",
    "credito em confianca",
    "cancelamento",
]

# Detection fingerprints (case-insensitive)
DETECTION_PHRASES = ["btg pactual", "btg"]


class BTGParser(BaseParser):
    """Parser for BTG credit card statements"""

    BANK_NAME = "btg"
    PARSER_VERSION = "1.0.0"

    def parse(self, file_path: str, password: Optional[str] = None) -> ParseResult:
        """Parse BTG credit card PDF"""
        transactions: list[Transaction] = []
        path = Path(file_path)

        try:
            with pdfplumber.open(file_path, password=password) as pdf:
                year = extract_year_from_filename(path.name)
                tx_month = extract_month_from_filename(path.name) or 1

                for page in pdf.pages:
                    text = page.extract_text() or ""
                    lines = text.split("\n")

                    # Track section state to skip "Pagamentos feitos pelo cliente" section
                    in_payments_section = False

                    for line in lines:
                        # Check for section transitions
                        if "Pagamentos feitos pelo cliente" in line:
                            in_payments_section = True
                            continue
                        if "Lancamentos do cartao" in line or "Total de compras e despesas" in line:
                            in_payments_section = False

                        if in_payments_section:
                            continue

                        # Pattern 1: International currency conversions
                        conversion_match = CONVERSION_PATTERN.search(line)
                        if conversion_match:
                            amount_str = conversion_match.group(1)
                            try:
                                amount = parse_brazilian_amount(amount_str)
                                amount = normalize_expense_amount(amount)
                                tx_date = validate_date(year, tx_month, 1)
                                if tx_date:
                                    transactions.append(
                                        Transaction(
                                            date=tx_date,
                                            description="International conversion",
                                            original_description=line.strip(),
                                            amount=amount,
                                            type="DEBIT",
                                            is_international=True,
                                        )
                                    )
                            except ValueError:
                                pass
                            continue

                        # Pattern 2: Standard transactions (DD Mon Description R$ XXX,XX)
                        matches = TX_PATTERN.findall(line)
                        for match in matches:
                            day = int(match[0])
                            month_abbr = match[1]
                            description = match[2].strip()
                            amount_str = match[3]

                            # Skip invalid days
                            if day == 0 or day > 31:
                                continue

                            # Skip lines where description looks like an R$ amount
                            if AMOUNT_ONLY_PATTERN.match(description):
                                continue

                            # Skip summary lines like "- Atual"
                            if description.startswith("-") and len(description) < 20:
                                continue

                            # Cache lowercase for skip check
                            lower_desc = description.lower()
                            if any(skip in lower_desc for skip in SKIP_KEYWORDS):
                                continue

                            if DATE_ONLY_PATTERN.match(description):
                                continue

                            month = MONTH_MAP_TITLE.get(month_abbr)
                            if not month:
                                continue

                            tx_date = validate_date(year, month, day)
                            if not tx_date:
                                continue

                            try:
                                amount = parse_brazilian_amount(amount_str)
                            except ValueError:
                                continue

                            amount = normalize_expense_amount(amount)

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
        """Check if PDF is from BTG"""
        try:
            with pdfplumber.open(file_path) as pdf:
                if not pdf.pages:
                    return False

                # Check first page for fingerprints (case-insensitive)
                text = (pdf.pages[0].extract_text() or "").lower()
                return any(phrase in text for phrase in DETECTION_PHRASES)
        except Exception:
            return False
