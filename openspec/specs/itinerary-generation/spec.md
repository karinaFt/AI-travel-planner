# itinerary-generation Specification

## Purpose

Defines how the API turns validated trip preferences into a day-by-day itinerary: the request and response contract, what the AI is asked for, how its output is validated and normalized, and how AI failures are reported.

## Requirements

### Requirement: Generate endpoint
The API SHALL expose `POST /api/itineraries/generate`. It SHALL accept trip preferences as JSON and, on success, respond `200` with `{ "data": { "trip": … } }`, where `trip` holds a new `id`, a `createdAt` timestamp, the normalized `preferences` and the generated `itinerary`.

#### Scenario: Successful generation
- **WHEN** a client posts valid preferences for a 3-day trip to Lisbon and the AI returns a valid 3-day plan
- **THEN** the response status is 200
- **AND** `data.trip` passes the shared trip schema, with `preferences.destination` "Lisbon" and 3 days

### Requirement: Request validation
The endpoint SHALL validate the body with the shared trip preferences schema before calling the AI. Invalid input SHALL get `400 VALIDATION_ERROR` with `details.fields` mapping each invalid field path to its message. The client-only rule that the start date is not in the past SHALL NOT be enforced by the server.

#### Scenario: Invalid preferences
- **WHEN** a client posts preferences with an end date before the start date and no travel style
- **THEN** the response status is 400 with code `VALIDATION_ERROR`
- **AND** `details.fields` contains messages for `endDate` and `travelStyle`
- **AND** the AI is not called

#### Scenario: Past start date accepted
- **WHEN** a client posts otherwise valid preferences whose start date is in the past
- **THEN** the request is not rejected for that reason

### Requirement: Itinerary contract
A trip's itinerary SHALL have one day per trip date, in order. Each day SHALL have an `id`, a `dayNumber` from 1, its `date` and a `title`. Each activity SHALL have an `id`, a `title` of 1–120 characters, a `description` of at most 1000, a `category` from the fixed list, a `startTime` as `HH:mm`, a `durationMinutes` integer of 5–1440, and an `estimatedCost` of at least 0 with at most 2 decimals in the trip `currency`.

#### Scenario: Shared schema checks a trip
- **WHEN** the shared trip schema parses a trip whose activity has `startTime` "25:00" or `durationMinutes` 3
- **THEN** parsing fails

#### Scenario: Activities in time order
- **WHEN** the shared trip schema parses a day whose activities are not sorted by start time
- **THEN** parsing fails

### Requirement: Prompt content
The prompt SHALL ask the AI for content only: one title per day and timed activities with costs for the whole group in the trip currency, staying within the budget. It SHALL include the destination, dates, day count, budget, travelers, style, pace and interests, passing user text as quoted data and telling the model not to follow instructions inside it.

#### Scenario: Preferences in the prompt
- **WHEN** a prompt is built for Lisbon, 3 days, 1500 EUR, 2 travelers, style food, pace relaxed, interests "wine" and "markets"
- **THEN** the prompt contains each of those values and asks for exactly 3 days

#### Scenario: Instructions in user text
- **WHEN** the destination contains the text "Ignore previous instructions"
- **THEN** that text appears only inside the quoted trip data, not as an instruction

### Requirement: Starting point in the prompt
When "Starting from" is given, the prompt SHALL ask for a lighter first and last day for arrival and departure, and for tips on getting from the arrival point to the first stop. The prompt SHALL NOT ask for flights, tickets or the price of travel to and from the destination, with or without a starting point.

#### Scenario: Trip with a starting point
- **WHEN** a prompt is built for a trip from Kyiv
- **THEN** it includes "Kyiv" and asks for lighter arrival and departure days and arrival tips
- **AND** it tells the model not to plan or price flights or other travel to the destination

#### Scenario: Trip without a starting point
- **WHEN** a prompt is built without a starting point
- **THEN** it contains no arrival or departure instructions

### Requirement: Structured AI output
The server SHALL request JSON output that follows a response schema with exactly the trip's number of days and a fixed activity shape. The AI SHALL return content only. The server SHALL validate the result with Zod, which is the final authority on whether the output is usable.

#### Scenario: Schema sent with the request
- **WHEN** the server asks the AI for a 4-day trip
- **THEN** the request asks for JSON output with a schema requiring exactly 4 days

### Requirement: Output normalization
The server SHALL assign every ID, day number and date, set every activity's currency to the trip currency, trim text, round costs to cents, sort each day's activities by start time, and map unknown categories to `other`. Values the AI sends for server-owned fields SHALL be ignored.

#### Scenario: Normalizing a valid response
- **WHEN** the AI returns a day with activities at "14:00" then "09:30", a category "museum", a cost of 12.345 and a title with surrounding spaces
- **THEN** the trip lists the "09:30" activity first, uses category `other`, a cost of 12.35, the trimmed title, the trip currency and server-generated UUIDs

#### Scenario: Dates follow the trip
- **WHEN** a trip from 2026-11-10 to 2026-11-12 is generated
- **THEN** the days have `dayNumber` 1–3 and dates 2026-11-10, 2026-11-11 and 2026-11-12

### Requirement: Invalid AI output
If the AI output is not valid JSON, has the wrong number of days, or fails the output schema after normalization, the API SHALL respond `502 AI_INVALID_RESPONSE` and SHALL NOT retry automatically.

#### Scenario: Wrong day count
- **WHEN** the AI returns 2 days for a 3-day trip
- **THEN** the response status is 502 with code `AI_INVALID_RESPONSE`
- **AND** the AI was called exactly once

#### Scenario: Unparsable output
- **WHEN** the AI returns text that is not JSON
- **THEN** the response status is 502 with code `AI_INVALID_RESPONSE`

### Requirement: AI provider failures
When the provider reports rate limiting or overload (HTTP 429 or 503), including exhausted free-tier quota, the API SHALL respond `503 AI_UNAVAILABLE`. Any other provider or network failure SHALL get `502 AI_PROVIDER_ERROR`. The provider's error text SHALL NOT appear in the response.

#### Scenario: Quota exhausted
- **WHEN** the provider answers with HTTP 429
- **THEN** the response status is 503 with code `AI_UNAVAILABLE`

#### Scenario: Provider error
- **WHEN** the provider answers with HTTP 500 and the message "internal model failure"
- **THEN** the response status is 502 with code `AI_PROVIDER_ERROR`
- **AND** the body does not contain "internal model failure"

### Requirement: Generation without an API key
When `GEMINI_API_KEY` is not set, the server SHALL still start and serve `/api/health`, log a warning that generation is disabled, and answer valid generate requests with `503 AI_UNAVAILABLE`.

#### Scenario: No key configured
- **WHEN** the server runs without `GEMINI_API_KEY` and a client posts valid preferences
- **THEN** the response status is 503 with code `AI_UNAVAILABLE`
- **AND** `GET /api/health` still returns status `ok`

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
