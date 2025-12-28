# Dinheiro Contado - Technical Planning Document

> Personal finance tracking SaaS for Brazilians - PoC/MVP Phase

## Project Goals

Build a production-ready PoC that:
- Ingests bank statements and credit card bills (PDF/CSV)
- Parses and stores transaction data securely
- Displays spending progression by month, card, and account
- Is architected for multi-tenancy from day one (even with single user)

---

## 1. Tech Stack

### Frontend
| Layer | Technology | Rationale |
|-------|------------|-----------|
| Framework | **Next.js 15** (App Router) | SSR, API routes, familiar stack |
| Language | **TypeScript** | Type safety for financial data |
| Styling | **Tailwind CSS v4** | Rapid UI development |
| Charts | **Recharts** or **Tremor** | Financial visualizations |
| Forms | **React Hook Form + Zod** | Validation for uploads |
| State | **TanStack Query** | Server state, caching |

### Backend
| Layer | Technology | Rationale |
|-------|------------|-----------|
| API | **Next.js API Routes** + **Python microservice** | Unified frontend, Python for PDF parsing |
| PDF Processing | **FastAPI** microservice | Leverage existing pdfplumber/pandas code |
| Auth | **NextAuth.js v5** (Auth.js) | Flexible, supports multiple providers |
| File Upload | **UploadThing** or **S3 presigned URLs** | Secure file handling |

### Database & Storage
| Layer | Technology | Rationale |
|-------|------------|-----------|
| Primary DB | **PostgreSQL** (via Neon/Supabase) | Production-ready, JSONB for flexibility |
| ORM | **Prisma** or **Drizzle** | Type-safe queries |
| File Storage | **S3** (or Cloudflare R2) | Encrypted PDF storage |
| Cache | **Redis** (optional for MVP) | Session storage, rate limiting |

### Infrastructure
| Layer | Technology | Rationale |
|-------|------------|-----------|
| Hosting | **Vercel** (Next.js) + **Railway** (Python) | Familiar from existing projects |
| Monitoring | **Sentry** | Error tracking |
| CI/CD | **GitHub Actions** | Automated deployments |

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND                              │
│                   Next.js 15 (Vercel)                       │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────────┐    │
│  │Dashboard│  │ Upload  │  │ Reports │  │ Transactions │    │
│  └─────────┘  └─────────┘  └─────────┘  └─────────────┘    │
└──────────────────────┬──────────────────────────────────────┘
                       │ API Routes
┌──────────────────────┴──────────────────────────────────────┐
│                     BACKEND LAYER                            │
│  ┌────────────────────┐    ┌────────────────────────────┐   │
│  │  Next.js API       │    │  Python Parser Service     │   │
│  │  - Auth            │◄──►│  (FastAPI on Railway)      │   │
│  │  - CRUD ops        │    │  - PDF parsing             │   │
│  │  - File management │    │  - Transaction extraction  │   │
│  └─────────┬──────────┘    └────────────────────────────┘   │
└────────────┼────────────────────────────────────────────────┘
             │
┌────────────┴────────────────────────────────────────────────┐
│                      DATA LAYER                              │
│  ┌─────────────────┐         ┌─────────────────────────┐    │
│  │   PostgreSQL    │         │    S3 / Cloudflare R2   │    │
│  │   (Neon/Supa)   │         │    (Encrypted PDFs)     │    │
│  │                 │         │                         │    │
│  │  - Users        │         │  - Original statements  │    │
│  │  - Accounts     │         │  - Processed backups    │    │
│  │  - Transactions │         │                         │    │
│  │  - Categories   │         │                         │    │
│  └─────────────────┘         └─────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Data Architecture

### Database Schema (PostgreSQL)

