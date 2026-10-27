# Tasks

## 1. Server workspace and tooling

- [ ] 1.1 Create `server/` (`package.json` as `@travel-planner/server` with scripts `dev`, `build`, `start`, `typecheck`, `test`; `tsconfig.json` per design D1; a minimal `src/index.ts`), add `server` to root `workspaces`, install the runtime deps (`express`, `cors`, `helmet`, `dotenv`, `zod`, `@travel-planner/shared`) and dev deps (`tsx`, `esbuild`, `typescript`, `vitest`, `supertest`, `@types/express`, `@types/cors`, `@types/supertest`, `@types/node`) in the server workspace and `concurrently` at the root; stop any running dev server first; verify `npm ci`, `npm run typecheck` and `npm test` from the root exit 0
- [x] 1.2 Add root scripts `dev` (concurrently client + api), `dev:client`, `dev:server` and `start`; add the `/api` proxy to `client/vite.config.ts`; verify `npm run build` produces `client/dist/index.html` and `server/dist/index.cjs`

## 2. Shared API contract

- [x] 2.1 Add `shared/src/api.ts` (`ERROR_CODES` per design D4, `ApiErrorCode`, `ApiSuccess`, `ApiErrorBody`, `apiErrorBodySchema`) exported from `shared/src/index.ts`, with `shared/src/api.test.ts` (every code has a status and a non-empty message; schema accepts a valid envelope and rejects one without `code` or with an unknown code); verify `npm test -w shared` passes

## 3. Configuration

- [x] 3.1 Implement `server/src/config.ts` (`loadConfig(env)`, `ConfigError`, defaults, origin rules per design D3) and `server/.env.example`; add `config.test.ts` covering the cases in design D7, including that messages never contain the rejected value; verify `npm test -w server` passes
- [x] 3.2 Wire `index.ts` to load `server/.env` (dotenv, quiet), call `loadConfig`, print the error and exit 1 on failure, otherwise listen and log one startup line; verify `PORT=abc npm run dev:server` exits non-zero naming `PORT`, and that creating `server/.env` does not show up in `git status`

## 4. App and middleware

- [x] 4.1 Implement `createApp` with request ID, logger, helmet, CORS allow-list, JSON body handling, `GET /api/health`, `/api` 404 and the error handler (design D5–D6); add `app.test.ts` with Supertest covering every `api-server` scenario listed in design D7, using `extraRoutes` for the echo and throwing routes; verify `npm test -w server` passes
- [x] 4.2 Mutation-check the tests: temporarily return the raw error message in the 500 handler and remove `helmet()`; confirm the matching tests fail; revert and verify all pass

## 5. End-to-end checks

- [x] 5.1 Run `npm run dev`: verify both processes start with prefixed output, `curl http://localhost:3001/api/health` and `http://localhost:5173/api/health` (through the proxy) both return status `ok`, the app still loads in the browser without console errors, and saving a file in `server/src` restarts the API
- [x] 5.2 Run `npm run build` then `npm start`: verify `GET /api/health` on the built server returns `ok`, and a request from a disallowed `Origin` gets no `Access-Control-Allow-Origin` header

## 6. Documentation and checks

- [x] 6.1 Update `README.md`: request flow (client → API → Gemini later), `server/` in the project layout, environment setup from `server/.env.example` with each variable, the new scripts (`dev`, `dev:client`, `dev:server`, `start`) and `API_PROXY_TARGET`, the error envelope and code table, and a note that CORS limits browsers only; verify the documented commands run as written
- [ ] 6.2 Run `npm ci`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` and `npx @fission-ai/openspec@latest validate add-api-server --strict`; verify all pass

## Workflow follow-up

- Archive the change and mark step 6 as done in `openspec/ROADMAP.md`.
