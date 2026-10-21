# Spec Delta

## MODIFIED Requirements

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

## ADDED Requirements

### Requirement: Home page
The URL `/` SHALL show a home page with exactly one top-level heading, a short sentence describing the planner, and a "Plan a trip" link to `/plan`.

#### Scenario: Starting from the home page
- **WHEN** a user opens `/` and activates the "Plan a trip" link in the page content
- **THEN** the plan page at `/plan` is shown without a full page reload

### Requirement: Plan page placeholder
The URL `/plan` SHALL show a page with the top-level heading "Plan a trip" and a message that the trip form is coming soon.

#### Scenario: Opening the plan page directly
- **WHEN** a user opens `/plan` by typing the URL or reloading the page
- **THEN** the page with the heading "Plan a trip" is shown

### Requirement: Header navigation
The header SHALL contain a navigation landmark with the links "Home" (`/`) and "Plan a trip" (`/plan`). The link of the current page SHALL be exposed as the current page to assistive technology and visibly distinguished. All header links SHALL be reachable and usable with the keyboard.

#### Scenario: Navigating with the header
- **WHEN** a user on `/` activates "Plan a trip" in the header
- **THEN** the plan page is shown without a full page reload
- **AND** the "Plan a trip" link is marked as the current page and "Home" is not

#### Scenario: Browser history
- **WHEN** a user navigates from `/` to `/plan` and presses the browser back button
- **THEN** the home page is shown again and "Home" is marked as current

#### Scenario: Keyboard use
- **WHEN** a keyboard user tabs through the header
- **THEN** the app name link, "Home" and "Plan a trip" each receive visible focus and can be activated with Enter

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
