# Tasks

## 1. Server config

- [x] 1.1 Add `CLIENT_DIR` and `EXPOSE_CLIENT_IP` to `server/src/config.ts` and `startupSummary` (design D2), document both in `server/.env.example`, and extend `config.test.ts` per design D7; verify `npm test -w server` passes

## 2. Serving the client and the IP check

- [x] 2.1 Add `server/src/http/client-app.ts` (design D3) and mount it in `createApp` after the `/api` 404 when `clientDir` is set; add `client-app.test.ts` per design D7
- [x] 2.2 Add `server/src/routes/client-ip.ts` (design D4), mounted only when `exposeClientIp`; add `client-ip.test.ts`; verify `npm test -w server` passes
- [x] 2.3 Mutation-check: temporarily mount the client before the `/api` 404, drop the `no-cache` header on the fallback, and mount the IP route unconditionally; confirm the matching tests fail; revert and verify all pass

## 3. Client

- [x] 3.1 Add `client/src/api/warmUp.ts` and call it from `main.tsx`; set `CLIENT_TIMEOUT_MS = 90_000`; add the 15 s notice to `GenerationStatus` (design D6); update and add the tests from design D7; verify `npm test -w client` passes

## 4. Hosting files

- [x] 4.1 Add `render.yaml` (design D5) and `.node-version` containing `24`

## 5. Docs

- [x] 5.1 Add a README section "Deploying to Render": what the Blueprint creates; the steps the user does (push, New Blueprint, connect the repository, enter `GEMINI_API_KEY`); checking the client IP with `EXPOSE_CLIENT_IP` and setting `TRUST_PROXY`; changing the key later; cold starts and free-plan limits; that limits reset on sleep. Add the new variables to the configuration docs

## 6. Production check (local)

- [x] 6.1 Run `npm run build`, then start the built server on a free port with `CLIENT_DIR=../client/dist` and the API key; in a browser verify `/`, a direct `/plan` load, a full generation to `/trips/:id`, a reload of `/trips/:id` showing "Trip not found", `/api/unknown` as JSON 404, the cache headers, the warm-up request in the network log, and no CSP or other console errors

## 7. Checks

- [x] 7.1 Run `npm ci` (or `npm install` from the unchanged lockfile when a dev server holds `node_modules`, and say so), `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`; ask the user to run `npx @fission-ai/openspec@latest validate add-deployment --strict`; verify all pass

## Workflow follow-up

- Archive the change; in `openspec/ROADMAP.md` insert this as step 12 (done), renumber editing and saving to 13 and 14, and record the decisions; commit on `main` without pushing.
- After the user pushes and creates the Render Blueprint: check the live URL (health, a generation, the client IP with `EXPOSE_CLIENT_IP`), and help set `TRUST_PROXY`. This is outside the change's tasks because it needs the user's Render account.
