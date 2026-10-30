# itinerary-view Specification

## Purpose

Defines the page that shows a generated trip: the trip overview, the day tabs and the selected day in the URL, each day's timeline of activities with expandable details, empty days, and exact cost totals.

## Requirements

### Requirement: Trip overview
The trip page SHALL start with an overview of the trip: the destination as the page heading, the date range, the trip length in days, the number of travelers, the travel style, the pace, the starting point when one was given, the estimated cost of the whole trip and the budget, both formatted in the trip currency. The tab title SHALL be "<destination> trip · AI Travel Planner". The page SHALL NOT show a "coming soon" note and SHALL link to plan another trip.

#### Scenario: Overview of a generated trip
- **WHEN** a user opens a 3-day Lisbon trip from Kyiv, 2026-11-10 to 2026-11-12, for 2 travelers, style food, pace relaxed, budget 1500 EUR, with activities costing €40.00 on each day
- **THEN** the page shows the heading "Lisbon", the date range, "3 days", "2 travelers", "Food", "Relaxed", "Kyiv", an estimated cost of "€120.00" and a budget of "€1,500.00"
- **AND** the tab title is "Lisbon trip · AI Travel Planner"

#### Scenario: No starting point
- **WHEN** the trip was generated without a starting point
- **THEN** the overview does not mention a starting point

### Requirement: Day tabs
The trip page SHALL show an accessible tab list with one tab per itinerary day, labelled with the day number and short date. Exactly one tab SHALL be selected, and it SHALL control a tab panel holding that day's timeline.

#### Scenario: Tabs of a trip
- **WHEN** a user opens a 3-day trip
- **THEN** the page shows the tabs "Day 1", "Day 2" and "Day 3", each with its short date
- **AND** "Day 1" is selected

#### Scenario: Choosing a day
- **WHEN** a user activates the "Day 2" tab of a 3-day trip
- **THEN** "Day 2" is selected and the panel shows day 2's title and activities

### Requirement: Day tab keyboard navigation
Only the selected day tab SHALL be in the Tab order. The arrow keys, Home and End SHALL move focus between the day tabs and select the focused tab.

#### Scenario: Only the selected tab is tabbable
- **WHEN** "Day 2" of a 3-day trip is selected
- **THEN** pressing Tab from before the tab list focuses "Day 2" and skips the other tabs

#### Scenario: Arrow keys wrap around
- **WHEN** focus is on the selected "Day 3" tab of a 3-day trip and the user presses the Right arrow key
- **THEN** focus moves to "Day 1" and it becomes selected
- **AND** pressing the Left arrow key then moves focus to "Day 3" and selects it

#### Scenario: Home and End
- **WHEN** focus is on the "Day 2" tab of a 3-day trip
- **THEN** pressing End focuses and selects "Day 3", and pressing Home focuses and selects "Day 1"

### Requirement: Day tabs on narrow viewports
On narrow viewports the day tab row SHALL scroll horizontally within itself, and the page SHALL NOT scroll horizontally.

#### Scenario: 14-day trip on a phone
- **WHEN** a user opens a 14-day trip in a 375 px wide viewport
- **THEN** the tab row can be scrolled sideways to reach "Day 14"
- **AND** the page itself has no horizontal scroll

### Requirement: Selected day in the URL
The selected day SHALL be kept in the `day` query parameter of the trip page URL. Choosing a tab SHALL add a browser history entry, so going back shows the previously selected day. A missing, non-numeric or out-of-range `day` SHALL select day 1. Changing only the selected day SHALL NOT move focus to the page heading.

#### Scenario: Opening a specific day
- **WHEN** a user opens `/trips/<id>?day=3` for a 3-day trip
- **THEN** "Day 3" is selected

#### Scenario: Invalid day
- **WHEN** a user opens `/trips/<id>?day=9` or `/trips/<id>?day=abc` for a 3-day trip
- **THEN** "Day 1" is selected

#### Scenario: Back after choosing a day
- **WHEN** a user on day 1 activates the "Day 2" tab and then goes back in the browser
- **THEN** "Day 1" is selected again

#### Scenario: Focus stays on the tab
- **WHEN** a user activates the "Day 2" tab
- **THEN** focus stays on the "Day 2" tab

### Requirement: Day timeline
The tab panel SHALL show a heading with the day number, the full date and the day title, the number of activities and the day's estimated cost in the trip currency, followed by the day's activities in start-time order as a list. Each activity SHALL show its start time, title, category and estimated cost, with "Free" for a cost of 0.

#### Scenario: Activities of a day
- **WHEN** day 1 has "Breakfast" at 09:00 costing €20.00 (food) and "Castle visit" at 11:00 costing €0 (sightseeing)
- **THEN** the panel lists "09:00 Breakfast, Food, €20.00" before "11:00 Castle visit, Sightseeing, Free"
- **AND** it shows "2 activities" and an estimated day cost of "€20.00"

### Requirement: Activity details
Each activity SHALL have a toggle button, collapsed by default, that shows or hides its details in place: the time range from the start time to the start time plus the duration (marked "next day" when it ends after midnight), the duration in hours and minutes, the description when it is not empty, and a note that the cost is for the whole group. The toggle SHALL expose its state with `aria-expanded`. Choosing another day SHALL show that day's activities collapsed.

#### Scenario: Expanding an activity
- **WHEN** a user activates the details toggle of "Lunch" starting at 13:00 for 90 minutes
- **THEN** the toggle reports expanded and the details show "13:00–14:30", "1 h 30 min" and the description

#### Scenario: Ending after midnight
- **WHEN** an activity starts at 23:30 and lasts 90 minutes
- **THEN** its details show "23:30–01:00 (next day)"

#### Scenario: Collapsing again
- **WHEN** a user activates the toggle of an expanded activity
- **THEN** the toggle reports collapsed and the details are hidden

### Requirement: Empty day
A day without activities SHALL show a short message that nothing is planned for that day instead of an empty list, with a day cost of 0 in the trip currency.

#### Scenario: Day without activities
- **WHEN** a user selects a day whose activity list is empty
- **THEN** the panel says that no activities are planned for this day and shows no activity list

### Requirement: Cost totals
Day and trip estimated costs SHALL be the exact sums of the activity costs, computed in integer hundredths of the currency so that decimal amounts add up without floating-point error.

#### Scenario: Decimal costs
- **WHEN** a day has activities costing 0.10, 0.20 and 19.99 EUR
- **THEN** the day's estimated cost is shown as "€20.29"
