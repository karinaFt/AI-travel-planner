# Design

## Context

What the client has now (step 9):
- **`TripPage`** (`client/src/pages/TripPage.tsx`) reads the trip from `useTripStore()` and shows a short summary: heading, date range, day count, an ordered list "Day N · title", a "coming soon" note and "Plan another trip". Unknown IDs show `TripNotFound`.
- **`TripStoreProvider`** keeps trips in a `Map` ref; it has no way to start with trips, so tests reach the page only through the generation flow.
- **`RootLayout`** moves focus to the new page's `h1` whenever `location.key` changes. Any `setSearchParams` call creates a new key, so a query change would steal focus today.
- **Helpers:** `formatDate`, `formatMoney`, `plural` (`features/trip-setup/format.ts`), `travelStyleTitle`, `paceTitle` (`styleOptions.ts`), `Card`, `Container`, `PageHeading`, `ButtonLink`, `useDocumentTitle`. `date-fns` is a dependency.
- **Data (`shared/src/itinerary.ts`):** a `Trip` has `preferences` and `itinerary.days` (1–14 days, numbered from 1, on the trip dates). A day has `id`, `dayNumber`, `date`, `title` and 0–20 activities sorted by `startTime`. An activity has `id`, `title`, `description` (may be empty), `category` (10 values), `startTime` `HH:mm`, `durationMinutes` 5–1440, `estimatedCost` ≥ 0 with ≤ 2 decimals and `currency` equal to the trip currency.

The user chose details that expand in place, and the selected day kept in `?day=N`.

## Goals / Non-Goals

**Goals:**
- A readable, accessible day-by-day view built from small presentational components that steps 11–12 can extend.
- Exact cost sums from the start, in a shared helper.

**Non-Goals:**
- Budget comparison, per-currency totals (step 11), editing (step 12), persistence (step 13).
- Visual timelines with a time scale, maps, images.

## Decisions

### D1. Layout
```
shared/src/money.ts                      sumMoney(amounts) → exact sum via integer hundredths
client/src/features/itinerary/
  format.ts                              categoryLabel, formatDuration, formatTimeRange, formatDayDate
  useSelectedDay.ts                      ?day=N ↔ selected day number
  TripOverview.tsx                       heading, facts list, estimated cost and budget
  dayIds.ts                              DAY_PANEL_ID, dayTabId (shared by the tabs and the panel)
  DayTabs.tsx                            tab list (roving tabindex, arrows, Home/End)
  DayTimeline.tsx                        tab panel: day heading, totals, activity list or empty message
  ActivityItem.tsx                       one activity with its details toggle
  ItineraryView.tsx                      composes the above for one trip
client/src/pages/TripPage.tsx            found → <ItineraryView>, otherwise TripNotFound (unchanged)
```
`sumMoney` is exported from `shared/src/index.ts`. The client-only formatting stays in the feature folder; `formatDate`, `formatMoney` and `plural` are imported from `trip-setup/format.ts` as `TripPage` already does.

### D2. Money
`sumMoney(amounts: readonly number[]): number` adds `Math.round(a * 100)` for every amount (integer hundredths) and divides the total by 100 once at the end. Inputs already have ≤ 2 decimals (schema), so rounding only removes float noise (`0.1 * 100 = 10.000000000000002`). Day cost = `sumMoney(day.activities.map(a => a.estimatedCost))`; trip cost = `sumMoney` of the day costs. Display uses `formatMoney(amount, trip.preferences.currency)`.

### D3. Selected day
`useSelectedDay(dayCount)` returns `[day, selectDay]`:
- reads `searchParams.get('day')`; it is valid only if it matches `^\d+$` and is between 1 and `dayCount`; otherwise the day is 1. An invalid value is not rewritten in the URL.
- `selectDay(n)` calls `setSearchParams({ day: String(n) })` (push, so Back returns to the previous day) with `preventScrollReset: true`.

### D4. Focus on query-only changes
`RootLayout` keeps `lastPathname` next to `lastLocationKey`. When the key changes but `location.pathname` is the same, it updates the refs and does nothing else. Side effect: activating the header's "Plan a trip" while already on `/plan` no longer moves focus. That is the same page, so the spec's "to another page" still holds, and the app-shell delta states the query-only case.

### D5. Tabs (WAI-ARIA tabs pattern, automatic activation)
- `div role="tablist" aria-label="Days"` with one `button role="tab"` per day: `id="day-tab-N"`, `aria-selected`, `aria-controls="day-panel"`, `tabIndex={selected ? 0 : -1}`.
- Label: "Day N" on the first line and the short date ("Tue, 10 Nov", `EEE, d MMM`) on the second.
- Keys on the tab list: ArrowRight/ArrowLeft (wrap), Home, End → `selectDay(n)` and focus the new tab (refs array). Click selects.
- One panel: `div role="tabpanel" id="day-panel" aria-labelledby="day-tab-N" tabIndex={0}`.
- The tab row is `overflow-x-auto` with `flex-nowrap` and the buttons `shrink-0`; the selected tab uses the primary color with a bottom border. It scrolls the selected tab into view on change (`scrollIntoView({ block: 'nearest', inline: 'nearest' })`, guarded because jsdom lacks it).

