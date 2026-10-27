# Design

## Context

After step 4:
- `shared/src/trip-basics.ts` holds `tripBasicsSchema` together with `MESSAGES`, `dateRangeError` and `whenBothDatesValid`.
- The client's `features/trip-setup/formSchema.ts` maps raw strings onto it and adds the "not in the past" rule.
- `TripBasicsForm` uses React Hook Form, `zodResolver` (resolvers 5.9.2), `mode: 'onTouched'` and `shouldFocusError`.
- `PlanPage` switches between `form` and `summary`, and keeps the form mounted but hidden so values survive "Edit details".
- UI primitives: `Field` (a render prop wiring `id`, `aria-describedby` and `aria-invalid`), `TextInput`, `DateInput`, `Select`, `Button` and `Card`.
- Tests use `testUtils.tsx` (`tripFields`, `fillBasics`, `validBasics`) and fake "today" set to 2026-10-21.
- `RootLayout` moves focus to the page `h1` on route change.

The roadmap records the field rules, including the "Starting from" decision of 2026-10-27.

## Goals / Non-Goals

**Goals:**
- One shared `tripPreferencesSchema` that the server (step 7) validates against.
- Accessible radio-card and tag-list controls that later steps can reuse.
- Draft retention that is simple and clearly scoped to the browser tab session.

**Non-Goals:**
- Persisting the draft in `sessionStorage` or `localStorage` (saved trips, step 13).
- A multi-step wizard. The form stays one page with three sections, followed by the review.
- Generating the itinerary, or any "Generate" button (step 9).

## Decisions

### D1. Shared schema: extend, don't fork
`shared/src/trip-preferences.ts`:
```ts
export const TRAVEL_STYLES = ['relaxation','adventure','culture','food','nature'] as const
export const PACES = ['relaxed','balanced','packed'] as const
export const DEFAULT_PACE = 'balanced'
export const INTEREST_LIMITS = { min: 2, max: 40, count: 10 }
export const tripPreferencesSchema = tripBasicsSchema.safeExtend({ origin, travelStyle, pace, interests })
```
- Zod 4 `.extend()` throws on schemas that carry refinements, which `tripBasicsSchema` does. `safeExtend()` keeps the existing date-range `superRefine` (with its `when`). It is present in the installed Zod (checked in `zod/v4/classic/schemas.d.ts` while planning). A task still verifies at runtime that the date-range rule fires through the extended schema.
- `origin`: `z.string().trim()` piped into either empty (transformed to `undefined`) or a 2–100 character string. The output type is `origin?: string`. On the wire, `undefined` and an absent key mean the same thing.
- `interests`: an array of the trimmed 2–40 character item schema, at most 10 items, with a `superRefine` that rejects duplicates ignoring case. The item schema is exported as `interestSchema`, so the client's add input reuses the same rules.
- New messages are added to `MESSAGES` with the exact spec texts. `tripBasicsSchema` stays exported; nothing else uses it, but its tests remain valid.
- Display labels and descriptions for styles and paces live in the **client** (UI copy), not in `shared`. They are not part of the contract.

### D2. Form schema and RHF values
The raw form values gain `origin: string`, `travelStyle: string` (`''` when nothing is chosen), `pace: string` and `interests: string[]`. The form schema pipes `travelStyle` and `pace` through the shared enums. An empty `travelStyle` gets "Choose a travel style" through a preprocess, so the message is the specific one and not a generic enum error.

The resolver output type becomes `TripPreferences`, and `onSubmit` receives normalized preferences.

### D3. Controls
- **`RadioCardGroup`** (`components/ui/`): a native `<fieldset>` + `<legend>` with visually hidden native `<input type="radio">` inside `<label>` cards. Native radios give arrow-key navigation, a single Tab stop and announcements for free, without a custom ARIA radiogroup. Each card shows a title and a one-line description. The checked card gets a teal border and a mint background, and the focus ring shows on the card when its hidden input has `:focus-visible` (`has-[:focus-visible]`). The error is wired to the fieldset through `aria-describedby`, and `aria-invalid` sits on the inputs. The group is registered through RHF `register` on each radio, which is native and needs no Controller.
- **`TravelStyleField`** and **`PaceField`** pass the options and their client-side copy:
  - Relaxation: "Slow mornings, spas, beaches";
  - Adventure: "Hikes, sports, adrenaline";
  - Culture: "Museums, history, architecture";
  - Food: "Markets, local dishes, tastings";
  - Nature: "Parks, views, outdoors";
  - Relaxed: "2–3 activities a day";
  - Balanced: "3–5 activities a day";
  - Packed: "5–7 activities a day".

  The counts match the generation prompt planned in the roadmap.
