# Design

## Context

The repo is an npm workspaces root with one workspace, `client/`: React 19, Vite 8, React Router 8, Tailwind v4 tokens, and UI primitives `Button`, `ButtonLink`, `Card`, `Container` and `PageHeading`. `/plan` renders `PlanPage`, a placeholder. Tests use Vitest + React Testing Library + user-event, and the `renderWithRouter` helper. The roadmap fixes the trip preference rules (see `openspec/ROADMAP.md`). The future Express server (step 6) must reuse the same validation, which is why the rules go into a shared package now.

## Goals / Non-Goals

**Goals:**
- One Zod schema for the trip basics that the browser uses today and the server imports later, unchanged.
- Form controls in the UI kit, so steps 5, 11 and 12 reuse them.
- Error UX that is accessible and never shows errors before the user interacts.

**Non-Goals:**
- Style, pace, interests, the review step, and draft retention across routes (step 5).
- Localized number formats such as `1 500,50`. Input is a plain dot-decimal number, and the hint says so.
- A custom date picker. Native `<input type="date">` is accessible and mobile-friendly.

## Decisions

### D1. `shared/` workspace consumed as TypeScript source
```
shared/
  package.json   name @travel-planner/shared, private, type module,
                 exports { ".": "./src/index.ts" }, deps zod + date-fns,
                 scripts typecheck (tsc --noEmit), test (vitest run)
  tsconfig.json  strict, moduleResolution bundler, noEmit, lib ES2023 (no DOM)
  src/index.ts   re-exports
  src/dates.ts   isIsoDate, tripLengthInDays (date-fns parseISO/isValid/differenceInCalendarDays)
  src/trip-basics.ts
```
- The root `workspaces` becomes `["shared", "client"]`, and the client adds `"@travel-planner/shared": "*"`. npm links the folder into `node_modules`, and Vite and Vitest compile the `.ts` directly. There is no build step and no `dist/` to keep in sync.
- Vite allows serving files from the workspace root by default (`searchForWorkspaceRoot`), so the linked path outside `client/` works in dev. A task verifies this.
- The server (step 6) runs through `tsx`, which also consumes TS source, so the same approach works there.
- *Alternative*: compile `shared` with `tsc` to `dist/`. This adds a build-order dependency and stale-output bugs, which isn't worth it while every consumer understands TS.
- *Alternative*: a path alias (`@shared/*`) instead of a package. It works for Vite but needs separate configuration in every consumer's tsconfig and test runner. The package link works everywhere.

### D2. Two schema layers
- **Wire schema** (`shared`): `tripBasicsSchema` validates the normalized object `{ destination: string, startDate: 'YYYY-MM-DD', endDate, budget: number, currency: Currency, travelers: number }`.
  - Destination: `trim()`, `.min(2)`, `.max(100)`.
  - Budget: positive, at most 10,000,000, and at most 2 decimals. The decimal check is `Math.round(v * 100) === v * 100` on finite numbers.
  - Travelers: `int`, 1–20.
  - Currency: `z.enum(CURRENCIES)`.
  - Dates: a `superRefine` checks that both are real dates, end ≥ start, and length ≤ `MAX_TRIP_DAYS = 14`. The issue is attached to the `endDate` path.
  - It exports `TripBasics`, `CURRENCIES`, `CURRENCY_NAMES` and `LIMITS`.
- **Form schema** (`client/src/features/trip-setup/formSchema.ts`): accepts raw input strings and maps them onto the wire rules.
  - Budget: a strict regex `^\d+(\.\d{1,2})?$` after trimming. That rejects `1e5`, `Infinity`, `12,5,0`, a leading `+` and similar. Then `Number()`.
  - Travelers: `^\d+$`.
  - Adds the client-only rule "start date not in the past", using local today from date-fns `startOfToday`.
  - Error messages are the exact texts in the spec.
  - The output type is `TripBasics`, so the submit handler receives normalized data.
- Dates stay `YYYY-MM-DD` strings end to end. They are parsed only for comparison with `parseISO`, never with `new Date('2026-11-10')`, which reads the string as UTC midnight.

### D3. React Hook Form + `zodResolver`
Versions: `react-hook-form` 7.90 and `@hookform/resolvers` **5.9.2**, not 6.0.0. Version 6.0.0 (released 2026-10-19) fails `npm install` with `ERESOLVE`: its optional peer `effect@^4` conflicts with its other optional peer chain `@typeschema/effect` → `effect@^3`. 5.9.2 supports `zod ^3.25 || ^4` and installs cleanly. Revisit when 6.x fixes its peer ranges, and don't use `--legacy-peer-deps` to work around it.

