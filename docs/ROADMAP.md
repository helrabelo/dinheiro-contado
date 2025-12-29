# Dinheiro Contado - Roadmap

## Vision
A personal finance tracker that gives Brazilians a clear visual overview of their spending patterns over time - from daily transactions to multi-year trends.

---

## Current State

### What's Built (MVP + Phase 1 Complete)
- [x] Authentication (NextAuth v5) - *Note: Password verification is placeholder only*
- [x] PDF parsing (5 bank parsers, 100% accuracy on 144 PDFs)
- [x] File upload with deduplication
- [x] Basic dashboard with 30-day summary
- [x] Transaction list with filtering
- [x] Categories CRUD
- [x] Auto-categorization on import (200+ keywords)
- [x] **Time Period Selector** - Reusable component with presets and custom range
- [x] **Pie/Donut Chart** - Gastos por Categoria with drill-down links
- [x] **Line/Area Chart** - Gastos ao Longo do Tempo with credits/debits toggle
- [x] **Bar Chart** - Alternative view for spending over time
- [x] **Category Detail Page** - `/dashboard/categories/[id]` with charts and top merchants
- [x] **Period Comparison** - Month vs month, year vs year comparisons
- [x] **Top Spending Analysis** - Top merchants, biggest transactions, frequent merchants
- [x] **Enhanced Summary Cards** - Averages, savings rate, trends

### Recent Fixes (2025-12-29)
- [x] Fixed "Maiores Valores" sorting (was showing lowest instead of highest)
- [x] Changed default period to "Todo periodo" across all analytics components
- [x] Fixed Decimal serialization error for Prisma data
- [x] Fixed date hydration mismatch with UTC-safe formatting

### Session 2 Fixes (2025-12-29)
- [x] Fixed uncategorized transactions link (`categoryId=UNCATEGORIZED`)
- [x] Added error states to enhanced-summary-cards with retry button
- [x] Added confirmation dialog before auto-categorization
- [x] Standardized error messages to Portuguese (login, upload, APIs)
- [x] **NEW: Batch Categorization by Pattern** - `/dashboard/categories/batch`
  - Auto-detects patterns in uncategorized transactions (e.g., "IFD*", "UBER*")
  - Preview matching transactions before applying
  - Custom pattern input for manual patterns
  - Bulk apply categories with one click

---

## Known Bugs & Issues (Priority Order)

### Critical (Fix Before Production)
- [ ] **Password authentication not implemented** - `/src/lib/auth/index.ts:30,43` has TODOs
- [ ] **File storage not implemented** - `/src/app/api/statements/upload/route.ts:76` - files lost after processing

### High Priority
- [x] ~~**Uncategorized link broken**~~ - Fixed
- [ ] **Missing duplicate transaction detection** - Same transaction in multiple statements imports twice
- [x] ~~**Silent error handling**~~ - Fixed with retry button

### Medium Priority
- [x] ~~**Categorization button race condition**~~ - Fixed with confirmation dialog
- [x] ~~**No confirmation before auto-categorization**~~ - Added confirmation modal
- [ ] **Missing upload progress indicator** - Large files show no progress feedback
- [x] ~~**Inconsistent error messages**~~ - Standardized to Portuguese

### Low Priority
- [ ] **Console.error without context** - 30+ occurrences without user/request info
- [ ] **Duplicate code** - Category lookup logic repeated in 3+ files
- [ ] **Unused import** - "Legend" in spending-over-time-chart.tsx
- [ ] **No success toast** - Categorization success message disappears on refresh

---

## Phase 2: Bug Fixes & Polish (Priority: HIGH)

### 2.1 Authentication Security
- [ ] Implement bcrypt password hashing
- [ ] Add password verification in credentials provider
- [ ] Add password reset flow
- [ ] Consider OAuth providers (Google, GitHub)