```prisma
// schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ============ USERS & AUTH ============

model User {
  id            String    @id @default(cuid())
  email         String    @unique
  name          String?
  emailVerified DateTime?
  image         String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  // Relations
  accounts      Account[]
  sessions      Session[]
  bankAccounts  BankAccount[]
  creditCards   CreditCard[]
  statements    Statement[]
  transactions  Transaction[]
  categories    Category[]

  @@map("users")
}

model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
  @@map("accounts")
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("sessions")
}

// ============ FINANCIAL ENTITIES ============

model BankAccount {
  id          String   @id @default(cuid())
  userId      String
  bankCode    String   // e.g., "341" for Itau, "260" for Nubank
  bankName    String   // e.g., "Nubank", "Inter", "BTG"
  accountType String   // "checking", "savings"
  nickname    String?  // User-defined name
  lastFour    String?  // Last 4 digits (optional, for identification)
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  user         User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  statements   Statement[]
  transactions Transaction[]

  @@map("bank_accounts")
}

model CreditCard {
  id          String   @id @default(cuid())
  userId      String
  issuer      String   // "Nubank", "Inter", "BTG", "Santander"
  cardName    String   // "Ultravioleta", "Gold", etc.
  lastFour    String?  // Last 4 digits
  nickname    String?  // User-defined name
  closingDay  Int?     // Day of month when bill closes
  dueDay      Int?     // Day of month when payment is due
  creditLimit Decimal? @db.Decimal(12, 2)
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  user         User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  statements   Statement[]
  transactions Transaction[]

  @@map("credit_cards")
}

// ============ STATEMENTS ============

model Statement {
  id              String        @id @default(cuid())
  userId          String
  bankAccountId   String?
  creditCardId    String?

  // File info
  originalFileName String
  storagePath      String       // S3/R2 path (encrypted)
  fileHash         String       // SHA-256 for deduplication
  fileSizeBytes    Int

  // Statement metadata
  statementType    StatementType
  periodStart      DateTime
  periodEnd        DateTime
  totalAmount      Decimal?     @db.Decimal(12, 2) // For credit cards

  // Processing status
  status           ProcessingStatus @default(PENDING)
  parserVersion    String?
  parsedAt         DateTime?
  errorMessage     String?

  // Audit
  createdAt        DateTime     @default(now())
  updatedAt        DateTime     @updatedAt

  user         User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  bankAccount  BankAccount?  @relation(fields: [bankAccountId], references: [id])
  creditCard   CreditCard?   @relation(fields: [creditCardId], references: [id])
  transactions Transaction[]

  @@unique([userId, fileHash]) // Prevent duplicate uploads
  @@map("statements")
}

enum StatementType {
  CREDIT_CARD
  CHECKING_ACCOUNT
  SAVINGS_ACCOUNT
}

enum ProcessingStatus {
  PENDING
  PROCESSING
  COMPLETED
  FAILED
  NEEDS_REVIEW
}

// ============ TRANSACTIONS ============

model Transaction {
  id            String   @id @default(cuid())
  userId        String
  statementId   String
  bankAccountId String?
  creditCardId  String?
  categoryId    String?

  // Transaction data
  transactionDate DateTime
  postingDate     DateTime?
  description     String
  originalDescription String  // Raw text from statement
  amount          Decimal  @db.Decimal(12, 2)
  type            TransactionType

  // Credit card specific
  installmentCurrent Int?    // e.g., 2 of 12
  installmentTotal   Int?    // e.g., 12
  isInternational    Boolean @default(false)

  // Metadata
  merchantName    String?
  merchantCategory String?  // MCC code if available
  notes           String?

  // Deduplication
  transactionHash String   // Hash of date+amount+description

  // Audit
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  user        User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  statement   Statement    @relation(fields: [statementId], references: [id], onDelete: Cascade)
  bankAccount BankAccount? @relation(fields: [bankAccountId], references: [id])
  creditCard  CreditCard?  @relation(fields: [creditCardId], references: [id])
  category    Category?    @relation(fields: [categoryId], references: [id])

  @@index([userId, transactionDate])
  @@index([transactionHash])
  @@map("transactions")
}

enum TransactionType {
  CREDIT   // Money in
  DEBIT    // Money out
  TRANSFER // Between own accounts
}

// ============ CATEGORIES ============

model Category {
  id          String   @id @default(cuid())
  userId      String?  // null = system default, userId = user custom
  name        String
  icon        String?
  color       String?
  parentId    String?  // For subcategories
  isSystem    Boolean  @default(false)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  user         User?         @relation(fields: [userId], references: [id], onDelete: Cascade)
  parent       Category?     @relation("CategoryHierarchy", fields: [parentId], references: [id])
  children     Category[]    @relation("CategoryHierarchy")
  transactions Transaction[]

  @@map("categories")
}
```

