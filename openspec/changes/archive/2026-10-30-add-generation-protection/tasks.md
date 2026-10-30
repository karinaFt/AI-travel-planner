# Tasks

## 1. Configuration and dependency

- [x] 1.1 Install `express-rate-limit` (latest 8.x) in the server workspace; add `TRUST_PROXY` to `server/src/config.ts` (design D5) and `server/.env.example`; apply it with `app.set('trust proxy', …)` in `createApp`; extend `config.test.ts` per design D8; verify `npm test -w server` passes

## 2. Log hygiene foundation

- [x] 2.1 Replace `errorHandler` with `createErrorHandler(log)` writing the message-free `event: 'error'` line (design D6); make the request logger write one `aborted: true` line for abandoned requests (design D4); update `app.test.ts` for the new error line and add an abandoned-request logger test; verify `npm test -w server` passes

## 3. Protections

- [x] 3.1 Add `server/src/protection.ts` and `server/src/http/rate-limit.ts`, mount the limiter on `POST /api/itineraries/generate` before `jsonBody`, and add the test-only `generationLimits` option to `createApp` (design D1, D2); confirm from the installed package that the custom `handler`, `req.rateLimit.resetTime`, `standardHeaders: 'draft-8'` and `validate.xForwardedForHeader` behave as designed — if not, stop and update design D2; add `http/rate-limit.test.ts` per design D8; verify the tests pass
- [x] 3.2 Add `server/src/http/in-flight.ts` and use it in the generate route (design D3); add `http/in-flight.test.ts` per design D8; verify the tests pass
- [x] 3.3 Add the timeout and disconnect signal, `abortable` in `generateTrip`, the adapter's abort → `AI_TIMEOUT` mapping and the silent return for a gone client (design D4); add the timeout, disconnect and adapter tests from design D8; verify the tests pass and that a timed-out or abandoned request releases its slot
- [x] 3.4 Add `server/src/log-hygiene.test.ts` (design D6); verify it passes
- [x] 3.5 Mutation-check the tests: temporarily raise the per-minute limit to 50, remove the `finally { release() }`, drop the `abortable` race, and log `error.message` in the error line; confirm the matching tests fail; revert and verify all pass

## 4. End-to-end checks

- [x] 4.1 With `npm run dev` and no key: send 6 generate requests through the Vite proxy within a minute and verify the 6th gets 429 `RATE_LIMITED` with `Retry-After`, while `/api/health` still returns `ok`; confirm the log lines carry `code: "RATE_LIMITED"` and no bodies
- [x] 4.2 With the free-tier key in `server/.env`: generate one trip successfully; start a generation and, while it runs, send a second one from another terminal and verify 409 `GENERATION_IN_PROGRESS`; abort a running request with Ctrl+C on curl and verify an `aborted: true` log line and that the next request is accepted; confirm no log line contains the key

## 5. Documentation and checks

- [x] 5.1 Rewrite the README security section per design D7 and add `TRUST_PROXY` to the environment table; verify the documented values match the code constants
- [x] 5.2 Run `npm ci`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` and `npx @fission-ai/openspec@latest validate add-generation-protection --strict`; verify all pass

## Workflow follow-up

- Archive the change and mark step 8 as done in `openspec/ROADMAP.md`.
