"""Shared parsing utilities for credit card statement parsers.

Consolidates common patterns:
- Month name mappings (Portuguese)
- Year/month extraction from filenames
- Brazilian currency parsing
- Amount normalization
- Date validation
"""
from __future__ import annotations

import re
from datetime import datetime
from typing import Optional, Tuple

# Pre-compiled patterns for filename parsing
YEAR_PATTERN = re.compile(r"20\d{2}")
MONTH_FROM_FILENAME_PATTERN = re.compile(r"fatura-\d{4}-(\d{2})")

# Portuguese month abbreviations - all case variants
MONTH_MAP_UPPER = {
    "JAN": 1, "FEV": 2, "MAR": 3, "ABR": 4, "MAI": 5, "JUN": 6,
    "JUL": 7, "AGO": 8, "SET": 9, "OUT": 10, "NOV": 11, "DEZ": 12,
}

MONTH_MAP_TITLE = {
    "Jan": 1, "Fev": 2, "Mar": 3, "Abr": 4, "Mai": 5, "Jun": 6,
    "Jul": 7, "Ago": 8, "Set": 9, "Out": 10, "Nov": 11, "Dez": 12,
}

MONTH_MAP_LOWER = {
    "jan": 1, "fev": 2, "mar": 3, "abr": 4, "mai": 5, "jun": 6,
    "jul": 7, "ago": 8, "set": 9, "out": 10, "nov": 11, "dez": 12,
}

# Combined map for flexible lookups
MONTH_MAP_ALL = {**MONTH_MAP_UPPER, **MONTH_MAP_TITLE, **MONTH_MAP_LOWER}


def parse_month(month_str: str) -> Optional[int]:
    """Parse Portuguese month abbreviation to month number.

    Handles: JAN/Jan/jan, FEV/Fev/fev, etc.
    Also handles trailing periods (jan., fev.)

    Returns None if not recognized.
    """
    cleaned = month_str.rstrip(".")
    return MONTH_MAP_ALL.get(cleaned)


def extract_year_from_filename(filename: str) -> int:
    """Extract 4-digit year from filename, fallback to current year."""
    match = YEAR_PATTERN.search(filename)
    return int(match.group(0)) if match else datetime.now().year


def extract_month_from_filename(filename: str) -> Optional[int]:
    """Extract month from fatura-YYYY-MM format filename."""
    match = MONTH_FROM_FILENAME_PATTERN.search(filename)
    return int(match.group(1)) if match else None


def extract_year_month_from_filename(filename: str) -> Tuple[int, int]:
    """Extract both year and month from filename.

    Returns (year, month) tuple. Month defaults to 1 if not found.
    """
    year = extract_year_from_filename(filename)
    month = extract_month_from_filename(filename) or 1
    return year, month


def parse_brazilian_amount(amount_str: str) -> float:
    """Parse Brazilian currency format to float.

    Converts "1.234,56" -> 1234.56
    Handles: "1.234,56", "234,56", "-1.234,56"
    """
    return float(amount_str.replace(".", "").replace(",", "."))


def normalize_expense_amount(amount: float) -> float:
    """Ensure expense amounts are negative (credit card convention)."""
    return -abs(amount)


def normalize_credit_amount(amount: float) -> float:
    """Ensure credit/refund amounts are positive."""
    return abs(amount)


def validate_date(year: int, month: int, day: int) -> Optional[datetime]:
    """Validate and create datetime, return None if invalid."""
    try:
        return datetime(year, month, day)
    except ValueError:
        return None


def validate_day_month(day: int, month: int) -> bool:
    """Quick validation of day/month values."""
    return 1 <= day <= 31 and 1 <= month <= 12
