# AI Travel Planner — MVP Roadmap

This is the working plan for the MVP. It is **not** an OpenSpec artifact. Each row becomes its own OpenSpec change, proposed just before it is implemented:

```
/opsx:propose <name>  →  review  →  /opsx:apply <name>  →  /opsx:archive <name>  →  next row
```

Update this file when a step is archived or the plan changes.

## Architecture

```
repo root (npm workspaces)
├─ client/   React 19 + Vite + TypeScript + Tailwind, React Router, React Hook Form, Zod, date-fns, Vitest + RTL
├─ server/   Node + TypeScript + Express, @google/genai (Gemini), dotenv, Zod
├─ shared/   isomorphic Zod schemas and types (trip preferences, itinerary, API envelope, money)
└─ openspec/ specs and changes
```

Request flow: `client → POST /api/itineraries/generate → server → Gemini → server (validate + normalize) → client`.
Persistence: browser localStorage only. No database, no auth.

## Steps

| # | Change | Outcome                                                                                                        | Status |
|---|---|----------------------------------------------------------------------------------------------------------------|---|
| 1 | `restructure-to-client-folder` | Frontend moved to `client/` as an npm workspace; root scripts unchanged                                        | done (archived 2026-10-21) |
| 2 | `add-routing-and-rename` | "AI Travel Planner" name, React Router, header nav, not-found page                                             | done (archived 2026-10-21) |
| 3 | `add-design-foundation` | Tailwind tokens, fonts, UI primitives, website color palette – light, modern, pleasant colors, landing page    | done (archived 2026-10-21) |
| 4 | `add-trip-form-basics` | `shared/` workspace with trip preferences schema; form: destination, dates, budget, currency, travelers<br/>        | done (archived 2026-10-22) |
| 5 | `add-trip-style-and-interests` | Optional "Starting from", style, pace, interests, review step, draft retention                                 | done (archived 2026-10-27) |
| 6 | `add-api-server` | `server/` workspace: Express, env config, `/api/health`, error envelope, CORS, helmet, `npm run dev` runs both | done (archived 2026-10-27) |
| 7 | `add-itinerary-generation` | Itinerary schema, prompt, Gemini adapter, output validation and normalization, generate endpoint               | done (archived 2026-10-30) |
| 8 | `add-generation-protection` | Rate limit, one in-flight generation per client, timeouts, log hygiene, security notes in README               | done (archived 2026-10-30) |
| 9 | `connect-form-to-generation` | API client, loading, error, retry and cancel states, form values kept on failure                               | done (archived 2026-10-30) |
| 10 | `add-itinerary-view` | `/trips/:id`: summary, day tabs, timeline, activity details, cost totals, empty and not-found states           | done (archived 2026-10-30) |
| 11 | `add-budget-summary` | Budget, estimated, remaining or over budget, cost by day, exact money math                                     | done (archived 2026-10-30) |
| 12 | `add-deployment` | One free Render web service (Blueprint) serving the API and the built client; warm-up, slow notice, 90 s client timeout | done (archived 2026-10-31) |
| 13 | `add-activity-editing` | Add, edit, delete and move activities via a pure validated reducer                                             | |
| 14 | `add-saved-trips` | localStorage repository, auto-save, `/trips` list, delete, corrupted-data and quota handling, cross-tab sync   | |

## Decisions carried between steps

These were agreed during planning. Re-check each one when proposing the step it belongs to.

- **Trip preferences (steps 4–5):**
  - destination 2–100 characters, trimmed;
  - "Starting from" (step 5, decided 2026-10-27): optional free text, no dropdown or places API. When filled, it must be 2–100 characters after trimming; empty means not provided. It only helps the AI plan arrival and departure days. The trip budget does not include getting to and from the destination, and the form says so;
  - ISO `YYYY-MM-DD` date strings end to end, with end ≥ start and at most 14 days;
  - "not in the past" is a client-only rule;
  - budget > 0 and ≤ 10,000,000 with ≤ 2 decimals;
  - currencies USD, EUR, GBP, UAH, PLN, CZK, CHF, JPY, CAD, AUD (default EUR);
  - travelers an integer 1–20 (default 1);
  - style relaxation | adventure | culture | food | nature (required, no default);
  - pace relaxed | balanced | packed (default balanced);
  - interests: up to 10, 2–40 characters each, unique ignoring case.
