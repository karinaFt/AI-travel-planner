# Tasks

## 1. Shared trip preferences

- [x] 1.1 Add `shared/src/trip-preferences.ts` (`TRAVEL_STYLES`, `PACES`, `DEFAULT_PACE`, `INTEREST_LIMITS`, `interestSchema`, `tripPreferencesSchema` via `tripBasicsSchema.safeExtend`, `TripPreferences`, new `MESSAGES` entries with the spec texts) and export it from `src/index.ts`; add `trip-preferences.test.ts` covering origin (empty/whitespace → absent, 1 and 101 chars rejected, trimmed), style/pace enums, interests (0 and 10 accepted, 11 rejected, 1/41 chars rejected, case-insensitive duplicates rejected, items trimmed) and that the end-before-start rule still fires through the extended schema; verify `npm test -w shared` passes

## 2. Controls

- [x] 2.1 Add `RadioCardGroup` to `client/src/components/ui/` (fieldset + legend, hidden native radios inside label cards with title and description, checked and `has-[:focus-visible]` styles, error wired via `aria-describedby`); verify with RTL tests that options are grouped under the legend, arrow keys move the selection (user-event), and the error is announced with the group
- [x] 2.2 Add `client/src/features/trip-setup/format.ts` (`formatMoney`, `formatDate`, `plural`) moved from the summary, with unit tests (EUR, UAH with non-breaking space, singular/plural)

## 3. Form

- [x] 3.1 Extend `formSchema.ts` to trip preferences (raw `origin`, `travelStyle` with the specific "Choose a travel style" message for empty, `pace`, `interests: string[]`; output `TripPreferences`) and update its tests for the new fields
- [x] 3.2 Add `TravelStyleField`, `PaceField` (option copy per design D3) and `InterestsField` (Controller, add by Enter or button without submitting, remove per chip, local add errors, limit of 10 disables input and button, polite live region); verify each Interests list scenario from the spec with RTL tests, including that Enter does not submit the form
- [x] 3.3 Rename `TripBasicsForm` to `TripPreferencesForm`: add "Starting from (optional)" with its hint to "Where & when", update the budget hint to the budget-scope text, add the "Your style" section, rename the button to "Review trip", default pace balanced; update `testUtils` (`fillPreferences`, `validPreferences`) and the existing step 4 tests to the new button and required style; verify the "Form is shown", "Defaults", "Starting point", "Budget scope", "Travel style selection" and "Pace selection" scenarios with RTL tests (tampered pace via an injected radio value)

## 4. Review and draft retention

- [x] 4.1 Add `TripDraftProvider` around the outlet in `RootLayout`; make the form read `defaultValues` from it and write back through RHF `subscribe`; verify both "Draft retention" scenarios with RTL tests that navigate through the header links
- [x] 4.2 Replace `TripBasicsSummary` with `TripReview` (all rows per design D5, "Not specified" / "None", next-step note, "Edit details"), remove the hidden-form trick from `PlanPage`, keep focus moves (review heading in, destination back); verify the three "Valid submission" scenarios with RTL tests

## 5. Browser verification

- [x] 5.1 With `npm run dev` on `/plan`: complete the form by keyboard only (Tab into each radio group, arrows change the selection, focus ring visible on the card), add and remove interests with Enter and the buttons, confirm Enter in the interest input does not submit, reach the review, go to Home and back and see every value kept; no console errors; no horizontal scroll at 360px and 1440px; take screenshots of the form (with errors) and the review at 360px and 1440px for review

## 6. Documentation and checks

- [x] 6.1 Update `README.md` (the shared rules table gets starting point, style, pace, interests; layout lists the new trip-setup files and `RadioCardGroup`; note that the draft lives only for the tab session) and verify the documented commands run as written
- [x] 6.2 Run `npm ci`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` and `npx @fission-ai/openspec@latest validate add-trip-style-and-interests --strict`; verify all pass

## Workflow follow-up

- Archive the change and mark step 5 as done in `openspec/ROADMAP.md`.
