# Tasks

## 1. Repository and store

- [x] 1.1 Add `client/src/features/trips/tripRepository.ts` (key, version, `readTrips`, `writeTrips` with backup first, design D2) and `tripRepository.test.ts` with a `Map`-backed fake storage per design D10; verify it passes
- [x] 1.2 Add `createTripStore.ts` with the `TripStore` API from design D3 (`save`/`remove` results, 50-trip limit, unsaved reasons, cached `list`/`get`, `subscribe`, `handleStorageChange` with external revisions, D6) and `createTripStore.test.ts` per design D10; verify it passes
- [x] 1.3 Update `tripStoreContext.ts` to the new `TripStore` type and `TripStoreProvider.tsx` to create the store once from a guarded `window.localStorage` and listen to `storage` events; add `useTrips.ts` (`useTripList`, `useStoredTrip`, `useUnsavedReason`) on `useSyncExternalStore`; drop `initialTrips` from `App` and `RootLayout`
- [x] 1.4 Test helpers: `seedTrips(trips)`, `renderTripPage` seeds `localStorage`, `setup.ts` clears it after each test; verify the existing client tests pass unchanged otherwise

## 2. My trips

- [x] 2.1 Move `DeleteConfirmation` to `client/src/components/ui/` (design D7) and update `ActivityItem`; verify the editing tests pass
- [x] 2.2 Add `TripList.tsx` and `client/src/pages/TripsPage.tsx` (design D5): the list, empty state, delete with confirmation, focus and status, skipped and unavailable notices; add the `/trips` route
- [x] 2.3 Add the "My trips" `NavLink` with `end` to `SiteHeader`
- [x] 2.4 Add `TripsPage.test.tsx` and the header test per design D10; verify they pass

## 3. Trip page and generation

- [x] 3.1 `TripPage`: `useStoredTrip`, key `ItineraryView` by ID and revision, `TripDeleted`, new `TripNotFound` text and links (design D4)
- [x] 3.2 `ItineraryView`: the unsaved notice with "Try again" and the My trips link, the "updated in another tab" initial status (design D4)
- [x] 3.3 `PlanPage` / `TripReview`: save result ignored for navigation; at 50 saved trips show the limit message and the My trips link instead of "Generate" (design D4)
- [x] 3.4 Trip page, plan page and review tests per design D10 (reload survival, unsaved notice and retry, update and delete from another tab, limit); verify `npm test -w client` passes
- [x] 3.5 Mutation check: temporarily (a) write without re-reading storage, (b) skip the backup before writing, (c) bump revisions on own saves, (d) drop the limit check; confirm the matching tests fail; revert and verify all pass

## 4. Docs

- [x] 4.1 Update README (saving, My trips, the limit, storage failures and backups, tabs, the `features/trips` tree and routes) and record the "Saving (step 14)" decision as built in `openspec/ROADMAP.md` (design D9)

## 5. End-to-end checks

- [x] 5.1 In a browser against a dev server pair on free ports (never the user's own 3001/5173), with the free-tier key: generate a trip, edit it, reload and see the edits; open My trips, open the trip from it, delete another trip; open the same trip in two tabs and check that an edit and a delete in one show in the other; simulate a full storage (fill `localStorage` from the console) and check the unsaved notice and "Try again"; put broken JSON in the key and check the backup and the empty state; keyboard-only flow and a 375 px viewport (ask the user if the window can't be resized); no console errors

## 6. Checks

- [x] 6.1 Run `npm ci` (only when no dev server holds files in `node_modules`; otherwise `npm install` from the unchanged lockfile, and say so), `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`; ask the user to run `npx @fission-ai/openspec@latest validate add-saved-trips --strict`; verify all pass

## Workflow follow-up

- Archive the change and mark step 14 as done in `openspec/ROADMAP.md`; commit on `main` without pushing.
