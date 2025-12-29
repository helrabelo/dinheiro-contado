# Dinheiro Contado - Roadmap

## Vision
A personal finance tracker that gives Brazilians a clear visual overview of their spending patterns over time - from daily transactions to multi-year trends.

---

## Current State (MVP Complete)

### What's Built
- [x] Authentication (NextAuth v5)
- [x] PDF parsing (5 bank parsers, 100% accuracy on 144 PDFs)
- [x] File upload with deduplication
- [x] Basic dashboard with 30-day summary
- [x] Transaction list with filtering
- [x] Categories CRUD
- [x] Auto-categorization on import (200+ keywords)
- [x] Basic "Gastos por Categoria" (30 days only, progress bars)

### What's Missing
- [ ] **Charts and visualizations** (pie charts, line charts, bar charts)
- [ ] **Time period selectors** (all time, year, 6 months, month, custom)
- [ ] **Detailed category breakdown** (drill-down into each category)
- [ ] **Spending trends** (month-over-month, year-over-year)
- [ ] **Comparison views** (this month vs last month, this year vs last year)

---

## Phase 1: Analytics Dashboard (Priority: HIGH)

### 1.1 Time Period Selector Component
Create a reusable time filter component:
- Presets: "Todo periodo", "Este ano", "Ultimos 6 meses", "Este mes", "Mes passado"
- Custom date range picker
- Persisted in URL params for shareability

### 1.2 Charts Library Integration
Install and configure charting library:
- **Recommended**: Recharts (React-native, good for financial data)
- **Alternative**: Tremor (Tailwind-based, simpler API)

### 1.3 Spending by Category (Enhanced)
Upgrade the current "Gastos por Categoria" section:
- **Pie/Donut chart** showing category distribution
- **Time period selector** (not just 30 days)
- **Drill-down**: Click category to see transactions
- **Comparison badge**: "+15% vs last period"

### 1.4 Spending Over Time Chart
New line/area chart showing:
- Monthly spending totals
- Trend line
- Credits vs Debits comparison
- Configurable date range

### 1.5 Category Detail Page
New page: `/dashboard/categories/[id]`
- Category spending over time (line chart)
- Top merchants in category
- Monthly breakdown (bar chart)
- All transactions in category

---

## Phase 2: Insights & Comparisons (Priority: MEDIUM)

### 2.1 Period Comparison
Side-by-side comparisons:
- This month vs last month
- This year vs last year
- Custom period comparison

### 2.2 Top Spending Analysis
- Top 10 merchants (all time, by period)
- Top spending categories
- Biggest single transactions
- Average daily/weekly/monthly spending

### 2.3 Spending Heatmap
Calendar heatmap showing spending intensity by day (like GitHub contribution graph)

### 2.4 Summary Cards
Enhanced summary with:
- Average monthly spending
- Highest spending month
- Most common category
- Spending velocity (trend direction)

---

## Phase 3: Reports & Export (Priority: MEDIUM)

### 3.1 Monthly Report
Auto-generated monthly summary:
- Total spending by category
- Comparison with previous month
- Notable transactions
- PDF export option

### 3.2 Annual Report
Year-end summary:
- Yearly spending by category
- Month-by-month breakdown
- Year-over-year comparison (if data exists)
- Exportable PDF/CSV

### 3.3 Data Export
- CSV export (all transactions)
- PDF report generation
- JSON export for backup

---

## Phase 4: Advanced Features (Priority: LOW)

### 4.1 Budget Tracking
- Set monthly budgets per category
- Progress bars showing budget usage
- Alerts when approaching limits

### 4.2 Recurring Transaction Detection
- Identify subscriptions and recurring bills
- Monthly recurring expenses summary
- Subscription management view

### 4.3 User-Defined Categorization Rules
- Custom merchant → category mappings
- Rule priority system
- Bulk re-categorization

### 4.4 Goals & Savings
- Savings goals tracking
- "What if" scenarios
- Spending reduction targets

---

## Technical Priorities

### Must Have for Phase 1
1. **Recharts or Tremor** - Charting library
2. **Time period context** - Global date range state
3. **API endpoints** for aggregated data:
   - `/api/analytics/spending-by-category`
   - `/api/analytics/spending-over-time`
   - `/api/analytics/category/[id]`

### Nice to Have
- Server components for initial data
- Client-side interactivity for filters
- Loading skeletons for charts
- Mobile-responsive charts

---

## Implementation Order

```
Week 1: Charts & Time Selector
├── Install Recharts
├── Create TimePeriodSelector component
├── Add pie chart to "Gastos por Categoria"
└── Add line chart for "Gastos ao Longo do Tempo"

Week 2: Category Deep Dive
├── Create /dashboard/categories/[id] page
├── Category spending over time chart
├── Top merchants in category
└── Transactions table with filters

Week 3: Comparisons & Insights
├── Period comparison component
├── Top spending analysis
├── Enhanced summary cards
└── Mobile responsiveness

Week 4: Polish & Reports
├── PDF export for reports
├── CSV export for transactions
├── Loading states and error handling
└── Performance optimization
```

---

## Success Metrics

- User can see spending breakdown for any time period
- User can identify spending trends over months/years
- User can drill down into any category to see details
- Charts load in < 1 second
- Mobile-friendly visualizations
