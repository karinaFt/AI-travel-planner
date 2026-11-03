# Design

## Context

What exists after step 13:
- **`TripStore`** (`client/src/features/trips/tripStoreContext.ts`) is `{ get(id), save(trip) }`. `TripStoreProvider` implements it with a ref-backed `Map`. Saving doesn't re-render. The provider takes `initialTrips`, which only tests pass, through `App` and `RootLayout`.
- **`PlanPage`** calls `trips.save(trip)` in `useGeneration`'s `onSuccess`, then navigates to `/trips/<id>`. `TripReview` renders the "Generate" button in `GenerationFooter`.
- **`TripPage`** reads `store.get(id)` on render and renders `<ItineraryView key={trip.id} trip={trip} />` or `TripNotFound`.
- **`ItineraryView`** holds the trip in `useState(initialTrip)`, changes it only through `editTrip`, and calls `store.save(trip)` in an effect after every change. It has a sr-only `role="status"` paragraph keyed to the selected day. `DayTimeline` is keyed by day ID, so a remount closes any open form.
- **`DeleteConfirmation`** (`features/editing/`) is an in-page `role="group"` labelled `Delete "<title>"?`. Focus goes to Keep, Escape keeps, and Delete uses the danger variant.
- **`SiteHeader`** has `NavLink`s for Home (`end`) and Plan a trip.
- **Formatting helpers** live in `features/trip-setup/format.ts`: `formatDate`, `formatMoney`, `plural`. `tripLengthInDays` comes from shared.
- **Tests**: jsdom provides a real `localStorage`. `renderTripPage(trip)` passes `initialTrips`, `tripFixture()` builds valid trips, and `setup.ts` only runs `cleanup()`.
- **No code uses `localStorage` yet.** The `/plan` draft is in memory and stays that way.

## Goals / Non-Goals

**Goals:**
- Trips survive reloads, with no Save button and no data loss: no silent deletion, no tab overwriting another tab's trips.
- Storage failures (quota, blocked storage, invalid data) are visible and recoverable, and never crash the app.
- Tabs agree with each other.

**Non-Goals:**
- Sync between browsers, export or import, restoring backups from the UI, and persisting the plan draft.

## Decisions

### D1. Layout
```
client/src/components/ui/DeleteConfirmation.tsx  moved from features/editing/, wording made generic
client/src/features/trips/
  tripRepository.ts        storage format: read (validate, collect invalid), write (backup first)
  createTripStore.ts       TripStore over a Storage | null: cache, save/remove results, listeners, storage events
  tripStoreContext.ts      TripStore type, context, useTripStore
  TripStoreProvider.tsx    creates the store once from window.localStorage; listens to `storage`
  useTrips.ts              useTripList(), useStoredTrip(id), useUnsavedReason(id) via useSyncExternalStore
  TripList.tsx             the list with delete, focus and status
client/src/pages/TripsPage.tsx                   /trips: heading, notices, TripList or empty state
```

### D2. Stored format and the repository
- Key `ai-travel-planner:trips`, value `{ "version": 1, "trips": Trip[] }`. Backups go to `ai-travel-planner:trips:backup:<ISO time>`.
- `readTrips(storage): ReadResult` gives `{ trips: Trip[], invalid: unknown[] | string | null }`:
  - missing key: no trips, nothing invalid;
  - `JSON.parse` fails, the value isn't an object, `version !== 1` or `trips` isn't an array: no trips, and `invalid` is the **raw string**;
  - otherwise each entry goes through `tripSchema.safeParse`: valid entries are kept and the rest go to the `invalid` array;
  - duplicate IDs: the first one wins and the rest count as invalid.
- `writeTrips(storage, trips, invalid)`: if `invalid` is non-empty, first `setItem` the backup (the raw string, or `JSON.stringify(invalidEntries)`). If that throws, the main write isn't attempted and it returns `'failed'`. Then `setItem(KEY, JSON.stringify({ version: 1, trips }))`. Any throw returns `'failed'`. Quota errors differ across browsers (`QuotaExceededError`, code 22, `NS_ERROR_DOM_QUOTA_REACHED`), so every throw counts as a failure. The notice says "storage is full or unavailable".
- Once a backup succeeds, the invalid data has been set aside, and later writes don't back it up again. The store clears `invalid` and keeps the count for the My trips notice (D5).
- The repository has no React and no globals. It takes a `Storage`-like `{ getItem, setItem }`, so tests use a `Map`-backed fake that can be set to throw.

