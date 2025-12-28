"""
Bank-specific PDF parsers
"""

from .base import BaseParser
from .nubank import NubankParser
from .inter import InterParser
from .btg import BTGParser

PARSERS = {
    "nubank": NubankParser,
    "inter": InterParser,
    "btg": BTGParser,
}


def get_parser(bank: str) -> BaseParser:
    """Get parser for a specific bank"""
    parser_class = PARSERS.get(bank.lower())
    if not parser_class:
        raise ValueError(f"No parser available for bank: {bank}")
    return parser_class()


def detect_bank(file_path: str) -> str:
    """Auto-detect bank from PDF content"""
    # TODO: Implement bank detection logic
    return "unknown"
