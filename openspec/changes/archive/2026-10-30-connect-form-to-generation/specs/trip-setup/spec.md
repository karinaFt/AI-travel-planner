# Spec Delta

## MODIFIED Requirements

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
