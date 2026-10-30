# Spec Delta

## MODIFIED Requirements

### Requirement: Configuration at startup
The API server SHALL read its configuration from environment variables, optionally loaded from a local `server/.env` file. `PORT` SHALL default to 3001, `ALLOWED_ORIGINS` to `http://localhost:5173`, `GEMINI_MODEL` to `gemini-3.5-flash-lite` and `TRUST_PROXY` to 0. `GEMINI_API_KEY` SHALL be optional. Invalid values SHALL stop startup with a non-zero exit and a message that names the variable without echoing its value. Configuration values SHALL never be logged.

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

#### Scenario: Proxy headers ignored by default
- **WHEN** `TRUST_PROXY` is not set and a request carries `X-Forwarded-For: 203.0.113.7`
- **THEN** the client IP used for rate limiting is the connecting address, not 203.0.113.7

#### Scenario: Trusted proxy
- **WHEN** `TRUST_PROXY=1` and a request arrives through one proxy with `X-Forwarded-For: 203.0.113.7`
- **THEN** the client IP used for rate limiting is 203.0.113.7

#### Scenario: Invalid proxy count
- **WHEN** `TRUST_PROXY` is set to `yes` or `11`
- **THEN** startup fails with a message stating that `TRUST_PROXY` is invalid

### Requirement: Request logging
The API SHALL log one line per request with method, path, status code, duration and request ID, plus the error code when there is one. A request the client abandons SHALL be logged with `aborted: true` instead of a status. Logs SHALL NOT contain request or response bodies, prompts, model output or secrets such as the API key.

#### Scenario: Logged request
- **WHEN** a client sends a request whose body contains the text "secret-note"
- **THEN** the log line for it contains the method, path, status and request ID
- **AND** the log output does not contain "secret-note"

#### Scenario: Generation leaves no content in logs
- **WHEN** a generation succeeds, fails validation, gets invalid AI output or hits an unexpected error
- **THEN** no log line contains the trip preferences, the prompt, the model output or the API key

#### Scenario: Abandoned request
- **WHEN** a client disconnects before its response is sent
- **THEN** one log line is written for the request, with `aborted: true`

## ADDED Requirements

### Requirement: Unexpected error logging
An unexpected error SHALL be logged server-side as one JSON line with the request ID, the error name and its stack frames, without the error message.

#### Scenario: Error with data in its message
- **WHEN** a handler throws an unexpected error whose message contains "secret-note"
- **THEN** one error line is logged with the request ID and the error name
- **AND** no log output contains "secret-note"