### Default Categories (System)

```typescript
const DEFAULT_CATEGORIES = [
  { name: "Alimentacao", icon: "🍽️", subcategories: ["Restaurantes", "Supermercado", "Delivery", "Padaria"] },
  { name: "Transporte", icon: "🚗", subcategories: ["Combustivel", "Uber/99", "Estacionamento", "Manutencao"] },
  { name: "Moradia", icon: "🏠", subcategories: ["Aluguel", "Condominio", "Luz", "Agua", "Gas", "Internet"] },
  { name: "Saude", icon: "🏥", subcategories: ["Farmacia", "Consultas", "Exames", "Plano de Saude"] },
  { name: "Educacao", icon: "📚", subcategories: ["Cursos", "Livros", "Escola", "Faculdade"] },
  { name: "Lazer", icon: "🎮", subcategories: ["Streaming", "Jogos", "Cinema", "Viagens", "Hobbies"] },
  { name: "Compras", icon: "🛒", subcategories: ["Roupas", "Eletronicos", "Casa", "Presentes"] },
  { name: "Servicos", icon: "⚙️", subcategories: ["Assinaturas", "Telefone", "Seguros"] },
  { name: "Financeiro", icon: "💰", subcategories: ["Investimentos", "Emprestimos", "Taxas", "IOF"] },
  { name: "Renda", icon: "💵", subcategories: ["Salario", "Freelance", "Rendimentos", "Reembolsos"] },
  { name: "Outros", icon: "📦", subcategories: [] },
];
```

---

## 3. Security & Privacy Considerations

### 3.1 Data Classification

| Data Type | Sensitivity | Storage | Encryption |
|-----------|-------------|---------|------------|
| User email/name | Medium | PostgreSQL | At rest (DB-level) |
| Bank names | Low | PostgreSQL | At rest (DB-level) |
| Card last 4 digits | Medium | PostgreSQL | At rest (DB-level) |
| Transaction amounts | High | PostgreSQL | At rest (DB-level) |
| Transaction descriptions | High | PostgreSQL | At rest (DB-level) |
| Original PDFs | Critical | S3/R2 | AES-256 + at rest |
| PDF passwords | **NEVER STORE** | - | - |

### 3.2 Security Measures

#### Authentication & Authorization
```typescript
// middleware.ts - Route protection
export const config = {
  matcher: [
    '/dashboard/:path*',
    '/api/:path*',
  ]
};

// All API routes must verify:
// 1. Valid session
// 2. User owns the requested resource (userId matches)
```

#### File Upload Security
```typescript
// File upload validation
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'text/csv',
  'application/vnd.ms-excel',
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// Validation steps:
// 1. Check MIME type (both header and magic bytes)
// 2. Check file size
// 3. Scan filename for path traversal
// 4. Generate random storage key (never use original filename)
// 5. Compute SHA-256 hash for deduplication
```

#### API Security
```typescript
// Security headers (next.config.js)
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-XSS-Protection', value: '1; mode=block' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Content-Security-Policy', value: "default-src 'self'..." },
];

// Rate limiting per user
const RATE_LIMITS = {
  upload: { requests: 10, window: '1m' },
  api: { requests: 100, window: '1m' },
  parse: { requests: 5, window: '1m' },
};
```

#### PDF Handling Security
```python
# Python parser security
def secure_pdf_processing(file_path: str, password: str = None):
    """
    Security measures:
    1. Never log passwords
    2. Process in isolated temp directory
    3. Delete temp files immediately after processing
    4. Validate PDF structure before parsing
    5. Timeout long-running operations
    6. Never store passwords anywhere
    """
    pass
```

### 3.3 LGPD Compliance (Brazilian GDPR)

