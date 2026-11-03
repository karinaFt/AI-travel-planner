# Spec Delta

## MODIFIED Requirements

### Requirement: Header navigation
The header SHALL contain a navigation landmark with the links "Home" (`/`), "Plan a trip" (`/plan`) and "My trips" (`/trips`). The link of the current page SHALL be exposed as the current page to assistive technology and visibly distinguished; "My trips" SHALL be current only on `/trips`, not on a trip page. All header links SHALL be reachable and usable with the keyboard.

#### Scenario: Navigating with the header
- **WHEN** a user on `/` activates "Plan a trip" in the header
- **THEN** the plan page is shown without a full page reload
- **AND** the "Plan a trip" link is marked as the current page and "Home" is not

#### Scenario: Opening My trips
- **WHEN** a user activates "My trips" in the header
- **THEN** the My trips page is shown without a full page reload and "My trips" is marked as current

#### Scenario: Trip page
- **WHEN** a user opens `/trips/abc`
- **THEN** no header link is marked as current

#### Scenario: Browser history
- **WHEN** a user navigates from `/` to `/plan` and presses the browser back button
- **THEN** the home page is shown again and "Home" is marked as current

#### Scenario: Keyboard use
- **WHEN** a keyboard user tabs through the header
- **THEN** the app name link, "Home", "Plan a trip" and "My trips" each receive visible focus and can be activated with Enter