### D3. Store API
```ts
type SaveResult = 'saved' | 'limit' | 'failed'
type UnsavedReason = 'limit' | 'failed'

type TripStore = {
  get(id: string): Trip | undefined
  list(): readonly Trip[]                  // newest createdAt first; same array until something changes
  save(trip: Trip): SaveResult
  remove(id: string): 'removed' | 'failed'
  unsavedReason(id: string): UnsavedReason | undefined
  externalRevision(id: string): number     // bumps only on changes from other tabs
  readonly skipped: number | 'all'          // trips set aside as invalid at load; "all" when the whole value was broken
  handleStorageChange(key: string | null): void  // called by the provider for `storage` events
  readonly available: boolean              // false when localStorage can't be used
  subscribe(listener: () => void): () => void
}
```
- `createTripStore(storage: Storage | null)` keeps an in-memory `Map<id, Trip>`, which is always the source for `get` and `list`, plus a `Map<id, UnsavedReason>`.
- **`save`**: (1) put the trip in memory, so the page works even when the write fails; (2) if the trip is new and the re-read stored data already has 50 trips, set `unsaved = 'limit'` and return `'limit'`; (3) otherwise re-read storage (D6), replace or insert this trip, and write; (4) on success clear `unsaved`, on failure set `'failed'`; (5) notify listeners. With no storage, it always returns `'failed'`.
- **`remove`**: re-read, drop the ID, write; on success, drop it from memory and notify. On failure nothing changes and the list shows an error message instead of the status.
- `list()` and `get()` return cached references that change only when the data changes, so `useSyncExternalStore` doesn't loop. A trip from our own `save` is the same object `ItineraryView` passed in.
- `TripStoreProvider` creates the store once (`useState(() => createTripStore(getLocalStorage()))`). `getLocalStorage()` wraps `window.localStorage` access in try/catch, because it can throw in blocked or sandboxed contexts. The provider drops the `initialTrips` prop, and tests seed `localStorage` instead (D10).

