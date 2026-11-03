# Spec Delta

## MODIFIED Requirements

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
