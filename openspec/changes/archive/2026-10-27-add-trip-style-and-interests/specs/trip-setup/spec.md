# Spec Delta

## RENAMED Requirements

- FROM: `### Requirement: Trip basics form`
- TO: `### Requirement: Trip preferences form`

## MODIFIED Requirements

### Requirement: Trip preferences form
The page `/plan` SHALL show the heading "Plan a trip" and a form with these fields, each with a visible label:
- destination;
- starting from (marked optional);
- start date and end date;
- total budget and currency;
- number of travelers;
- travel style and pace;
- interests.

The form SHALL have a submit button labeled "Review trip".

#### Scenario: Form is shown
- **WHEN** a user opens `/plan`
- **THEN** every listed field is visible and programmatically associated with its label
- **AND** the travel style and pace options are each grouped under their own group label
- **AND** a "Review trip" button is shown

#### Scenario: Defaults
- **WHEN** a user opens `/plan` for the first time in a browser tab
- **THEN** the currency is preset to EUR, the number of travelers to 1 and the pace to balanced
- **AND** no travel style is selected, the interests list is empty, and the other fields are empty

### Requirement: Valid submission
When the user submits a valid form, the application SHALL produce normalized trip preferences:
- trimmed destination;
- the starting point, trimmed, or absent when empty;
- `YYYY-MM-DD` dates;
- numeric budget and currency code;
- integer traveler count;
- travel style and pace;
- trimmed interests in the order they were added.

It SHALL then show a review of all of them: the trip length in days, the budget formatted in the chosen currency, the number of travelers, and "Not specified" for a missing starting point and "None" for an empty interests list. The review SHALL offer an "Edit details" action that returns to the form with all values kept, and SHALL say that itinerary generation is the next step.

#### Scenario: Summary after submitting
- **WHEN** a user submits Lisbon from Kyiv, 2026-11-10 to 2026-11-12, budget 1500 EUR, 2 travelers, style food, pace relaxed, interests "wine" and "markets"
- **THEN** a review shows "Lisbon", "Kyiv", the date range, "3 days", "€1,500.00", "2 travelers", "Food", "Relaxed" and "wine, markets"

#### Scenario: Optional values left empty
- **WHEN** a user submits a valid form without a starting point and without interests
- **THEN** the review shows "Not specified" for the starting point and "None" for interests

#### Scenario: Editing after the summary
- **WHEN** a user activates "Edit details" on the review
- **THEN** the form is shown again with every previously entered value, including the selected style, pace and interests

## ADDED Requirements

### Requirement: Starting point
The "Starting from" field SHALL be optional. An empty or whitespace-only value SHALL mean "not provided". A provided value SHALL be 2 to 100 characters long after trimming. The field SHALL explain that it is used to plan the arrival and departure days.

#### Scenario: Left empty
- **WHEN** a user leaves "Starting from" empty and submits an otherwise valid form
- **THEN** the form is submitted and the preferences have no starting point

#### Scenario: Too short
- **WHEN** a user enters "K" as the starting point and submits
- **THEN** the field shows "Starting point must be 2–100 characters"

### Requirement: Budget scope
The budget field SHALL state that the budget is for the trip at the destination and does not include travel to and from it.

#### Scenario: Reading the budget hint
- **WHEN** a user looks at the total budget field
- **THEN** its description says that getting to and from the destination is not included

### Requirement: Travel style selection
The user SHALL choose exactly one travel style: Relaxation, Adventure, Culture, Food or Nature. Each option SHALL show a one-line description. No style SHALL be preselected, and a style SHALL be required.

#### Scenario: Missing travel style
- **WHEN** a user submits without choosing a travel style
- **THEN** the travel style group shows "Choose a travel style" and the form is not submitted

#### Scenario: Keyboard selection
- **WHEN** a keyboard user tabs into the travel style group and presses the arrow keys
- **THEN** the selection moves between the options and the selected option is announced

### Requirement: Pace selection
The user SHALL choose exactly one pace: Relaxed, Balanced or Packed. Each option SHALL show a one-line description of how full the days are. Balanced SHALL be preselected.

#### Scenario: Changing the pace
- **WHEN** a user selects "Packed" and submits a valid form
- **THEN** the preferences have pace `packed`

#### Scenario: Tampered pace value
- **WHEN** the submitted pace value is not one of the allowed values (for example changed through developer tools)
- **THEN** the pace group shows "Choose a pace" and the form is not submitted

### Requirement: Interests list
The user SHALL be able to add free-text interests and remove them. Each interest SHALL be trimmed and 2 to 40 characters long. The list SHALL hold at most 10 interests and SHALL NOT contain duplicates ignoring case. An empty list SHALL be allowed. Pressing Enter in the interest input SHALL add the interest and SHALL NOT submit the form.

#### Scenario: Adding an interest
- **WHEN** a user types "street art" in the interest input and presses Enter or activates "Add"
- **THEN** "street art" appears in the interests list, the input is cleared, and the form is not submitted

#### Scenario: Removing an interest
- **WHEN** a user activates the remove control labeled "Remove street art"
- **THEN** "street art" is removed from the list

#### Scenario: Invalid interest
- **WHEN** a user tries to add "a" or a text longer than 40 characters
- **THEN** the interest is not added and the input shows "Interests must be 2–40 characters"

#### Scenario: Duplicate interest
- **WHEN** a user tries to add "Museums" while "museums" is already in the list
- **THEN** the interest is not added and the input shows "That interest is already in the list"

#### Scenario: Interest limit
- **WHEN** the list already holds 10 interests
- **THEN** the add control is disabled and the field explains that up to 10 interests can be added

### Requirement: Draft retention
Values entered on `/plan`, whether submitted or not, SHALL be kept while the user moves between pages of the application in the same browser tab, and SHALL be shown again when the user returns to `/plan`. Keeping them across a full page reload is not required.

#### Scenario: Leaving and returning to the form
- **WHEN** a user fills in the destination, budget, a travel style and two interests, opens the home page, and returns to `/plan`
- **THEN** the form shows the same destination, budget, travel style and interests

#### Scenario: Returning after reviewing
- **WHEN** a user reaches the review, opens the home page, and returns to `/plan`
- **THEN** the form is shown with all reviewed values
