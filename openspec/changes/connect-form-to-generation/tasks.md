# Tasks

## 1. API client

- [x] 1.1 Add `client/src/api/http.ts` (`postJson`, `ApiResult`, `ApiFailure`) and `client/src/api/itineraries.ts` (`generateItinerary`, `CLIENT_TIMEOUT_MS = 45_000`) per design D2, plus `tripFixture()` in `client/src/test/`; add `http.test.ts` and `itineraries.test.ts` per design D8; verify `npm test -w client` passes

## 2. Generation state and messages

- [x] 2.1 Add `features/generation/messages.ts` (design D3) with `messages.test.ts`; verify it passes
- [x] 2.2 Add `useGeneration` (design D4), `GenerationStatus` and `GenerationError` (design D5); verify typecheck passes

## 3. Trip store and page

- [x] 3.1 Add `TripStoreProvider`/`useTripStore` and `TripPage`, mount the provider in `RootLayout` and the `/trips/:id` route in `App.tsx` (design D6); add the not-found tests from design D8; verify they pass

## 4. Wire the review

- [x] 4.1 Replace the "coming soon" note in `TripReview` with the generate footer, and use `useGeneration` in `PlanPage` with save-and-navigate on success (design D4–D6); update existing trip-setup tests that expected the note; add the generation flow and success tests from design D8; verify `npm test -w client` passes
- [x] 4.2 Mutation-check: temporarily remove the abort in the unmount clean-up, drop the `Retry-After` countdown, and skip `tripSchema` parsing; confirm the matching tests fail; revert and verify all pass

## 5. Preview proxy and docs

- [x] 5.1 Share the `/api` proxy between `server.proxy` and `preview.proxy` in `client/vite.config.ts` (design D7); update the README (the generate flow, `/trips/:id` kept only until reload, and that `npm run preview` proxies `/api`)

## 6. End-to-end checks

- [x] 6.1 In a browser against a dev server pair started on free ports (never the user's own), with no API key: generate from the review and verify the busy message, Try again and Edit details with values kept; send 5 more and verify the 429 countdown; verify keyboard focus moves to Cancel and to the error heading
- [x] 6.2 With the free-tier key: generate a trip and verify `/trips/:id` shows the destination, dates, length and day titles; cancel a running generation and verify the cancelled notice; reload `/trips/:id` and verify "Trip not found"; no console errors
- [x] 6.3 Run `npm run build`, then `npm run preview` with the API running, and verify `/api/health` through the preview URL

## 7. Checks

- [x] 7.1 Run `npm ci`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`; ask the user to run `npx @fission-ai/openspec@latest validate connect-form-to-generation --strict`; verify all pass

## Workflow follow-up

- Archive the change and mark step 9 as done in `openspec/ROADMAP.md`; commit on `main` without pushing.
