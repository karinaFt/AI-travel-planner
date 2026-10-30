# trip-setup Specification

## Purpose

Lets a user describe the basics of the trip they want planned (where, when, budget, currency and how many travelers) and guarantees that only complete, valid trip details move on to the next planning step.

## Requirements

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

### Requirement: Destination validation
The destination SHALL be required. After leading and trailing whitespace is trimmed, it SHALL be 2 to 100 characters long.

#### Scenario: Missing destination
- **WHEN** a user submits the form with an empty or whitespace-only destination
- **THEN** the destination field shows "Enter a destination"

#### Scenario: Too short or too long
- **WHEN** a user enters a one-character destination or a destination longer than 100 characters and submits
- **THEN** the destination field shows an error stating the 2–100 character limit

#### Scenario: Trimmed value
- **WHEN** a user enters "  Lisbon, Portugal  " and submits an otherwise valid form
- **THEN** the destination is accepted as "Lisbon, Portugal"

### Requirement: Trip date validation
Start and end dates SHALL be required real calendar dates. The start date SHALL NOT be earlier than today in the user's local time zone. The end date SHALL NOT be earlier than the start date. A trip SHALL span at most 14 days, counting both the start and end dates.

#### Scenario: End date before start date
- **WHEN** a user picks a start date of 2026-11-10 and an end date of 2026-11-08 and submits
- **THEN** the end date field shows "End date can't be before the start date"
- **AND** the form is not submitted

#### Scenario: Single-day trip
- **WHEN** a user picks the same start and end date and submits an otherwise valid form
- **THEN** the dates are accepted as a 1-day trip

#### Scenario: Fourteen days allowed, fifteen rejected
- **WHEN** a user picks 2026-11-01 to 2026-11-14
- **THEN** the dates are accepted as a 14-day trip
- **AND WHEN** the user changes the end date to 2026-11-15
- **THEN** the end date field shows "Trips can be at most 14 days long"

#### Scenario: Start date in the past
- **WHEN** a user picks a start date earlier than today
- **THEN** the start date field shows "Start date can't be in the past"

#### Scenario: Missing or impossible date
- **WHEN** a date field is empty or holds a value that is not a real calendar date
- **THEN** that field shows "Enter a valid date"

### Requirement: Budget validation
The total budget SHALL be required. It SHALL be a plain decimal number using a dot as the decimal separator, greater than 0, at most 10,000,000, with at most two decimal places. Leading and trailing spaces SHALL be ignored.

#### Scenario: Zero or negative budget
- **WHEN** a user enters `0` or `-200` as the budget and submits
- **THEN** the budget field shows "Budget must be greater than 0"

#### Scenario: Not a number
- **WHEN** a user enters `abc`, `12,5,0`, `1e5` or `Infinity` and submits
- **THEN** the budget field shows "Enter an amount like 1500 or 1500.50"

#### Scenario: Too many decimals or too large
- **WHEN** a user enters `100.555` or `20000000` and submits
- **THEN** the budget field shows an error stating the two-decimal limit or the 10,000,000 maximum respectively

#### Scenario: Valid budget
- **WHEN** a user enters ` 1500.5 ` and submits an otherwise valid form
- **THEN** the budget is accepted as the number 1500.5

### Requirement: Currency selection
The currency SHALL be chosen from this fixed list of ISO 4217 codes: USD, EUR, GBP, UAH, PLN, CZK, CHF, JPY, CAD, AUD. Each option SHALL show the code together with the currency name.

#### Scenario: Choosing a currency
- **WHEN** a user selects "UAH — Ukrainian hryvnia" and submits a valid form
- **THEN** the submitted trip basics have currency `UAH`

#### Scenario: Tampered value
- **WHEN** the currency control's value is changed to an unsupported code (for example through browser developer tools) and the form is submitted
- **THEN** the currency field shows "Choose a currency from the list" and the form is not submitted

### Requirement: Traveler count validation
The number of travelers SHALL be required and SHALL be a whole number from 1 to 20.

#### Scenario: Invalid traveler count
- **WHEN** a user enters `0`, `21`, `2.5` or `two` as the number of travelers and submits
- **THEN** the travelers field shows "Enter a whole number from 1 to 20"

### Requirement: Accessible error messaging
Each validation error SHALL be shown next to its field in plain language. It SHALL be linked to the field so that assistive technology announces it, and the field SHALL be marked invalid. Errors SHALL NOT appear for a field before the user has left it or submitted the form. Once shown, an error SHALL update as the user types and disappear when the value becomes valid. On a submit attempt with errors, focus SHALL move to the first invalid field.

#### Scenario: Untouched form
- **WHEN** a user opens `/plan` and has not interacted with any field
- **THEN** no error messages are shown

#### Scenario: Leaving a field
- **WHEN** a user focuses the destination field, leaves it empty and moves to the next field
- **THEN** the destination field shows its error and is marked invalid

#### Scenario: Submitting an invalid form
- **WHEN** a user submits the form with the destination and budget invalid
- **THEN** both fields show their errors and are marked invalid
- **AND** focus moves to the destination field
- **AND** the form is not submitted

#### Scenario: Correcting an error
- **WHEN** a user fixes the value of a field that shows an error
- **THEN** that field's error disappears without another submit

### Requirement: Robust handling of malformed input
The form SHALL never crash or submit invalid values, whatever the input: pasted text in numeric fields, very long strings, or values changed through browser developer tools. Such input SHALL produce the matching validation error.

#### Scenario: Pasted text in a numeric field
- **WHEN** a user pastes "1e400" into the budget field and submits
- **THEN** the budget field shows a validation error
- **AND** the page keeps working and no errors are logged to the browser console

### Requirement: Valid submission
When the user submits a valid form, the application SHALL produce normalized trip preferences:
- trimmed destination;
- the starting point, trimmed, or absent when empty;
- `YYYY-MM-DD` dates;
- numeric budget and currency code;
- integer traveler count;
- travel style and pace;
- trimmed interests in the order they were added.

#### Scenario: Normalized values
- **WHEN** a user submits a valid form with the destination "  Lisbon  ", an empty starting point and the interests " wine " and "markets"
- **THEN** the trip preferences have the destination "Lisbon", no starting point and the interests "wine" and "markets" in that order

### Requirement: Trip review
After a valid submission, the application SHALL show a review of the trip preferences: the trip length in days, the budget formatted in the chosen currency, the number of travelers, and "Not specified" for a missing starting point and "None" for an empty interests list. The review SHALL offer an "Edit details" action that returns to the form with all values kept, and a "Generate itinerary" action that starts generation.

#### Scenario: Summary after submitting
- **WHEN** a user submits Lisbon from Kyiv, 2026-11-10 to 2026-11-12, budget 1500 EUR, 2 travelers, style food, pace relaxed, interests "wine" and "markets"
- **THEN** a review shows "Lisbon", "Kyiv", the date range, "3 days", "€1,500.00", "2 travelers", "Food", "Relaxed" and "wine, markets"

#### Scenario: Optional values left empty
- **WHEN** a user submits a valid form without a starting point and without interests
- **THEN** the review shows "Not specified" for the starting point and "None" for interests

#### Scenario: Editing after the summary
- **WHEN** a user activates "Edit details" on the review
- **THEN** the form is shown again with every previously entered value, including the selected style, pace and interests

#### Scenario: Generation offered
- **WHEN** the review is shown
- **THEN** it offers a "Generate itinerary" button and no "coming soon" note

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
