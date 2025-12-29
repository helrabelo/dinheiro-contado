# Next Session Prompt

Copy and paste this to start the next session:

---

## Prompt

```
Continue working on Dinheiro Contado, a personal finance tracker for Brazilian bank statements.

**What's done (Phase 1 complete):**
- MVP: auth, file upload, PDF parsing (5 banks), transactions, categories
- 8,348 transactions imported, 55% auto-categorized
- Analytics Dashboard with Recharts:
  - TimePeriodSelector component (presets + custom range)
  - SpendingByCategoryChart (pie/donut with drill-down)
  - SpendingOverTimeChart (area/bar toggle, credits/debits)
  - Category Detail page with trends and top merchants
  - API endpoints: /api/analytics/spending-by-category, /api/analytics/spending-over-time, /api/analytics/category/[id]

**Goal for this session:**
Implement Phase 2: Insights & Comparisons (see docs/ROADMAP.md):

1. **Period Comparison Component:**
   - Side-by-side: this month vs last month
   - This year vs last year
   - Custom period comparison
   - Show % change with up/down indicators

2. **Top Spending Analysis:**
   - Top 10 merchants (all time + by period)
   - Top spending categories
   - Biggest single transactions
   - Average daily/weekly/monthly spending

3. **Spending Heatmap:**
   - Calendar heatmap (like GitHub contributions)
   - Color intensity by spending amount
   - Click to see day details

4. **Enhanced Summary Cards:**
   - Average monthly spending
   - Highest spending month
   - Most common category
   - Spending trend direction (up/down arrow)

**Tech context:**
- Next.js 15 + React 19 + TypeScript + Tailwind v4
- PostgreSQL + Prisma
- Recharts already installed
- Existing chart components in src/components/dashboard/

Start by reading docs/ROADMAP.md for full Phase 2 details.
```

---

## Alternative: Quick Start Prompt

```
Continue working on Dinheiro Contado. Read docs/ROADMAP.md and implement Phase 2: Insights & Comparisons with period comparison, top spending analysis, and spending heatmap.
```
