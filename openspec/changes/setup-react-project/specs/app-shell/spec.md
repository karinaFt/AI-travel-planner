# Spec Delta

## Purpose

Defines the baseline page users see when they open Smart Doc Assistant, providing the root view that every future feature is rendered inside.

## ADDED Requirements

### Requirement: Application identifies itself
The application SHALL present the name "Smart Doc Assistant" both as the browser document title and as the primary heading of the root view.

#### Scenario: Opening the application
- **WHEN** a user opens the application's root URL in a browser
- **THEN** the browser tab title reads "Smart Doc Assistant"
- **AND** the page displays a top-level heading with the text "Smart Doc Assistant"

### Requirement: Root view renders without errors
The application SHALL render its root view on initial load without emitting errors to the browser console.

#### Scenario: Clean initial load
- **WHEN** a user loads the application in a current evergreen browser (Chrome, Edge, Firefox, Safari)
- **THEN** the root view is visible
- **AND** no errors are logged to the browser console

### Requirement: Usable on narrow and wide viewports
The root view SHALL be readable without horizontal scrolling on viewports from 360px wide up to desktop widths.

#### Scenario: Phone-width viewport
- **WHEN** the application is viewed at a 360px-wide viewport
- **THEN** the heading and content fit within the viewport width with no horizontal scrollbar

#### Scenario: Desktop viewport
- **WHEN** the application is viewed at a 1440px-wide viewport
- **THEN** the heading and content are displayed without layout overflow

### Requirement: Notice when JavaScript is unavailable
The application SHALL show a plain message stating that JavaScript is required when the browser has JavaScript disabled.

#### Scenario: JavaScript disabled
- **WHEN** a user opens the application with JavaScript disabled
- **THEN** the page shows a message telling the user that JavaScript must be enabled to use Smart Doc Assistant
