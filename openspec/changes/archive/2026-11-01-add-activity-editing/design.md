# Design

## Context

What exists after step 12:
- **`shared/src/itinerary.ts`**: `activitySchema`, `daySchema` (activities sorted by start time, at most `ACTIVITY_LIMITS.perDay.max` = 20), `itinerarySchema` and `tripSchema` (activities must use the trip currency). It also exports `ACTIVITY_CATEGORIES`, `ACTIVITY_LIMITS` and `START_TIME`, and `trip-basics.ts` exports `LIMITS.budget.max` and `hasAtMostTwoDecimals`.
- **`TripStoreProvider`** keeps trips in a ref-backed `Map` with `get`/`save`. Saving does not re-render. `TripPage` reads the trip on render and renders `ItineraryView`.
- **`ItineraryView`** derives `dayCosts` and `estimatedCost` from `trip.itinerary` with `sumMoney` and passes them to `BudgetSummary` and `DayTimeline`. `DayTimeline` is keyed by `day.id`, so switching days remounts it.
- **`ActivityItem`** shows time, title, cost and category, plus a "Details" toggle with `aria-label="<text> for <title>"`.
- **Forms**: `TripPreferencesForm` uses react-hook-form with `zodResolver`, `mode: 'onTouched'`, `shouldFocusError`, raw string values and `Field` / `TextInput` / `Select`. Numeric inputs are `type="text"` with `inputMode`.
- **Tests**: `renderTripPage(trip)` renders the whole app with the trip in the store, and `tripFixture({ days })` builds valid trips.
- **ROADMAP decision (step 13):** a pure reducer with stable IDs, re-sorting by start time and a schema guard. Delete confirmation is in-page. Step 14 will auto-save on every edit through the same store.

## Goals / Non-Goals

**Goals:**
- Add, edit, move and delete activities, with the totals and the budget summary following every change.
- Every state the page can reach is a valid `Trip`.
- Keyboard and screen-reader friendly: predictable focus, announced results, no browser dialogs.

**Non-Goals:**
- Editing day titles, the budget or the preferences; drag-and-drop ordering; undo; saving across reloads.

## Decisions

### D1. Layout
```
client/src/components/ui/TextArea.tsx          textarea with inputStyles, like TextInput
client/src/features/editing/
  editTrip.ts                                  pure reducer: (trip, action) → trip
  activityFormSchema.ts                        raw form values → ActivityDraft, messages, empty/initial values
  ActivityForm.tsx                             the add/edit form
  DeleteConfirmation.tsx                       in-page "Delete "X"?" with Delete / Keep
client/src/features/itinerary/
  ItineraryView.tsx                            trip state changed through editTrip; saves to the store; status message
  DayTimeline.tsx                              which form is open; Add activity; focus after changes
  ActivityItem.tsx                             Edit and Delete buttons; shows the confirmation
client/src/pages/TripPage.tsx                  <ItineraryView key={trip.id} …>
```

### D2. Reducer
```ts
/** An activity as the user enters it: no ID, no currency. */
type ActivityDraft = Omit<Activity, 'id' | 'currency'>

type EditAction =
  | { type: 'add'; dayId: string; id: string; draft: ActivityDraft }
  | { type: 'update'; activityId: string; dayId: string; draft: ActivityDraft }   // dayId: target day
  | { type: 'delete'; activityId: string }

function editTrip(trip: Trip, action: EditAction): Trip
```
- **Purity:** the new ID comes in the action (`crypto.randomUUID()` in the component), so the reducer is deterministic and testable.
- **Currency:** the reducer builds the activity as `{ ...draft, id, currency: trip.preferences.currency }`, so a draft can't carry another currency.
- **Ordering:** for `update` on the same day, the activity is replaced in place and the day is stable-sorted by `startTime`. Equal times keep their order, so an unchanged time keeps its place. For `add` and for `update` to another day, the activity is removed from its old day (for a move), appended to the target day, and the target day is stable-sorted, so it lands after equal times. `Array.prototype.toSorted` is stable. `HH:mm` strings compare correctly as strings.
- **Guard:** the result goes through `tripSchema.safeParse`. On failure, or when an ID isn't found, the reducer returns the **same** `trip` object, so React skips the re-render and nothing is saved. The schema's own rules (≤ 20 per day, sorted, currency, field limits) are the single source of truth. The UI prevents these cases, and the guard is the backstop.
- Untouched days and activities keep their object identity.

