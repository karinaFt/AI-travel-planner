# Design

## Context

What steps 6–7 left in place:
- `createApp({ config, log, itineraryModel?, extraRoutes? })` with request ID, logger (on `finish`), helmet, CORS, `jsonBody` (10 KB), the routes, the `/api` 404 and `errorHandler`;
- `POST /api/itineraries/generate`: validate → no model? `503` → one `model.generate(request, signal?)` → normalize. The `ItineraryModel` port already takes an optional `AbortSignal`, and the Gemini adapter passes it to the SDK as `abortSignal`. The SDK notes that aborting is client-side only: the service may still finish (and count) the request.
- `ERROR_CODES` already defines `GENERATION_IN_PROGRESS` (409), `RATE_LIMITED` (429) and `AI_TIMEOUT` (504).
- `errorHandler` currently writes unexpected errors with `console.error(error)`, message included.

The roadmap fixes the numbers: 5 per minute and 30 per hour per IP, one in-flight generation per IP, a 30 s server timeout. The 45 s client timeout belongs to step 9.

Requirements are in `specs/itinerary-generation`, `specs/api-server` and `specs/build-tooling`.

## Goals / Non-Goals

**Goals:**
- Protect the shared free-tier quota and the server from one noisy client, with clear, retryable errors.
- Never hold a generation slot longer than the timeout, whatever the SDK does.
- Tests that fail if a body, a prompt, model output or the key ever reaches the logs.

**Non-Goals:**
- Distributed or persistent limits (one process, memory store), authentication, CAPTCHAs.
- Retrying timed-out or failed generations.
- Client-side timeout and cancel (step 9).

## Decisions

### D1. Layout
```
server/src/http/rate-limit.ts    generationRateLimit(limits): RequestHandler[]   (express-rate-limit)
server/src/http/in-flight.ts     createInFlightGuard(): { tryAcquire(key): (() => void) | undefined }
server/src/protection.ts         GENERATION_LIMITS = { perMinute: 5, perHour: 30, timeoutMs: 30_000 }
server/src/log-hygiene.test.ts   end-to-end log checks across success and error paths
```
`createApp` gains a test-only `generationLimits?: Partial<GenerationLimits>` (like `extraRoutes`). Tests can then use a 50 ms timeout or an hourly limit of 3 without fake timers. Production never passes it. Every `createApp` call builds its own limiter stores and guard, so tests don't share state.

### D2. Rate limiting
- **Limiters:** two `express-rate-limit` instances, `{ windowMs: 60_000, limit: 5 }` and `{ windowMs: 3_600_000, limit: 30 }`.
- **Store and key:** the default memory store and the default key (`req.ip`, which the library groups by IPv6 subnet).
- **Mounting:** `app.post('/api/itineraries/generate', ...generationRateLimit(limits))`, after CORS and **before** `jsonBody`. Malformed, oversized or wrong-type bodies therefore count too ("every request, valid or not"). Preflight `OPTIONS` and other routes are never counted.
- **Headers:** `standardHeaders: 'draft-8'` sends the `RateLimit` and `RateLimit-Policy` headers, and `legacyHeaders: false`.
- **Handler:** a custom `handler` sets `Retry-After` to the whole seconds until `req.rateLimit.resetTime` (at least 1) and calls `next(new AppError('RATE_LIMITED'))`. The response then uses the normal envelope, request ID and log `code`.
- **Validation check:** `validate: { xForwardedForHeader: false }`. With `TRUST_PROXY=0`, an `X-Forwarded-For` header is expected noise (or a spoofing attempt), not a misconfiguration, and the library's console warning would be log noise.
- *Alternative considered:* a hand-written sliding window. It's ~40 lines, but `express-rate-limit` is the standard choice, is tested, handles IPv6 subnets and the headers, and is free.

### D3. One generation at a time
- `createInFlightGuard()` keeps a `Set<string>` of client keys.
- `tryAcquire(key)` returns a `release` function, or `undefined` if the key is busy. `release` is idempotent.
- In the route, after validation and the no-model check: `const release = guard.tryAcquire(req.ip)`. If it's busy, the route throws `AppError('GENERATION_IN_PROGRESS')`. Otherwise it runs `try { … } finally { release() }`.
- Invalid requests (400) and the no-key case (503) never take a slot.

### D4. Timeout and client disconnect
- **Signal:** per request, `const clientGone = new AbortController()` and `signal = AbortSignal.any([clientGone.signal, AbortSignal.timeout(timeoutMs)])`.
- **Disconnect:** `res.on('close', () => { if (!res.writableEnded) clientGone.abort() })`.
- **Racing the model:** `generateTrip(preferences, model, { signal })` passes the signal to the model **and** races the model's promise against it (`abortable(promise, signal)`). A model or SDK that ignores the signal still can't hold the slot past the timeout.
- **Mapping the abort:**
  - If the race loses to the signal, or the adapter sees `signal.aborted`, the error becomes `AppError('AI_TIMEOUT')`.
  - The Gemini adapter checks `signal?.aborted` before mapping SDK errors, so an abort never shows up as `AI_PROVIDER_ERROR`.
- **Client already gone:** the route checks `clientGone.signal.aborted` in its `catch`. If set, it returns without responding (the socket is closed), and the `finally` releases the slot. Nothing is logged as an error.
- **Logging an abandoned request:** the request logger also listens to `close`. If the response never finished, it logs one line with `aborted: true` instead of `status`. A `logged` flag prevents a second line.

