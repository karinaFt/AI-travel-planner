# activity-editing Specification

## Purpose

Defines editing a generated trip on the trip page: editing, moving, adding and deleting activities, form validation, the day limit, start-time order, a valid trip after every change, feedback and focus, and keeping the edits for the tab.

## Requirements

### Requirement: Edit an activity
Each activity on the day timeline SHALL have an "Edit" button whose accessible name includes the activity title. Activating it SHALL replace that activity in the list with a form holding its current title, day, start time, duration in minutes, category, estimated cost and description, and SHALL move focus to the title field. Saving a valid form SHALL apply the changes to the trip and close the form.

#### Scenario: Changing the cost
- **WHEN** a user edits "Lunch" on day 1, changes its estimated cost from 40 to 25.50 and saves
- **THEN** the timeline shows "Lunch" with "€25.50"
- **AND** the day cost, the budget summary and the cost-by-day row for day 1 are reduced by €14.50

### Requirement: Cancel and one form at a time
"Cancel" SHALL close the activity form without changes and return focus to the activity's "Edit" button. At most one activity form SHALL be open at a time: opening another one SHALL close the open form without saving.

#### Scenario: Cancelling
- **WHEN** a user edits "Lunch", changes its title and activates "Cancel"
- **THEN** the timeline still shows "Lunch" unchanged and focus is on its "Edit" button

#### Scenario: One form at a time
- **WHEN** the form for "Lunch" is open and the user activates "Edit" on "Dinner"
- **THEN** the form for "Lunch" closes without saving and the form for "Dinner" opens

### Requirement: Activity form validation
The activity form SHALL save only values the trip schema accepts and SHALL show a message next to each invalid field instead of saving. The title SHALL be required and at most 120 characters, the start time a 24-hour `HH:mm`, the duration a whole number of minutes from 5 to 1440, the cost from 0 to 10,000,000 with at most 2 decimals, and the description at most 1000 characters, all after trimming.

#### Scenario: Invalid values
- **WHEN** a user clears the title, enters "25:00" as the start time, "3" as the duration and "12.345" as the cost, and saves
- **THEN** the form stays open with an error on each of these four fields
- **AND** the trip is unchanged

### Requirement: Numeric inputs and error focus
The duration and cost fields SHALL be text inputs with an `inputMode`, so invalid text such as `abc` is shown as an error. On a failed save, focus SHALL move to the first invalid field.

#### Scenario: Text in a numeric field
- **WHEN** a user enters "abc" as the duration and saves
- **THEN** the duration field shows an error and has focus

#### Scenario: Focus on the first error
- **WHEN** the title and the cost are both invalid and the user saves
- **THEN** focus is on the title field

### Requirement: Cost field
The cost field SHALL be labelled with the trip currency and SHALL say that the amount is for the whole group. Saved activities SHALL always use the trip currency.

#### Scenario: Cost label
- **WHEN** the activity form is open on a EUR trip
- **THEN** the cost field is labelled with the trip currency and says the amount is for the whole group

### Requirement: Move an activity to another day
The activity form SHALL have a "Day" select listing every trip day by number and short date, with the activity's current day selected. Saving with another day SHALL remove the activity from its day and place it in the chosen day in start-time order. A day other than the current one that already holds 20 activities SHALL be listed as full and SHALL NOT be selectable.

#### Scenario: Moving to day 2
- **WHEN** a user edits "Lunch" on day 1, chooses "Day 2" and saves
- **THEN** day 1 no longer lists "Lunch" and the status message says "Moved "Lunch" to Day 2."
- **AND** selecting "Day 2" shows "Lunch" in start-time order
- **AND** the cost-by-day rows of day 1 and day 2 change by the activity's cost

#### Scenario: Full day
- **WHEN** day 3 holds 20 activities and a user edits an activity on day 1
- **THEN** the "Day 3" option is marked full and can't be chosen

