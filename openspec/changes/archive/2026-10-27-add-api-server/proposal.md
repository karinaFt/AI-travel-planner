# Proposal

## Why

Itinerary generation must call Gemini with a secret API key, so it cannot run in the browser. The request flow is React → Express → Gemini → Express → React, and that needs a backend. Before adding the AI call (step 7), the backend needs a solid frame:
- configuration loaded from the environment;
- one consistent error format;
- a strict CORS policy and security headers;
- a health check;
- one command that runs the client and the server together.

Building this frame separately keeps the AI step focused on prompts and validation.

## What Changes

- Add a `server/` npm workspace (`@travel-planner/server`): Node.js + TypeScript + Express 5, run with `tsx` in development and compiled with `tsc` for production.
- Configuration from environment variables via `dotenv`, validated at startup, with documented defaults:
  - `PORT` (default 3001);
  - `ALLOWED_ORIGINS` (default `http://localhost:5173`).

  Invalid values stop the server with a message that names the variable without echoing its value. `GEMINI_API_KEY` is not needed yet; step 7 adds it.
- `GET /api/health` returns `{ "data": { "status": "ok" } }`.
- A consistent JSON error envelope for every `/api` error: `{ "error": { "code", "message", "requestId", "details"? } }`. The fixed list of error codes and their HTTP statuses lives in `shared/` so the client can rely on it later. Every response carries an `X-Request-Id` header.
- Request handling basics:
  - JSON bodies only (`415` otherwise);
  - malformed JSON → `400 INVALID_JSON`;
  - bodies over 10 KB → `413 PAYLOAD_TOO_LARGE`;
  - unknown `/api` routes → `404 NOT_FOUND`;
  - unexpected failures → `500 INTERNAL_ERROR` with no internal details.
- Security basics: an allow-list CORS policy from `ALLOWED_ORIGINS`, standard security headers via `helmet`, and no `X-Powered-By`. Request logs record method, path, status, duration and request ID, never bodies.
- Tooling:
  - `npm run dev` starts the Vite client and the API together;
  - the Vite dev server proxies `/api` to the API, so the browser makes same-origin calls in development;
  - `npm run build` also compiles the server;
  - a new `npm start` runs the compiled server;
  - a committed `server/.env.example` documents every variable, and local values go in the git-ignored `server/.env`;
  - API tests run offline with Supertest.

## Capabilities

### New Capabilities
- `api-server`: Backend behavior every endpoint relies on: startup configuration, the health check, the error envelope and codes, request IDs, JSON body handling, CORS, security headers and request logging.

### Modified Capabilities
- `build-tooling`:
  - "Local development server" now starts the client and the API together with the `/api` proxy;
  - "Production build" also compiles the API;
  - "Setup documentation" covers environment configuration;
  - new requirements: "API server start" and "Environment template".

## Impact

- **New**:
  - `server/` (`package.json`, `tsconfig.json`, `src/index.ts`, `src/app.ts`, `src/config.ts`, `src/http/*`, tests);
  - `shared/src/api.ts` (error codes, envelope types and schemas);
  - `server/.env.example`.
- **Changed**:
  - root `package.json` (`workspaces` adds `server`; `dev` runs both through `concurrently`; new `start`);
  - `client/vite.config.ts` (`server.proxy` for `/api`);
  - `README.md`.
- **Dependencies** (server workspace): `express`, `cors`, `helmet`, `dotenv`, `zod` (via shared). Dev: `tsx`, `typescript`, `vitest`, `supertest`, `@types/express`, `@types/cors`, `@types/supertest`, `@types/node`. Root dev: `concurrently`.
- **Out of scope**:
  - the Gemini call and the generate endpoint (step 7);
  - rate limiting, the in-flight guard, AI timeouts and the log-hygiene tests (step 8);
  - the client calling the API (step 9);
  - deployment and hosting.
