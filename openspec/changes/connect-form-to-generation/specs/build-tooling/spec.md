# Spec Delta

## MODIFIED Requirements

### Requirement: Preview of production build
The project SHALL provide a `preview` script that serves the contents of `client/dist/` locally and forwards `/api` requests to the API, like the development server.

#### Scenario: Previewing a build
- **WHEN** a developer runs `npm run preview` after a successful build
- **THEN** the terminal prints a local URL
- **AND** opening that URL shows the application root view

#### Scenario: API through the preview
- **WHEN** the API is running and a developer requests `/api/health` from the preview URL
- **THEN** the response is the API's health response
