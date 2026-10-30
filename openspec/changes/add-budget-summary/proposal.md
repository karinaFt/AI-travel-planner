# Proposal

## Why

The trip page (step 10) shows the estimated cost of the whole trip next to the budget, but the user has to compare the two numbers themselves. This step answers the question a traveler actually has: "Does this plan fit my budget, and by how much?" It adds a budget summary that states what is left or how far over the plan goes, computed exactly.

## What Changes

- **Budget summary card** on the trip page, between the overview and the itinerary:
  - **Budget**, **Estimated cost** and either **Remaining** or **Over budget by**, all in the trip currency;
  - a bar showing how much of the budget the plan uses, with the percentage in words ("8% of budget"), exposed as an accessible meter;
  - over budget, the card uses the warning color and says so in text, so color is never the only signal; exactly on budget reads "Remaining €0.00";
  - **cost by day**: a table with one row per day (day number, date, title, estimated cost, €0.00 for a day without activities) and a total row equal to the estimated cost.
- **The overview loses its "Estimated cost" and "Budget" facts**: they move into the card, so each number appears once.
- **Exact money math**: the remaining amount is computed in integer hundredths with a new shared `subtractMoney`, next to `sumMoney`.
- **One currency**: every activity is in the trip currency, as the shared trip schema already requires. There are no per-currency totals and nothing is converted.

## Capabilities

### New Capabilities
- `budget-summary`: the budget card: amounts, remaining or over, the usage bar, cost by day and exact math.

### Modified Capabilities
- `itinerary-view`: "Trip overview" no longer lists the estimated cost and the budget; the card shows them.

## Impact

- **New**:
  - `subtractMoney` in `shared/src/money.ts` with tests;
  - `client/src/features/budget/` (`budgetSummary()` and `BudgetSummary`) with tests.
- **Changed**:
  - `client/src/features/itinerary/ItineraryView.tsx` and `TripOverview.tsx`, and their tests;
  - `client/src/theme/contrast.test.ts` (the bar colors);
  - `README.md`;
  - `openspec/ROADMAP.md`: step 11 drops "per-currency totals", and the Money decision says all amounts are in the trip currency.
- **Server**: no changes. **Dependencies**: none new.
- **Out of scope**:
  - per-currency totals and currency conversion (decided against: one currency per trip);
  - per-day budgets (the breakdown shows costs, not a budget split across days) and per-traveler amounts;
  - editing the budget or activities (step 12);
  - saving trips (step 13).