- **Numeric inputs** are `type="text"` with `inputMode`, so invalid text such as `abc` or `1e400` is visible to validation.
- **Activity model (step 7):**
  - `id` (UUID), `title` 1–120, `description` ≤ 1000;
  - `category`: sightseeing | culture | food | nature | adventure | relaxation | shopping | nightlife | transport | other;
  - `startTime` `HH:mm`, `durationMinutes` an integer 5–1440;
  - `estimatedCost` ≥ 0 with ≤ 2 decimals, for the whole group;
  - `currency`.
- **Itinerary model:** days carry `id`, `dayNumber`, `date`, `title` and `activities`.
- **AI contract (step 7):**
  - the model returns content only;
  - when "Starting from" is given, the prompt asks for a lighter first and last day (arrival and departure) and tips for getting from the arrival point. It never asks for flights, tickets or prices of travel to the destination;
  - the server assigns IDs, dates, day numbers and the trip currency, sorts by start time, and maps unknown categories to `other`;
  - a wrong day count or a schema failure gives `502 AI_INVALID_RESPONSE` with no automatic retry;
  - Gemini is called with JSON output and a schema, and Zod is always the final authority;
  - the response is a `Trip` (`id`, `createdAt`, `preferences`, `itinerary`), stored and shown as is in steps 9–14; `VALIDATION_ERROR` details are `{ fields: { "<path>": "<message>" } }`.
- **Running cost (step 7, decided 2026-10-27):** the app must stay completely free. Gemini runs on the free tier: an AI Studio key in a project without billing. The default model is `gemini-3.5-flash-lite` (switched from `gemini-3.8-flash` on 2026-10-30, which was overloaded on the free tier), overridable with `GEMINI_MODEL`. A missing `GEMINI_API_KEY` doesn't stop the server; generation answers `503 AI_UNAVAILABLE`.
- **Platform (step 7):** Node.js 22.12+ (Node 20 is end-of-life), `@google/genai` 2.x; its 3.0 announces Node 22+.
- **Error envelope (step 6):** `{ error: { code, message, requestId, details? } }`, with an `X-Request-Id` header. The codes are:

  | Code | Status |
  |---|---|
  | `VALIDATION_ERROR` | 400 |
  | `INVALID_JSON` | 400 |
  | `UNSUPPORTED_MEDIA_TYPE` | 415 |
  | `PAYLOAD_TOO_LARGE` | 413 |
  | `NOT_FOUND` | 404 |
  | `GENERATION_IN_PROGRESS` | 409 |
  | `RATE_LIMITED` | 429 |
  | `AI_INVALID_RESPONSE` | 502 |
  | `AI_PROVIDER_ERROR` | 502 |
  | `AI_UNAVAILABLE` | 503 |
  | `AI_TIMEOUT` | 504 |
  | `INTERNAL_ERROR` | 500 |

- **Protection (step 8):**
  - 5 requests/min and 30/hour per IP;
  - one in-flight generation per IP;
  - JSON body ≤ 10 KB;
  - AI timeout 30 s on the server, 45 s on the client (90 s since step 12);
  - CORS allow-list from `ALLOWED_ORIGINS`;
  - never log bodies, prompts, model output or keys;
  - the README states that these measures do not make the app fully secure;
  - built (2026-10-30): limits live in the memory of one process (`server/src/protection.ts`); the client IP is the socket address unless `TRUST_PROXY` names the proxies in front;
  - step 9 adds the 45 s client timeout and cancel, and should show `RATE_LIMITED` (with `Retry-After`), `GENERATION_IN_PROGRESS` and `AI_TIMEOUT` clearly.
