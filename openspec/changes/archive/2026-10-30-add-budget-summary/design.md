# Design

## Context

What exists after step 10:
- **`shared/src/money.ts`** has `sumMoney(amounts)`, which adds in integer hundredths.
- **`ItineraryView`** computes the day costs and the trip cost with `sumMoney` and passes `estimatedCost` to **`TripOverview`**. The overview's `dl` lists Dates, Travelers, Style, Pace, Starting from, Estimated cost and Budget.
- **Data:** `preferences.budget` is > 0 and ≤ 10,000,000 with ≤ 2 decimals. `tripSchema` requires every activity's `currency` to equal `preferences.currency`, so all amounts on a trip share one currency.
- **Tokens:** `coral`, `coral-text` and `coral-soft` already exist for warnings. `contrast.test.ts` checks text and non-text pairs.
- **Helpers:** `formatMoney`, `Card`. Tests use `renderTripPage(trip)` and `tripFixture({ preferences, days })`.

The user chose one currency per trip, an overall summary, and a cost-by-day breakdown inside the same card.

## Goals / Non-Goals

**Goals:**
- One clear answer to "does the plan fit the budget?", correct to the cent.
- A pure, tested `budgetSummary()` that step 12 can rerun after every edit.

**Non-Goals:**
- Per-currency totals, conversion, per-day budgets, per-traveler figures, editing the budget.

## Decisions

### D1. Layout
```
shared/src/money.ts                    + subtractMoney(a, b) → exact a − b via integer hundredths
client/src/features/budget/
  budgetSummary.ts                     budgetSummary(budget, estimatedCost) → BudgetSummaryData
  BudgetSummary.tsx                    the card: amounts, usage bar, cost-by-day table
client/src/features/itinerary/
  ItineraryView.tsx                    renders <BudgetSummary> between the overview and the itinerary card
  TripOverview.tsx                     drops Estimated cost and Budget, and the estimatedCost prop
```

### D2. Money math
- `subtractMoney(a, b)` returns `(Math.round(a * 100) - Math.round(b * 100)) / 100`. It is exported from `shared/src/index.ts`.
- `budgetSummary(budget, estimatedCost)` returns:
  ```ts
  type BudgetSummaryData = {
    budget: number
    estimatedCost: number
    status: 'within' | 'over'        // 'within' includes exactly on budget
    /** Remaining when within, the excess when over; never negative. */
    difference: number
    /** Whole percent of the budget used, e.g. 8 or 120; not capped. */
    percentUsed: number
  }
  ```
  - `diff = subtractMoney(budget, estimatedCost)`; `status = diff < 0 ? 'over' : 'within'`; `difference = Math.abs(diff)`.
  - `percentUsed = Math.round((Math.round(estimatedCost * 100) * 100) / Math.round(budget * 100))`, computed from hundredths so the share is not skewed by float noise. The budget is never 0 (schema).
- The day costs and the estimated cost keep coming from `sumMoney` in `ItineraryView`, which passes `days`, `dayCosts` and `estimatedCost` to the card, so the table, the day timelines and the totals use the same numbers.

### D3. Card
- `Card as="section" aria-labelledby="budget-heading"` with `h2` "Budget".
- `dl`: "Budget" and "Estimated cost", then either "Remaining" or "Over budget by", each value via `formatMoney(amount, currency)`.
- Bar: a track `div` (`bg-line`, rounded, 8 px high) with a fill `div` whose width is `min(percentUsed, 100)%`; the fill is `bg-primary` when within and `bg-coral` when over. The track carries `role="meter"`, `aria-label="Budget used"`, `aria-valuemin=0`, `aria-valuemax=100`, `aria-valuenow=min(percentUsed, 100)` and `aria-valuetext="<percentUsed>% of budget"`.
- Below the bar, a text line "<percentUsed>% of budget".
- Over budget: the "Over budget by" term and value use `text-coral-text`, and the card gets a `coral` left border. The words already say it, so color is an addition, not the signal.
- **Cost by day:** a `table` with `caption` "Cost by day" and columns Day, Date, Title (hidden below `sm`, where the title would crowd the row) and Estimated cost (right-aligned, `tabular-nums`). One row per day, in order: "Day N" as the row header (`th scope="row"`), `formatDayDate(date, 'short')`, the title, `formatMoney(dayCost)`. A `tfoot` row "Total" with the estimated cost. On narrow screens the table fits without horizontal scroll because the title column is hidden.
- A fill under 1% still shows: width `max(percent, 1%)` when the estimated cost is above 0, so a tiny plan isn't drawn as empty. A cost of 0 shows an empty bar and "0% of budget".

### D4. Overview change
`TripOverview` keeps Dates, Travelers, Style, Pace and Starting from. The `estimatedCost` prop is removed. "Dates" keeps its two-column span.

### D5. Contrast
Add non-text pairs to `contrast.test.ts`: `primary` on `line` (the fill against the track) and `coral` on `line` and on `surface`. If `coral` on `line` fails 3:1, the over-budget fill switches to `coral-text`, which is darker, and the test lists that pair instead.

### D6. Tests
- **`shared/src/money.test.ts`:** `subtractMoney(0.3, 0.1)` → 0.2; `subtractMoney(0.3, sumMoney([0.1, 0.2]))` → 0; negative results; large values.
- **`features/budget/budgetSummary.test.ts`:** within (1500 / 120 → remaining 1380, 8%); exactly on budget (120 / 120 → within, 0, 100%); over (100 / 120 → over, 20, 120%); decimal on budget (0.3 / 0.1 + 0.2 → within, 0); zero cost (0%); rounding of the percentage (1/3 → 33%).
- **`features/budget/BudgetSummary.test.tsx`** through `renderTripPage` and `tripFixture` with `days`:
  - within: the three amounts, "Remaining", no "Over budget by", meter value text "8% of budget";
  - exactly on budget: "Remaining €0.00";
  - over: "Over budget by €20.00", no "Remaining", meter value 100 with text "120% of budget";
  - decimal costs meeting a 0.30 budget: "Remaining €0.00";
  - cost by day: rows in order with €40.00, €0.00 and €80.50, the total row €120.50, and the caption "Cost by day".
- **`ItineraryView.test.tsx`:** the overview facts no longer include Estimated cost or Budget.

## Risks / Trade-offs

- **Removing the estimated cost from the overview** moves it a little lower on the page. → The card sits right under the overview, before the itinerary.
- **One currency per trip** means a user who pays some things in another currency must enter them converted (step 12). → Decided by the user; the ROADMAP is updated to match.
- **The percentage is rounded**, so 99.6% reads "100% of budget" while the text says "Remaining €0.06". → The amounts are exact; the percentage is a guide. Showing "Remaining" keeps it unambiguous.

## Migration Plan

Client and shared only. No new dependencies or configuration. To roll back, revert the commit.
