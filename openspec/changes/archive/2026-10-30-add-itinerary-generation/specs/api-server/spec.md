# Spec Delta

## MODIFIED Requirements

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
