# Proposal

## Why

Right now a trip lives only in the memory of the tab. A reload, a closed tab or the free server waking up loses the generated itinerary and every edit. Each generation also costs a free-tier Gemini request. Without saving, the planner is a demo rather than a tool. This is the last MVP step: trips are saved in the browser automatically, the user can find them again, and broken or full storage never loses data silently.

## What Changes

- **Trips are saved in `localStorage`** under `ai-travel-planner:trips` as `{ version: 1, trips }`. A generated trip is saved before its page opens, and every edit is saved right away. There is no Save button.
- **A "My trips" page** at `/trips`, with a "My trips" link in the header. It lists saved trips newest first: destination (a link to the trip), dates and length, travelers and budget. An empty state links to "Plan a trip".
- **Delete a saved trip** from the list with the same in-page confirmation used for activities. Focus and a status message follow, as in editing.
- **Up to 50 saved trips.** At the limit, the review step shows "delete a trip first" with a link to My trips instead of "Generate", so no AI request is wasted. Nothing is ever deleted automatically.
- **Storage full or unavailable** (quota exceeded, private mode, storage blocked): the trip still opens and stays editable for the tab. The trip page shows a notice that it isn't saved, with "Try again" and a link to My trips. The app never crashes because of storage.
- **Invalid saved data** (a trip that fails `tripSchema`, broken JSON, an unknown version) is skipped and first copied to a backup key, never silently deleted. My trips says how many trips couldn't be read.
- **Other tabs stay in sync** through the `storage` event. The list and an open trip page follow changes made elsewhere. An open form closes, and the change is announced. A trip deleted in another tab shows "Trip deleted". Every save re-reads storage and changes only its own trip, so tabs don't overwrite each other's trips.
- **"Trip not found"** now explains that trips are saved only in the browser they were planned in and may have been deleted. It links to My trips and Plan a trip.

## Capabilities

### New Capabilities
- `saved-trips`: saving trips in the browser, auto-save, the My trips list, deleting, the trip limit, storage failures, invalid data and backups, and syncing between tabs.

### Modified Capabilities
- `app-shell`: "Header navigation" gains the "My trips" link.
- `itinerary-request`: "Generated trip page" saves the trip instead of keeping it for the tab, and the "Trip not found" text changes.
- `activity-editing`: "Edits are kept for the tab" is renamed to "Edits are saved" and now covers reloads.

## Impact

- **New**:
  - `client/src/features/trips/`: `tripRepository.ts` (read, write and back up the stored data), `createTripStore.ts` (the store over the repository, listeners, `storage` events), `useTrips.ts` hooks, `TripList.tsx`, plus tests;
  - `client/src/pages/TripsPage.tsx`;
  - `client/src/components/ui/DeleteConfirmation.tsx` (moved from `features/editing/` so both features use it).
- **Changed**:
  - `tripStoreContext.ts` (wider `TripStore` interface) and `TripStoreProvider.tsx` (a localStorage-backed store);
  - `App.tsx` (the `/trips` route) and `RootLayout.tsx` (drops `initialTrips`);
  - `SiteHeader.tsx` (the My trips link);
  - `PlanPage.tsx` and `TripReview.tsx` (save result, the trip limit);
  - `TripPage.tsx` (reactive trip, not-found and deleted states, remount on changes from another tab);
  - `ItineraryView.tsx` (the unsaved notice and the "updated in another tab" announcement);
  - test helpers (`renderTripPage` seeds `localStorage`; setup clears it);
  - `README.md` and `openspec/ROADMAP.md`.
- **Server and shared schemas**: no changes. **Dependencies**: none new.
- **Out of scope**:
  - accounts, a database or sync between browsers and devices;
  - export or import of trips;
  - renaming trips, searching or sorting the list;
  - deleting a trip from its own page;
  - persisting the `/plan` draft across reloads;
  - restoring backed-up data from the UI. The backup is only kept in storage.
