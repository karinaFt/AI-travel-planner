# Spec Delta

## ADDED Requirements

### Requirement: Trips are saved in the browser
The client SHALL save every generated trip in `localStorage` under the key `ai-travel-planner:trips`, as `{ "version": 1, "trips": [...] }` holding complete `Trip` objects. A trip SHALL be saved before its page opens. Reloading the page, or opening the app in a new tab of the same browser, SHALL show saved trips.

#### Scenario: Reloading a trip page
- **WHEN** a user generates a 3-day Lisbon trip and reloads its page
- **THEN** the trip page shows the Lisbon trip with the same days and activities

#### Scenario: Stored format
- **WHEN** a trip is saved
- **THEN** `localStorage["ai-travel-planner:trips"]` holds JSON with `version` 1 and a `trips` array containing that trip

### Requirement: Edits are saved automatically
Every change made on the trip page SHALL be saved to `localStorage` as soon as it is applied, with no Save button. Each save SHALL read the current stored data first and replace only the saved trip, so trips saved by other tabs are kept.

#### Scenario: Edit survives a reload
- **WHEN** a user changes the cost of "Lunch" to 25.50 and reloads the page
- **THEN** "Lunch" shows "€25.50"

#### Scenario: Another tab's trip is kept
- **WHEN** tab A saves a Lisbon trip and then tab B, opened before it, edits a Porto trip
- **THEN** storage holds both the Lisbon and the Porto trip

### Requirement: My trips page
The app SHALL have a "My trips" page at `/trips` with the tab title "My trips · AI Travel Planner". It SHALL list saved trips by creation time, newest first. Each item SHALL show the destination as a link to the trip page, the dates and number of days, the number of travelers and the budget.

#### Scenario: Listing trips
- **WHEN** a user has saved a Porto trip and later a Lisbon trip, and opens `/trips`
- **THEN** "Lisbon" is listed before "Porto"
- **AND** each item shows its dates, length, travelers and budget

#### Scenario: Opening a trip
- **WHEN** a user activates "Lisbon" in the list
- **THEN** the Lisbon trip page opens without a full page reload

### Requirement: No saved trips
When no trips are saved, the My trips page SHALL say so and link to `/plan`.

#### Scenario: Empty list
- **WHEN** a user with no saved trips opens `/trips`
- **THEN** the page says there are no saved trips yet and shows a "Plan a trip" link

### Requirement: Delete a saved trip
Each listed trip SHALL have a "Delete" button whose accessible name includes the destination and dates. It SHALL show an in-page confirmation, never a browser dialog, with focus on "Keep". "Delete" SHALL remove the trip from storage and the list, announce it in a polite live region, and move focus to the next trip's link, else the previous one, else "Plan a trip".

#### Scenario: Deleting a trip
- **WHEN** a user activates "Delete" for the Lisbon trip and confirms
- **THEN** Lisbon is no longer listed or stored, `Deleted "Lisbon".` is announced, and focus is on the next trip's link

#### Scenario: Keeping a trip
- **WHEN** the confirmation is shown and the user presses Escape or activates "Keep"
- **THEN** the trip stays and focus returns to its "Delete" button

### Requirement: Trip limit
The client SHALL keep at most 50 saved trips and SHALL never delete a trip without the user asking. With 50 trips saved, the review step SHALL show a message to delete a trip first, with a link to My trips, instead of the "Generate" button.

#### Scenario: Limit reached before generating
- **WHEN** 50 trips are saved and the user reaches the review step
- **THEN** no "Generate" button is shown, the message and a "My trips" link are shown, and no generate request is sent

#### Scenario: Limit reached by another tab
- **WHEN** another tab saves the 50th trip while a generation is running, and the generation succeeds
- **THEN** the new trip opens but is not saved, and its page shows the unsaved notice

### Requirement: Unsaved trip notice
When a trip can't be saved (storage full, unavailable or blocked, or the trip limit), the trip SHALL stay open and editable for the tab. Its page SHALL show a notice that it isn't saved, with the reason, a "Try again" button and a link to My trips. The notice SHALL disappear once a save succeeds. Storage errors SHALL never break the page.

#### Scenario: Storage full
- **WHEN** `localStorage.setItem` throws a quota error while a generated trip is saved
- **THEN** the trip page opens with the notice and the itinerary can still be edited

#### Scenario: Trying again
- **WHEN** the user frees space and activates "Try again"
- **THEN** the trip is saved and the notice disappears

### Requirement: Storage unavailable
When `localStorage` can't be read at all, the app SHALL work with trips kept only for the tab. My trips SHALL say that this browser isn't letting the app save trips.

#### Scenario: Blocked storage
- **WHEN** accessing `localStorage` throws and the user generates a trip
- **THEN** the trip page opens with the unsaved notice and `/trips` shows the storage notice

### Requirement: Invalid saved data
Stored trips that fail `tripSchema` SHALL be skipped. Stored data that isn't valid JSON or has an unknown version SHALL be treated as having no readable trips. Before the main key is written again, the unreadable data SHALL be copied to a key starting with `ai-travel-planner:trips:backup:`. If the backup can't be written, the main key SHALL not be written.

#### Scenario: One broken trip
- **WHEN** storage holds a valid Porto trip and an entry without an itinerary, and the user edits Porto
- **THEN** the backup key holds the broken entry and the main key holds only Porto

#### Scenario: Broken JSON
- **WHEN** the stored value is `{not json`
- **THEN** My trips shows the empty state and the raw text is copied to a backup key before any save

### Requirement: Unreadable trips notice
When saved data was skipped as invalid, the My trips page SHALL say how many saved trips couldn't be read and that they were set aside.

#### Scenario: Notice on the list
- **WHEN** storage holds two valid trips and one invalid entry and the user opens `/trips`
- **THEN** two trips are listed with a notice that 1 saved trip couldn't be read

### Requirement: Changes from other tabs
The My trips list and an open trip page SHALL follow trips added, changed or deleted in other tabs, using the `storage` event. When the open trip changes in another tab, its page SHALL show the new version, close any open form or confirmation, and announce "This trip was updated in another tab."

#### Scenario: Edited elsewhere
- **WHEN** the Lisbon trip is open in tabs A and B, and tab B deletes "Lunch"
- **THEN** tab A no longer lists "Lunch" and announces the update

#### Scenario: Added elsewhere
- **WHEN** `/trips` is open in tab A and tab B generates a Porto trip
- **THEN** tab A lists "Porto" first

### Requirement: Trip deleted in another tab
When the open trip is deleted in another tab, its page SHALL show a "Trip deleted" heading, explain that it was deleted in another tab, and link to My trips and Plan a trip.

#### Scenario: Deleted elsewhere
- **WHEN** the Lisbon trip is open in tab A and tab B deletes it
- **THEN** tab A shows "Trip deleted" with links to My trips and Plan a trip
