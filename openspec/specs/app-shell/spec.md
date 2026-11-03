# app-shell Specification

## Purpose

Defines the page frame of AI Travel Planner that every feature is rendered inside. It covers the app's identity, the shared header and navigation, the routed pages and their titles, and the baseline rendering guarantees on all pages.

## Requirements

### Requirement: Application identifies itself
The application SHALL present the name "AI Travel Planner" in the browser document title and in a header shown on every page, where the name links to the home page.

#### Scenario: Opening the application
- **WHEN** a user opens the application's root URL in a browser
- **THEN** the browser tab title contains "AI Travel Planner"
- **AND** the page header displays "AI Travel Planner" as a link to `/`

#### Scenario: Old name removed
- **WHEN** a user visits any page of the application
- **THEN** the text "Smart Doc Assistant" does not appear in the page or its title

### Requirement: Root view renders without errors
The application SHALL render every page on initial load and after in-app navigation without emitting errors to the browser console.

#### Scenario: Clean initial load
- **WHEN** a user loads the application in a current evergreen browser (Chrome, Edge, Firefox, Safari)
- **THEN** the home page is visible
- **AND** no errors are logged to the browser console

#### Scenario: Clean navigation
- **WHEN** a user moves between the home page, the plan page and an unknown URL
- **THEN** each page renders and no errors are logged to the browser console

### Requirement: Usable on narrow and wide viewports
Every page, including the header, SHALL be readable without horizontal scrolling on viewports from 360px wide up to desktop widths.

#### Scenario: Phone-width viewport
- **WHEN** any page is viewed at a 360px-wide viewport
- **THEN** the header, heading and content fit within the viewport width with no horizontal scrollbar

#### Scenario: Desktop viewport
- **WHEN** any page is viewed at a 1440px-wide viewport
- **THEN** the header, heading and content are displayed without layout overflow

### Requirement: Notice when JavaScript is unavailable
The application SHALL show a plain message stating that JavaScript is required when the browser has JavaScript disabled.

#### Scenario: JavaScript disabled
- **WHEN** a user opens the application with JavaScript disabled
- **THEN** the page shows a message telling the user that JavaScript must be enabled to use AI Travel Planner

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

### Requirement: Page titles
Each page SHALL set a distinct browser tab title in the form "<page name> · AI Travel Planner". The home page title SHALL be "AI Travel Planner".

#### Scenario: Titles per page
- **WHEN** a user visits `/`, `/plan` and an unknown URL in turn
- **THEN** the tab titles are "AI Travel Planner", "Plan a trip · AI Travel Planner" and "Page not found · AI Travel Planner"

### Requirement: Unknown routes
The application SHALL show a not-found page for any URL that does not match a known page. It SHALL display the header, a "Page not found" heading and a link back to the home page. This SHALL work both for in-app navigation and for a URL opened directly in the dev server or the production preview.

#### Scenario: Mistyped URL
- **WHEN** a user opens `/does-not-exist` directly
- **THEN** a "Page not found" heading and a link to the home page are shown
- **AND** no errors are logged to the browser console

#### Scenario: Returning home
- **WHEN** a user on the not-found page activates the link to the home page
- **THEN** the home page is shown

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

### Requirement: Reduced motion
Transitions and animations SHALL be disabled or reduced to a minimum when the user's system requests reduced motion.

#### Scenario: Reduced motion preference
- **WHEN** a user with the "reduce motion" system setting hovers or focuses buttons and links
- **THEN** no transition or animation longer than 0.01 seconds plays