### D3. State and saving
- `ItineraryView` takes the stored trip as the initial state: `const [trip, setTrip] = useState(initialTrip)`, and every change goes through `editTrip`. Plain state instead of `useReducer`, so `applyEdit` can see right away whether `editTrip` rejected the change (same object back) and keep the form open without announcing anything. Everything derived (day costs, estimated cost, budget summary) is computed from this state, so step 11's summary follows edits with no changes.
- After a change, `useEffect(() => store.save(trip), [trip])` writes the trip back. Saving the unchanged initial trip on mount is harmless. Step 14 swaps the store implementation and gets auto-save on every edit for free.
- `TripPage` renders `<ItineraryView key={trip.id} trip={trip} />`, so opening another trip resets the reducer.
- `applyEdit(action, message)` applies the change, sets the status message (D6) and returns whether the trip changed. `ItineraryView` passes `applyEdit`, `days` and `currency` down to `DayTimeline`.

### D4. Form
- **Raw values** (strings, like the trip form): `title`, `dayId`, `startTime`, `durationMinutes`, `category`, `estimatedCost`, `description`.
- **`activityFormSchema`** transforms them to `{ dayId, draft: ActivityDraft }` and reuses the shared limits:

  | Field | Rule | Message |
  |---|---|---|
  | title | trimmed, 1–120 | "Enter a title" / "Title can be at most 120 characters" |
  | startTime | `START_TIME` | "Enter a 24-hour time like 09:30" |
  | durationMinutes | `^\d+$`, 5–1440 | "Enter whole minutes from 5 to 1440" |
  | estimatedCost | `^\d+(\.\d+)?$`, ≤ 10,000,000, `hasAtMostTwoDecimals` | "Enter an amount like 25 or 25.50" / "Use at most 2 decimal places" / "Cost can be at most 10,000,000" |
  | category | `z.enum(ACTIVITY_CATEGORIES)` | "Choose a category" |
  | description | trimmed, ≤ 1000 | "Description can be at most 1000 characters" |
  | dayId | one of the trip's day IDs (checked by the form, `z.string()` here) | "Choose a day" |

  The cost input trims surrounding spaces. `durationMinutes` and `estimatedCost` use `inputMode="numeric"` and `inputMode="decimal"`.
- **Initial values:** in edit mode, from the activity (numbers to strings, cost via `String(cost)`). In add mode: empty title, time and cost, the selected day, category `other` and duration `60`.
- **react-hook-form** set up like the trip form: `zodResolver`, `mode: 'onTouched'`, `reValidateMode: 'onChange'`, `shouldFocusError: true`. Focus goes to the title field on mount with `setFocus('title')`.
- **Fields** in this order: Title, Day (select), Start time (hint "24-hour, e.g. 09:30"), Duration in minutes, Category (select with `categoryLabel`), Estimated cost (`Estimated cost (EUR)`, hint "For the whole group"), Description (`TextArea`, optional). On `sm+` time, duration and cost sit in one row of three. Buttons: primary "Save activity" (add mode: "Add activity") and secondary "Cancel".
- **Day options:** "Day N · Wed, 11 Nov". Days other than the activity's current day that hold 20 activities are `disabled`, with " (full)" in the text.
- The form is a `<form aria-label="Edit <title>">` (add mode: `"New activity"`). In edit mode it renders inside the activity's `<li>`, in place of its content. In add mode it renders after the list as its own block.

### D5. Delete confirmation
- `ActivityItem` holds `confirming` state. "Delete" sets it, and the action row is replaced by `DeleteConfirmation`: a `role="group"` labelled "Delete <title>?", with the question text, a "Delete" button (danger style: `coral-text` text with a `coral-text` ring, using the existing secondary button shape) and "Keep". Focus goes to "Keep" on mount. Escape on the group triggers Keep.
- Keep returns focus to the item's "Delete" button through a ref. Delete calls `applyEdit({ type: 'delete', … })`.
- Item buttons: "Details", "Edit", "Delete" in one row. Accessible names follow the existing pattern: `"Edit <title>"`, `"Delete <title>"`.

