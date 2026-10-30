# Design

## Context

The repo is an npm workspaces root with `shared/` (isomorphic Zod schemas consumed as TypeScript source through `exports: ./src/index.ts`) and `client/` (Vite + React). Root scripts delegate with `--workspaces --if-present`, apart from `dev`, `preview` and `test:watch`, which target the client. `.gitignore` already ignores `dist/` and `.env*` at any depth, except `!.env.example`. Node in use is 24, and `engines` allows `^20.19.0 || >=22.12.0`. The roadmap fixes the error envelope and the code list (see `openspec/ROADMAP.md`, "Error envelope"). Requirements are in `specs/api-server` and `specs/build-tooling`.

## Goals / Non-Goals

**Goals:**
- An Express app built by a factory (`createApp`) that tests can drive with Supertest, without a network or an API key.
- One error envelope produced in one place.
- A server build that runs on every Node version in `engines`.

**Non-Goals:**
- Gemini, the generate endpoint, `GEMINI_API_KEY` (step 7).
- Rate limiting, the in-flight guard, `TRUST_PROXY`, AI timeouts and the log-hygiene tests for secrets (step 8).
- Deployment, process managers and HTTPS.

## Decisions

### D1. Layout
```
server/
  package.json        @travel-planner/server; deps express, cors, helmet, dotenv, zod, @travel-planner/shared
  tsconfig.json       strict, ES2023, moduleResolution bundler, allowImportingTsExtensions, noEmit, types: node
  .env.example        PORT, ALLOWED_ORIGINS with comments
  src/index.ts        load config (exit 1 on error) → createApp → listen → log "listening" line
  src/app.ts          createApp({ config, log, extraRoutes? }): express app
  src/config.ts       loadConfig(env): Config, throws ConfigError naming the bad variables
  src/http/request-id.ts  generate UUID, set res.locals.requestId + X-Request-Id
  src/http/logger.ts      createLogger(write) and the per-request logging middleware
  src/http/json-body.ts   415 check for body-carrying methods + express.json({ limit: '10kb' })
  src/http/errors.ts      AppError, notFound (for /api), errorHandler
  src/routes/health.ts
shared/src/api.ts     ERROR_CODES, ApiErrorCode, ApiSuccess<T>, ApiErrorBody, apiErrorBodySchema
```
`extraRoutes` exists so tests can mount a throw-away `POST /api/test/echo` and a route that throws. The JSON-body and 500 scenarios need such routes before step 7 adds a real POST endpoint. Production code never passes it.

### D2. Build and run
- **Dev**: `tsx watch src/index.ts`. tsx compiles TypeScript on the fly, including the linked `@travel-planner/shared` source, and restarts on change.
- **Build**: `tsc --noEmit && esbuild src/index.ts --bundle --platform=node --target=node20 --format=cjs --sourcemap --outfile=dist/index.cjs`. tsc type-checks, and esbuild bundles the server, `shared` and npm deps into one CommonJS file.
  - *Why bundle*: `shared` is published as `.ts` source. Plain `tsc` output would make Node import TypeScript from `shared/` at runtime. Node 20.19 (allowed by `engines`) can't do that without flags, and type stripping is still a moving target. A bundle has no runtime TS and no path rewriting.
  - *Why CJS output*: Express and some of its deps are CommonJS. ESM bundles of CJS code hit "Dynamic require of 'x' is not supported" for Node built-ins.
  - *Alternative*: compile `shared` to JS too. That needs a build-order dependency between workspaces, which we avoided on purpose in step 4.
- **Start**: `node --enable-source-maps dist/index.cjs`. The root `start` script runs `npm run start -w server`.
- **Root dev**: `concurrently -n client,api -c cyan,magenta "npm run dev -w client" "npm run dev -w server"`. Root `dev:client` and `dev:server` scripts are added for running one side alone.
- **Vite proxy**: `server.proxy = { '/api': process.env.API_PROXY_TARGET ?? 'http://localhost:3001' }` in `client/vite.config.ts`. This gives same-origin calls in dev, so CORS is not involved for the normal dev flow. CORS still matters for `vite preview` or a separately hosted client.

### D3. Configuration
- `dotenv` loads `server/.env` (npm runs workspace scripts with the workspace as the working directory) with `quiet: true`, which suppresses dotenv's startup tip. Already-set environment variables win, so tests and CI can pass values directly.
- `loadConfig(env)` validates with Zod. It is a pure function of the env object, which makes it unit-testable.
  - `PORT`: an integer 1–65535, default 3001.
  - `ALLOWED_ORIGINS`: comma-separated, trimmed, empty items dropped, default `http://localhost:5173`. Each item must parse with `new URL()`, use `http:` or `https:`, and equal its own `URL.origin`, which rejects paths and trailing slashes.
- Failure throws `ConfigError` with one line per variable: "PORT must be a whole number from 1 to 65535". Messages never include the value. `index.ts` prints the message to stderr and exits with code 1.