#### Required Features
- [ ] **Consent Management**: Clear opt-in for data processing
- [ ] **Data Portability**: Export all user data (JSON/CSV)
- [ ] **Right to Deletion**: Complete account + data deletion
- [ ] **Data Minimization**: Only collect what's necessary
- [ ] **Privacy Policy**: Clear explanation of data usage
- [ ] **Terms of Service**: Legal agreement
- [ ] **Breach Notification**: Process for security incidents

#### Data Retention Policy
```typescript
const DATA_RETENTION = {
  transactions: 'indefinite', // User controls
  statements: '7_years',      // Legal requirement
  sessions: '30_days',
  logs: '90_days',
  deleted_accounts: '30_days_then_purge',
};
```

### 3.4 Encryption Strategy

```typescript
// Environment variables (NEVER commit)
// .env.local
DATABASE_URL="postgresql://..."
ENCRYPTION_KEY="..." // 32-byte key for application-level encryption
S3_ENCRYPTION_KEY="..." // For client-side S3 encryption
NEXTAUTH_SECRET="..."

// Application-level encryption for sensitive fields (optional extra layer)
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

function encryptSensitiveField(text: string): string {
  const iv = randomBytes(16);
  const cipher = createCipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
  // ... implementation
}
```

### 3.5 Audit Logging

```typescript
// Log all sensitive operations
const AUDITABLE_ACTIONS = [
  'user.login',
  'user.logout',
  'statement.upload',
  'statement.delete',
  'transaction.categorize',
  'account.delete',
  'data.export',
];

// Audit log schema
model AuditLog {
  id        String   @id @default(cuid())
  userId    String
  action    String
  resource  String
  resourceId String?
  metadata  Json?
  ipAddress String?
  userAgent String?
  createdAt DateTime @default(now())

  @@index([userId, createdAt])
  @@map("audit_logs")
}
```

---

## 4. MVP Feature Scope

### Phase 1: Core Upload & Parse (Week 1-2)
- [ ] User authentication (email/password or OAuth)
- [ ] Bank account & credit card registration
- [ ] PDF/CSV upload with validation
- [ ] Integration with existing Python parsers
- [ ] Basic transaction list view

### Phase 2: Visualization (Week 3)
- [ ] Monthly spending summary
- [ ] Spending by category (pie chart)
- [ ] Spending trend (line chart)
- [ ] Filter by account/card

### Phase 3: Management (Week 4)
- [ ] Transaction categorization (manual)
- [ ] Category management
- [ ] Statement management (view, delete)
- [ ] Basic data export

---

## 5. Project Structure

```
dinheiro-contado/
├── apps/
│   └── web/                    # Next.js 15 frontend
│       ├── app/
│       │   ├── (auth)/         # Login, register
│       │   ├── (dashboard)/    # Protected routes
│       │   │   ├── dashboard/
│       │   │   ├── statements/
│       │   │   ├── transactions/
│       │   │   └── settings/
│       │   └── api/
│       │       ├── auth/
│       │       ├── statements/
│       │       └── transactions/
│       ├── components/
│       ├── lib/
│       │   ├── db/             # Prisma client
│       │   ├── auth/           # NextAuth config
│       │   └── utils/
│       └── ...
│
├── services/
│   └── parser/                 # FastAPI Python service
│       ├── app/
│       │   ├── main.py
│       │   ├── parsers/        # Bank-specific parsers
│       │   │   ├── btg.py
│       │   │   ├── nubank.py
│       │   │   ├── inter.py
│       │   │   └── ...
│       │   └── schemas/
│       ├── requirements.txt
│       └── Dockerfile
│
├── packages/
│   └── shared/                 # Shared types/utils
│       └── types/
│
├── prisma/
│   └── schema.prisma
│
├── docker-compose.yml          # Local development
└── ...
```

---

## 6. Next Steps

1. **Create repository**: `dinheiro-contado` in personal projects
2. **Initialize Next.js 15** with TypeScript + Tailwind
3. **Set up Prisma** with PostgreSQL (Neon free tier)
4. **Implement auth** with NextAuth.js
5. **Port existing parsers** to FastAPI microservice
6. **Build upload flow** with S3/R2 integration

---

*Document created: 2025-12-28*
*Version: 1.0 - PoC Planning*