### D6. Status and focus
- `ItineraryView` renders one `<p role="status" className="sr-only">` that stays in the DOM, so screen readers pick up changes to its text. Messages: `Saved "<title>".`, `Added "<title>".`, `Added "<title>" to Day <n>.` and `Moved "<title>" to Day <n>.` (add or update to a day other than the selected one), `Deleted "<title>".`. The message is cleared when the day changes. Messages are visually hidden: the change itself is visible on screen.
- `DayTimeline` holds `editing: null | { mode: 'add' } | { mode: 'edit'; activityId }`. Opening another form replaces this state, so only one form is open. After a change it renders synchronously with `flushSync` and then focuses the target, which is in the DOM by then:
  - saved on the selected day → that activity's "Edit" button (buttons found by `data-activity-id` inside the panel, which avoids a ref per item);
  - saved to another day → the tab panel (it already has `tabIndex={0}`);
  - deleted → the "Add activity" button (after a delete the day has at most 19 activities, so the button is always there);
  - cancel in edit mode → the activity's "Edit" button; cancel in add mode → "Add activity".
- Switching days remounts `DayTimeline` (existing `key={day.id}`), which closes any form or confirmation without saving. This is accepted (see Risks).

### D7. Day limit
`day.activities.length >= ACTIVITY_LIMITS.perDay.max` replaces the "Add activity" button with "A day can hold up to 20 activities." (muted text). The same constant drives the disabled day options.

### D8. Tests
- **`editTrip.test.ts`** (pure, with `tripFixture`):
  - add: appended in time order, after equal times, gets the action ID and the trip currency;
  - update on the same day: fields change, the ID is kept, a time change re-sorts, an unchanged time keeps its place among equal times;
  - move: removed from the source, inserted in the target in order, ID kept;
  - delete: removed, and other days keep their identity;
  - guards return the same object: unknown activity ID, unknown day ID, a 21st activity, an invalid draft (empty title, 1441 minutes, cost with 3 decimals).
- **`activityFormSchema.test.ts`**: valid values transform to numbers and trimmed strings; each rule in the D4 table gives its message; `abc`, `1e3`, `-1` and `12,5` are rejected for cost and duration.
- **`ActivityEditing.test.tsx`** (through `renderTripPage`, user-event):
  - edit the cost → timeline, day cost, budget "Remaining" and the cost-by-day row update;
  - cancel → unchanged, focus on "Edit Lunch";
  - invalid save → four errors, focus on title, trip unchanged;
  - change the time → re-sorted;
  - move to day 2 → gone from day 1, status message, present on day 2, cost-by-day rows updated, focus on the panel;
  - a full target day is disabled in the select;
  - add with all fields → listed in order with "€3.00", count and day cost updated, status "Added …", focus on its "Edit";
  - empty day → "Add activity" visible; 20 activities → limit text and no button;
  - delete → confirm → gone, status, focus on "Add activity"; Keep and Escape → focus back on "Delete Lunch"; deleting the last activity → empty message;
  - one form at a time;
  - switching days closes the form;
  - back and forward through `HistoryBack` keeps the edit.
- **`TextArea`** gets no separate test; the form tests cover it.

## Risks / Trade-offs

- **Switching days discards an open form.** → The form is small, and keeping drafts across days adds state for little gain. The behavior is in the spec, so it is deliberate.
- **The schema guard silently ignores an invalid change.** → The form validates with the same limits first, so the guard only catches programming errors. The reducer tests cover each guard.
- **Validating the whole trip on every edit** costs one `tripSchema` parse, which is microseconds for ≤ 14 days × 20 activities.
- **Edits are lost on reload** until step 14. → The "Trip not found" page already says trips last until reload. Step 14 adds auto-save through the same `save`.
- **Saving the initial trip on mount** writes an unchanged object. → Harmless with the in-memory store. Step 14 can skip a save when nothing changed if writes become costly.

## Migration Plan

Client only. No new dependencies, configuration or schema changes. To roll back, revert the commit.