### D4. Error envelope and codes (`shared/src/api.ts`)
```ts
export const ERROR_CODES = {
  VALIDATION_ERROR:       { status: 400, message: 'Some of the trip details are not valid.' },
  INVALID_JSON:           { status: 400, message: 'The request body is not valid JSON.' },
  NOT_FOUND:              { status: 404, message: 'This API route does not exist.' },
  GENERATION_IN_PROGRESS: { status: 409, message: 'An itinerary is already being generated. Please wait for it to finish.' },
  PAYLOAD_TOO_LARGE:      { status: 413, message: 'The request body is too large.' },
  UNSUPPORTED_MEDIA_TYPE: { status: 415, message: 'Send the request body as JSON.' },
  RATE_LIMITED:           { status: 429, message: 'Too many requests. Please try again a little later.' },
  INTERNAL_ERROR:         { status: 500, message: 'Something went wrong on our side. Please try again.' },
  AI_INVALID_RESPONSE:    { status: 502, message: 'The itinerary could not be generated. Please try again.' },
  AI_PROVIDER_ERROR:      { status: 502, message: 'The itinerary service is temporarily unavailable. Please try again.' },
  AI_UNAVAILABLE:         { status: 503, message: 'The itinerary service is busy right now. Please try again later.' },
  AI_TIMEOUT:             { status: 504, message: 'Generating the itinerary took too long. Please try again.' },
} as const
```
- All codes from the roadmap are defined now, so the contract is complete and step 7 doesn't edit `shared` again. Only some are produced in this step.
- `apiErrorBodySchema` (Zod) lets the client parse error bodies safely in step 9. `ApiSuccess<T> = { data: T }`.
- `AppError(code, details?)` is thrown by handlers. `errorHandler` maps it, plus body-parser errors (`type === 'entity.parse.failed'` → `INVALID_JSON`, `'entity.too.large'` → `PAYLOAD_TOO_LARGE`), and treats anything else as `INTERNAL_ERROR`. For unexpected errors it writes the stack to stderr (server-side only) and sends just the generic message.

### D5. Middleware order
`disable('x-powered-by')` → `requestId` → `requestLogger` (logs on `res.finish`) → `helmet()` → `cors({ origin: allowList, methods: ['GET','POST'], allowedHeaders: ['Content-Type'] })` → `jsonBody` → routes (`/api/health`, `extraRoutes`) → `/api` 404 → `errorHandler`.
- `cors` with a function origin: allowed origins are echoed back, and others get no allow header (no error is thrown, so the request itself still proceeds, as the spec scenario expects).
- `jsonBody`: for `POST`, `PUT` and `PATCH` with a non-empty body (`content-length > 0` or `transfer-encoding` present), if `!req.is('application/json')`, it raises `UNSUPPORTED_MEDIA_TYPE`. Then `express.json({ limit: '10kb' })`.
- The client's `X-Request-Id` is ignored because the middleware always generates `crypto.randomUUID()`.

### D6. Logging
`createLogger(write = (line) => process.stdout.write(line + '\n'))` writes one JSON object per line: `time, method, path, status, ms, requestId`, and `code` when the response is an error (taken from `res.locals.errorCode`, set by `errorHandler`). It logs `req.path`, not the URL, so query strings stay out of the logs. It never reads bodies. Tests inject a `write` that collects lines.

### D7. Tests (server workspace, Vitest node environment)
- `config.test.ts`: defaults; `PORT` abc/0/70000 rejected; origins with path, trailing slash, `ftp:` or garbage rejected; a list with spaces is trimmed; error messages never contain the value.
- `app.test.ts` (Supertest against `createApp`, using `extraRoutes` for the echo and throwing routes): every `api-server` scenario. That covers health; 404; 500 without stack text; `X-Request-Id` equals `requestId`; a client ID is ignored; 415; malformed JSON; 50 KB → 413; CORS allowed preflight and disallowed origin; `nosniff` and no `X-Powered-By`; the log line has the fields and doesn't contain a body marker.
- `shared/src/api.test.ts`: every code has a status and a non-empty message, and `apiErrorBodySchema` accepts the envelope and rejects malformed ones.

## Risks / Trade-offs

- [esbuild bundling Express may emit warnings or miss dynamic requires] → Express 5 and its deps bundle cleanly in practice. A task runs `npm start` on the bundle and checks `/api/health`. If something breaks, mark that package `--external`.
- [Two dev processes in one terminal are noisy] → `concurrently` prefixes and colors each stream. `dev:client` and `dev:server` exist for focused work.
- [The proxy target is hard-wired to port 3001] → It can be overridden with `API_PROXY_TARGET`, which the README documents.
- [`extraRoutes` is a test seam in production code] → It is a small optional parameter, unused in `index.ts`. Step 7's real POST route will let some tests move to it.
- [Logging the stack on 500s could include data from the error message] → This is server-side only, and step 8 adds hygiene tests and tightening.

## Migration Plan

After pulling, run `npm install`, which links the new workspace and installs its deps. Optionally copy `server/.env.example` to `server/.env`; the defaults work without it. `npm run dev` now starts both processes. To roll back, revert the commit.
