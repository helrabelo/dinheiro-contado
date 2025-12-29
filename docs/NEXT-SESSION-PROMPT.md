# Next Session Prompt

Copy and paste this to start the next session:

---

## Prompt

```
I'm working on Dinheiro Contado, a personal finance tracker for Brazilian bank statements.

**Current state:**
- MVP complete: auth, file upload, PDF parsing (5 banks), transactions, categories
- 8,348 transactions imported, 4,576 auto-categorized (55%)
- Dashboard shows only 30-day summary with basic progress bars
- No charts, no time period selection

**Goal for this session:**
Implement Phase 1 of the Analytics Dashboard (see docs/ROADMAP.md):

1. **Install Recharts** for charting
2. **Create TimePeriodSelector component** with presets:
   - "Todo periodo" (all time)
   - "Este ano" (this year)
   - "Ultimos 6 meses" (last 6 months)
   - "Este mes" (this month)
   - "Mes passado" (last month)
   - Custom date range

3. **Upgrade "Gastos por Categoria" section:**
   - Replace progress bars with a donut/pie chart
   - Add time period selector
   - Show percentage of total
   - Click to drill-down into category

4. **Add "Gastos ao Longo do Tempo" chart:**
   - Line/area chart showing monthly spending
   - Configurable time range
   - Show credits vs debits

5. **Create Category Detail Page** (`/dashboard/categories/[id]`):
   - Category spending over time (line chart)
   - Top merchants in this category
   - All transactions table

**Tech context:**
- Next.js 15 + React 19 + TypeScript + Tailwind v4
- PostgreSQL + Prisma
- Existing components in src/components/dashboard/
- API routes in src/app/api/

Start by reading docs/ROADMAP.md and the current dashboard at src/app/(dashboard)/dashboard/page.tsx
```

---

## Alternative: Quick Start Prompt

```
Continue working on Dinheiro Contado. Read docs/ROADMAP.md and implement Phase 1: Analytics Dashboard with Recharts charts and time period selectors.
```
