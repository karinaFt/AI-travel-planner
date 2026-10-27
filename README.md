# AI Travel Planner

Plan a multi-day trip with AI. You enter your travel preferences, get a day-by-day itinerary, adjust the activities and their estimated costs, and keep your trips in the browser. It is a single-page React application built with Vite and TypeScript, backed by a small Express API.

The AI provider needs a secret API key, so the browser never calls it directly. Requests flow from the React client to the Express API, which (from a later step) calls Gemini and returns the result:

```
React client  →  Express API (/api)  →  Gemini (later step)
```

## Prerequisites

- Node.js `^20.19.0 || >=22.12.0` (the range Vite requires)
- npm (ships with Node.js)

## Getting started

```sh
npm ci
cp server/.env.example server/.env   # optional: the defaults work without it
npm run dev
```

All commands run from the repository root. It is an [npm workspaces](https://docs.npmjs.com/cli/using-npm/workspaces) root, and each script is forwarded to the workspaces that provide it.

`npm run dev` starts two processes in one terminal, with each line prefixed `[client]` or `[api]`:

- the Vite client. Open the local URL it prints (by default http://localhost:5173/). Changes to files in `client/src/` show up in the browser without restarting it.
- the API on http://localhost:3001. Saving a file in `server/src/` restarts it automatically.

In development, Vite proxies every request to `/api` to the API, so the page calls `/api/...` on its own origin and CORS doesn't come into play. To point the proxy elsewhere, set `API_PROXY_TARGET` when starting the client, for example `API_PROXY_TARGET=http://localhost:4000 npm run dev`.

## Environment

The API reads its configuration from environment variables. For local values, copy `server/.env.example` to `server/.env`. That file is ignored by git, so never commit it. Variables already set in the environment take precedence over the file.

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `3001` | Port the API listens on, a whole number from 1 to 65535. |
| `ALLOWED_ORIGINS` | `http://localhost:5173` | Comma-separated browser origins allowed by CORS, as `scheme://host[:port]` with no path or trailing slash. |

An invalid value stops the API at startup with exit code 1 and a message naming the variable (the value itself is never printed).

`API_PROXY_TARGET` (default `http://localhost:3001`) is read by the Vite dev server, not the API. It only changes where the client's `/api` proxy points.

## Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Start the client (hot module replacement) and the API (restarts on change) together. |
| `npm run dev:client` | Start only the Vite client. |
| `npm run dev:server` | Start only the API in watch mode. |
| `npm run build` | Type-check every workspace, build the client into `client/dist/` and bundle the API into `server/dist/index.cjs`. |
| `npm start` | Run the built API from `server/dist/` (run `npm run build` first). |
| `npm run preview` | Serve the contents of `client/dist/` locally (run `npm run build` first). |
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
client/               Frontend workspace (@travel-planner/client)
  package.json        Frontend dependencies and scripts
  index.html          HTML entry point
  vite.config.ts      Vite and Vitest configuration
  public/             Static files copied as-is to the build
  src/
    main.tsx          Mounts the React app inside the browser router
    App.tsx           Route table (/, /plan, not-found)
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
    hooks/            Reusable hooks (document title)
    theme/            Contrast helper and the test that guards the token palette
    test/             Test setup and helpers (jest-dom, renderWithRouter)
server/               API workspace (@travel-planner/server): Express 5
  .env.example        Every environment variable with its default
  src/
    index.ts          Entry point: loads server/.env, validates config, listens
    app.ts            createApp(): middleware order and routes
    config.ts         Environment validation (PORT, ALLOWED_ORIGINS)
    http/             Request ID, request logging, JSON body handling, error envelope
    routes/           One router per endpoint group (health)
openspec/             Specs, change proposals and the MVP roadmap (OpenSpec)
```

## API

The API serves everything under `/api`. Successful responses have the body `{ "data": ... }`.

| Endpoint | Response |
|---|---|
| `GET /api/health` | `200 { "data": { "status": "ok" } }` |

Every response carries an `X-Request-Id` header with a server-generated ID (an ID sent by the client is ignored). Each request is logged as one JSON line with the method, path, status, duration in ms, request ID and, for errors, the error code. Request and response bodies and query strings are never logged.

Endpoints that take a body accept only `application/json`, up to 10 KB.

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
| `AI_UNAVAILABLE` | 503 | The AI provider is overloaded |
| `AI_TIMEOUT` | 504 | Generation took too long |

The 409, 429 and AI codes are part of the contract now, but they are first returned when itinerary generation arrives in later steps.

### Security

- **CORS** headers are sent only to origins in `ALLOWED_ORIGINS`, for `GET` and `POST` with the `Content-Type` header. CORS only restricts browsers. It doesn't stop other clients such as curl or scripts, which can still call the API directly.
- **Security headers** come from [helmet](https://helmetjs.github.io/) (for example `X-Content-Type-Options: nosniff`), and `X-Powered-By` is turned off.

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

## Styling

- **Tailwind CSS v4** runs through the `@tailwindcss/vite` plugin. There is no `tailwind.config.js`; the configuration lives in CSS.
- **Design tokens** live in one place: the `@theme` block in `client/src/index.css`. It holds the colors, fonts, radii and shadow, and they are available as utilities such as `bg-canvas`, `text-muted`, `bg-primary`, `font-display` and `rounded-card`.
- **The app has a single light theme on purpose**, so it ignores the operating system's dark-mode setting.
- **Contrast is tested.** `client/src/theme/contrast.test.ts` reads the tokens from `index.css` and checks every text and background pair against WCAG AA. If a token change breaks contrast, `npm test` fails.
- **Fonts** are Fraunces (headings) and Inter (UI text). They are self-hosted through Fontsource, so no requests go to external font services.
- **Build pages from the primitives** in `client/src/components/ui/` instead of one-off styles. Page titles use `PageHeading`, because the layout moves focus to it after navigation.
- **Don't animate `outline-color`.** Avoid the bare `transition` utility on focusable elements and list the animated properties explicitly, for example `transition-[color,background-color]`. Otherwise the focus ring fades in from the text color.
