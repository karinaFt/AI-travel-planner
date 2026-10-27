# Spec Delta

## MODIFIED Requirements

### Requirement: Home page
The URL `/` SHALL show a landing page made of:
- a hero with exactly one top-level heading, a one- or two-sentence value statement and a primary "Plan a trip" call to action linking to `/plan`;
- a "How it works" section with three numbered steps (describe your trip, get an AI itinerary, refine and keep it);
- a closing call to action linking to `/plan`.

Decorative graphics SHALL be hidden from assistive technology.

#### Scenario: Starting from the home page
- **WHEN** a user opens `/` and activates the "Plan a trip" call to action in the hero
- **THEN** the plan page at `/plan` is shown without a full page reload

#### Scenario: Landing content
- **WHEN** a user opens `/`
- **THEN** the page has exactly one top-level heading
- **AND** a "How it works" heading is followed by an ordered list of three steps
- **AND** a second call to action at the end of the page links to `/plan`

#### Scenario: Decorative illustration
- **WHEN** a screen reader user reads the landing page
- **THEN** the decorative illustration is not announced

## ADDED Requirements

### Requirement: Single light visual theme
All pages SHALL use one light color theme with shared typefaces, colors, spacing and component styles, regardless of the operating system's light or dark preference.

#### Scenario: Operating system in dark mode
- **WHEN** a user whose operating system prefers a dark color scheme opens any page
- **THEN** the page shows the same light background and dark text as for other users

#### Scenario: Shared components look the same everywhere
- **WHEN** a primary call to action appears on the home page and on another page
- **THEN** both use the same color, typeface, size and shape

### Requirement: Readable contrast
Text and interactive elements SHALL meet WCAG 2.1 AA contrast: at least 4.5:1 for normal text and 3:1 for large text, focus indicators and the boundaries of controls.

#### Scenario: Theme color pairs
- **WHEN** every text color of the theme is checked against every background it is used on
- **THEN** each pair meets at least 4.5:1, or 3:1 where it is used only for large text or non-text elements

### Requirement: Visible keyboard focus
Every link and button SHALL show a clearly visible focus indicator when focused with the keyboard, on every page.

#### Scenario: Tabbing through the landing page
- **WHEN** a keyboard user presses Tab repeatedly on `/`
- **THEN** each focused link and button shows a visible focus outline

### Requirement: Skip to content
Every page SHALL start with a "Skip to content" link that is visible when focused and moves focus to the page's main content.

#### Scenario: Using the skip link
- **WHEN** a keyboard user loads any page and presses Tab once
- **THEN** a visible "Skip to content" link is focused
- **AND** activating it moves focus to the main content so the next Tab skips the header

### Requirement: Focus after navigation
After in-app navigation to another page, focus SHALL move to that page's top-level heading so that assistive technology announces the new page. On the initial page load, focus SHALL stay at the browser's default position.

#### Scenario: Navigating with a link
- **WHEN** a user activates "Plan a trip" in the header
- **THEN** the "Plan a trip" heading of the new page has focus

#### Scenario: Initial load
- **WHEN** a user opens `/` directly
- **THEN** no element on the page is focused automatically

### Requirement: Reduced motion
Transitions and animations SHALL be disabled or reduced to a minimum when the user's system requests reduced motion.

#### Scenario: Reduced motion preference
- **WHEN** a user with the "reduce motion" system setting hovers or focuses buttons and links
- **THEN** no transition or animation longer than 0.01 seconds plays
