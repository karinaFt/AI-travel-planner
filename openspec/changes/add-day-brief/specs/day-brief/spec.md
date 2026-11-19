# Spec Delta

## ADDED Requirements

### Requirement: Create day overview button
A day with at least one activity and no saved overview SHALL show a "Day overview" section with a short explanation and a "Create day overview" button, between the day heading and the activity list. Activating it SHALL send one `POST /api/days/brief` for that day. A day without activities SHALL show no button. No overview SHALL be requested without the user activating the button.

#### Scenario: Opening a day
- **WHEN** a user opens day 2, which has activities and no overview
- **THEN** the panel shows "Create day overview" and no request to `/api/days/brief` has been sent

#### Scenario: Creating the overview
- **WHEN** the user activates "Create day overview"
- **THEN** one request to `/api/days/brief` is sent with day 2's activities

#### Scenario: Empty day
- **WHEN** a day has no activities
- **THEN** the panel shows no "Create day overview" button

### Requirement: Overview request content
The request SHALL carry the trip's destination, currency, travelers, travel style, pace and interests, the day's number, date and title, and each activity's ID, title, category, start time, duration and estimated cost, with its description cut to 160 characters.

#### Scenario: Long description
- **WHEN** an activity's description has 400 characters
- **THEN** the request sends its first 160 characters

### Requirement: Overview loading state
While the overview is being created, the section SHALL show a skeleton in the shape of the blocks, the button SHALL be replaced by a disabled "Creating overview…" state, and a polite live region SHALL announce "Creating the day overview". The skeleton SHALL not animate when the user prefers reduced motion. Switching to another day or leaving the page SHALL cancel the request.

#### Scenario: Waiting for the overview
- **WHEN** the request is running
- **THEN** the skeleton is shown and the user cannot start a second request for the day

#### Scenario: Switching days cancels
- **WHEN** the user selects day 3 while day 2's overview is being created
- **THEN** day 2's request is aborted and no overview is saved for day 2

### Requirement: Overview errors
When the request fails, the section SHALL show a short message for the cause and a "Try again" button, and keep the activity list usable. The messages SHALL be:
- `RATE_LIMITED`: try again in N seconds, with "Try again" enabled after `Retry-After`;
- `GENERATION_IN_PROGRESS`: another overview is being created;
- `AI_UNAVAILABLE`: overviews are busy or unavailable right now;
- `AI_TIMEOUT`, `AI_INVALID_RESPONSE`, `AI_PROVIDER_ERROR` and other failures: the overview couldn't be created;
- a network failure or a client timeout after 90 seconds: check the connection.

#### Scenario: Busy model
- **WHEN** the API answers `503 AI_UNAVAILABLE`
- **THEN** the section shows the busy message and "Try again"

#### Scenario: Retry
- **WHEN** the user activates "Try again" after a failure
- **THEN** a new request for the same day is sent

### Requirement: Overview is saved with the trip
A successful overview SHALL be stored on the day as `brief` (`blocks`, `generatedAt`, and `basedOn` set to the signature of the activities that were sent) through the same validated edit path as activity changes, so it is saved with the trip and shown again after a reload without a new request. Trips saved without overviews SHALL stay valid.

#### Scenario: Reload keeps the overview
- **WHEN** a user creates day 2's overview and reloads the page
- **THEN** day 2 shows the same overview and no request to `/api/days/brief` is sent

#### Scenario: Older saved trip
- **WHEN** a trip saved before this change is opened
- **THEN** it opens normally and its days offer "Create day overview"

### Requirement: Overview layout
The overview SHALL be shown as one card in this order, whatever order the blocks came in: `highlight`, then `route`, then `tip` and `booking` cards in a grid, then the budget table. The grid SHALL have two columns at 640 px and wider and one column below. The card SHALL use the app's theme: Fraunces for the highlight title, `mint` for tips, `coral-soft` for bookings, `sky` for the route, and an icon from `lucide-react` before each block heading. Each block SHALL have a visible heading ("Route", "Tip", "Book ahead", "Day budget"). A block type the client does not know SHALL render nothing. The card SHALL show when it was created.

