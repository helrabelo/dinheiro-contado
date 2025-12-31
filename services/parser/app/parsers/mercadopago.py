"""
Mercado Pago credit card statement parser.

Format: "DD/MM Description R$ Amount"
Handles card section detection and garbled PDFs.
"""
from __future__ import annotations

import re
from pathlib import Path
from typing import Optional

import pdfplumber

from .base import BaseParser, ParseResult, Transaction
from ..utils import (
    extract_month_from_filename,
    extract_year_from_filename,
    normalize_expense_amount,
    parse_brazilian_amount,
    validate_date,
    validate_date_with_statement_context,
)

# Pre-compiled regex patterns
TX_PATTERN = re.compile(
    r"(\d{2})/(\d{2})\s+(.+?)\s+R\$\s+([-]?\d{1,3}(?:\.\d{3})*,\d{2})$"
)
TOTAL_PATTERN = re.compile(r"Total\s+R\$\s+([\d.,]+)$")

# Pattern to extract installment info (e.g., "2/12", "PARCELA 2/12", "Parcela 02/12")
INSTALLMENT_PATTERN = re.compile(r"(?:PARCELA\s+)?(\d{1,2})[/\\](\d{1,2})", re.IGNORECASE)

SKIP_KEYWORDS = ["pagamento", "tarifa", "encargo", "multa", "juros", "iof"]

# Detection fingerprints (case-insensitive, checked across multiple pages)
DETECTION_PHRASES = ["mercado pago"]


class MercadoPagoParser(BaseParser):
    """Parser for Mercado Pago credit card statements"""

    BANK_NAME = "mercadopago"
    PARSER_VERSION = "1.0.0"

    def parse(self, file_path: str, password: Optional[str] = None) -> ParseResult:
        """Parse Mercado Pago credit card PDF"""
        transactions: list[Transaction] = []
        path = Path(file_path)

        try:
            with pdfplumber.open(file_path, password=password) as pdf:
                year = extract_year_from_filename(path.name)
                fallback_month = extract_month_from_filename(path.name) or 1

                for page in pdf.pages:
                    text = page.extract_text() or ""
                    in_card_section = False

                    for line in text.split("\n"):
                        stripped = line.strip()

                        # Detect card section start
                        if "Cartao Visa" in stripped or "Cartao Mastercard" in stripped:
                            in_card_section = True
                            continue

                        # Pattern 1: Standard transaction line
                        match = TX_PATTERN.match(stripped)
                        if match:
                            day = int(match.group(1))
                            month = int(match.group(2))
                            description = match.group(3).strip()
                            amount_str = match.group(4)

                            # Cache lowercase for skip check
                            lower_desc = description.lower()
                            if any(skip in lower_desc for skip in SKIP_KEYWORDS):
                                continue

                            # Use statement-context-aware date validation to handle
                            # cross-year transactions (e.g., Dec transactions in Jan statement)
                            tx_date = validate_date_with_statement_context(
                                year, fallback_month, month, day
                            )
                            if not tx_date:
                                continue

                            amount = parse_brazilian_amount(amount_str)
                            amount = normalize_expense_amount(amount)

                            # Extract installment info from description
                            installment_current = None
                            installment_total = None
                            installment_match = INSTALLMENT_PATTERN.search(description)
                            if installment_match:
                                installment_current = int(installment_match.group(1))
                                installment_total = int(installment_match.group(2))

                            transactions.append(
                                Transaction(
                                    date=tx_date,
                                    description=description,
                                    original_description=description,
                                    amount=amount,
                                    type="DEBIT",
                                    installment_current=installment_current,
                                    installment_total=installment_total,
                                )
                            )
                            continue

                        # Pattern 2: Card section total (for garbled PDFs)
                        if in_card_section:
                            total_match = TOTAL_PATTERN.match(stripped)
                            if total_match:
                                amount_str = total_match.group(1)
                                amount = parse_brazilian_amount(amount_str)
                                amount = normalize_expense_amount(amount)

                                tx_date = validate_date(year, fallback_month, 1)
                                if tx_date:
                                    transactions.append(
                                        Transaction(
                                            date=tx_date,
                                            description="Card section total",
                                            original_description=stripped,
                                            amount=amount,
                                            type="DEBIT",
                                        )
                                    )
                                in_card_section = False

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
        """Check if PDF is from Mercado Pago"""
        try:
            with pdfplumber.open(file_path) as pdf:
                if not pdf.pages:
                    return False

                # Check first 4 pages for fingerprints (case-insensitive)
                full_text = ""
                for page in pdf.pages[:4]:
                    full_text += (page.extract_text() or "").lower()

                return any(phrase in full_text for phrase in DETECTION_PHRASES)
        except Exception:
            return False