### Requirement: Add an activity
The day panel SHALL show an "Add activity" button after the activity list, and also with the empty-day message. Activating it SHALL open an empty activity form at the end of the panel with the selected day chosen, the category "Other", a duration of 60 minutes and focus on the title field. Saving SHALL add the activity to the chosen day in the trip currency with a new ID.

#### Scenario: Adding to a day
- **WHEN** a user on day 1 activates "Add activity", enters "Tram 28", "10:00", "30", category Transport and cost "3", and saves
- **THEN** day 1 lists "10:00 Tram 28, Transport, €3.00" in start-time order
- **AND** the activity count and the day cost include it

#### Scenario: Adding to an empty day
- **WHEN** a user selects a day with no activities
- **THEN** the panel shows the no-activities message and an "Add activity" button

### Requirement: Day limit
When the selected day already holds 20 activities, the panel SHALL say that a day can hold up to 20 activities instead of showing the "Add activity" button.

#### Scenario: Day limit
- **WHEN** the selected day holds 20 activities
- **THEN** there is no "Add activity" button and the panel says a day can hold up to 20 activities

### Requirement: Delete an activity
Each activity SHALL have a "Delete" button whose accessible name includes the activity title. Activating it SHALL show an in-page confirmation in that activity asking whether to delete it, with "Delete" and "Keep" buttons, and SHALL move focus to "Keep". "Delete" SHALL remove the activity; "Keep" or Escape SHALL close the confirmation and return focus to the activity's "Delete" button. The app SHALL NOT use browser dialogs for this.

#### Scenario: Confirming
- **WHEN** a user activates "Delete" on "Lunch" and then confirms with "Delete"
- **THEN** "Lunch" is no longer listed and the status message says "Deleted "Lunch"."
- **AND** the day cost and the budget summary no longer include its cost

#### Scenario: Keeping
- **WHEN** a user activates "Delete" on "Lunch" and then "Keep"
- **THEN** "Lunch" is still listed and focus is on its "Delete" button

#### Scenario: Deleting the last activity
- **WHEN** a user deletes the only activity of a day
- **THEN** the panel shows the no-activities message and the "Add activity" button

### Requirement: Start-time order after changes
After every change the activities of each day SHALL be in start-time order. An edited activity that stays on its day and keeps its start time SHALL keep its place among activities with the same start time; an added or moved activity SHALL be placed after the activities with the same start time.

#### Scenario: Changing the time
- **WHEN** day 1 lists "Breakfast" at 09:00 and "Museum" at 11:00, and a user changes "Breakfast" to 12:00
- **THEN** day 1 lists "Museum" before "Breakfast"

#### Scenario: Same start time
- **WHEN** day 1 lists "Walk" and "Coffee", both at 10:00, and a user adds "Tram" at 10:00
- **THEN** day 1 lists "Walk", "Coffee", "Tram" in this order

### Requirement: Valid trip after every change
Every change SHALL be applied by a pure function of the trip and the change. Activity and day IDs SHALL stay the same, new activities SHALL get the ID carried by the change, and every added or edited activity SHALL be in the trip currency. When the result would not pass the trip schema, the trip SHALL stay unchanged.

#### Scenario: Invalid change
- **WHEN** a change would put a 21st activity on a day
- **THEN** the trip is returned unchanged

#### Scenario: IDs are kept
- **WHEN** an activity is edited or moved to another day
- **THEN** it keeps its ID, and no other activity or day changes its ID

### Requirement: Feedback and focus after changes
A polite live region on the trip page SHALL announce each completed change: "Saved "<title>".", "Added "<title>".", "Added "<title>" to Day <n>." (to a day other than the selected one), "Moved "<title>" to Day <n>." and "Deleted "<title>".". After saving an activity that is on the selected day, focus SHALL move to its "Edit" button. After saving an activity to another day, focus SHALL move to the day panel. After a delete, focus SHALL move to the day's "Add activity" button.

#### Scenario: Focus after saving
- **WHEN** a user saves an edit of "Lunch" that keeps it on the selected day
- **THEN** focus is on the "Edit" button of "Lunch" and the live region says "Saved "Lunch"."

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
