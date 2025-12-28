"""
Base parser class for bank statements
"""

from abc import ABC, abstractmethod
from typing import Optional
from datetime import datetime
from pydantic import BaseModel


class Transaction(BaseModel):
    date: datetime
    description: str
    original_description: str
    amount: float
    type: str
    installment_current: Optional[int] = None
    installment_total: Optional[int] = None
    is_international: bool = False


class ParseResult(BaseModel):
    success: bool
    bank: str
    statement_type: str
    period_start: Optional[datetime] = None
    period_end: Optional[datetime] = None
    total_amount: Optional[float] = None
    transactions: list[Transaction] = []
    parser_version: str
    error_message: Optional[str] = None


class BaseParser(ABC):
    """Abstract base class for bank statement parsers"""

    BANK_NAME: str = "unknown"
    PARSER_VERSION: str = "0.1.0"

    @abstractmethod
    def parse(self, file_path: str, password: Optional[str] = None) -> ParseResult:
        """Parse a PDF file and return transactions"""
        pass

    @abstractmethod
    def detect(self, file_path: str) -> bool:
        """Check if this parser can handle the given PDF"""
        pass

    def _create_error_result(self, error: str) -> ParseResult:
        """Create an error result"""
        return ParseResult(
            success=False,
            bank=self.BANK_NAME,
            statement_type="UNKNOWN",
            transactions=[],
            parser_version=self.PARSER_VERSION,
            error_message=error,
        )
