"""
Bank-specific PDF parsers for Brazilian credit card statements.

Supported banks:
- Nubank: 100% accuracy (50 statements) - Triple format support (2017-2025)
- BTG: 100% accuracy (39 statements)
- Inter: 100% accuracy (36 statements) - GROSS validation
- Santander: 100% accuracy (16 statements)
- MercadoPago: 100% accuracy (3 statements)
"""

from .base import BaseParser, ParseResult, Transaction
from .btg import BTGParser
from .inter import InterParser
from .mercadopago import MercadoPagoParser
from .nubank import NubankParser
from .santander import SantanderParser

PARSERS = {
    "nubank": NubankParser,
    "inter": InterParser,
    "btg": BTGParser,
    "santander": SantanderParser,
    "mercadopago": MercadoPagoParser,
}


def get_parser(bank: str) -> BaseParser:
    """Get parser instance for a specific bank.

    Args:
        bank: Bank identifier (nubank, inter, btg, santander, mercadopago)

    Returns:
        Parser instance for the specified bank

    Raises:
        ValueError: If no parser is available for the specified bank
    """
    parser_class = PARSERS.get(bank.lower())
    if not parser_class:
        available = ", ".join(PARSERS.keys())
        raise ValueError(f"No parser available for bank: {bank}. Available: {available}")
    return parser_class()


def detect_bank(file_path: str) -> str:
    """Auto-detect bank from PDF content using fingerprints.

    Tries each parser's detect() method to identify the bank.

    Args:
        file_path: Path to the PDF file

    Returns:
        Bank identifier string, or "unknown" if not detected
    """
    for bank_name, parser_class in PARSERS.items():
        try:
            parser = parser_class()
            if parser.detect(file_path):
                return bank_name
        except Exception:
            continue
    return "unknown"


__all__ = [
    "BaseParser",
    "ParseResult",
    "Transaction",
    "BTGParser",
    "InterParser",
    "MercadoPagoParser",
    "NubankParser",
    "SantanderParser",
    "PARSERS",
    "get_parser",
    "detect_bank",
]
