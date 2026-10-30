# Tasks

## 1. Money math

- [x] 1.1 Add `subtractMoney` to `shared/src/money.ts` (design D2), export it from `shared/src/index.ts`, and extend `money.test.ts` per design D6; verify `npm test -w shared` passes
- [x] 1.2 Add `client/src/features/budget/budgetSummary.ts` (design D2) with `budgetSummary.test.ts` per design D6; verify it passes

## 2. Card and page

- [x] 2.1 Add `BudgetSummary.tsx` with the amounts, the usage bar and the cost-by-day table (design D3) and render it in `ItineraryView` between the overview and the itinerary card; remove Estimated cost, Budget and the `estimatedCost` prop from `TripOverview` (design D4)
- [x] 2.2 Add the contrast pairs from design D5 to `client/src/theme/contrast.test.ts`, switching the over-budget fill if a pair fails
- [x] 2.3 Add `BudgetSummary.test.tsx` per design D6 and update `ItineraryView.test.tsx` for the overview change; verify `npm test -w client` passes
- [x] 2.4 Mutation-check: temporarily compute the difference with plain `budget - estimatedCost`, treat exactly-on-budget as over (`<=` instead of `<`), and drop the 100% cap on the bar width; confirm the matching tests fail; revert and verify all pass

## 3. Docs

- [x] 3.1 Update the README trip page section (the budget card, one currency per trip); in `openspec/ROADMAP.md` remove "per-currency totals" from step 11 and change the Money decision to "all amounts are in the trip currency; nothing is converted"

## 4. End-to-end checks

- [x] 4.1 In a browser against a dev server pair started on free ports (never the user's own), with the free-tier key: generate a trip and verify the card's amounts, percentage and bar, and that each cost-by-day row matches that day's timeline total; generate a trip with a deliberately small budget and verify the over-budget state if the plan exceeds it (report it if the AI keeps within budget); no console errors

## 5. Checks

- [x] 5.1 Run `npm ci` (only when no dev server holds files in `node_modules`; otherwise `npm install` from the unchanged lockfile, and say so), `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`; ask the user to run `npx @fission-ai/openspec@latest validate add-budget-summary --strict`; verify all pass

## Workflow follow-up

- Archive the change and mark step 11 as done in `openspec/ROADMAP.md`; commit on `main` without pushing.
