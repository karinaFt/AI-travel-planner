# Spec Delta

## Purpose

Defines how the API turns validated trip preferences into a day-by-day itinerary: the request and response contract, what the AI is asked for, how its output is validated and normalized, and how AI failures are reported.

## ADDED Requirements

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
