# Spec Delta

## ADDED Requirements

### Requirement: Warm-up request
When the app loads in a browser tab, the client SHALL send one `GET /api/health` request in the background, so a sleeping server starts waking before the user generates. Its result SHALL be ignored and SHALL never show an error.

#### Scenario: App opened
- **WHEN** a user opens any page of the app
- **THEN** the client sends `GET /api/health` once for that tab

#### Scenario: Server unreachable
- **WHEN** the warm-up request fails
- **THEN** no error is shown and the app works as before

## MODIFIED Requirements

### Requirement: Loading state
While a generation request is running, the review SHALL show an announced status "Generating your itinerary…" with a hint that it usually takes up to half a minute, and a "Cancel" button. The user SHALL NOT be able to start a second request until the first one ends. After 15 seconds the status SHALL add "The server may be waking up after a pause. This can take up to a minute."

#### Scenario: Waiting for the API
- **WHEN** a user activates "Generate itinerary" and the API has not answered yet
- **THEN** a status region announces "Generating your itinerary…"
- **AND** a "Cancel" button is shown and no "Generate itinerary" button can be activated

#### Scenario: Slow answer
- **WHEN** the API has not answered 15 seconds after the user activated "Generate itinerary"
- **THEN** the status also says "The server may be waking up after a pause. This can take up to a minute."

### Requirement: Client timeout
The client SHALL abort a generation request that has not finished within 90 seconds and show a timeout error with "Try again".

#### Scenario: No answer in time
- **WHEN** the API has not answered 90 seconds after the user activated "Generate itinerary"
- **THEN** the request is aborted
- **AND** the user sees "Generating the itinerary took too long. Please try again." with "Try again"