- `useForm({ resolver: zodResolver(tripBasicsFormSchema), mode: 'onTouched', reValidateMode: 'onChange', shouldFocusError: true, defaultValues })`. Defaults are EUR, travelers `'1'`, and empty strings elsewhere.
  - `onTouched`: the first validation happens on blur.
  - `reValidateMode: 'onChange'`: errors update while typing once shown.
  - `shouldFocusError`: focus moves to the first invalid field on submit, in field registration order.
- A cross-field rule: when the start date changes, the form re-triggers end-date validation (`trigger('endDate')`) if the end date was already touched. Otherwise "end before start" would not clear.
- Budget and travelers use `type="text"` with `inputMode="decimal"` / `"numeric"`. A `type="number"` input hides invalid text: it reports `''` for `abc`, so the user would see "required" instead of the real problem (roadmap decision).
- `noValidate` on the `<form>` disables native browser bubbles, so all messages come from one place.

### D4. Form controls in the UI kit (`client/src/components/ui/`)
- `Field({ label, hint?, error?, children })`:
  - generates ids with `useId`;
  - passes props to the control through a render prop, `children({ id, describedBy, invalid })`, instead of cloning elements. The control receives `id`, `aria-describedby` (hint and error ids) and `aria-invalid`;
  - renders `<label htmlFor>`, the control, the hint (muted) and the error (`text-coral-text` with a small icon). The error has no `role="alert"`, because the field already announces it through `aria-describedby`.
- `TextInput`, `DateInput` and `Select` forward refs (React 19 `ref` as a prop) for RHF `register`. They share `inputStyles(invalid)`: a white surface, `border-line-strong` (3.6:1, which meets non-text contrast), rounded corners, comfortable padding, a teal focus outline, and a coral border plus a thicker outline when invalid. Transitions list explicit properties only (the README rule about `outline-color`).
- Error text color `coral-text` (`#B4432C`) is already AA on canvas and white. The contrast test gains the pair `coral-text` on `surface`.

### D5. Page composition and submission
- `PlanPage` → `PageHeading` "Plan a trip" + intro line → `TripBasicsForm` inside a `Card`.
- Layout: a "Where & when" section (destination full width, then start and end dates side by side from `sm:`) and a "Budget & travelers" section (budget with the currency select next to it, then travelers). Below that sits a "Continue" primary `Button type="submit"`.
- Local page state: `{ step: 'form' } | { step: 'summary', basics: TripBasics }`. On a valid submit the page switches to `TripBasicsSummary`, a `Card` with a definition list showing:
  - destination;
  - the date range, formatted with date-fns `format(parseISO(d), 'd MMM yyyy')`;
  - "N days";
  - the budget via `Intl.NumberFormat('en', { style: 'currency', currency })`;
  - travelers with pluralization.

  Below the list are an "Edit details" button and a note that style and interests come next.
- The form component stays mounted but hidden (`hidden` attribute) while the summary shows, so "Edit details" returns with every value intact without extra state. Step 5 replaces this mechanism with the draft provider.
- Focus: switching to the summary focuses its heading, and "Edit details" focuses the destination input. This mirrors the route-change focus behavior.

### D6. Tests
- `shared`: Vitest unit tests (node environment) for every boundary in the spec:
  - destination 1/2/100/101 characters after trimming;
  - same-day trip, 14 vs 15 days, end < start, `2026-02-30`;
  - budget 0, negative, `0.01`, 2 vs 3 decimals, max and max + 0.01, `NaN`/`Infinity`;
  - travelers 0/1/20/21/2.5;
  - currency enum.
- Client: `formSchema` tests (raw strings such as `1e5`, ` 1500.5 `, `abc` and `two`, and the past date with `vi.setSystemTime`), `Field` and control tests (label association, `aria-invalid`, `aria-describedby` including the error), and page tests for each trip-setup scenario with user-event.
- "Today" is controlled in tests with `vi.useFakeTimers({ toFake: ['Date'] })` and `vi.setSystemTime('2026-10-21T10:00:00')`, so date rules are deterministic and user-event timers keep working.

## Risks / Trade-offs

- [Linking TS source across workspaces trips up a tool that expects JS] → All current consumers (Vite, Vitest, tsc with bundler resolution) handle it. The step 6 server runs on `tsx`. If a tool fails later, add a build to `shared` then.
- [The "not in the past" rule disagrees with the server near midnight across time zones] → It is a client-only rule by design. The server never enforces it.
- [Native date inputs look different per browser] → They are styled consistently (border, radius, padding), and the inner picker UI is left native. This is acceptable for the MVP.
- [Comma decimals (`1500,50`) are rejected] → The hint text under the budget says "Use a dot for decimals, e.g. 1500.50". Locale-aware parsing is a non-goal.
- [The hidden-form trick is temporary] → Step 5 replaces it with the draft provider. It is documented here so it is not mistaken for the final design.

## Migration Plan

There is no persisted data. After pulling, run `npm install` (or `npm ci`) to link the new workspace. To roll back, revert the commit.
