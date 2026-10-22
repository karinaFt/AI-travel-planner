# Proposal

## Why

Users cannot yet describe a trip. `/plan` still shows a "coming soon" placeholder. The trip's basic facts (where, when, budget, currency and how many people) are the input every later step depends on: AI generation, the itinerary view and the budget summary. The backend (step 6) must validate exactly the same rules as the browser, so the rules need to live in shared code from the start rather than inside the form.

## What Changes

- Add a `shared/` npm workspace (`@travel-planner/shared`) for isomorphic TypeScript used by the client now and by the server later. It contains:
  - the trip basics schema (Zod) with plain-language error messages;
  - the list of supported currencies and the limits;
  - date helpers.
- Validation rules:
  - destination: required, 2–100 characters after trimming;
  - start and end dates: valid calendar dates in `YYYY-MM-DD` form, end not before start, at most 14 days;
  - start date not in the past (browser only, because it depends on the user's local date);
  - budget: greater than 0, at most 10,000,000, at most 2 decimals;
  - currency: one of USD, EUR, GBP, UAH, PLN, CZK, CHF, JPY, CAD, AUD (default EUR);
  - travelers: a whole number from 1 to 20 (default 1).
- Add form building blocks to the client UI kit: a `Field` with label, hint and error wiring, plus styled text input, date input and select, all in the design-foundation style.
- **BREAKING** (spec-level): replace the `/plan` placeholder with a trip basics form:
  - field-level errors shown after a field is touched or on submit;
  - focus moves to the first invalid field on submit;
  - unexpected input never crashes the form.
- On a valid submission, show a short summary of the normalized trip basics. Step 5 replaces this summary with the full review step.

## Capabilities

### New Capabilities
- `trip-setup`: How a user describes a trip's basics (destination, dates, budget, currency, travelers): the fields, the validation rules and messages, the error behavior, and the submission outcome.

### Modified Capabilities
- `app-shell`: The "Plan page placeholder" requirement is removed, because `trip-setup` now owns what `/plan` shows.

The `build-tooling` spec does not change. Its existing "Scripts run from the repository root" requirement already says that every script must cover every workspace that provides it, and the new `shared` workspace follows it.

## Impact

- **New**: the `shared/` workspace (`package.json`, `tsconfig.json`, `src/trip-basics.ts`, `src/dates.ts`, `src/index.ts`, tests); `client/src/components/ui/` form controls; `client/src/features/trip-setup/` (form schema adapter, form component, summary).
- **Changed**: root `package.json` (`workspaces` adds `shared`), `client/package.json` (depends on `@travel-planner/shared`), `client/src/pages/PlanPage.tsx`, `client/src/App.test.tsx` (plan page tests), README.
- **Dependencies**: `zod` 4 and `date-fns` 4 in `shared`; `react-hook-form` and `@hookform/resolvers` in `client`. Dev: `@testing-library/user-event` is already present.
- **Out of scope** (roadmap step 5): travel style, pace, interests, the review step and keeping the draft when leaving `/plan`. Also out of scope: any API call.
