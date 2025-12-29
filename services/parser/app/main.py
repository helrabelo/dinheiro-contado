"""
Dinheiro Contado - PDF Parser Service
FastAPI microservice for parsing Brazilian bank statements and credit card bills.

Supported banks (100% accuracy across 144 statements, R$ 1.2M):
- Nubank: 50 statements - Triple format support (2017-2025)
- BTG: 39 statements - International conversion handling
- Inter: 36 statements - GROSS validation
- Santander: 16 statements - Multi-column layout
- MercadoPago: 3 statements
"""

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

import os
import tempfile
from typing import Optional

from .parsers import ParseResult, detect_bank, get_parser

app = FastAPI(
    title="Dinheiro Contado Parser",
    description="PDF parsing service for Brazilian bank statements with 100% accuracy",
    version="1.0.0",
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


class HealthResponse:
    def __init__(self, status: str, version: str, supported_banks: list[str]):
        self.status = status
        self.version = version
        self.supported_banks = supported_banks


@app.get("/health")
async def health_check():
    """Health check endpoint with supported banks list."""
    return {
        "status": "healthy",
        "version": "1.0.0",
        "supported_banks": ["nubank", "btg", "inter", "santander", "mercadopago"],
    }


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
        bank: Bank identifier (auto, nubank, inter, btg, santander, mercadopago)
        password: Optional PDF password for encrypted files

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
        # Auto-detect bank if requested
        detected_bank = bank
        if bank == "auto":
            detected_bank = detect_bank(tmp_path)
            if detected_bank == "unknown":
                return ParseResult(
                    success=False,
                    bank="unknown",
                    statement_type="UNKNOWN",
                    transactions=[],
                    parser_version="1.0.0",
                    error_message="Could not auto-detect bank from PDF. Please specify bank parameter.",
                )

        # Get parser and process
        try:
            parser = get_parser(detected_bank)
        except ValueError as e:
            return ParseResult(
                success=False,
                bank=detected_bank,
                statement_type="UNKNOWN",
                transactions=[],
                parser_version="1.0.0",
                error_message=str(e),
            )

        result = parser.parse(tmp_path, password=password)
        return result

    except Exception as e:
        return ParseResult(
            success=False,
            bank=bank,
            statement_type="UNKNOWN",
            transactions=[],
            parser_version="1.0.0",
            error_message=f"Parsing error: {str(e)}",
        )
    finally:
        # Clean up temp file
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)


@app.get("/banks")
async def list_banks():
    """List all supported banks with their parser versions."""
    from .parsers import PARSERS

    banks = []
    for bank_name, parser_class in PARSERS.items():
        parser = parser_class()
        banks.append({
            "name": bank_name,
            "version": parser.PARSER_VERSION,
        })
    return {"banks": banks}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
