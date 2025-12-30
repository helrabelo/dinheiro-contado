"""
Nubank credit card statement parser.

Supports triple format evolution (2017-2025):
- VERY OLD (2017-2020): "DD MMM Description Amount" (NO R$ symbol!)
- OLD (2021-2024): "DD MMM Description R$ Amount"
- NEW (2025+): "DD MMM **** XXXX Description R$ Amount"
"""
from __future__ import annotations

import re
from pathlib import Path
from typing import Optional

import pdfplumber

from .base import BaseParser, ParseResult, Transaction
from ..utils import (
    MONTH_MAP_UPPER,
    extract_year_from_filename,
    normalize_expense_amount,
    parse_brazilian_amount,
    validate_date,
)

# Pre-compiled regex patterns for transaction matching
# Pattern 1: NEW format (2025+) with card digits "DD MMM **** XXXX Description R$ Amount"
TX_PATTERN_NEW = re.compile(
    r"(\d{2})\s+([A-Z]{3})\s+[*]+\s*(\d{4})\s+(.+?)\s+R\$\s*([-]?\d{1,3}(?:\.\d{3})*,\d{2})$"
)

# Pattern to extract card last 4 digits from header (e.g., "Cartão **** **** **** 1234")
CARD_PATTERN = re.compile(r"[*]+\s*[*]+\s*[*]+\s*(\d{4})")

# Pattern to extract installment info (e.g., "2/12", "PARCELA 2/12", "Parcela 02/12")
INSTALLMENT_PATTERN = re.compile(r"(?:PARCELA\s+)?(\d{1,2})[/\\](\d{1,2})", re.IGNORECASE)

# Pattern 2: OLD format (2021-2024) with R$ symbol "DD MMM Description R$ Amount"
TX_PATTERN_OLD = re.compile(
    r"(\d{2})\s+([A-Z]{3})\s+(.+?)\s+R\$\s*([-]?\d{1,3}(?:\.\d{3})*,\d{2})$"
)

# Pattern 3: VERY OLD format (2017-2020) WITHOUT R$ symbol "DD MMM Description Amount"
TX_PATTERN_VERY_OLD = re.compile(
    r"(\d{2})\s+([A-Z]{3})\s+(.+?)\s+([-]?\d{1,3}(?:\.\d{3})*,\d{2})$"
)

# Detection fingerprints (case-insensitive, checked across all pages)
DETECTION_PHRASES = ["nu pagamentos", "nubank"]


class NubankParser(BaseParser):
    """Parser for Nubank credit card statements"""

    BANK_NAME = "nubank"
    PARSER_VERSION = "1.0.0"

    def parse(self, file_path: str, password: Optional[str] = None) -> ParseResult:
        """Parse Nubank credit card PDF"""
        transactions: list[Transaction] = []
        path = Path(file_path)
        card_last_four: Optional[str] = None

        try:
            with pdfplumber.open(file_path, password=password) as pdf:
                year = extract_year_from_filename(path.name)

                if not pdf.pages:
                    return self._create_error_result("Empty PDF")

                # Extract card last 4 from first page
                first_page_text = pdf.pages[0].extract_text() or ""
                card_match = CARD_PATTERN.search(first_page_text)
                if card_match:
                    card_last_four = card_match.group(1)

                for page in pdf.pages:
                    text = page.extract_text() or ""

                    for line in text.split("\n"):
                        stripped = line.strip()

                        # Try patterns in order: NEW -> OLD -> VERY_OLD
                        match = TX_PATTERN_NEW.match(stripped)
                        is_new_format = match is not None
                        if not match:
                            match = TX_PATTERN_OLD.match(stripped)
                        if not match:
                            match = TX_PATTERN_VERY_OLD.match(stripped)

                        if not match:
                            continue

                        # Handle different capture groups based on pattern
                        if is_new_format:
                            # NEW format: (day, month, card_digits, description, amount)
                            day = int(match.group(1))
                            month_abbr = match.group(2)
                            # Group 3 is card last 4 - also extract from transaction if not found earlier
                            if not card_last_four:
                                card_last_four = match.group(3)
                            description = match.group(4).strip()
                            amount_str = match.group(5)
                        else:
                            # OLD/VERY_OLD format: (day, month, description, amount)
                            day = int(match.group(1))
                            month_abbr = match.group(2)
                            description = match.group(3).strip()
                            amount_str = match.group(4)

                        # Cache lowercase for multiple checks
                        lower_desc = description.lower()

                        # Skip payment lines (already paid)
                        if "pagamento" in lower_desc:
                            continue

                        # Skip balance/credit entries (not new purchases)
                        if "saldo em atraso" in lower_desc:
                            continue
                        if "credito de atraso" in lower_desc:
                            continue
                        if "multa de atraso" in lower_desc:
                            continue

                        # Skip credits/refunds - "Credito de X" means refund for X
                        if lower_desc.startswith("credito de"):
                            continue

                        # Skip IOF entries (taxes, not included in "Total de compras")
                        if lower_desc.startswith("iof de") or lower_desc.startswith("iof "):
                            continue

                        # Skip financing interest (fees from carrying balance)
                        if "juros de financiamento" in lower_desc or "juros do financiamento" in lower_desc:
                            continue
                        if "juros de rotativo" in lower_desc or "juros do rotativo" in lower_desc:
                            continue
                        if "juros e mora" in lower_desc:
                            continue

                        # Handle discounts - make them positive (reduce amount owed)
                        is_discount = "desconto" in lower_desc

                        # Extract installment info from description
                        installment_current = None
                        installment_total = None
                        installment_match = INSTALLMENT_PATTERN.search(description)
                        if installment_match:
                            installment_current = int(installment_match.group(1))
                            installment_total = int(installment_match.group(2))

                        month = MONTH_MAP_UPPER.get(month_abbr)
                        if not month:
                            continue

                        tx_date = validate_date(year, month, day)
                        if not tx_date:
                            continue

                        amount = parse_brazilian_amount(amount_str)

                        # Credits (positive) stay positive for discounts, otherwise negate
                        if is_discount:
                            amount = abs(amount)
                            tx_type = "CREDIT"
                        elif amount > 0:
                            amount = normalize_expense_amount(amount)
                            tx_type = "DEBIT"
                        else:
                            tx_type = "DEBIT"

                        transactions.append(
                            Transaction(
                                date=tx_date,
                                description=description,
                                original_description=description,
                                amount=amount,
                                type=tx_type,
                                installment_current=installment_current,
                                installment_total=installment_total,
                            )
                        )

            return ParseResult(
                success=True,
                bank=self.BANK_NAME,
                statement_type="CREDIT_CARD",
                card_last_four=card_last_four,
                transactions=transactions,
                parser_version=self.PARSER_VERSION,
                total_amount=sum(t.amount for t in transactions) if transactions else None,
            )

        except Exception as e:
            return self._create_error_result(str(e))

    def detect(self, file_path: str) -> bool:
        """Check if PDF is from Nubank"""
        try:
            with pdfplumber.open(file_path) as pdf:
                if not pdf.pages:
                    return False

                # Check first 3 pages for fingerprints (case-insensitive)
                full_text = ""
                for page in pdf.pages[:3]:
                    full_text += (page.extract_text() or "").lower()

                return any(phrase in full_text for phrase in DETECTION_PHRASES)
        except Exception:
            return False
