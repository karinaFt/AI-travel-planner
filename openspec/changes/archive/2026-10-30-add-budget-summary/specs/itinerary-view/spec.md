# Spec Delta

## MODIFIED Requirements

### Requirement: Trip overview
The trip page SHALL start with an overview of the trip: the destination as the page heading, the date range, the trip length in days, the number of travelers, the travel style, the pace and the starting point when one was given. The budget and the estimated cost SHALL appear only in the budget summary. The tab title SHALL be "<destination> trip · AI Travel Planner". The page SHALL NOT show a "coming soon" note and SHALL link to plan another trip.

#### Scenario: Overview of a generated trip
- **WHEN** a user opens a 3-day Lisbon trip from Kyiv, 2026-11-10 to 2026-11-12, for 2 travelers, style food, pace relaxed
- **THEN** the page shows the heading "Lisbon", the date range, "3 days", "2 travelers", "Food", "Relaxed" and "Kyiv"
- **AND** the tab title is "Lisbon trip · AI Travel Planner"

#### Scenario: No starting point
- **WHEN** the trip was generated without a starting point
- **THEN** the overview does not mention a starting point
