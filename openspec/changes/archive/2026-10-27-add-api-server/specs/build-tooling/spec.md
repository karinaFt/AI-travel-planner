# Spec Delta

## MODIFIED Requirements

### Requirement: Local development server
The project SHALL provide a `dev` script that starts the client dev server and the API server together. Changes to client source SHALL show up in the browser without a manual restart, and changes to API source SHALL restart the API automatically. In development, requests from the page to `/api` SHALL reach the local API without extra configuration.

#### Scenario: Starting the dev server
- **WHEN** a developer runs `npm run dev`
- **THEN** the terminal prints a local URL
- **AND** opening that URL shows the application root view
- **AND** a request from that page to `/api/health` returns status `ok`

#### Scenario: Editing source while running
- **WHEN** a developer saves a change to an application source file while the dev server is running
- **THEN** the browser reflects the change without restarting the server

#### Scenario: Editing API source while running
- **WHEN** a developer saves a change to a file in `server/src` while `npm run dev` is running
- **THEN** the API restarts on its own and serves the changed code

### Requirement: Production build
The project SHALL provide a `build` script that type-checks the source, emits static production assets to a `client/dist/` directory, and compiles the API server to JavaScript in `server/dist/`.

#### Scenario: Successful build
- **WHEN** a developer runs `npm run build` on code with no type errors
- **THEN** the command exits with status 0
- **AND** `client/dist/index.html` and its referenced assets exist
- **AND** the compiled API entry point exists in `server/dist/`

#### Scenario: Build blocked by type error
- **WHEN** a developer runs `npm run build` on code containing a type error
- **THEN** the command exits with a non-zero status and reports the error location

### Requirement: Setup documentation
The project SHALL include a README that states the Node.js prerequisite, explains how to create `server/.env` from `server/.env.example`, describes every environment variable, and lists every script with its purpose.

#### Scenario: Following the README
- **WHEN** a new developer follows the README steps on a fresh clone
- **THEN** they can install dependencies, configure the environment and open the running application without consulting other sources

## ADDED Requirements

### Requirement: API server start
The project SHALL provide a `start` script that runs the compiled API server from `server/dist/`.

#### Scenario: Starting the built API
- **WHEN** a developer runs `npm run build` and then `npm start`
- **THEN** the API listens on the configured port and `GET /api/health` returns status `ok`

### Requirement: Environment template
The repository SHALL contain `server/.env.example`, listing every variable the API reads, each with its default or a placeholder and a one-line comment. It SHALL NOT contain real secrets. The API SHALL read its local values from `server/.env`, and that file SHALL be ignored by git.

#### Scenario: Reading the template
- **WHEN** a developer opens `server/.env.example`
- **THEN** every variable the API reads is listed with a comment

#### Scenario: Local env file ignored
- **WHEN** a developer copies `server/.env.example` to `server/.env`
- **THEN** `git status` does not show `server/.env`
