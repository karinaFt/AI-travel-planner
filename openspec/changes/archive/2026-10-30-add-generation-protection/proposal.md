# Proposal

## Why

`POST /api/itineraries/generate` now calls Gemini on the free tier, which has small per-minute and per-day quotas shared by the whole project. Nothing currently stops one client, a buggy retry loop or a script from burning the day's quota in minutes, or from starting several slow generations at once. There is also no limit on how long a call may take: on 2026-10-30, `gemini-3.8-flash` hung for over 60 seconds on a trivial prompt.

This step adds the protections the roadmap planned for the generate endpoint, checks that logs never leak sensitive data, and documents honestly what these measures do and don't protect against.

## What Changes

- **Rate limiting** on `POST /api/itineraries/generate`: at most 5 requests per minute and 30 per hour per client IP. More answers `429 RATE_LIMITED` with a `Retry-After` header. Other routes such as `/api/health` are not limited.
- **One generation at a time per IP**: a second valid request while one is running answers `409 GENERATION_IN_PROGRESS`. The slot is released when the generation ends, however it ends.
- **AI timeout**: a generation that takes longer than 30 seconds is aborted and answers `504 AI_TIMEOUT`.
- **Client disconnect**: if the client goes away mid-generation, the AI call is aborted and the slot released, so a cancelled request doesn't hold the slot until the timeout.
- **`TRUST_PROXY`** (optional, default `0`): the number of reverse proxies in front of the API, so the client IP is read correctly behind one. With the default, `X-Forwarded-For` is ignored and can't be used to dodge the limits.
- **Log hygiene**:
  - tests prove that request bodies, prompts, model output and the API key never appear in logs, including on error paths;
  - unexpected errors are logged as one JSON line with the request ID, error name and stack frames, without the error message, which could carry data.
- **Security notes in the README**: what is protected (rate limit, in-flight guard, timeout, body limit, CORS, headers, log hygiene), and the limits:
  - limits are in memory, per process and reset on restart;
  - IPs can be shared or rotated;
  - CORS restricts browsers only;
  - there is no authentication.

  It states plainly that these measures do not make the app fully secure.

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `itinerary-generation`: adds "Generation rate limit", "One generation at a time", "AI timeout" and "Client disconnect".
- `api-server`:
  - "Configuration at startup" adds `TRUST_PROXY`;
  - "Request logging" adds that prompts, model output and secrets are never logged, and that abandoned requests are logged with `aborted: true`;
  - adds "Unexpected error logging".
- `build-tooling`: adds "Security notes".

## Impact

- **New**:
  - `server/src/http/rate-limit.ts`;
  - `server/src/http/in-flight.ts`;
  - `server/src/protection.ts` (the limit values);
  - tests for both;
  - `server/src/log-hygiene.test.ts`.
- **Changed**:
  - `server/src/config.ts` (`TRUST_PROXY`);
  - `server/src/app.ts` (`trust proxy`, limiter, in-flight guard);
  - `server/src/routes/itineraries.ts` (guard, timeout and disconnect signal);
  - `server/src/ai/gemini.ts` (abort → `AI_TIMEOUT`, or a quiet cancel);
  - `server/src/http/errors.ts` (message-free error log);
  - `server/.env.example`;
  - `README.md`.
- **Dependencies**: `express-rate-limit` (server). Free, in-memory store, no external service.
- **Out of scope**:
  - the client's 45-second timeout and cancel button (step 9);
  - shared or persistent rate-limit stores (Redis and similar), authentication, CAPTCHAs, per-user quotas;
  - retrying after a timeout.
