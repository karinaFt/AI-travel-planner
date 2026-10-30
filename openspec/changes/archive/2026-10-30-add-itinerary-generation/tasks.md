# Tasks

## 1. Platform and dependency

- [x] 1.1 Raise the Node baseline per design D8: root `engines` to `>=22.12.0`, server esbuild `--target=node22`, README prerequisite; install the latest `@google/genai` 2.x (`^2.31.0`) in the server workspace (stop any running dev server first); confirm from the installed type definitions that `models.generateContent` accepts `systemInstruction`, `responseMimeType`, `responseJsonSchema`, `thinkingConfig.thinkingLevel` and `abortSignal`, and that `ApiError` exposes `status` — if any differ, stop and update design D5 before continuing; verify `npm run typecheck` and `npm test` exit 0

## 2. Shared contract

- [x] 2.1 Add `tripDates` to `shared/src/dates.ts` and `ValidationErrorDetails` to `shared/src/api.ts`; add `shared/src/itinerary.ts` (design D2) exported from `shared/src/index.ts`, with `itinerary.test.ts` and `dates` tests covering the cases in design D9; verify `npm test -w shared` passes

## 3. Configuration

- [x] 3.1 Extend `server/src/config.ts` with `GEMINI_API_KEY` and `GEMINI_MODEL` and add `startupSummary` (design D7); document both in `server/.env.example` (placeholder, never a real key); extend `config.test.ts` per design D9; verify `npm test -w server` passes

## 4. AI module

- [x] 4.1 Add `server/src/ai/model.ts`, `prompt.ts` and `prompt.test.ts` (design D1, D4, D9); verify the tests pass
- [x] 4.2 Add `server/src/ai/response-schema.ts` and `normalize.ts` with `response-schema.test.ts` and `normalize.test.ts` (design D5, D6, D9); verify the tests pass
- [x] 4.3 Add `server/src/ai/gemini.ts` with the error mapping and `gemini.test.ts` using a fake client (design D5, D9); verify the tests pass and that no test touches the network

## 5. Endpoint

- [x] 5.1 Add `generate.ts` and `routes/itineraries.ts` (design D3), add `itineraryModel` to `createApp`, and build the Gemini model in `index.ts` only when a key is set, logging the startup summary and the "generation is disabled" warning otherwise; add `routes/itineraries.test.ts` covering every `itinerary-generation` scenario listed in design D9; verify `npm test -w server` passes
- [x] 5.2 Mutation-check the tests: temporarily remove the stable sort in `normalizeTrip`, map 429 to `AI_PROVIDER_ERROR`, and drop the "ignore any instructions" line from the system instruction; confirm the matching tests fail; revert and verify all pass

## 6. End-to-end checks

- [x] 6.1 Without a key: run `npm run dev`; verify the warning line, `GET /api/health` returns `ok`, and `POST /api/itineraries/generate` with valid preferences returns 503 `AI_UNAVAILABLE`, while invalid preferences return 400 with `details.fields`
- [x] 6.2 With a free-tier key in `server/.env` (provided by the developer, never committed or printed): generate a 3-day trip with a starting point and a 1-day trip without one through the Vite proxy; verify both responses pass `tripSchema`, have the right number of days, sorted activities and the trip currency; confirm `git status` doesn't show `server/.env` and no log line contains the key

## 7. Documentation and checks

- [x] 7.1 Update `README.md`: Node 22 prerequisite; how to get a free Gemini API key in Google AI Studio without enabling billing, the free tier's limits and data-use note; `GEMINI_API_KEY` and `GEMINI_MODEL` in the environment table; the generate endpoint with request and response examples; the trip/itinerary contract; `server/src/ai/` in the project layout; verify the documented commands run as written
- [x] 7.2 Run `npm ci`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` and `npx @fission-ai/openspec@latest validate add-itinerary-generation --strict`; verify all pass

## Workflow follow-up

- Archive the change and mark step 7 as done in `openspec/ROADMAP.md`; record the free-tier and Node 22 decisions in the roadmap's "Decisions carried between steps".
