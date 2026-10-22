# trip-setup Specification

## Purpose

Lets a user describe the basics of the trip they want planned (where, when, budget, currency and how many travelers) and guarantees that only complete, valid trip details move on to the next planning step.

## Requirements

### Requirement: Trip basics form
The page `/plan` SHALL show the heading "Plan a trip" and a form with these fields, each with a visible label: destination, start date, end date, total budget, currency and number of travelers. The form SHALL have a submit button labeled "Continue".

#### Scenario: Form is shown
- **WHEN** a user opens `/plan`
- **THEN** every listed field is visible and programmatically associated with its label
- **AND** a "Continue" button is shown

#### Scenario: Defaults
- **WHEN** a user opens `/plan`
- **THEN** the currency is preset to EUR, the number of travelers is preset to 1, and the other fields are empty

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
When the user submits a valid form, the application SHALL produce normalized trip basics: trimmed destination, `YYYY-MM-DD` dates, numeric budget, currency code and integer traveler count. It SHALL show a summary of them with the trip length in days, the budget formatted in the chosen currency, and the number of travelers. The summary SHALL offer an "Edit details" action that returns to the form with all values kept.

#### Scenario: Summary after submitting
- **WHEN** a user submits Lisbon, 2026-11-10 to 2026-11-12, budget 1500, EUR, 2 travelers
- **THEN** a summary shows "Lisbon", the date range, "3 days", "€1,500.00" and "2 travelers"

#### Scenario: Editing after the summary
- **WHEN** a user activates "Edit details" on the summary
- **THEN** the form is shown again with every previously entered value
