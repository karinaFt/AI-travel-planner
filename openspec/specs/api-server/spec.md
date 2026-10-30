# api-server Specification

## Purpose

Defines the behavior every backend endpoint relies on: how the API server is configured and started, how it reports health and errors, and the basic protections it applies to every request.

## Requirements

### Requirement: Configuration at startup
The API server SHALL read its configuration from environment variables, optionally loaded from a local `server/.env` file. `PORT` SHALL default to 3001, `ALLOWED_ORIGINS` to `http://localhost:5173` and `GEMINI_MODEL` to `gemini-3.5-flash-lite`. `GEMINI_API_KEY` SHALL be optional. Invalid values SHALL stop startup with a non-zero exit and a message that names the variable without echoing its value. Configuration values SHALL never be logged.

#### Scenario: Defaults applied
- **WHEN** the server starts with no configuration variables set
- **THEN** it listens on port 3001 and allows the origin `http://localhost:5173`

#### Scenario: Invalid port
- **WHEN** the server is started with `PORT=abc`
- **THEN** it exits with a non-zero status and a message stating that `PORT` is invalid

#### Scenario: Invalid origin list
- **WHEN** `ALLOWED_ORIGINS` contains a value that is not an `http(s)` origin, such as `not a url`
- **THEN** startup fails with a message stating that `ALLOWED_ORIGINS` is invalid

#### Scenario: Invalid model name
- **WHEN** `GEMINI_MODEL` is set to a value with spaces, such as `my model`
- **THEN** startup fails with a message stating that `GEMINI_MODEL` is invalid, without the value

#### Scenario: API key not echoed
- **WHEN** the server starts with `GEMINI_API_KEY` set
- **THEN** no startup or request log line contains the key

### Requirement: Health check
The API SHALL expose `GET /api/health`, responding `200` with `{ "data": { "status": "ok" } }`.

#### Scenario: Health probe
- **WHEN** a client requests `GET /api/health`
- **THEN** the response status is 200 and the body is `{ "data": { "status": "ok" } }`

### Requirement: Error envelope
Every error response from `/api` SHALL have the JSON body `{ "error": { "code", "message", "requestId", "details"? } }`. `code` SHALL come from a fixed, documented set, each code mapped to one HTTP status. `message` SHALL be safe to show to users and SHALL NOT contain stack traces, file paths or internal error text.

#### Scenario: Unknown API route
- **WHEN** a client requests `GET /api/does-not-exist`
- **THEN** the response status is 404 with code `NOT_FOUND` in the error envelope

#### Scenario: Unexpected failure
- **WHEN** a request handler throws an unexpected error
- **THEN** the response status is 500 with code `INTERNAL_ERROR` and a generic message
- **AND** the body contains no stack trace or the original error message

### Requirement: Request IDs
Every response from `/api` SHALL include an `X-Request-Id` header with a server-generated identifier. Error bodies SHALL repeat it as `requestId`. An `X-Request-Id` sent by the client SHALL be ignored.

#### Scenario: Matching request ID
- **WHEN** a request to `/api` fails
- **THEN** the `X-Request-Id` header equals `error.requestId` in the body

#### Scenario: Client-supplied ID ignored
- **WHEN** a client sends `X-Request-Id: my-id`
- **THEN** the response's `X-Request-Id` is a different, server-generated value

### Requirement: JSON request bodies
Endpoints that accept a body SHALL accept only `application/json`, up to 10 KB. A body with another content type SHALL get `415 UNSUPPORTED_MEDIA_TYPE`. Malformed JSON SHALL get `400 INVALID_JSON`. A body over 10 KB SHALL get `413 PAYLOAD_TOO_LARGE`.

#### Scenario: Wrong content type
- **WHEN** a client sends `POST` to an `/api` route with `Content-Type: text/plain`
- **THEN** the response status is 415 with code `UNSUPPORTED_MEDIA_TYPE`

#### Scenario: Malformed JSON
- **WHEN** a client sends `POST` with `Content-Type: application/json` and the body `{"destination":`
- **THEN** the response status is 400 with code `INVALID_JSON`

#### Scenario: Oversized body
- **WHEN** a client sends a 50 KB JSON body
- **THEN** the response status is 413 with code `PAYLOAD_TOO_LARGE`

### Requirement: CORS allow-list
The API SHALL send CORS headers only for origins listed in `ALLOWED_ORIGINS`, allowing the `GET` and `POST` methods and the `Content-Type` header. Requests from other origins SHALL get no `Access-Control-Allow-Origin` header. The documentation SHALL state that CORS limits browsers only, not other clients.

#### Scenario: Allowed origin preflight
- **WHEN** a browser at `http://localhost:5173` sends a preflight request for `POST /api/health` with `Content-Type`
- **THEN** the response allows that origin, the `POST` method and the `Content-Type` header

#### Scenario: Disallowed origin
- **WHEN** a request arrives with `Origin: https://evil.example`
- **THEN** the response has no `Access-Control-Allow-Origin` header

### Requirement: Security headers
API responses SHALL include standard security headers, at least `X-Content-Type-Options: nosniff`. They SHALL NOT include `X-Powered-By`.

#### Scenario: Headers on a response
- **WHEN** a client requests `GET /api/health`
- **THEN** the response includes `X-Content-Type-Options: nosniff` and no `X-Powered-By` header

### Requirement: Request logging
The API SHALL log one line per request with method, path, status code, duration and request ID, plus the error code when there is one. It SHALL NOT log request or response bodies.

#### Scenario: Logged request
- **WHEN** a client sends a request whose body contains the text "secret-note"
- **THEN** the log line for it contains the method, path, status and request ID
- **AND** the log output does not contain "secret-note"
