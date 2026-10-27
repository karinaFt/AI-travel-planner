# Tasks

## 1. Shared workspace

- [x] 1.1 Create `shared/` (`package.json` as `@travel-planner/shared` with `exports` to `./src/index.ts`, scripts `typecheck` and `test`; `tsconfig.json` without DOM libs; `src/index.ts`), add it to root `workspaces` before `client`, install `zod` and `date-fns` in `shared` and `"@travel-planner/shared": "*"` in `client`; verify `npm ci` links the package and `npm run typecheck` and `npm test` from the root run the `shared` scripts and exit 0
- [x] 1.2 Implement `shared/src/dates.ts` (`isIsoDate`, `tripLengthInDays`) and `shared/src/trip-basics.ts` (`CURRENCIES`, `CURRENCY_NAMES`, `LIMITS`, `MAX_TRIP_DAYS`, `tripBasicsSchema`, `TripBasics`) with the spec's messages; add `shared/src/trip-basics.test.ts` covering every boundary in design D6 and verify `npm test` passes
- [x] 1.3 Import `tripBasicsSchema` from `@travel-planner/shared` in a throwaway client test, run it under `npm test` and in `npm run dev` (import in a page, open it, check no Vite "outside of serving allow list" error), then remove the throwaway code; verify `npm run build` exits 0

## 2. Form controls

- [x] 2.1 Install `react-hook-form` and `@hookform/resolvers` in `client`; add `Field` (render prop with `id`, `aria-describedby`, `aria-invalid`), `inputStyles`, `TextInput`, `DateInput` and `Select` to `client/src/components/ui/`; add the `coral-text` on `surface` pair to the contrast test; verify with RTL tests that the label is associated, the hint and error are referenced by `aria-describedby`, and `aria-invalid` is set only when an error is passed

## 3. Trip basics form

- [x] 3.1 Implement `client/src/features/trip-setup/formSchema.ts` (raw strings → `TripBasics`, strict number regexes, local "not in the past" rule, spec messages) and unit-test it with `vi.setSystemTime` for each validation scenario in the spec (including `1e5`, `Infinity`, `12,5,0`, ` 1500.5 `, `two`, `2.5`, an unsupported currency)
- [x] 3.2 Build `TripBasicsForm` (RHF + `zodResolver`, `mode: 'onTouched'`, `reValidateMode: 'onChange'`, `shouldFocusError`, `noValidate`, defaults EUR and 1, end-date re-validation when the start date changes, "Where & when" and "Budget & travelers" sections, budget hint about the dot) and render it from `PlanPage`; verify with RTL tests the "Form is shown", "Defaults", "Untouched form", "Leaving a field", "Submitting an invalid form" (both errors, focus on destination) and "Correcting an error" scenarios
- [x] 3.3 Add RTL tests for the field-specific scenarios through the page (end before start, 14 vs 15 days with the message clearing when fixed, past start date, budget messages, travelers message, tampered currency via `fireEvent.change` on an injected option, pasted `1e400`) and verify they pass

## 4. Submission summary

- [x] 4.1 Build `TripBasicsSummary` and the `form | summary` page state (form stays mounted but hidden, summary heading focused, "Edit details" focuses destination); verify with RTL tests the "Summary after submitting" scenario (Lisbon, date range, "3 days", "€1,500.00", "2 travelers") and the "Editing after the summary" scenario with every value kept
- [x] 4.2 Update `App.test.tsx` and `RootLayout.test.tsx` for the new plan page (the placeholder text is gone; heading and title unchanged) and verify `npm test` passes

## 5. Browser verification

- [x] 5.1 With `npm run dev`, verify on `/plan`: keyboard-only completion of the form (Tab order follows the visual order, native date pickers open), errors appear on blur and clear while typing, focus jumps to the first invalid field on submit, valid submit shows the summary and "Edit details" restores the values, pasting junk into the numeric fields shows errors with no console errors, and no horizontal scroll at 360px and 1440px; take screenshots of the form with errors at 360px and 1440px for review

## 6. Documentation and checks

- [x] 6.1 Update `README.md` (project layout with `shared/`, a note that shared code is consumed as TypeScript source, and the trip basics rules in one short list) and verify the documented commands run as written
- [x] 6.2 Run `npm ci`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` and `npx @fission-ai/openspec@latest validate add-trip-form-basics --strict`; verify all pass

## Workflow follow-up

- Archive the change and mark step 4 as done in `openspec/ROADMAP.md`.
