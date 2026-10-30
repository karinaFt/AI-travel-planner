# Spec Delta

## MODIFIED Requirements

### Requirement: Focus after navigation
After in-app navigation to another page, focus SHALL move to that page's top-level heading so that assistive technology announces the new page. On the initial page load, focus SHALL stay at the browser's default position. A navigation that changes only the query string of the current page SHALL NOT move focus.

#### Scenario: Navigating with a link
- **WHEN** a user activates "Plan a trip" in the header
- **THEN** the "Plan a trip" heading of the new page has focus

#### Scenario: Initial load
- **WHEN** a user opens `/` directly
- **THEN** no element on the page is focused automatically

#### Scenario: Query-only change
- **WHEN** a control on a page changes only the URL's query string, such as choosing a day on the trip page
- **THEN** focus stays on that control
