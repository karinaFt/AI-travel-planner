# Tasks

## 1. Shared contract

- [x] 1.1 Add `shared/src/day-brief.ts`: block schemas and `dayBriefBlockSchema` (discriminated union), `dayBriefSchema` with the singleton refine, `dayBriefResultSchema`, `dayBriefRequestSchema` with the 160-character description and unique IDs, `activitySignature` (FNV-1a), `BRIEF_LIMITS` for lengths (design D2, D3); export from `shared/src/index.ts`
- [x] 1.2 Add optional `brief` to `daySchema` in `shared/src/itinerary.ts`
- [x] 1.3 Add `day-brief.test.ts` and extend `itinerary.test.ts` per design D11 (block validity, image hosts, singletons, old trip still valid, signature fields); verify `npm test -w shared` passes

## 2. Server: brief generation

- [x] 2.1 Add `server/src/ai/brief-prompt.ts` with `a1..aN` keys and the rules from design D4, and `brief-prompt.test.ts` (no UUIDs in either string, rules present, data JSON-encoded)
- [x] 2.2 Add `brief-response-schema.ts` (flat Gemini JSON Schema and lenient `aiBriefSchema`, design D5) and its test
- [x] 2.3 Add `brief-normalize.ts` (key mapping, per-block validation, route step pruning, singletons, cap, zero → `AI_INVALID_RESPONSE`) and `brief-normalize.test.ts`
- [x] 2.4 Add `server/src/photos/wikipedia.ts` (`createPhotoFinder({ fetch })`, one Action API request, 3 s timeout, host check, 500-entry cache including misses, design D6) and its test with a fake `fetch`
- [x] 2.5 Add `generate-brief.ts` (prompt → model with `abortable` → normalize → photo for the highlight) and its test with a fake model and photo finder

## 3. Server: route, limits, headers

- [x] 3.1 Move `fieldErrors` and the close/timeout abort wiring out of `routes/itineraries.ts` into `server/src/http/` helpers; verify the itineraries tests pass unchanged
- [x] 3.2 Generalize `generationRateLimit` to `rateLimits({ perMinute, perHour })`; add `BRIEF_LIMITS` (10/min, 60/hour) to `protection.ts`
- [x] 3.3 Add `routes/day-briefs.ts` and wire it in `app.ts` with its own rate limit (mounted before `jsonBody`), its own in-flight guard and the photo finder; add test-only overrides for brief limits like `generationLimits`
- [x] 3.4 Set the helmet CSP `img-src` to `'self' data: https://upload.wikimedia.org https://thumb.wikimedia.org` (design D7)
- [x] 3.5 Add `routes/day-briefs.test.ts` per design D11 (200 shape, 400, 503, 409, brief and generation in parallel, 504 releases the slot, 429 and generation still allowed), the CSP header test, and extend `log-hygiene.test.ts`; verify `npm test -w server` passes

## 4. Client: data and state

- [x] 4.1 `npm install lucide-react -w client`
- [x] 4.2 Add `client/src/api/dayBriefs.ts` (`createDayBrief`, 90 s timeout, parse with `dayBriefResultSchema`) and its test
- [x] 4.3 Add the `setBrief` action to `editTrip.ts` and tests (replaces the brief, keeps activities, invalid brief returns the same trip, activity edits keep `brief`)
- [x] 4.4 Add `features/day-brief/useDayBrief.ts` (design D8), `messages.ts` (reusing `waitText` and `NETWORK_MESSAGE`) and `dayBudget.ts` with tests (shares, free row, rounding)

## 5. Client: UI

- [x] 5.1 Add `ActivityLink.tsx` and give `ActivityItem`'s `<li>` its anchor ID and `tabIndex={-1}` (design D10)
- [x] 5.2 Add `registry.tsx` and the blocks `HighlightBlock` (photo, credit, `onError` fallback), `RouteTimeline`, `TipCard`, `BookingCard`, `BudgetTable` (design D9)
- [x] 5.3 Add `DayBriefSkeleton.tsx` and `DayBrief.tsx` (button, loading, live region, errors with countdown and retry, card with created time, stale notice, "Update overview")
- [x] 5.4 Render `DayBrief` in `DayTimeline.tsx` between the heading block and the list; capture `basedOn` before the request and save via `onEdit({ type: 'setBrief', ... })`
- [x] 5.5 Add `DayBrief.test.tsx` per design D11 (button visibility, no request on open, loading, saved and reloaded, order and unknown type, image fallback, budget table, links and flash, deleted activity as text, stale notice, update and failed update, abort on day switch, 429 countdown); verify `npm test -w client` passes
- [x] 5.6 Mutation check: temporarily (a) skip key mapping, (b) fail the whole brief on one invalid block, (c) compute `basedOn` after the response, (d) share the in-flight guard with generation; confirm the matching tests fail; revert and verify all pass

## 6. Docs

- [x] 6.1 Update README (Day overview, the `/api/days/brief` endpoint and its limits, Wikipedia photos and attribution, CSP, `features/day-brief` in the tree) and add step 15 `add-day-brief` with its decisions to `openspec/ROADMAP.md`

## 7. End-to-end checks

- [ ] 7.1 In a browser against a dev server pair on free ports (never the user's own 3001/5173), with the free-tier key: create an overview for one day, check the photo or fallback, the route, tips and booking cards, the budget table, and jumping to an activity; reload and see it without a new request; edit an activity and see the stale notice; update it; switch days during loading and check that nothing is saved; a 375 px viewport and keyboard-only flow (ask the user if the window can't be resized); no console errors
- [x] 7.2 Run the built app with `npm start` (`CLIENT_DIR` set) on a free port and confirm the Wikimedia photo loads under the CSP with no CSP violations in the console

## 8. Checks

- [ ] 8.1 Run `npm ci` (only when no dev server holds files in `node_modules`; otherwise `npm install` from the updated lockfile, and say so), `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`; ask the user to run `npx @fission-ai/openspec@latest validate add-day-brief --strict`; verify all pass

## Workflow follow-up

- Archive the change and mark step 15 as done in `openspec/ROADMAP.md`; commit on the current branch without pushing.
