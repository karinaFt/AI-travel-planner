# Spec Delta

## ADDED Requirements

### Requirement: Serving the client
When `CLIENT_DIR` is set, the API server SHALL serve the files in that directory and answer any other `GET` request outside `/api` with its `index.html`. Requests under `/api` SHALL keep their API behavior, including the JSON `404 NOT_FOUND` for unknown API paths. When `CLIENT_DIR` is not set, the server SHALL serve only the API.

#### Scenario: Opening an app route directly
- **WHEN** `CLIENT_DIR` points to a built client and a browser requests `/trips/abc`
- **THEN** the server answers `200` with the client's `index.html`

#### Scenario: Unknown API path
- **WHEN** `CLIENT_DIR` is set and a client requests `GET /api/unknown`
- **THEN** the server answers `404` with the `NOT_FOUND` error envelope

#### Scenario: API only
- **WHEN** `CLIENT_DIR` is not set and a client requests `/plan`
- **THEN** the server answers `404` and serves no client files

### Requirement: Client caching
Files under the client's `assets/` directory SHALL be served with a one-year immutable cache, and `index.html` SHALL be served with `Cache-Control: no-cache`, so a new deployment is picked up on the next page load.

#### Scenario: Cache headers
- **WHEN** a browser requests a hashed asset and then `/`
- **THEN** the asset has `Cache-Control: public, max-age=31536000, immutable`
- **AND** `/` has `Cache-Control: no-cache`

### Requirement: Client directory check
At startup, a set `CLIENT_DIR` SHALL be resolved to an absolute path, and the server SHALL stop with a non-zero exit and a message naming `CLIENT_DIR` if that directory has no `index.html`.

#### Scenario: Missing build
- **WHEN** the server starts with `CLIENT_DIR` pointing to a directory without `index.html`
- **THEN** it exits with a non-zero code and a message naming `CLIENT_DIR`

### Requirement: Render Blueprint
The repository SHALL contain a `render.yaml` that defines one free Render web service which installs dependencies including dev dependencies, builds every workspace, starts the API server, uses `/api/health` as its health check, serves the built client through `CLIENT_DIR`, and sets `TRUST_PROXY`. `GEMINI_API_KEY` SHALL be declared as a value entered in Render, never stored in the repository.

#### Scenario: Blueprint contents
- **WHEN** a reader opens `render.yaml`
- **THEN** it declares a `web` service on the `free` plan with the build and start commands, the `/api/health` health check, `CLIENT_DIR`, `TRUST_PROXY` and `GEMINI_API_KEY` with `sync: false`

### Requirement: Pinned Node version
The repository SHALL pin the Node.js major version used by the host in a `.node-version` file that satisfies the `engines` range in `package.json`.

#### Scenario: Version file
- **WHEN** the host reads `.node-version`
- **THEN** it selects Node.js 24, which satisfies `>=22.12.0`

### Requirement: Client IP check
When `EXPOSE_CLIENT_IP` is `true`, the API SHALL answer `GET /api/client-ip` with `{ "data": { "ip": "<address>" } }`, the client address as computed with the configured `TRUST_PROXY`. Otherwise the route SHALL NOT exist. The address SHALL NOT be logged.

#### Scenario: Check enabled
- **WHEN** `EXPOSE_CLIENT_IP=true` and a client requests `GET /api/client-ip`
- **THEN** the server answers `200` with the address it uses for rate limiting

#### Scenario: Check disabled
- **WHEN** `EXPOSE_CLIENT_IP` is not set and a client requests `GET /api/client-ip`
- **THEN** the server answers `404 NOT_FOUND`
