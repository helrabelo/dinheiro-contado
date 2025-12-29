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

# Start parser service:
cd services/parser && uvicorn main:app --reload

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

services/parser/            # Python FastAPI parser service
  parsers/
    nubank.py              # Nubank credit card (3 formats: 2017-2021, 2022-2024, 2025+)
    btg.py                 # BTG Pactual credit card
    inter.py               # Inter bank credit card
    santander.py           # Santander credit card
    mercadopago.py         # MercadoPago credit card

scripts/
  bulk-import.ts           # Import PDFs to user accounts
```

## What's Built (MVP Complete)
- Full authentication flow (NextAuth v5)
- Dashboard with 30-day spending summary
- File upload with drag-drop, deduplication (SHA-256)
- Transactions page with filtering (search, type, date, amount)
- Statement detail page with parsed transactions
- Categories CRUD with icons/colors
- Bank accounts & credit cards CRUD
- **Parser service with 5 credit card parsers**:
  - Nubank (3 format versions: 2017-2021, 2022-2024, 2025+)
  - BTG Pactual
  - Inter
  - Santander
  - MercadoPago
- Auto-detection with case-insensitive, multi-page fingerprinting
- **100% parsing success rate** on 144 test PDFs (8,552 transactions)
- **Auto-categorization on import** (200+ keyword patterns, 16 categories)
  - 4,576 of 8,348 transactions categorized (55%)

## Next Priority: Analytics Dashboard
See `docs/ROADMAP.md` for full details.

### Phase 1: Charts & Visualizations
1. Install Recharts for charting
2. Time period selector (all time, year, 6 months, month, custom)
3. Pie/donut chart for "Gastos por Categoria"
4. Line chart for "Gastos ao Longo do Tempo"
5. Category detail page with drill-down

### Phase 2: Insights & Comparisons
- Period comparison (this month vs last month)
- Top spending analysis
- Spending heatmap (calendar view)

### Phase 3: Reports & Export
- Monthly/annual PDF reports
- CSV/JSON data export

### Future Features
- Budget tracking and alerts
- Recurring transaction detection
- User-defined categorization rules

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

## Recent Fixes (2025-12-29)
- Fixed Decimal serialization error when passing Prisma data to client components
- Fixed date hydration mismatch by using UTC-safe date formatting
