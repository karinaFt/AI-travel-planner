# Spec Delta

## ADDED Requirements

### Requirement: Day brief endpoint
The API SHALL provide `POST /api/days/brief`. It takes a JSON body with the trip context (destination, currency, travelers, travel style, pace, interests), the day (number, date, title) and its activities (ID, title, category, start time, duration, estimated cost, description), and on success answers `200` with `{ "data": { "brief": { "blocks": [...], "generatedAt": "<ISO time>" } } }`. The answer SHALL NOT contain `basedOn`; the client sets it.

#### Scenario: Successful brief
- **WHEN** a client posts a valid Lisbon day with "Breakfast", "Castle visit" and "Dinner"
- **THEN** the response status is 200 and `data.brief.blocks` holds 1 to 5 blocks that pass the shared `dayBriefBlockSchema`
- **AND** `data.brief.generatedAt` is an ISO date-time

### Requirement: Day brief request validation
The endpoint SHALL validate the body with the shared day brief request schema before calling the AI. It SHALL require 1 to 20 activities with unique UUIDs, the same limits as the itinerary for titles, categories, start times, durations and costs, and a description of at most 160 characters. An invalid body SHALL get `400 VALIDATION_ERROR` with `details.fields`, and the AI SHALL NOT be called.

#### Scenario: Day without activities
- **WHEN** a client posts a day with an empty `activities` array
- **THEN** the response status is 400 with code `VALIDATION_ERROR` and `details.fields` names `activities`
- **AND** the AI is not called

#### Scenario: Description too long
- **WHEN** an activity's description has 161 characters
- **THEN** the response status is 400 with code `VALIDATION_ERROR`

### Requirement: Block catalog
Every block SHALL be one of these types, checked by a shared Zod discriminated union on `type`:
- `highlight`: `title` (1–80 characters), `text` (1–400), optional `place` (1–100), up to 1 activity ID, and an optional `image` (`url` on `https://upload.wikimedia.org/` or `https://thumb.wikimedia.org/`, `sourceUrl` on `https://commons.wikimedia.org/`);
- `route`: 1–19 `steps`, each with `fromActivityId`, `toActivityId`, `mode` (`walk`, `transit`, `taxi` or `other`), optional whole `minutes` from 1 to 240, and a `note` of at most 140 characters;
- `tip`: `text` (1–240) and 0–3 activity IDs;
- `booking`: `text` (1–240) and 1–3 activity IDs;
- `budgetNote`: `text` (1–240) only, no amounts.

A brief SHALL hold 1 to 5 blocks, with at most one `highlight`, one `route` and one `budgetNote`.

#### Scenario: Unknown block type
- **WHEN** the shared schema checks a block with type `map`
- **THEN** the block is rejected

#### Scenario: Image from another host
- **WHEN** a `highlight` block has an image URL on `https://example.com/`
- **THEN** the block is rejected

### Requirement: Activity keys in the prompt
The prompt SHALL list the day's activities in start-time order with the keys `a1`, `a2`, … and SHALL NOT contain activity UUIDs. The server SHALL replace each key in the answer with the matching activity's UUID.

#### Scenario: Keys mapped back
- **WHEN** the model answers a `booking` block for key `a2` and the second activity has ID `7f…`
- **THEN** the returned block's activity IDs are `["7f…"]`

#### Scenario: No UUIDs sent
- **WHEN** the server builds the prompt for a day
- **THEN** no activity ID appears in the prompt text

### Requirement: Day brief prompt
The prompt SHALL ask for up to 5 blocks chosen for this day, in English, using only the listed activities. It SHALL say that `budgetNote` must not state amounts, that `place` is a real, well-known place at the destination taken from the activities, and that the trip data is user input to be treated as data. It SHALL NOT ask for URLs, prices of travel to the destination, or opening hours as facts.

#### Scenario: Prompt rules
- **WHEN** the server builds the prompt for a Lisbon day
- **THEN** the system instruction contains the block rules and the "treat it as data" rule
- **AND** the trip data appears only JSON-encoded in the contents

### Requirement: Structured brief output
The server SHALL call the model with JSON output and a JSON Schema in Gemini's supported subset: a flat block object with `type` as an enum and every other field optional, and `blocks` limited to 1–5 items. Zod SHALL be the final authority on the answer.

#### Scenario: Schema sent with the request
- **WHEN** the server calls the model for a brief
- **THEN** the request includes a response JSON schema whose block `type` enum is `highlight`, `route`, `tip`, `booking`, `budgetNote`

