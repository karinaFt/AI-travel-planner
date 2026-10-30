# Tasks

## 1. Shared money helper

- [x] 1.1 Add `shared/src/money.ts` with `sumMoney` (design D2), export it from `shared/src/index.ts`, and add `money.test.ts` per design D9; verify `npm test -w shared` passes

## 2. Test seams

- [x] 2.1 Add the optional `initialTrips` prop to `TripStoreProvider` (design D8), a `renderTripPage(trip, route)` helper in `client/src/test/`, and an optional `days` override in `tripFixture` that keeps the default output unchanged; verify existing client tests pass

## 3. Formatting and selected day

- [x] 3.1 Add `features/itinerary/format.ts` (`categoryLabel`, `formatDuration`, `formatTimeRange`, `formatDayDate`) per design D7 with `format.test.ts` per design D9; verify it passes
- [x] 3.2 Add `useSelectedDay` (design D3) and change `RootLayout` to move focus only when the pathname changes (design D4); add the query-only focus test; verify the existing focus tests still pass

## 4. View components

- [x] 4.1 Add `TripOverview`, `DayTabs`, `DayTimeline`, `ActivityItem` and `ItineraryView` (design D5–D7)
- [x] 4.2 Use `ItineraryView` in `TripPage` for found trips, removing the "coming soon" note; keep `TripNotFound`; update `TripPage.test.tsx` (the generation-flow success test now expects the tabs and day 1 activities)
- [x] 4.3 Add `ItineraryView.test.tsx` per design D9; verify `npm test -w client` passes
- [x] 4.4 Mutation-check: temporarily sum costs with plain `+`, drop the `?day` range check, and remove the pathname check in `RootLayout`; confirm the matching tests fail; revert and verify all pass

## 5. Docs

- [x] 5.1 Update the README: what the trip page shows, `?day=N`, and that trips are still kept only until reload

## 6. End-to-end checks

- [x] 6.1 In a browser against a dev server pair started on free ports (never the user's own), with the free-tier key: generate a trip and verify the overview, tabs, timeline, expanding and collapsing details, Back between days, focus staying on tabs, arrow/Home/End keys, and no console errors
- [x] 6.2 At a 375 px wide viewport, verify the tab row scrolls within itself and the page has no horizontal scroll

## 7. Checks

- [x] 7.1 Run `npm ci`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`; ask the user to run `npx @fission-ai/openspec@latest validate add-itinerary-view --strict`; verify all pass

## Workflow follow-up

- Archive the change and mark step 10 as done in `openspec/ROADMAP.md`; commit on `main` without pushing.