### D6. Overview
`PageHeading` with the destination, then a `dl` of facts: Dates ("10 Nov 2026 – 12 Nov 2026 · 3 days"), Travelers ("2 travelers"), Style, Pace, Starting from (only when `origin` is set), Estimated cost, Budget. Style and pace use `travelStyleTitle` and `paceTitle`. A `ButtonLink` "Plan another trip" to `/plan` stays at the bottom of the page. The "coming soon" note is removed.

### D7. Day timeline and activity
- **Panel header:** `h2` "Day N · Wednesday, 11 November" (`EEEE, d MMMM`) and the day title below it, then "2 activities · Estimated €60.00" (`plural`).
- **List:** `ol` of `ActivityItem`, keyed by activity id. The panel is rendered with `key={day.id}`, so expanded state resets when the day changes.
- **`ActivityItem`:** a row with the start time (`<time>`), title (`h3`), a category badge and the cost (`formatMoney`, or "Free" when 0). A secondary text button "Details" / "Hide details" with `aria-expanded` and `aria-controls` toggles a details block: "13:00–14:30" (with " (next day)" when start + duration passes 24:00; only one day can be passed because the duration is at most 1440 minutes, and exactly 1440 also reads "next day"), "1 h 30 min" ("45 min", "2 h"), the description when not empty, and "Estimated cost for the whole group." The button's accessible name includes the activity title ("Details for Lunch") so each one is distinct.
- **Category labels:** a `Record<ActivityCategory, string>` ("Sightseeing", "Culture", "Food", "Nature", "Adventure", "Relaxation", "Shopping", "Nightlife", "Transport", "Other"). One neutral badge style for all categories, so contrast is checked once.
- **Empty day:** "No activities are planned for this day." in a `bg-sky` note instead of the list; the header shows "0 activities · Estimated €0.00".

### D8. Trip store seam
`TripStoreProvider` gains an optional `initialTrips?: readonly Trip[]` that fills the map once. `App` and `RootLayout` pass an optional `initialTrips` prop through to it; `main.tsx` never sets it. Tests render the whole `App` (so the layout's focus handling is part of every view test) with `initialTrips={[trip]}` inside a `MemoryRouter`, plus a "Test back" button calling `navigate(-1)`, through a `renderTripPage(trip, route)` helper in `client/src/test/`. One test still goes through the full generation flow (already in `TripPage.test.tsx`), updated for the new page.

### D9. Tests
- **`shared/src/money.test.ts`:** empty list → 0; `[0.1, 0.2]` → 0.3; `[0.1, 0.2, 19.99]` → 20.29; large values keep 2 decimals.
- **`features/itinerary/format.test.ts`:** time ranges (normal, ending exactly at 24:00, after midnight, 1440 minutes), durations, day dates, every category labelled.
- **`features/itinerary/ItineraryView.test.tsx`** (via `renderTripPage`):
  - overview facts, estimated cost and budget, tab title, no "coming soon" note, no origin when absent;
  - tabs: three tabs, day 1 selected, only it tabbable; clicking "Day 2" shows its title; Right/Left wrap, Home/End;
  - URL: `?day=3` selects day 3; `?day=9`, `?day=abc`, `?day=0` select day 1; Back after choosing restores day 1 (MemoryRouter + a back button rendered by the test, or `useNavigate(-1)` in a test-only route element); focus stays on the tab after a click;
  - timeline: order, start times, categories, "Free", day total with decimal costs, "N activities";
  - details: collapsed by default, expand shows range, duration, description, group note; collapse hides; an empty description shows no description text; switching days collapses;
  - empty day message and no list.
- **`RootLayout`/`App` test:** a query-only navigation does not move focus; a path change still focuses the `h1` (the existing test).
- **Fixture:** `tripFixture` gains an optional `days` override (activities per day) so tests can describe exact activities; the default output stays the same, so existing tests keep passing.

## Risks / Trade-offs

- **Push on every tab change fills history** (at most one entry per click). → Matches the chosen Back behavior; arrow-key moves also push, which is acceptable for at most 14 days.
- **Trips still vanish on reload**, so `?day=N` links survive only within the tab until step 13. → Not found explains it.
- **Focus rule change in `RootLayout`** affects every page. → Covered by the existing focus tests plus a query-only test.
- **Floating-point sums.** → `sumMoney` in integer hundredths, tested with decimal cases. Float drift in a sum of at most 280 two-decimal amounts stays far below half a cent, and `formatMoney` rounds to cents, so the view looks the same with plain `+`: the mutation check found that only `money.test.ts` can catch it. Exactness starts to matter in step 11, when totals are compared with the budget.

## Migration Plan

Client and shared only. No new dependencies or configuration. To roll back, revert the commit.