- **Generation in the client (step 9, built 2026-10-30):**
  - `client/src/api/http.ts` `postJson` never throws; it returns `ApiResult<T>` with failure kinds `api`, `network`, `timeout`, `cancelled` and `invalid-response`. A success body must pass `tripSchema`;
  - `useGeneration` lives in `PlanPage`; after a `429` the error panel counts down `Retry-After` before "Try again" is enabled;
  - on success the trip is saved in an in-memory `TripStore` (`client/src/features/trips/`) and the app opens `/trips/:id` (`client/src/pages/TripPage.tsx`), a minimal summary that shows "Trip not found" after a reload. Step 10 replaces the page; step 14 swaps the store for localStorage behind the same `get`/`save` interface;
  - `vite preview` proxies `/api` like the dev server.
- **Itinerary view (step 10, built 2026-10-30):**
  - `client/src/features/itinerary/` holds the view: overview, day tabs (WAI-ARIA, arrows/Home/End), day timeline, activity details expanded in place;
  - the selected day lives in `?day=N` (each change adds a history entry; an invalid value means day 1). `RootLayout` now moves focus only when the pathname changes, so query-only changes keep focus;
  - day and trip costs use `sumMoney()` from `shared/src/money.ts` (integer hundredths). The overview shows the estimated trip cost next to the budget; step 11 adds remaining/over and cost by day and should reuse `sumMoney`;
  - `App`/`RootLayout`/`TripStoreProvider` accept `initialTrips` for tests (`client/src/test/renderTripPage.tsx`).
- **Money (step 11, revised 2026-10-30):** sums and differences are done in integer hundredths (`sumMoney`, `subtractMoney`). All amounts on a trip are in the trip currency, as `tripSchema` requires; nothing is converted and there are no per-currency totals (the user chose one currency per trip). Step 13 must keep new and edited activities in the trip currency.
- **Budget summary (step 11, built 2026-10-30):** `client/src/features/budget/` holds `budgetSummary(budget, estimatedCost)` (pure: status within/over, difference, whole percent used) and the `BudgetSummary` card (amounts, meter, "Cost by day" table). `ItineraryView` computes the day costs once and passes them to the card and the timelines; step 13 only has to recompute them from the edited itinerary. The over-budget bar uses `coral-text`, because `coral` on the track fails 3:1.
- **Deployment (step 12, built 2026-10-31):**
  - one free Render web service from `render.yaml` (Blueprint): build `npm ci --include=dev && npm run build`, start `npm start`, health `/api/health`; Node from `.node-version` (24);
  - the API serves `client/dist` when `CLIENT_DIR` is set (after the `/api` 404, so API paths never get `index.html`); `assets/` cached a year, everything else `no-cache`. Local development is unchanged;
  - `GEMINI_API_KEY` is entered only in the Render dashboard (`sync: false`), never in the repository;
  - `TRUST_PROXY=1` must be confirmed once on the live service with `EXPOSE_CLIENT_IP=true` and `/api/client-ip`, then turned off;
  - free services sleep after 15 min: the client sends a warm-up `GET /api/health` on load, shows a waking-up note after 15 s of generation, and waits 90 s. In-memory limits reset on wake.
- **Editing (step 13):** a pure reducer with stable IDs, re-sorting by start time, and an `itinerarySchema` guard. Delete confirmation is in-page, with no `window.confirm`.
- **Saving (step 14):**
  - auto-save on generation and on every edit, with no Save button;
  - key `ai-travel-planner:trips` holding `{ version: 1, trips }`;
  - invalid entries are skipped and backed up, never silently deleted.
- **UI:** English copy, editorial and calm visual style (serif display + sans body, warm paper background, teal and terracotta accents), WCAG AA contrast, no dark mode.

## Out of scope for the MVP

Authentication, databases, user accounts, payments, hotel and flight booking, live prices or availability, Google Maps, and AI image generation.
