# Proposal

## Why

Generation works end to end (step 9), but `/trips/:id` only lists the day titles and says "The full day-by-day view is coming soon." The activities the AI planned (times, descriptions, categories and costs) are never shown. This step turns the page into the real itinerary view, so a user can read the plan day by day.

## What Changes

- **Trip overview** at the top of `/trips/:id`:
  - the destination, date range, trip length, travelers, style, pace and starting point (when given);
  - the estimated cost of the whole trip in the trip currency, next to the budget. The budget comparison (remaining or over) is step 11.
- **Day tabs**: one tab per day ("Day 1", "Day 2", …, with the short date), built as an accessible tab list.
  - Arrow keys, Home and End move between tabs.
  - On narrow screens the tab row scrolls sideways inside itself; the page never scrolls sideways.
- **Selected day in the URL**: `/trips/:id?day=N`.
  - Choosing a tab adds a history entry, so Back returns to the previous day.
  - A missing, invalid or out-of-range `day` shows day 1.
  - Changing the day does not move focus to the page heading.
- **Day timeline** for the selected day:
  - a heading with the day number, full date and day title, the number of activities and the day's estimated cost;
  - the activities in start-time order, each with its start time, title, category and cost ("Free" for 0).
- **Activity details**, expanded in place: a toggle button on each activity shows its time range (with "next day" when it ends after midnight), duration, description and a note that the cost is for the whole group.
- **Empty day**: a day without activities says so instead of showing an empty list.
- **Cost totals**: day and trip totals are summed in integer hundredths by a new shared `sumMoney` helper, so step 11 can reuse it.
- **Not found** stays as it is: an unknown or no-longer-kept trip shows "Trip not found".
- **Focus after navigation**: the layout now moves focus to the new page's heading only when the path changes, not when only the query changes.

## Capabilities

### New Capabilities
- `itinerary-view`: the `/trips/:id` view: overview, day tabs, selected day in the URL, day timeline, activity details, empty day and cost totals.

### Modified Capabilities
- `itinerary-request`: "Generated trip page" now opens the itinerary view instead of the short summary.
- `app-shell`: "Focus after navigation" gains a scenario saying a query-only change (choosing a day) keeps focus where it is.

## Impact

- **New**:
  - `shared/src/money.ts` (`sumMoney`) with tests;
  - `client/src/features/itinerary/` (overview, day tabs, day timeline, activity item, selected-day hook, formatting) with tests.
- **Changed**:
  - `client/src/pages/TripPage.tsx` (uses the new view) and its tests;
  - `client/src/features/trips/TripStoreProvider.tsx` (optional initial trips, used by tests);
  - `client/src/layouts/RootLayout.tsx` (focus only on path change);
  - `README.md`.
- **Server**: no changes. **Dependencies**: none new (`date-fns` is already used).
- **Out of scope**:
  - budget remaining or over budget and per-currency totals (step 11);
  - editing, adding, deleting or moving activities (step 12);
  - saving trips across reloads and a trips list (step 13);
  - maps, images, printing and sharing.
