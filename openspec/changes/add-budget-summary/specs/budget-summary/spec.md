# Spec Delta

## ADDED Requirements

### Requirement: Budget summary
The trip page SHALL show a "Budget" summary between the trip overview and the itinerary. It SHALL list the budget, the estimated cost of the whole trip and, when the estimated cost does not exceed the budget, the remaining amount, all formatted in the trip currency.

#### Scenario: Within budget
- **WHEN** a user opens a trip with a budget of 1500 EUR and activities costing €120.00 in total
- **THEN** the summary shows a budget of "€1,500.00", an estimated cost of "€120.00" and "Remaining €1,380.00"

#### Scenario: Exactly on budget
- **WHEN** the activities of a trip with a budget of 120 EUR cost €120.00 in total
- **THEN** the summary shows "Remaining €0.00" and does not say the trip is over budget

### Requirement: Over budget
When the estimated cost exceeds the budget, the summary SHALL show "Over budget by" and the difference in the trip currency instead of the remaining amount, and SHALL mark the summary with the warning color. The text SHALL state the over-budget state on its own, without relying on color.

#### Scenario: Plan costs more than the budget
- **WHEN** the activities of a trip with a budget of 100 EUR cost €120.00 in total
- **THEN** the summary shows "Over budget by €20.00" and no remaining amount

### Requirement: Budget usage bar
The summary SHALL show a bar filled in proportion to the share of the budget the estimated cost uses, capped at a full bar, with the percentage rounded to a whole number as text, such as "8% of budget". The bar SHALL be exposed as a meter whose accessible value text states that percentage.

#### Scenario: Share of the budget
- **WHEN** a trip with a budget of 1500 EUR has an estimated cost of €120.00
- **THEN** the bar is 8% full and the summary says "8% of budget"

#### Scenario: More than the budget
- **WHEN** a trip with a budget of 100 EUR has an estimated cost of €120.00
- **THEN** the bar is full and the summary says "120% of budget"

### Requirement: Cost by day
The summary SHALL include a "Cost by day" table with one row per itinerary day, in day order, showing the day number, the short date, the day title and the day's estimated cost in the trip currency, followed by a total row equal to the estimated cost of the whole trip.

#### Scenario: Costs of each day
- **WHEN** a 3-day trip has activities costing €40.00 on day 1, €0 on day 2 and €80.50 on day 3
- **THEN** the table lists "Day 1" with "€40.00", "Day 2" with "€0.00" and "Day 3" with "€80.50", in that order
- **AND** its total row shows "€120.50"

#### Scenario: Day without activities
- **WHEN** a day has no activities
- **THEN** its row shows "€0.00"

### Requirement: Exact budget math
The day costs, the estimated cost and the remaining or over-budget amount SHALL be computed in integer hundredths of the trip currency, so decimal amounts compare and subtract without floating-point error. All amounts SHALL be in the trip currency; nothing is converted.

#### Scenario: Decimal costs that meet the budget
- **WHEN** a trip with a budget of 0.30 EUR has activities costing 0.10 and 0.20 EUR
- **THEN** the summary shows "Remaining €0.00" and does not say the trip is over budget
