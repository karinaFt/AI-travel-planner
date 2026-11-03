# itinerary-request Specification

## Purpose

Defines how the client asks the API for an itinerary from the reviewed trip: the request, the loading, cancel and timeout behavior, how failures are shown and retried, how the entered values are kept, and the page that opens a generated trip.

## Requirements

### Requirement: Generate request
When the user activates "Generate itinerary" on the review, the client SHALL send the reviewed trip preferences as JSON to `POST /api/itineraries/generate` on the same origin. A success body SHALL be accepted only if it passes the shared trip schema; any other success body SHALL be treated as an unusable response.

#### Scenario: Request sent
- **WHEN** a user reviews a Lisbon trip and activates "Generate itinerary"
- **THEN** one `POST` request to `/api/itineraries/generate` is sent with a JSON body equal to the reviewed preferences

#### Scenario: Malformed success body
- **WHEN** the API answers 200 with a body that does not pass the trip schema
- **THEN** the user sees the "could not be generated" error with "Try again"

### Requirement: Loading state
While a generation request is running, the review SHALL show an announced status "Generating your itinerary…" with a hint that it usually takes up to half a minute, and a "Cancel" button. The user SHALL NOT be able to start a second request until the first one ends. After 15 seconds the status SHALL add "The server may be waking up after a pause. This can take up to a minute."

#### Scenario: Waiting for the API
- **WHEN** a user activates "Generate itinerary" and the API has not answered yet
- **THEN** a status region announces "Generating your itinerary…"
- **AND** a "Cancel" button is shown and no "Generate itinerary" button can be activated

#### Scenario: Slow answer
- **WHEN** the API has not answered 15 seconds after the user activated "Generate itinerary"
- **THEN** the status also says "The server may be waking up after a pause. This can take up to a minute."

### Requirement: Cancel generation
Activating "Cancel" SHALL abort the running request and return to the review with all values kept and a short "Generation cancelled" notice. Leaving the page while a request runs SHALL abort it too, without showing an error.

#### Scenario: User cancels
- **WHEN** a user activates "Cancel" while generation is running
- **THEN** the request is aborted
- **AND** the review shows the same trip details, the "Generate itinerary" button and a "Generation cancelled" notice

#### Scenario: Leaving the page
- **WHEN** a user opens the home page while generation is running
- **THEN** the request is aborted and no error is shown or logged

### Requirement: Client timeout
The client SHALL abort a generation request that has not finished within 90 seconds and show a timeout error with "Try again".

#### Scenario: No answer in time
- **WHEN** the API has not answered 90 seconds after the user activated "Generate itinerary"
- **THEN** the request is aborted
- **AND** the user sees "Generating the itinerary took too long. Please try again." with "Try again"

### Requirement: Generation errors
Every failed generation SHALL show an error panel with a message users understand and SHALL keep the review's trip details. For API errors the message SHALL be the error body's safe message. A network failure SHALL say that the server could not be reached. The panel SHALL be announced to assistive technology and SHALL offer "Edit details".

#### Scenario: Service busy
- **WHEN** the API answers `503 AI_UNAVAILABLE`
- **THEN** the user sees "The itinerary service is busy right now. Please try again later." with "Try again" and "Edit details"

#### Scenario: Server unreachable
- **WHEN** the request fails because the network or server is unreachable
- **THEN** the user sees a message that the server could not be reached, with "Try again"

#### Scenario: Error body unreadable
- **WHEN** the API answers 500 with a body that is not the error envelope
- **THEN** the user sees "Something went wrong on our side. Please try again." with "Try again"

### Requirement: Retry
"Try again" SHALL send the same preferences again. After `429 RATE_LIMITED`, the error SHALL say how long to wait, from the `Retry-After` header, and "Try again" SHALL stay disabled until that time has passed. After `VALIDATION_ERROR`, only "Edit details" SHALL be offered. There SHALL be no automatic retry.

#### Scenario: Retry after a failure
- **WHEN** a generation failed with `502 AI_INVALID_RESPONSE` and the user activates "Try again"
- **THEN** a new request with the same preferences is sent and the loading state is shown

#### Scenario: Rate limited
- **WHEN** the API answers `429 RATE_LIMITED` with `Retry-After: 40`
- **THEN** the error says to try again in 40 seconds and "Try again" is disabled
- **AND** after 40 seconds "Try again" is enabled

#### Scenario: Rejected preferences
- **WHEN** the API answers `400 VALIDATION_ERROR`
- **THEN** the error offers "Edit details" and no "Try again"

### Requirement: Values kept on failure
After an error, a cancel or a timeout, "Edit details" SHALL show the form with every reviewed value, and the values SHALL still be kept when the user leaves and returns to `/plan`.

#### Scenario: Editing after an error
- **WHEN** a generation fails and the user activates "Edit details"
- **THEN** the form shows every value from the review

### Requirement: Generated trip page
On success the client SHALL save the trip (see `saved-trips`) and open `/trips/<trip id>`, which shows the itinerary view of that trip. An ID that isn't saved in this browser SHALL show a "Trip not found" heading, explain that trips are saved only in the browser they were planned in and may have been deleted, and link to `/trips` and `/plan`.

#### Scenario: Successful generation
- **WHEN** the API returns a 3-day Lisbon trip with the ID `abc`
- **THEN** the app shows `/trips/abc` with the heading "Lisbon", "3 days", day tabs for the three days and day 1's title and activities

#### Scenario: Unknown trip
- **WHEN** a user opens `/trips/unknown` directly
- **THEN** a "Trip not found" heading and links to My trips and to plan a trip are shown
- **AND** the tab title is "Trip not found · AI Travel Planner"

#### Scenario: Form kept after success
- **WHEN** a user generates a trip and then opens `/plan`
- **THEN** the form shows the values of the generated trip

### Requirement: Warm-up request
When the app loads in a browser tab, the client SHALL send one `GET /api/health` request in the background, so a sleeping server starts waking before the user generates. Its result SHALL be ignored and SHALL never show an error.

#### Scenario: App opened
- **WHEN** a user opens any page of the app
- **THEN** the client sends `GET /api/health` once for that tab

#### Scenario: Server unreachable
- **WHEN** the warm-up request fails
- **THEN** no error is shown and the app works as before
