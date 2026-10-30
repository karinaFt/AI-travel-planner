# Proposal

## Why

The form can collect and review trip preferences, and the API server now has a solid frame (config, error envelope, CORS, logging). What's still missing is the core of the product: turning those preferences into a day-by-day itinerary. This step adds that capability on the server, end to end from a validated request to a validated, normalized itinerary. The client starts calling it in step 9.

The project must stay **completely free to run**. Gemini's free tier covers this: an API key created in Google AI Studio for a project without billing is never charged. The trade-offs are lower rate limits and Google's right to use free-tier prompts to improve its products. The README will say both.

## What Changes

- **Shared itinerary contract** (`shared/`): the activity, day, itinerary and trip schemas from the roadmap.
  - Activity: `id` (UUID), `title` 1–120, `description` ≤ 1000, `category`, `startTime` `HH:mm`, `durationMinutes` an integer 5–1440, `estimatedCost` ≥ 0 with ≤ 2 decimals for the whole group, `currency`.
  - Day: `id`, `dayNumber`, `date`, `title`, `activities` sorted by start time.
  - Trip: `id`, `createdAt`, the normalized `preferences` and the `itinerary`. Steps 10 and 13 show and save this object as is.
  - The details shape of `VALIDATION_ERROR`: `{ fields: { "<path>": "<message>" } }`.
- **`POST /api/itineraries/generate`**:
  - accepts trip preferences validated with the shared `tripPreferencesSchema`; invalid input gets `400 VALIDATION_ERROR` with field messages;
  - returns `200 { "data": { "trip": … } }`.
- **Prompt**: built from the preferences, with user text passed as quoted data rather than instructions.
  - It asks for content only: day titles and activities.
  - When "Starting from" is given, it asks for a lighter first and last day and tips for getting from the arrival point. It never asks for flights, tickets or travel prices.
- **Gemini adapter** (`@google/genai`):
  - JSON output with a response schema that fixes the number of days;
  - a low thinking level;
  - the model from `GEMINI_MODEL` (default `gemini-3.5-flash-lite`: on the free tier, with more quota than the larger Flash models and, when tested on 2026-10-30, available while `gemini-3.8-flash` was overloaded).
  - Provider failures map to `503 AI_UNAVAILABLE` (rate limited or overloaded, including free-tier quota) or `502 AI_PROVIDER_ERROR` (anything else).
- **Validation and normalization**. Zod is the final authority on the model's output. The server:
  - assigns IDs, day numbers, dates and the trip currency;
  - trims text and rounds costs to cents;
  - sorts activities by start time;
  - maps unknown categories to `other`.
  - A wrong day count, unparsable JSON or any other schema failure gives `502 AI_INVALID_RESPONSE`, with no automatic retry.
- **Configuration**:
  - `GEMINI_API_KEY` is optional. Without it, the server starts and logs a warning, `/api/health` still works, and generation answers `503 AI_UNAVAILABLE`. Development, CI and UI work don't need a key.
  - `GEMINI_MODEL` is optional.
  - Both are documented in `server/.env.example` and never logged.
- **Node.js 22+**: Node 20 reached end of life in April 2026, and the `@google/genai` README announces Node 22+ as a requirement from SDK 3.0, so the next major upgrade won't need a platform change.
  - `engines` becomes `>=22.12.0`;
  - the server bundle targets `node22`;
  - the README prerequisite is updated.
- **Offline tests**: route, prompt, normalization and adapter tests use a fake model or a fake SDK client, never the network. One manual task checks a real call with a free key.

## Capabilities

### New Capabilities
- `itinerary-generation`: the generate endpoint, request validation, the itinerary contract, the prompt rules, model output validation and normalization, and how AI failures and a missing key are reported.

### Modified Capabilities
- `api-server`: "Configuration at startup" adds the optional `GEMINI_API_KEY` and `GEMINI_MODEL`.
- `build-tooling`: "Setup documentation" also explains how to get a free Gemini API key.

## Impact

- **New**:
  - `shared/src/itinerary.ts` (+ tests);
  - `server/src/ai/` (model port, Gemini adapter, prompt, response schema, normalization, + tests);
  - `server/src/routes/itineraries.ts` (+ tests).
- **Changed**:
  - `shared/src/api.ts` (`ValidationErrorDetails`);
  - `server/src/config.ts`, `server/src/app.ts` (inject the itinerary model), `server/src/index.ts` (build the Gemini adapter when a key is set);
  - `server/.env.example`;
  - root `package.json` (`engines`), `server/package.json` (esbuild target);
  - `README.md`.
- **Dependencies**: `@google/genai` (server, latest 2.x; 3.0 is not published yet). No paid services.
- **Out of scope**:
  - AI timeouts, rate limiting, the in-flight guard and the log-hygiene tests (step 8);
  - the client calling the endpoint (step 9);
  - displaying, editing or saving trips (steps 10–13);
  - streaming, retries and response caching.
