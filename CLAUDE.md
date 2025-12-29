# Dinheiro Contado

Personal finance tracker for Brazilian bank statements and credit card bills.

## Tech Stack
- **Frontend**: Next.js 16 + React 19 + TypeScript + Tailwind CSS v4
- **Backend**: Next.js API Routes + NextAuth.js v5
- **Database**: PostgreSQL + Prisma 5
- **Parser**: Python FastAPI microservice (in `services/parser/`)

## Quick Start
```bash
docker-compose up -d db    # Start PostgreSQL
npm run dev                # Start Next.js on :3000

# To test without Python parser:
echo 'USE_MOCK_PARSER="true"' >> .env
```

## Project Structure
```
src/
  app/
    (auth)/login/           # Login page
    (dashboard)/dashboard/  # Main dashboard
      accounts/             # Bank accounts & credit cards CRUD
      categories/           # Category management
      statements/           # Statement list & upload
        [id]/               # Statement detail view
      transactions/         # Transaction list with filters
    api/
      accounts/             # Bank/card CRUD endpoints
      categories/           # Category CRUD endpoints
      statements/upload/    # File upload + parsing
  components/dashboard/     # Reusable UI components
  lib/
    auth/                   # NextAuth.js config
    db/                     # Prisma client
    parser/                 # Parser service client

services/parser/            # Python FastAPI parser (placeholder parsers)
```

## What's Built
- Full authentication flow (NextAuth v5)
- Dashboard with 30-day spending summary
- File upload with drag-drop, deduplication (SHA-256)
- Parser service client with mock mode for testing
- Transactions page with filtering (search, type, date, amount)
- Statement detail page with parsed transactions
- Categories CRUD with icons/colors
- Bank accounts & credit cards CRUD

## What's Missing (Parsers)
The `services/parser/` contains placeholder parsers. Port from `financial-analyzer`:
- **BTG** (94.4% accuracy) - `/Users/helrabelo/code/personal/financial-analyzer/src/services/credit_cards/btg/v1.py`
- **Nubank** (76.6%) - Triple format support (2017-2025)
- **Inter** (50%) - GROSS validation needed

## Environment Variables
```bash
DATABASE_URL="postgresql://..."
AUTH_SECRET="..."
PARSER_SERVICE_URL="http://localhost:8000"
USE_MOCK_PARSER="false"  # "true" to test without Python service
```

## Test User
- Email: `helrabelo@gmail.com`
- Name: `hel rabelo`

## Git Remote
`git@github.com:helrabelo/dinheiro-contado.git`
