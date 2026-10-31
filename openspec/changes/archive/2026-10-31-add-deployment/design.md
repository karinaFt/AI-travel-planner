# Design

## Context

What exists after step 11:
- **Build:** `npm run build` builds every workspace: the client into `client/dist/` (`index.html` plus hashed files in `assets/`), and the server into one bundle `server/dist/index.cjs` (esbuild, CommonJS, Node 22 target). `npm start` runs `npm run start -w server`, so the server's working directory is `server/`.
- **Server:**
  - `createApp({ config, log, itineraryModel })` mounts request ID, logging, helmet, CORS, the generation rate limit, the JSON body parser, `/api` routes, the `/api` 404 and the error handler;
  - `loadConfig(env)` validates variables with Zod and never echoes values;
  - `index.ts` loads `server/.env` when it exists (it won't on Render) and reads `PORT`, which Render sets.
- **Protection:** in-memory limits per client IP; `TRUST_PROXY` (0–10) sets Express `trust proxy`.
- **Client:** same-origin `/api` calls; `CLIENT_TIMEOUT_MS = 45_000`; `GenerationStatus` shows the loading text.
- **Node:** `engines: >=22.12.0`; the developer machine runs Node 24.

Facts about Render, checked on 2026-10-30:
- Free web services spin down after 15 minutes without traffic and take about a minute to start again. There are 750 free instance hours per workspace each month.
- A Blueprint (`render.yaml`) declares services. `sync: false` makes Render ask for a value when the Blueprint is first created, and later Blueprint syncs ignore it.
- The Node version comes from `NODE_VERSION`, then `.node-version`, then `.nvmrc`, then `engines`. An open `engines` range resolves to the newest release.
- Render's docs don't state how many proxies sit in front of a service. Community reports say 1, and one says 3, so the value must be checked on the real service.

## Goals / Non-Goals

**Goals:**
- One free service and one origin, deployable by a beginner from the README.
- No behavior change for local development.
- No secret in the repository, and no client IP in logs.

**Non-Goals:**
- Custom domains, keep-alive pings, CI, paid plans, shared rate-limit storage.

## Decisions

### D1. Layout
```
render.yaml                               Blueprint: one free web service
.node-version                             24
server/src/http/client-app.ts             clientApp(dir): static files + index.html fallback
server/src/routes/client-ip.ts            GET /api/client-ip (only when enabled)
server/src/config.ts                      + clientDir?: string (absolute), exposeClientIp: boolean
server/src/app.ts                         mounts the client after the /api routes and the /api 404
client/src/api/warmUp.ts                  warmUp(): one fire-and-forget GET /api/health
client/src/main.tsx                       calls warmUp() before rendering
client/src/features/generation/GenerationStatus.tsx   wake-up notice after 15 s
client/src/api/itineraries.ts             CLIENT_TIMEOUT_MS = 90_000
```

### D2. Config
- `CLIENT_DIR`: optional and blank means unset. It is resolved with `path.resolve(process.cwd(), value)`. If `<dir>/index.html` doesn't exist, `ConfigError` "CLIENT_DIR must be a directory that contains index.html (run npm run build first)" is raised, which follows the existing exit path. The value is never printed.
- `EXPOSE_CLIENT_IP`: optional; `true` or `false`, default `false`; anything else is a `ConfigError`.
- `startupSummary` adds `servesClient: boolean` and `exposesClientIp: boolean`, never the path.
- `loadConfig` takes an optional `fileExists` dependency, so tests don't touch the disk.

### D3. Serving the client (`clientApp(dir)`)
- It returns an Express router that `createApp` mounts **after** `app.use('/api', notFound)`, so nothing under `/api` reaches it, and before the error handler.
- `express.static(dir, { index: false, setHeaders })`: files under `assets/` get `public, max-age=31536000, immutable`; other files (`favicon.svg`) get `no-cache`.
- Fallback: `GET` and `HEAD` requests that matched no file get `index.html` with `Cache-Control: no-cache` (`res.sendFile`). Other methods fall through to a plain 404.
- Helmet stays in front. Its default CSP allows the built page: module scripts from `'self'`, inline `style` attributes, and self-hosted fonts. The production check (task 6) confirms there are no CSP errors in the console.
- Static requests are logged like any other request (method, path, status, duration), which is acceptable and keeps the logger unchanged.

### D4. Client IP route
`GET /api/client-ip` → `{ data: { ip: req.ip } }`, mounted in the `/api` group only when `config.exposeClientIp`. It doesn't log the address; the request logger already never logs IPs. After the first deployment the user sets `EXPOSE_CLIENT_IP=true`, opens the URL, compares the address with their own public IP, adjusts `TRUST_PROXY` if needed, and turns the variable off again. The README explains the steps.

### D5. render.yaml
```yaml
services:
  - type: web
    name: ai-travel-planner
    runtime: node
    plan: free
    buildCommand: npm ci --include=dev && npm run build
    startCommand: npm start
    healthCheckPath: /api/health
    envVars:
      - key: CLIENT_DIR
        value: ../client/dist          # relative to server/, where npm runs the start script
      - key: TRUST_PROXY
        value: "1"
      - key: GEMINI_API_KEY
        sync: false
```
- `--include=dev` keeps TypeScript, Vite and esbuild available even if `NODE_ENV=production` is ever set. `NODE_ENV` is not set by the Blueprint.
- `ALLOWED_ORIGINS` is left at its default. Same-origin requests don't need CORS, and the CORS middleware never blocks a request.
- `GEMINI_MODEL` keeps its default.

### D6. Warm-up and the slow notice
- `warmUp()` calls `fetch('/api/health', { cache: 'no-store' })` and catches every error. `main.tsx` calls it once per page load; StrictMode double effects don't matter, because it is called outside React.
- `GenerationStatus` starts a 15 s `setTimeout` on mount and then shows the extra line inside the existing `role="status"` region, so it is announced. The timer is cleared on unmount.
- `CLIENT_TIMEOUT_MS` becomes 90 s. The server's own 30 s AI timeout is unchanged, so a running server still answers within about 30 s. The longer client limit only covers a server waking up.

### D7. Tests
- **`config.test.ts`:**
  - `CLIENT_DIR` unset gives `undefined`;
  - a set value resolves to an absolute path;
  - a missing `index.html` gives an error naming `CLIENT_DIR` without the value;
  - `EXPOSE_CLIENT_IP` accepts `true`/`false` and rejects other values;
  - the summary has no path.
- **`client-app.test.ts`** (supertest with a temporary directory holding `index.html` and `assets/app-abc.js`):
  - `/` and `/trips/abc` give `index.html` with `no-cache`;
  - the asset gets the immutable header;
  - `/api/unknown` gives the JSON 404 envelope;
  - `POST /plan` gives 404;
  - without `CLIENT_DIR`, `/plan` gives 404;
  - helmet headers are present on `/`.
- **`client-ip.test.ts`:** disabled gives the 404 envelope; enabled gives the IP, and with `TRUST_PROXY=1` plus `X-Forwarded-For: 203.0.113.7` the IP is `203.0.113.7`; the log has no IP.
- **Client:**
  - `warmUp.test.ts`: one GET to `/api/health`; a rejected fetch throws nothing;
  - `generation.test.tsx`: the slow notice appears after 15 s with fake timers, and the timeout test moves to 90 s;
  - `itineraries.test.ts`: the constant.

## Risks / Trade-offs

- **Cold starts:** the first visit after a pause can take about a minute. → The warm-up request, the slow notice and the 90 s client limit. Keep-alive pings are left out on purpose: they would use the free hours and are against the spirit of the free plan.
- **Proxy count is not documented.** → The opt-in client IP route and README steps to check it. The default of 1 matches most reports.
- **In-memory limits reset** when the service sleeps or restarts. → Acceptable for the MVP and already documented in the README Security section.
- **Free bandwidth and build minutes:** going over them suspends the service when no payment method is on file. → This app is small; the README says so.
- **`sync: false`** is asked only when the Blueprint is first created. → The README says to change the key later in the service's Environment settings.

## Migration Plan

1. Merge and push to `main` (the user pushes).
2. The user creates a Blueprint on Render from the repository and enters `GEMINI_API_KEY`.
3. Check the client IP once, set `TRUST_PROXY` if needed, then turn `EXPOSE_CLIENT_IP` off.

To roll back, suspend or delete the Render service. The code changes are inert locally while `CLIENT_DIR` is unset.