#### Scenario: Block order
- **WHEN** the saved blocks are `tip`, `highlight`, `route`
- **THEN** the card shows the highlight first, then the route, then the tip

#### Scenario: Narrow screen
- **WHEN** the viewport is 375 px wide
- **THEN** tip and booking cards are stacked in one column and nothing scrolls sideways

### Requirement: Highlight photo display
A `highlight` with an `image` SHALL show the photo at a 16:9 ratio, cropped to fill, loaded lazily, with alt text "Photo of <place>", and a credit line "Photo: Wikimedia Commons" linking to `image.sourceUrl` in a new tab. Without an image, or when the image fails to load, it SHALL show a tinted panel with the icon of the linked activity's category (a generic map-pin icon without one) and no broken image.

#### Scenario: Photo shown
- **WHEN** the highlight has an image for "Belém Tower"
- **THEN** the card shows an image with alt "Photo of Belém Tower" and a "Photo: Wikimedia Commons" link

#### Scenario: Photo fails to load
- **WHEN** the image URL answers with an error
- **THEN** the image is replaced by the tinted panel with the category icon

### Requirement: Route timeline
A `route` block SHALL be an ordered list of steps. Each step SHALL show the two activities' start times and titles, an icon and label for the mode ("Walk", "Transit", "Taxi", "Other"), the minutes when given ("12 min") and the note.

#### Scenario: Walking step
- **WHEN** a step goes from "09:30 Cathedral" to "11:00 Market" on foot in 12 minutes
- **THEN** the step reads "09:30 Cathedral → 11:00 Market · Walk · 12 min" followed by its note

### Requirement: Day budget table
When the overview has a `budgetNote`, the card SHALL show a "Day budget" table computed in the browser from the day's current activities: one row per activity with a cost above 0, sorted from most to least expensive, with the amount in the trip currency, its whole-percent share of the day's cost, and a bar whose width is that share. Free activities SHALL be summed up in one row ("Free: N activities"). The model's note SHALL be shown under the table. The table SHALL use exact money math (`sumMoney`).

#### Scenario: Cost shares
- **WHEN** the day has "Dinner" €45, "Museum" €15, "Tram" €40 and "Park" free
- **THEN** the rows read "Dinner €45.00 45%", "Tram €40.00 40%", "Museum €15.00 15%" and "Free: 1 activity"

#### Scenario: Costs change after the overview
- **WHEN** the user changes "Dinner" to €60 after the overview was created
- **THEN** the table shows "Dinner €60.00" without a new request

### Requirement: Links to activities
Each activity referenced by a `highlight`, `route`, `tip` or `booking` block SHALL be shown as a button with the activity's title. Activating it SHALL scroll the activity into view, move focus to it and highlight it for about 2 seconds. Scrolling SHALL be instant when the user prefers reduced motion. A reference to an activity that is no longer on the day SHALL be shown as plain text, not a button.

#### Scenario: Jump to a booking
- **WHEN** the user activates "Opera" in a `booking` block
- **THEN** the "Opera" activity is focused and visibly highlighted

#### Scenario: Deleted activity
- **WHEN** a tip references "Lunch" and the user has deleted "Lunch"
- **THEN** the tip shows "Lunch" as plain text

### Requirement: Stale overview
When the day's current activities no longer match the overview's `basedOn` signature (an activity was added, removed, moved, or its title, category, time, duration or cost changed), the card SHALL keep showing the overview and add a notice "The plan for this day changed since this overview was created" with an "Update overview" button. The overview SHALL be replaced only when the user activates it. Each overview SHALL also have an "Update overview" action when it is not stale.

#### Scenario: Activity added after the overview
- **WHEN** the user adds "Coffee" to a day that has an overview
- **THEN** the overview stays and the stale notice with "Update overview" is shown
- **AND** no request to `/api/days/brief` is sent

#### Scenario: Updating
- **WHEN** the user activates "Update overview"
- **THEN** one request is sent, and on success the new overview replaces the old one and the notice disappears

#### Scenario: Failed update keeps the old overview
- **WHEN** an update fails
- **THEN** the old overview is still shown with the error message and "Try again"
