# Spec Delta

## ADDED Requirements

### Requirement: Generation rate limit
The generate endpoint SHALL accept at most 5 requests per minute and 30 per hour from one client IP, counting every request to it, valid or not. Further requests SHALL get `429 RATE_LIMITED` with a `Retry-After` header in seconds, and SHALL NOT reach the AI. Other routes SHALL NOT count toward or be blocked by this limit.

#### Scenario: Sixth request in a minute
- **WHEN** one IP sends a sixth generate request within a minute
- **THEN** the response status is 429 with code `RATE_LIMITED` and a `Retry-After` header
- **AND** the AI is not called for it

#### Scenario: Hourly limit
- **WHEN** one IP has sent 30 generate requests within an hour, no more than 5 in any minute
- **THEN** its next generate request within that hour gets 429 with code `RATE_LIMITED`

#### Scenario: Other clients and routes unaffected
- **WHEN** one IP has reached the limit
- **THEN** a generate request from another IP is accepted
- **AND** `GET /api/health` from the limited IP still returns status `ok`

### Requirement: One generation at a time
While a generation for a client IP is running, another valid generate request from the same IP SHALL get `409 GENERATION_IN_PROGRESS` without calling the AI. The slot SHALL be released when the running generation ends, whether it succeeds, fails, times out or is abandoned.

#### Scenario: Second request while one is running
- **WHEN** an IP sends a valid generate request while its previous one is still waiting for the AI
- **THEN** the response status is 409 with code `GENERATION_IN_PROGRESS`
- **AND** the AI was called only for the first request

#### Scenario: Slot released after a failure
- **WHEN** an IP's generation ends with `502 AI_INVALID_RESPONSE`
- **THEN** its next valid generate request reaches the AI

#### Scenario: Other clients not blocked
- **WHEN** one IP has a generation running
- **THEN** a valid generate request from another IP reaches the AI

### Requirement: AI timeout
The server SHALL abort an AI call that has not finished within 30 seconds and respond `504 AI_TIMEOUT`. It SHALL NOT retry automatically.

#### Scenario: Slow model
- **WHEN** the AI does not answer within 30 seconds
- **THEN** the response status is 504 with code `AI_TIMEOUT`
- **AND** the AI call's abort signal has fired and the client's slot is released

### Requirement: Client disconnect
When the client closes the connection before a generation finishes, the server SHALL abort the AI call and release the client's slot. It SHALL NOT log this as an unexpected error.

#### Scenario: Client goes away
- **WHEN** a client disconnects while its generation is waiting for the AI
- **THEN** the AI call's abort signal fires
- **AND** a new valid generate request from the same IP reaches the AI
- **AND** no unexpected-error line is logged
