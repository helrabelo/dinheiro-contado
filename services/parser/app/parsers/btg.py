"""
BTG Pactual bank statement parser
"""

from typing import Optional
from .base import BaseParser, ParseResult


class BTGParser(BaseParser):
    """Parser for BTG Pactual statements and credit cards"""

    BANK_NAME = "btg"
    PARSER_VERSION = "0.1.0"

    def parse(self, file_path: str, password: Optional[str] = None) -> ParseResult:
        """Parse BTG PDF"""
        # TODO: Port parsing logic from financial-analyzer
        return self._create_error_result("BTG parser not yet implemented")

    def detect(self, file_path: str) -> bool:
        """Check if PDF is from BTG"""
        # TODO: Implement detection logic
        return False