### D5. `TRUST_PROXY`
- **Value:** an integer from 0 to 10, default 0. Blank counts as unset. The error is "TRUST_PROXY must be a whole number of proxies from 0 to 10".
- **Express setting:** `app.set('trust proxy', config.trustProxy)`. 0 means "trust nothing", so `req.ip` is the socket address. N means trust the last N hops of `X-Forwarded-For`. A boolean `true` isn't allowed: it would trust any client-supplied header and defeat the limits.
- **In development:** the Vite proxy doesn't add `X-Forwarded-For`, so all requests come from the loopback address. That's fine for one developer.

### D6. Log hygiene
- **`errorHandler` becomes `createErrorHandler(log)`.** For unexpected errors it writes `log({ event: 'error', requestId, name, stack })`.
  - `stack` holds only the `at …` frames of `error.stack`, so the message line is dropped.
  - A non-`Error` throwable is logged as `name: 'NonError'` without a stack.
  - `console.error` is no longer used.
  - Errors go through the same JSON line logger, so tests capture them with the injected `write`.
- **What is logged and when:**
  - Expected `AppError`s (AI failures included) log nothing extra; the request line's `code` is enough.
  - The adapter never logs provider text.
  - The prompt and model output are never logged anywhere.
- **`log-hygiene.test.ts`:** drives `createApp` with markers:
  - a destination `Zanzibar-marker-41`;
  - a fake model whose output contains `model-output-marker-77`, or that throws `new Error('provider leak marker-93')`;
  - an API key `key-marker-55`.

  It covers success, validation failure, invalid AI output, an unexpected model error, a timeout and a rate-limited request. It collects every logger line plus `console.error`, `console.warn` and `console.log` spies, then asserts:
  - no marker appears;
  - the system prompt's opening sentence doesn't appear;
  - each request produced exactly one request line.

### D7. README security notes
A "Security" section replaces the current two bullets:

| Protection | Value |
|---|---|
| rate limit on generate | 5/min and 30/h per IP, `429` + `Retry-After` |
| one generation at a time per IP | `409` |
| AI timeout | 30 s, `504` |
| body limit | 10 KB JSON only |
| CORS | allow-list, browsers only |
| helmet headers | — |
| log hygiene | — |
| `TRUST_PROXY` | when to set it |

Then "What this does not protect against":
- limits are in memory, per process and reset on restart;
- several instances don't share them;
- many users behind one NAT share a limit, and attackers can rotate IPs;
- non-browser clients ignore CORS;
- there are no accounts or authentication;
- the free tier's own quota still applies.

It ends with: "These measures reduce abuse and accidents; they do not make the app fully secure."

### D8. Tests
- **`http/rate-limit.test.ts`** (Supertest with `createApp` and a fake model):
  - the 6th request in a minute → 429 with `Retry-After` ≥ 1 and the model not called;
  - an invalid-JSON request counts toward the limit;
  - an hourly limit of 3 via `generationLimits` → the 4th → 429;
  - health is unaffected;
  - another IP is accepted (with `TRUST_PROXY=1` and different `X-Forwarded-For`);
  - with `TRUST_PROXY=0`, different `X-Forwarded-For` values share one bucket.
- **`http/in-flight.test.ts`:**
  - guard unit tests: acquire, busy, release is idempotent;
  - route tests with a deferred fake model: the second request → 409 and the model called once; after the first resolves, the next request reaches the model; after a 502, the slot is free; another IP is not blocked.
- **`routes/itineraries.test.ts`** gains:
  - timeout (`timeoutMs: 50`, a model that never resolves): 504 `AI_TIMEOUT`, the signal aborted, the slot released;
  - disconnect: a raw `http` request to `app.listen(0)`, destroyed mid-generation, leads to the signal aborted, the slot released, no error line and one `aborted: true` line.
- **`ai/gemini.test.ts`:** an aborted signal plus an SDK `AbortError` → `AI_TIMEOUT`, not `AI_PROVIDER_ERROR`.
- **`config.test.ts`:** `TRUST_PROXY` default, valid values 0, 1 and 10, invalid values (`yes`, `-1`, `11`, `1.5`) not echoed.
- **`app.test.ts`:** the 500 test now asserts one `event: 'error'` line with name and frames, and no message.
- **`log-hygiene.test.ts`** as in D6.

## Risks / Trade-offs

- **Memory store, per process.** A restart resets the counters, and several instances don't share them. → That's acceptable for a single-process free deployment, and the README says so. A shared store is out of scope.
- **Shared IPs (NAT, office, mobile carrier) share a limit.** → The limits are generous for one person; the README explains it.
- **An aborted Gemini call may still count against the free quota.** The SDK abort is client-side only. → The timeout still frees the slot and answers the user; the rate limit caps the waste.
- **A wrong `TRUST_PROXY` behind a real proxy puts every user in one bucket.** → The README explains when to set it, and the default is safe (spoof-proof).
- **Racing the model promise leaves the losing promise running.** → It's settled and ignored, and we abort it via the signal, so nothing is leaked beyond the SDK's own request.

## Migration Plan

Run `npm install` (adds `express-rate-limit`). Set `TRUST_PROXY` only when deploying behind a reverse proxy. No data or client changes. To roll back, revert the commit.
