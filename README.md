# AI Travel Planner

Plan a multi-day trip with AI. You enter your travel preferences, get a day-by-day itinerary, adjust the activities and their estimated costs, and keep your trips in the browser. It is a single-page React application built with Vite and TypeScript, backed by a small Express API.

The AI provider needs a secret API key, so the browser never calls it directly. Requests flow from the React client to the Express API, which calls Gemini, validates the answer and returns the trip:

```
React client  →  Express API (/api)  →  Gemini
```

## Prerequisites

- Node.js `>=22.12.0` (Node 20 is end-of-life; the Gemini SDK announces Node 22+ for its next major version)
- npm (ships with Node.js)

## Getting started

```sh
npm ci
cp server/.env.example server/.env   # optional: add GEMINI_API_KEY to enable generation
npm run dev
```

All commands run from the repository root. It is an [npm workspaces](https://docs.npmjs.com/cli/using-npm/workspaces) root, and each script is forwarded to the workspaces that provide it.

`npm run dev` starts two processes in one terminal, with each line prefixed `[client]` or `[api]`:

- the Vite client. Open the local URL it prints (by default http://localhost:5173/). Changes to files in `client/src/` show up in the browser without restarting it.
- the API on http://localhost:3001. Saving a file in `server/src/` restarts it automatically.

In development and in `npm run preview`, Vite proxies every request to `/api` to the API, so the page calls `/api/...` on its own origin and CORS doesn't come into play. To point the proxy elsewhere, set `API_PROXY_TARGET` when starting the client, for example `API_PROXY_TARGET=http://localhost:4000 npm run dev`.

## Environment

The API reads its configuration from environment variables. For local values, copy `server/.env.example` to `server/.env`. That file is ignored by git, so never commit it. Variables already set in the environment take precedence over the file.

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `3001` | Port the API listens on, a whole number from 1 to 65535. |
| `ALLOWED_ORIGINS` | `http://localhost:5173` | Comma-separated browser origins allowed by CORS, as `scheme://host[:port]` with no path or trailing slash. |
| `GEMINI_API_KEY` | *(unset)* | Secret key for the Gemini API. Without it the API still runs, but generation answers `503 AI_UNAVAILABLE`. Never logged. |
| `GEMINI_MODEL` | `gemini-3.5-flash-lite` | Gemini model used for itineraries. Flash-Lite has the most free quota; a larger model such as `gemini-3.8-flash` writes richer plans but has less free quota and is more often overloaded. |
| `TRUST_PROXY` | `0` | Number of reverse proxies in front of the API, 0–10, used to find the client IP for rate limits. Keep `0` unless the API runs behind a proxy that sets `X-Forwarded-For`; see [Security](#security). |

An invalid value stops the API at startup with exit code 1 and a message naming the variable (the value itself is never printed).

`API_PROXY_TARGET` (default `http://localhost:3001`) is read by the Vite dev and preview servers, not the API. It only changes where the client's `/api` proxy points.

### Free Gemini API key

Itinerary generation uses Google's Gemini API on its **free tier**. The app needs no paid service.

1. Sign in to [Google AI Studio](https://aistudio.google.com/) with a Google account.
2. Open **Get API key** and create a key. Let AI Studio create a new project for it, and **don't set up billing** for that project. Without billing, the key stays on the free tier and can't be charged.
3. Put the key in `server/.env` as `GEMINI_API_KEY=...` and restart `npm run dev`. The `listening` log line then shows `"generation":"enabled"`.

Know the free tier's limits:

- **Quota**: requests per minute and per day are limited and vary by model; see the [rate limits](https://ai.google.dev/gemini-api/docs/rate-limits). When the quota runs out, generation answers `503 AI_UNAVAILABLE` ("busy right now") until it resets. The default Flash-Lite model has more free quota than the larger Flash models.
- **Data use**: on the free tier, Google may use prompts and responses to improve its products. The app sends only the trip preferences, so don't put personal details in them.
- Keep the key out of git and chats. If it leaks, delete it in AI Studio and create a new one.

## Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Start the client (hot module replacement) and the API (restarts on change) together. |
| `npm run dev:client` | Start only the Vite client. |
| `npm run dev:server` | Start only the API in watch mode. |
| `npm run build` | Type-check every workspace, build the client into `client/dist/` and bundle the API into `server/dist/index.cjs`. |
| `npm start` | Run the built API from `server/dist/` (run `npm run build` first). |
| `npm run preview` | Serve the contents of `client/dist/` locally (run `npm run build` first), with `/api` proxied to the API like in development. |
| `npm run typecheck` | Report TypeScript errors without writing any output. |
| `npm run lint` | Lint the source with [oxlint](https://oxc.rs/docs/guide/usage/linter), including React hooks rules. |
| `npm test` | Run the unit test suite once with Vitest and exit. |
| `npm run test:watch` | Run Vitest in watch mode, re-running tests as files change. |

## Project layout

```
package.json          Workspaces root: shared scripts, oxlint, single lockfile
.oxlintrc.json        Lint rules for every workspace
shared/               Isomorphic code workspace (@travel-planner/shared)
  src/api.ts          API error codes, the error envelope schema and response types
  src/trip-basics.ts  Trip basics schema (Zod), currencies, limits, messages
  src/trip-preferences.ts  Full trip preferences: basics + starting point, style, pace, interests
  src/dates.ts        YYYY-MM-DD helpers (date-fns)
  src/itinerary.ts    Activity, day, itinerary and trip schemas (the generate response)
  src/money.ts        sumMoney(), subtractMoney(): exact money math in integer hundredths
client/               Frontend workspace (@travel-planner/client)
  package.json        Frontend dependencies and scripts
  index.html          HTML entry point
  vite.config.ts      Vite and Vitest configuration
  public/             Static files copied as-is to the build
  src/
    main.tsx          Mounts the React app inside the browser router
    App.tsx           Route table (/, /plan, /trips/:id, not-found)
    App.test.tsx      App shell and navigation tests
    config.ts         App-wide constants (app name)
    layouts/          Page frame shared by all routes (header + main)
    pages/            One component per route
    index.css         Tailwind import, design tokens (@theme) and base styles
    components/       Site header and other shared pieces
      ui/             UI primitives: Button, ButtonLink, Card, Container, PageHeading,
                      Field, TextInput, DateInput, Select, RadioCardGroup
    features/
      trip-setup/     Trip preferences form, its raw-input schema, style/pace/interests
                      fields, the review step and the draft kept for the tab session
      generation/     Generate flow on the review: state hook, loading and error panels, messages
      trips/          Generated trips kept in memory for the tab (TripStoreProvider)
      itinerary/      The /trips/:id view: overview, day tabs, day timeline, activity details
      budget/         Budget summary on the trip page: remaining or over, usage bar, cost by day
    api/              Typed API client: postJson() and generateItinerary()
    hooks/            Reusable hooks (document title)
    theme/            Contrast helper and the test that guards the token palette
    test/             Test setup and helpers (jest-dom, renderWithRouter, renderTripPage,
                      fetch mocks, a valid trip fixture)
server/               API workspace (@travel-planner/server): Express 5
  .env.example        Every environment variable with its default
  src/
    index.ts          Entry point: loads server/.env, validates config, listens
    app.ts            createApp(): middleware order and routes
    config.ts         Environment validation (PORT, ALLOWED_ORIGINS, GEMINI_*, TRUST_PROXY)
    protection.ts     Generation limits: requests per minute and hour, AI timeout
    ai/               Itinerary generation: model port, Gemini adapter, prompt, response
                      schema, normalization of the model output
    http/             Request ID, request logging, JSON body handling, error envelope,
                      rate limit, one-generation-at-a-time guard
    routes/           One router per endpoint group (health, itineraries)
openspec/             Specs, change proposals and the MVP roadmap (OpenSpec)
```

## API

The API serves everything under `/api`. Successful responses have the body `{ "data": ... }`.

| Endpoint | Response |
|---|---|
| `GET /api/health` | `200 { "data": { "status": "ok" } }` |
| `POST /api/itineraries/generate` | `200 { "data": { "trip": … } }`, see below |

Every response carries an `X-Request-Id` header with a server-generated ID (an ID sent by the client is ignored). Each request is logged as one JSON line with the method, path, status, duration in ms, request ID and, for errors, the error code. A request the client abandons is logged with `"aborted": true` instead of a status. Request and response bodies, query strings, prompts, model output and the API key are never logged. An unexpected error adds one `"event": "error"` line with the request ID, error name and stack frames, but not the error message, which could carry data.

Endpoints that take a body accept only `application/json`, up to 10 KB.

### Generating an itinerary

`POST /api/itineraries/generate` takes the trip preferences, validated with the shared `tripPreferencesSchema` (see [Shared code](#shared-code)):

```json
{
  "destination": "Lisbon",
  "origin": "Kyiv",
  "startDate": "2026-11-10",
  "endDate": "2026-11-12",
  "budget": 1500,
  "currency": "EUR",
  "travelers": 2,
  "travelStyle": "food",
  "pace": "relaxed",
  "interests": ["wine", "markets"]
}
```

It returns a trip, which passes the shared `tripSchema` (`shared/src/itinerary.ts`):

```json
{
  "data": {
    "trip": {
      "id": "6f1c…",
      "createdAt": "2026-10-27T10:00:00.000Z",
      "preferences": { "destination": "Lisbon", "…": "…" },
      "itinerary": {
        "days": [
          {
            "id": "b2e4…",
            "dayNumber": 1,
            "date": "2026-11-10",
            "title": "Arrival and Alfama",
            "activities": [
              {
                "id": "0d9a…",
                "title": "Airport to the city",
                "description": "Take the metro red line from the airport…",
                "category": "transport",
                "startTime": "14:00",
                "durationMinutes": 45,
                "estimatedCost": 3.7,
                "currency": "EUR"
              }
            ]
          }
        ]
      }
    }
  }
}
```

- **Days:** one per trip date, numbered from 1.
- **Activities:** sorted by `startTime` (`HH:mm`). `durationMinutes` is 5–1440. `estimatedCost` is for the whole group, in the trip currency, with at most 2 decimals. `category` is one of sightseeing, culture, food, nature, adventure, relaxation, shopping, nightlife, transport, other.
- **Server-owned fields:** the model returns content only. The server assigns IDs, dates and day numbers and sets the currency. It also trims text, rounds costs to cents and maps unknown categories to `other`.
- **Starting point:** with a starting point, the first and last days are lighter and day 1 starts with tips for getting from the arrival point. Flights and other travel to the destination are never planned or priced, and the budget covers the stay only.

How it can fail:

| Response | When |
|---|---|
| `400 VALIDATION_ERROR` | The preferences are invalid. `details.fields` maps each field path (or `body`) to its message. The past-date rule is client-only. |
| `409 GENERATION_IN_PROGRESS` | A generation from the same IP is still running. |
| `429 RATE_LIMITED` | More than 5 requests in a minute or 30 in an hour from the same IP. `Retry-After` says how many seconds to wait. |
| `502 AI_INVALID_RESPONSE` | The model's answer is not JSON, has the wrong number of days or fails the trip schema. There is no automatic retry. |
| `502 AI_PROVIDER_ERROR` | Gemini or the network failed. |
| `503 AI_UNAVAILABLE` | No `GEMINI_API_KEY` is set, or Gemini is rate limited or overloaded (including exhausted free-tier quota). |
| `504 AI_TIMEOUT` | The model didn't answer within 30 seconds. There is no automatic retry. |

### Errors

Every `/api` error has the same body. `message` is safe to show to users. An optional `details` field is added only by codes that need it, such as field errors for `VALIDATION_ERROR`:

```json
{ "error": { "code": "NOT_FOUND", "message": "This API route does not exist.", "requestId": "3f2c…" } }
```

The codes, their statuses and messages live in `shared/src/api.ts` (`ERROR_CODES`). The client parses error bodies with `apiErrorBodySchema`.

| Code | Status | When |
|---|---|---|
| `VALIDATION_ERROR` | 400 | The trip details fail validation |
| `INVALID_JSON` | 400 | The body is not valid JSON |
| `NOT_FOUND` | 404 | No `/api` route matches |
| `GENERATION_IN_PROGRESS` | 409 | An itinerary is already being generated |
| `PAYLOAD_TOO_LARGE` | 413 | The body is over 10 KB |
| `UNSUPPORTED_MEDIA_TYPE` | 415 | The body is not `application/json` |
| `RATE_LIMITED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Anything unexpected; details stay in the server log |
| `AI_INVALID_RESPONSE` | 502 | The AI returned an unusable itinerary |
| `AI_PROVIDER_ERROR` | 502 | The AI provider failed |
| `AI_UNAVAILABLE` | 503 | No API key is set, or the AI provider is rate limited, out of free quota or overloaded |
| `AI_TIMEOUT` | 504 | Generation took too long |

### Security

The API has these protections. The generation limits live in `server/src/protection.ts`.

| Protection | What it does |
|---|---|
| **Rate limit** | `POST /api/itineraries/generate` accepts at most **5 requests per minute and 30 per hour** per client IP, counting invalid requests too. Further requests get `429 RATE_LIMITED` with `Retry-After`, and responses carry `RateLimit` headers. Other routes are not limited. |
| **One generation at a time** | While a generation for an IP is running, another one from the same IP gets `409 GENERATION_IN_PROGRESS`. The slot is freed when the generation ends, however it ends. |
| **AI timeout** | A model call that takes longer than **30 seconds** is aborted and answers `504 AI_TIMEOUT`. If the client disconnects, the call is aborted too. |
| **Body limit** | Only `application/json` bodies up to **10 KB** are accepted. |
| **CORS** | Headers are sent only to origins in `ALLOWED_ORIGINS`, for `GET` and `POST` with the `Content-Type` header. |
| **Security headers** | They come from [helmet](https://helmetjs.github.io/) (for example `X-Content-Type-Options: nosniff`), and `X-Powered-By` is turned off. |
| **Log hygiene** | Logs never contain bodies, prompts, model output or the API key; tests check this on success and error paths. Error responses never include stack traces or provider messages. |

**`TRUST_PROXY`.** Limits are keyed by client IP. With the default `0`, the API uses the connecting address and ignores `X-Forwarded-For`, so a client can't fake its IP to get around the limits. Behind a reverse proxy, such as a hosting platform's load balancer, every request comes from the proxy's address, so all users would share one limit. In that case set `TRUST_PROXY` to the number of proxies in front of the API, usually `1`. Never set it higher than the real number of proxies, or clients could fake their IP again.

What this does **not** protect against:

- **Counters are in memory.** They belong to one process and reset when the server restarts, and several server instances don't share them.
- **IPs are a rough identity.** Many people behind one network (an office, a mobile carrier) share a limit, and an attacker can rotate IPs.
- **CORS only restricts browsers.** Other clients such as curl or scripts can call the API directly.
- **There are no accounts or authentication.** Anyone who can reach the API can use it within the limits.
- **Gemini's own free-tier quota still applies.** It is shared by every user of the key, and an aborted call may still count against it.

These measures reduce abuse and accidents; they do not make the app fully secure.

## Shared code

`shared/` holds validation and types that both the browser and the server must agree on.

- **It is consumed as TypeScript source, with no build step.** Its `package.json` exports `./src/index.ts`, and Vite, Vitest, tsx and `tsc` compile it directly. The server's production build bundles it with esbuild, so `server/dist/` never imports TypeScript at runtime. After pulling changes that add or rename a workspace, run `npm install` so npm re-links it.
- **It must stay free of DOM and React code.** Its tsconfig has no DOM types.

The trip preferences rules (`tripPreferencesSchema`, which extends `tripBasicsSchema`):

| Field | Rule |
|---|---|
| Destination | Required; 2–100 characters after trimming |
| Starting from | Optional; empty means not provided, otherwise 2–100 characters after trimming. Only used to plan arrival and departure days |
| Start and end dates | Real calendar dates as `YYYY-MM-DD`; the end is not before the start; at most 14 days, counting both ends |
| Budget | Greater than 0; at most 10,000,000; at most 2 decimals. Covers the trip at the destination, not getting there and back |
| Currency | One of USD, EUR, GBP, UAH, PLN, CZK, CHF, JPY, CAD, AUD (default EUR) |
| Travelers | Whole number from 1 to 20 (default 1) |
| Travel style | Required; one of relaxation, adventure, culture, food, nature |
| Pace | One of relaxed, balanced, packed (default balanced) |
| Interests | Up to 10, each 2–40 characters after trimming, no duplicates ignoring case |

The form in `client/src/features/trip-setup/formSchema.ts` parses the raw input strings, reuses these rules, and adds one browser-only rule: the start date can't be in the past (in the user's time zone).

What the user types on `/plan` is kept in a draft (`TripDraftProvider`) while they move between pages in the same tab. A full reload starts empty; trips are saved for real in a later step.

### Generating an itinerary in the app

The review step's **Generate itinerary** button sends the reviewed preferences to `POST /api/itineraries/generate` through `generateItinerary()` in `client/src/api/`. That client never throws: it returns the trip (checked against the shared `tripSchema`) or a typed failure.

- **While waiting**, the review shows an announced "Generating your itinerary…" status and a **Cancel** button. Leaving the page also cancels the request.
- **The client gives up after 45 seconds**, later than the API's own 30-second limit, to catch a hung connection.
- **On failure**, an error panel shows a message users can act on, with **Try again** and **Edit details**. After `429 RATE_LIMITED`, **Try again** stays disabled until the `Retry-After` time has passed. After `400 VALIDATION_ERROR` only **Edit details** is offered. The reviewed values and the form draft are never lost.
- **On success**, the trip is kept in memory for the tab (`TripStoreProvider`) and the app opens `/trips/<id>`. The trip is gone after a reload, and that page then shows "Trip not found". Saved trips come in a later step.

### The trip page

`/trips/<id>` shows the generated itinerary (`client/src/features/itinerary/`):

- **Overview:** destination, dates, length, travelers, style, pace and starting point.
- **Budget** (`client/src/features/budget/`): the budget, the estimated cost of the whole trip, and what remains or how far over budget the plan is. A bar shows the share of the budget used ("8% of budget"), and a "Cost by day" table lists each day's cost with a total.
- **Day tabs:** one per day. The selected day is kept in the URL as `?day=N`, so Back returns to the previous day. A missing or invalid value shows day 1. The arrow keys, Home and End move between tabs, and choosing a day keeps keyboard focus on its tab.
- **Day timeline:** the day's title, number of activities and estimated cost, then the activities in start-time order with time, category and cost. **Details** expands an activity in place to show its time range, duration, description and that the cost is for the whole group.
- **Costs** are summed and subtracted exactly with `sumMoney()` and `subtractMoney()` from `shared/` (integer hundredths). Each activity cost is for the whole group. Every amount on a trip is in the trip currency; nothing is converted.

## Styling

- **Tailwind CSS v4** runs through the `@tailwindcss/vite` plugin. There is no `tailwind.config.js`; the configuration lives in CSS.
- **Design tokens** live in one place: the `@theme` block in `client/src/index.css`. It holds the colors, fonts, radii and shadow, and they are available as utilities such as `bg-canvas`, `text-muted`, `bg-primary`, `font-display` and `rounded-card`.
- **The app has a single light theme on purpose**, so it ignores the operating system's dark-mode setting.
- **Contrast is tested.** `client/src/theme/contrast.test.ts` reads the tokens from `index.css` and checks every text and background pair against WCAG AA. If a token change breaks contrast, `npm test` fails.
- **Fonts** are Fraunces (headings) and Inter (UI text). They are self-hosted through Fontsource, so no requests go to external font services.
- **Build pages from the primitives** in `client/src/components/ui/` instead of one-off styles. Page titles use `PageHeading`, because the layout moves focus to it after navigation.
- **Don't animate `outline-color`.** Avoid the bare `transition` utility on focusable elements and list the animated properties explicitly, for example `transition-[color,background-color]`. Otherwise the focus ring fades in from the text color.