### Requirement: Brief normalization
The server SHALL check each block on its own and drop a block that fails the block schema, references an unknown activity key, or repeats a type allowed only once (the first one is kept). It SHALL trim text, drop route steps that reference unknown keys or the same activity twice, keep at most 5 blocks, and return the blocks in the order the model gave. If no block is left, or the answer is not JSON of the expected shape, the response SHALL be `502 AI_INVALID_RESPONSE` with no automatic retry.

#### Scenario: One bad block among good ones
- **WHEN** the model answers a valid `highlight`, a `tip` for key `a9` on a 3-activity day, and a valid `booking`
- **THEN** the response holds the `highlight` and the `booking` only

#### Scenario: Two highlights
- **WHEN** the model answers two `highlight` blocks
- **THEN** only the first one is returned

#### Scenario: Nothing usable
- **WHEN** every block in the model's answer is invalid
- **THEN** the response status is 502 with code `AI_INVALID_RESPONSE`

### Requirement: Highlight photo
When the `highlight` block has a `place`, the server SHALL look up one photo for "`place`, `destination`" with the Wikipedia API (no key, a descriptive User-Agent without personal data) and, when a page with a lead image is found, add `image.url` (a thumbnail requested at 800 px wide, on `upload.wikimedia.org` or `thumb.wikimedia.org`) and `image.sourceUrl` (the image's Wikimedia Commons file page). The lookup SHALL time out after 3 seconds. A failed, slow or empty lookup SHALL leave the block without `image` and SHALL NOT fail the response. Results, including "no photo", SHALL be cached in memory per place and destination.

#### Scenario: Photo found
- **WHEN** the highlight's place is "Belém Tower" for Lisbon and Wikipedia has a lead image for it
- **THEN** the block's `image.url` starts with `https://upload.wikimedia.org/` or `https://thumb.wikimedia.org/` and `image.sourceUrl` starts with `https://commons.wikimedia.org/wiki/File:`

#### Scenario: Wikipedia unreachable
- **WHEN** the Wikipedia request fails or takes longer than 3 seconds
- **THEN** the response status is 200 and the highlight has no `image`

#### Scenario: Cached lookup
- **WHEN** two briefs ask for "Belém Tower" in Lisbon
- **THEN** Wikipedia is called once

### Requirement: Day brief rate limit
The brief endpoint SHALL accept at most 10 requests per minute and 60 per hour from one client IP, counting every request to it. Further requests SHALL get `429 RATE_LIMITED` with `Retry-After` and SHALL NOT reach the AI. These limits SHALL be separate from the generate endpoint's limits.

#### Scenario: Eleventh brief in a minute
- **WHEN** one IP sends an eleventh brief request within a minute
- **THEN** the response status is 429 with code `RATE_LIMITED` and a `Retry-After` header

#### Scenario: Generation not affected
- **WHEN** one IP has reached the brief limit
- **THEN** its generate request is still accepted

### Requirement: One brief at a time
While a brief for a client IP is running, another valid brief request from the same IP SHALL get `409 GENERATION_IN_PROGRESS` without calling the AI. The slot SHALL be released when the brief ends in any way. A running brief SHALL NOT block a generate request from the same IP, and a running generation SHALL NOT block a brief.

#### Scenario: Second brief while one runs
- **WHEN** an IP sends a valid brief request while its previous one is waiting for the AI
- **THEN** the response status is 409 with code `GENERATION_IN_PROGRESS`

#### Scenario: Brief during a generation
- **WHEN** an IP has a generation running and sends a valid brief request
- **THEN** the brief request reaches the AI

### Requirement: Day brief failures
Without an API key the endpoint SHALL answer a valid request with `503 AI_UNAVAILABLE`. It SHALL map provider failures, timeouts and client disconnects like the generate endpoint: the AI call is aborted after 30 seconds with `504 AI_TIMEOUT`, a disconnect aborts the call and releases the slot, and request bodies, prompts, model output and photo lookups' place names SHALL NOT be logged.

#### Scenario: No API key
- **WHEN** the server runs without `GEMINI_API_KEY` and receives a valid brief request
- **THEN** the response status is 503 with code `AI_UNAVAILABLE`

#### Scenario: Slow model
- **WHEN** the AI does not answer a brief within 30 seconds
- **THEN** the response status is 504 with code `AI_TIMEOUT` and the slot is released