### 2.2 File Storage
- [ ] Implement cloud storage (S3/R2/Supabase Storage)
- [ ] Store uploaded PDFs for re-processing
- [ ] Add file download capability
- [ ] Implement storage cleanup for deleted statements

### 2.3 Transaction Deduplication
- [ ] Add duplicate detection on upload
- [ ] Show warning when duplicates found
- [ ] Allow user to skip/merge duplicates
- [ ] Add manual duplicate merge UI

### 2.4 Error Handling & UX
- [ ] Add error states to all analytics components
- [ ] Add retry buttons on failed requests
- [ ] Standardize all messages to Portuguese
- [ ] Add confirmation dialogs for destructive actions
- [ ] Add toast notifications for success/error feedback

### 2.5 Upload Experience
- [ ] Add upload progress bar
- [ ] Show parsing progress
- [ ] Better duplicate file feedback with link to existing

---

## Phase 3: Reports & Export (Priority: MEDIUM)

### 3.1 Monthly Report
- [ ] Auto-generated monthly summary
- [ ] Total spending by category
- [ ] Comparison with previous month
- [ ] Notable transactions
- [ ] PDF export option

### 3.2 Annual Report
- [ ] Year-end summary
- [ ] Yearly spending by category
- [ ] Month-by-month breakdown
- [ ] Year-over-year comparison
- [ ] Exportable PDF/CSV

### 3.3 Data Export
- [ ] CSV export (all transactions)
- [ ] PDF report generation
- [ ] JSON export for backup

---

## Phase 4: Advanced Features (Priority: LOW)

### 4.1 Budget Tracking
- [ ] Set monthly budgets per category
- [ ] Progress bars showing budget usage
- [ ] Alerts when approaching limits
- [ ] Budget vs actual reports

### 4.2 Recurring Transaction Detection
- [ ] Identify subscriptions and recurring bills
- [ ] Monthly recurring expenses summary
- [ ] Subscription management view
- [ ] Alerts for unusual recurring charges

### 4.3 User-Defined Categorization Rules
- [ ] Custom merchant → category mappings
- [ ] Rule priority system
- [ ] Bulk re-categorization
- [ ] Import/export rules

### 4.4 Transaction Enhancements
- [ ] Add notes/comments to transactions
- [ ] Bulk edit/delete transactions
- [ ] Split transactions
- [ ] Attach receipts/photos

### 4.5 Goals & Savings
- [ ] Savings goals tracking
- [ ] "What if" scenarios
- [ ] Spending reduction targets

---

## Technical Debt

### Code Quality
- [ ] Extract category lookup to shared utility
- [ ] Centralize date formatting in `src/lib/date-utils.ts`
- [ ] Add logging context (userId, requestId)
- [ ] Remove unused imports
- [ ] Add comprehensive error boundaries

### Testing
- [ ] Unit tests for API routes
- [ ] Integration tests for upload flow
- [ ] E2E tests for critical paths
- [ ] Parser tests for edge cases

### Performance
- [ ] Add Redis caching for analytics
- [ ] Optimize Prisma queries (select only needed fields)
- [ ] Add database indexes for common queries
- [ ] Implement pagination for large datasets

### Accessibility
- [ ] Add aria-labels to charts
- [ ] Keyboard navigation for charts
- [ ] Screen reader support
- [ ] Color contrast verification

---

## Success Metrics

- [x] User can see spending breakdown for any time period
- [x] User can identify spending trends over months/years
- [x] User can drill down into any category to see details
- [x] Charts load in < 1 second
- [ ] Mobile-friendly visualizations (partially done)
- [ ] Zero critical security vulnerabilities
- [ ] 95%+ uptime

---

## Next Session Priorities

1. **Fix uncategorized link** - Quick win, broken functionality
2. **Add error states to analytics** - Better UX
3. **Implement password hashing** - Security requirement
4. **Add confirmation dialogs** - UX safety
5. **Standardize to Portuguese** - Consistency
