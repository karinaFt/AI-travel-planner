# Spec Delta

## RENAMED Requirements

- FROM: `### Requirement: Edits are kept for the tab`
- TO: `### Requirement: Edits are saved`

## MODIFIED Requirements

### Requirement: Edits are saved
The edited trip SHALL be saved after every change (see `saved-trips`), so reopening the trip page or reloading it shows the edits. Switching days SHALL close an open form or delete confirmation without saving.

#### Scenario: Returning to the trip
- **WHEN** a user deletes "Lunch", goes back to the previous page and then forward to the trip page
- **THEN** the trip page does not list "Lunch"

#### Scenario: Reloading the trip
- **WHEN** a user deletes "Lunch" and reloads the page
- **THEN** the trip page does not list "Lunch"

#### Scenario: Switching days with an open form
- **WHEN** the form for "Lunch" is open with unsaved changes and the user selects "Day 2"
- **THEN** the form is closed and "Lunch" is unchanged
