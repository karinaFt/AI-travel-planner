# Tasks

## 1. Reducer and form schema

- [x] 1.1 Add `client/src/features/editing/editTrip.ts` with `ActivityDraft`, `EditAction` and `editTrip` (design D2), plus `editTrip.test.ts` per design D8; verify it passes
- [x] 1.2 Add `activityFormSchema.ts` with the raw values, the add/edit initial values and the rules and messages from design D4, plus `activityFormSchema.test.ts` per design D8; verify it passes

## 2. Form and confirmation

- [x] 2.1 Add `client/src/components/ui/TextArea.tsx` styled with `inputStyles`, matching `TextInput`
- [x] 2.2 Add `ActivityForm.tsx` (design D4): fields in order, day options with full days disabled, focus on the title field on mount, Save/Add and Cancel, errors through `Field`
- [x] 2.3 Add `DeleteConfirmation.tsx` (design D5): a labelled group, focus on "Keep", Escape as Keep, danger-styled "Delete"

## 3. Trip page

- [x] 3.1 In `ItineraryView`, hold the trip in state changed only through `editTrip`, derive the costs from it, save it to the store after each change, and render the status region with `applyEdit` (design D3, D6); key `ItineraryView` by trip ID in `TripPage`
- [x] 3.2 In `ActivityItem`, add the "Edit" and "Delete" buttons with `data-activity-id`, the in-place form in edit mode and the delete confirmation (design D4, D5)
- [x] 3.3 In `DayTimeline`, add the `editing` state (one form at a time), "Add activity" after the list and with the empty message, the day-limit text (design D7), and the focus targets after save, move, delete and cancel (design D6)
- [x] 3.4 Add `client/src/features/editing/ActivityEditing.test.tsx` per design D8 and keep `ItineraryView.test.tsx`, `BudgetSummary.test.tsx` and `TripPage.test.tsx` passing; verify `npm test -w client` passes
- [x] 3.5 Mutation-check: temporarily make the reducer skip the `tripSchema` guard, sort with an unstable comparator that puts edited items first among equal times, and drop the trip currency override; confirm the matching tests fail; revert and verify all pass

## 4. Docs

- [x] 4.1 Update the README trip page section (editing, moving, adding, deleting, in-page delete confirmation, edits kept until reload) and the `client/src/features/` tree; in `openspec/ROADMAP.md` record the Editing decision as built (where the reducer and the form live, what step 14 has to do: swap the store and get auto-save on every edit)

## 5. End-to-end checks

- [x] 5.1 In a browser against a dev server pair started on free ports (never the user's own), with the free-tier key: generate a trip, then edit a cost, change a time, move an activity to another day, add one and delete one; check that the timelines, the budget summary and the cost-by-day table agree after each step; check the keyboard-only flow (focus after each action, Escape on the confirmation) and a 375 px viewport; no console errors

## 6. Checks

- [x] 6.1 Run `npm ci` (only when no dev server holds files in `node_modules`; otherwise `npm install` from the unchanged lockfile, and say so), `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`; ask the user to run `npx @fission-ai/openspec@latest validate add-activity-editing --strict`; verify all pass

## Workflow follow-up

- Archive the change and mark step 13 as done in `openspec/ROADMAP.md`; commit on `main` without pushing.
