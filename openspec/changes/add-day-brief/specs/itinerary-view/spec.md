# Spec Delta

## MODIFIED Requirements

### Requirement: Day timeline
The tab panel SHALL show a heading with the day number, the full date and the day title, the number of activities and the day's estimated cost in the trip currency, then the day overview area (see `day-brief`), followed by the day's activities in start-time order as a list. Each activity SHALL show its start time, title, category and estimated cost, with "Free" for a cost of 0. Each activity SHALL be a focus target that the day overview can scroll to.

#### Scenario: Activities of a day
- **WHEN** day 1 has "Breakfast" at 09:00 costing €20.00 (food) and "Castle visit" at 11:00 costing €0 (sightseeing)
- **THEN** the panel lists "09:00 Breakfast, Food, €20.00" before "11:00 Castle visit, Sightseeing, Free"
- **AND** it shows "2 activities" and an estimated day cost of "€20.00"

#### Scenario: Overview area position
- **WHEN** day 1 has activities
- **THEN** the "Day overview" section comes after the day heading and before the activity list
