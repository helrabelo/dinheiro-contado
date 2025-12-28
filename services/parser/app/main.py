"""
Dinheiro Contado - PDF Parser Service
FastAPI microservice for parsing bank statements and credit card bills
"""

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import tempfile
import os

app = FastAPI(
    title="Dinheiro Contado Parser",
    description="PDF parsing service for Brazilian bank statements",
    version="0.1.0",
)

# CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://*.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class Transaction(BaseModel):
    date: datetime
    description: str
    original_description: str
    amount: float
    type: str  # CREDIT, DEBIT, TRANSFER
    installment_current: Optional[int] = None
    installment_total: Optional[int] = None
    is_international: bool = False


class ParseResult(BaseModel):
    success: bool
    bank: str
    statement_type: str  # CREDIT_CARD, CHECKING_ACCOUNT
    period_start: Optional[datetime] = None
    period_end: Optional[datetime] = None
    total_amount: Optional[float] = None
    transactions: list[Transaction] = []
    parser_version: str
    error_message: Optional[str] = None


class HealthResponse(BaseModel):
    status: str
    version: str


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    return HealthResponse(status="healthy", version="0.1.0")


@app.post("/parse", response_model=ParseResult)
async def parse_statement(
    file: UploadFile = File(...),
    bank: str = "auto",
    password: Optional[str] = None,
):
    """
    Parse a bank statement or credit card bill PDF.

    Args:
        file: PDF file to parse
        bank: Bank identifier (auto, nubank, inter, btg, santander)
        password: Optional PDF password

    Returns:
        Parsed transactions and statement metadata
    """
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")

    # Save to temp file for processing
    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
        content = await file.read()
        tmp.write(content)
        tmp_path = tmp.name

    try:
        # TODO: Implement actual parsing logic
        # For now, return a placeholder response
        return ParseResult(
            success=True,
            bank=bank if bank != "auto" else "unknown",
            statement_type="CREDIT_CARD",
            period_start=None,
            period_end=None,
            total_amount=None,
            transactions=[],
            parser_version="0.1.0",
            error_message=None,
        )
    except Exception as e:
        return ParseResult(
            success=False,
            bank=bank,
            statement_type="UNKNOWN",
            transactions=[],
            parser_version="0.1.0",
            error_message=str(e),
        )
    finally:
        # Clean up temp file
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