- **`InterestsField`** is an RHF `Controller` holding a `string[]`. It has a local text input plus an "Add" button and a list of chips, each with a remove button labeled "Remove {interest}". On add it validates the item with `interestSchema` and checks duplicates and the limit locally, then shows the add error under the input. That error is local state, not an RHF error, because it is about the text being typed, not the list. Enter in the input calls `preventDefault()` and adds, so it never submits the form. At 10 items the input and the button are disabled, with the hint "You can add up to 10 interests". A polite live region announces "Added street art" and "Removed street art".
- "Starting from" is a `TextInput` with the label "Starting from (optional)" and the hint "Where your trip begins, e.g. Kyiv. Used to plan arrival and departure days".
- Budget hint: "For the trip at your destination; getting there and back isn't included. Use a dot for decimals, e.g. 1500.50".

### D4. Draft retention: `TripDraftProvider`
- A context in `features/trip-setup/TripDraftProvider.tsx` (with the context and `useTripDraft` hook in `tripDraftContext.ts`, so the component file exports only components), rendered by `RootLayout` around the `<Outlet/>`. It lives as long as the SPA session in that tab.
- The provider holds the values in a **ref** and exposes a stable `{ get(), save(values) }` object, not React state. This was changed during implementation: with state, every keystroke would re-render every consumer, including `PlanPage` and the form, while the form only needs the draft when it mounts.
- `TripPreferencesForm` takes `initialValues` (from `draft.get()`) and `onValuesChange` (`draft.save`). It reports every change through RHF's `subscribe({ formState: { values: true }, callback })`, which doesn't re-render the form. The subscription is cleaned up on unmount.
- `PlanPage` no longer hides the form. It renders either the form or the review. "Edit details" mounts the form again from the draft, so values come back without the hidden-DOM trick. The page step (`form`/`review`) is local state, so returning to `/plan` always shows the form, as the spec requires.
- *Alternative*: `sessionStorage`. It would survive reloads, but the spec does not require that. It brings serialization and versioning questions, and step 13 introduces proper storage anyway.

### D5. Review step
`TripReview` replaces `TripBasicsSummary`. It is a definition list with these rows:
- Destination;
- Starting from ("Not specified" if absent);
- Dates;
- Length;
- Budget;
- Travelers;
- Style (display label);
- Pace (display label);
- Interests (comma-joined, or "None").

Below the list: "Next: we'll generate a day-by-day itinerary for you. Coming in the next step.", followed by "Edit details". Focus goes to the review heading on entry and to the destination input on return, as today. `formatMoney`, `formatDate` and `plural` move to `features/trip-setup/format.ts`, so the review stays lean and the helpers are testable.

### D6. Tests
- `shared`:
  - `trip-preferences.test.ts`: origin empty → absent, 1 or 101 characters rejected; style and pace enums; interests count, length, duplicates ignoring case and trimming;
  - the basics date-range rule still applies through the extended schema.
- `client`:
  - form schema tests for the new fields;
  - `RadioCardGroup` tests: group label, arrow-key selection with user-event, error wiring;
  - `InterestsField` tests: each spec scenario, including Enter not submitting;
  - `TripDraftProvider` and page tests for both draft retention scenarios, navigating with the header links;
  - review tests for both submission scenarios.
- Update `testUtils` with `fillPreferences` and `validPreferences`, and the step 4 tests that click "Continue" now use "Review trip". The basics field tests stay as they are, apart from the button name and the required travel style.

## Risks / Trade-offs

- [`safeExtend` might not carry the parent's refinements the way we expect] → A shared test asserts that "End date can't be before the start date" still fires through `tripPreferencesSchema`.
- [Hidden native radios lose their focus ring] → The card shows it via `has-[:focus-visible]`. This is verified in the browser task.
- [Draft writes on every keystroke] → `subscribe` avoids form re-renders. Context consumers other than the form don't read `values` while typing, so there are no wide re-renders.
- [The required travel style adds friction to the step 4 tests] → `testUtils.validPreferences` includes a style, so tests choose it once in a helper.
- [Free-text interests can carry prompt-injection text] → The server (step 7) passes them only inside a delimited data block and validates the output. This is noted in the roadmap.

## Migration Plan

There is no stored data. Users who had typed basics before the update lose nothing, because drafts were never persisted. Rollback means reverting the commit.