### D4. Pages and the unsaved notice
- **PlanPage**: `onSuccess` calls `trips.save(trip)` and navigates whatever the result is. The trip page shows the reason. **TripReview** gets `atTripLimit` (`useTripList().length >= 50`). When it's true and the state is idle, the footer shows "You have 50 saved trips. Delete one in My trips to plan another." with a `ButtonLink` to `/trips` instead of "Generate". Its wording and the limit constant (`TRIP_LIMIT = 50`) live in `features/trips`.
- **TripPage** uses `useStoredTrip(id)`, which returns `{ trip, revision }`. It renders `<ItineraryView key={`${id}:${revision}`} trip={trip} updatedElsewhere={revision > 0} />`. A trip that was found during this visit and then disappears renders `TripDeleted`, tracked with a ref of whether it was seen. Otherwise it renders `TripNotFound` with the new text and links to `/trips` and `/plan`.
- **ItineraryView** keeps `store.save(trip)` in its effect and reads `useUnsavedReason(trip.id)`. When a reason is set, it renders a notice card (`role="status"`, not `alert`, so it doesn't interrupt on every edit) above the itinerary:
  - limit: "This trip isn't saved: you already have 50 saved trips.";
  - failed: "This trip isn't saved: browser storage is full or unavailable.".
  The card has "Try again" (`store.save(trip)`) and a link to My trips. When `updatedElsewhere` is set, the status starts with "This trip was updated in another tab." and is shown for the selected day. The existing status logic only needs an initial value.

### D5. My trips page
- `/trips` route in `App`. Title "My trips" through `useDocumentTitle`. `PageHeading` "My trips".
- **Notices** above the list: if `!store.available`, "This browser isn't letting the app save trips, so trips last only until the tab is closed."; if `skipped` is a count, "N saved trip(s) couldn't be read and were set aside."; if it is `"all"`, "Your saved trips couldn't be read and were set aside."
- **List**: `<ul>` of cards. In each card, the destination is a `Link` to `/trips/<id>` inside an `h2`, followed by `formatDate(start) – formatDate(end) · N days` and `N travelers · Budget <formatMoney>`. Then a "Delete" button, `data-trip-id`, `aria-label="Delete <destination> trip, <dates>"`. Clicking it shows `DeleteConfirmation` titled with the destination inside the card.
- **After delete**: `flushSync` the removal, then focus the next card's link, else the previous one, else the empty state's "Plan a trip" link. A sr-only `role="status"` says `Deleted "<destination>".`. Keep or Escape returns focus to that card's Delete button. A failed remove shows "Couldn't delete this trip. Try again." in the status, and the trip stays.
- **Empty state**: "No saved trips yet. Trips you plan are saved here automatically." plus a `ButtonLink` "Plan a trip".
- **SiteHeader** gets a third `NavLink` "My trips" to `/trips` with `end`, so trip pages don't mark it as current.

### D6. Tabs and concurrent writes
- **Read-modify-write per operation**: `save` and `remove` call `readTrips` right before writing, change only their own trip, and write. `localStorage` is synchronous within a tab, and browsers apply one tab's `setItem` atomically. Two tabs editing different trips therefore never lose each other's trips. Two tabs editing the **same** trip: last write wins, and the other tab gets the new version through the event below.
- The provider listens to `window`'s `storage` event:
  - for `event.key === KEY`, the store re-reads and swaps in the new data;
  - for `event.key === null` (`localStorage.clear()` in another tab), it does the same;
  - for each ID whose JSON changed, it bumps `externalRevision(id)`; a removed ID is dropped;
  - then it notifies listeners.
  The event never fires in the tab that wrote, so our own saves never bump revisions.
- **Comparing versions** (found in the E2E check): a trip this tab holds goes through `tripSchema` before its JSON is compared with the stored one. An edited activity is built as `{ ...draft, id, currency }`, so the same data can have its keys in another order, and a raw comparison saw a change that wasn't there. That remounted the view in the tab that made the edit. `ItineraryView` also doesn't save on mount when its trip is already the store's object, so opening or remounting a trip page writes nothing.
- **A trip that is unsaved in this tab** (limit or failed) is kept in memory when an event arrives without it, so its page doesn't flip to "Trip deleted".
- Remounting `ItineraryView` on a new revision closes forms and confirmations, matching the "switching days" behaviour. The selected day lives in `?day=N`, so it survives. Focus goes back to `<main>` only on a pathname change, so after a remount focus may drop to `body`. That is acceptable for a change the user didn't make, and the announcement tells them what happened.

### D7. Moving `DeleteConfirmation`
It moves to `components/ui/` unchanged except for its comment ("before something is deleted"). `ActivityItem` and `TripList` import it from there. The editing tests keep passing because the markup is identical.

### D8. Limits and sizes
`localStorage` is about 5 MB per origin, stored as UTF-16 in some browsers. A 14-day trip with 20 activities a day and full descriptions is roughly 60–120 KB of JSON, and a typical trip is 10–30 KB. At 50 trips the worst case can still hit the quota. That is what the unsaved notice is for, and the limit keeps the common case well inside it.

### D9. Docs
- README: in the trip page and generation sections, replace "kept until reload" with "saved in this browser". Add My trips, the limit, storage failures and backups, and multiple tabs. Update the `features/trips` tree line and the route list.
- ROADMAP: record the "Saving (step 14)" decision as built, including the 50-trip limit and the "follow other tabs" policy.

### D10. Tests
- **`tripRepository.test.ts`** (fake storage):
  - round trip;
  - missing key;
  - broken JSON, wrong version and non-array `trips` go to the raw backup;
  - one invalid entry is skipped and backed up;
  - duplicate IDs;
  - a backup write that throws blocks the main write;
  - a main write that throws returns `'failed'`.
- **`createTripStore.test.ts`**:
  - save and get, newest-first list, stable references;
  - a write is merged with data another "tab" wrote to the same fake storage;
  - the limit at 50 for new trips; edits of existing trips are still saved at 50;
  - quota failure sets `'failed'` and a later success clears it;
  - no storage;
  - remove;
  - storage events bump revisions only for changed trips;
  - an unsaved trip survives an event.
- **`TripsPage.test.tsx`**:
  - list order and content;
  - empty state;
  - delete with focus and announcement, keep and Escape;
  - skipped-trips notice and unavailable-storage notice;
  - a `storage` event dispatched on `window` adds a trip.
- **Trip page tests**:
  - reload survival: render, edit, unmount, render again from the same `localStorage`;
  - unsaved notice with "Try again", by stubbing `Storage.prototype.setItem` to throw;
  - "updated in another tab" closes an open form and announces;
  - "Trip deleted";
  - new not-found text.
- **PlanPage and TripReview tests**: at 50 saved trips there is no Generate button, and the link is shown.
- **SiteHeader test**: "My trips" is current on `/trips` and not on `/trips/abc`.
- **Helpers**:
  - `renderTripPage` writes `{ version: 1, trips: [trip] }` to `localStorage` before rendering;
  - `setup.ts` runs `localStorage.clear()` after each test;
  - a `seedTrips(trips)` helper is used by the page tests.

## Risks / Trade-offs

- **Same-trip edits in two tabs**: last write wins, with no merge. This is acceptable for a personal planner, and the other tab is told.
- **Remount on an external update** drops focus and any unsaved form input in the receiving tab. That is rare and announced, and keeping a stale form would be worse.
- **The backup is never cleaned up or restored from the UI.** It only guards against silent loss. Repeated corruption adds backup keys; that's unlikely and documented.
- **The limit is checked against the stored count when the review step renders and again when saving.** Another tab can still race between those two checks; the "Limit reached by another tab" scenario covers it.
- **Parsing the whole store on every save** is O(trips). At ≤ 50 trips this is negligible next to a render.

## Open Questions

None. The trip limit (50, never delete automatically) and the cross-tab policy (follow other tabs) were confirmed by the user on 2026-11-03.
