# Proposal

## Why

The app works end to end locally (steps 1–11), but only on the developer's machine. The user wants it online, for free. The chosen setup is one free Render web service that serves both the API and the built client from one origin: no CORS, no second proxy, and the per-IP protection from step 8 keeps working. This step is inserted before activity editing so later steps can be checked in production too.

## What Changes

- **The API server can serve the built client.** When `CLIENT_DIR` is set, Express serves its files and answers every other non-API `GET` with `index.html`, so `/plan` and `/trips/:id` load directly. `/api` keeps its JSON 404. Hashed assets are cached for a year, `index.html` is never cached. Locally nothing changes: `CLIENT_DIR` is unset and Vite serves the client.
- **Startup checks `CLIENT_DIR`**: if it is set but has no `index.html`, the server stops with a clear message instead of serving 404s.
- **Render Blueprint** `render.yaml` in the repository: one free web service, build `npm ci --include=dev && npm run build`, start `npm start`, health check `/api/health`, `CLIENT_DIR`, `TRUST_PROXY=1`, and `GEMINI_API_KEY` as a secret entered in the Render dashboard, never committed.
- **Node version pinned** with `.node-version` (24, the version used locally), because `engines: >=22.12.0` alone would let Render pick any newer major release.
- **Finding the right proxy count**: an opt-in `GET /api/client-ip` route, mounted only when `EXPOSE_CLIENT_IP=true`, answers the caller with the IP the server sees. It is used once after deployment to confirm `TRUST_PROXY`, then turned off.
- **Waking a sleeping server**: the free service sleeps after 15 minutes without traffic and takes about a minute to wake.
  - The client sends one `GET /api/health` when the app loads, so the server starts waking while the user fills in the form.
  - After 15 seconds of generating, the loading status adds "The server may be waking up after a pause. This can take up to a minute."
  - The client timeout grows from 45 to 90 seconds, so a wake-up plus the server's 30-second AI limit fits.
- **README**: a "Deploying to Render" section with every step the user does by hand.

## Capabilities

### New Capabilities
- `deployment`: serving the client from the API server, the `CLIENT_DIR` check, the Render Blueprint, the pinned Node version and the client IP check.

### Modified Capabilities
- `itinerary-request`: "Client timeout" becomes 90 seconds; "Loading state" adds the wake-up notice; a new "Warm-up request" requirement.

## Impact

- **New**: `render.yaml`, `.node-version`, `server/src/http/client-app.ts` (static files and fallback), `server/src/routes/client-ip.ts`, tests.
- **Changed**:
  - `server/src/config.ts` (`CLIENT_DIR`, `EXPOSE_CLIENT_IP`), `server/src/app.ts`, `server/.env.example`;
  - `client/src/api/itineraries.ts` (90 s), a warm-up call at startup, `GenerationStatus.tsx` (wake-up notice);
  - `README.md`; `openspec/ROADMAP.md` (this step becomes 12; editing and saving become 13 and 14).
- **Dependencies**: none new.
- **Done by the user, not by Claude**: creating the Render account, connecting the GitHub repository, entering `GEMINI_API_KEY`, and pushing to `main` (Render deploys from GitHub).
- **Out of scope**: a custom domain, keeping the service awake with external pings, paid plans, CI pipelines, persistent rate-limit storage.
