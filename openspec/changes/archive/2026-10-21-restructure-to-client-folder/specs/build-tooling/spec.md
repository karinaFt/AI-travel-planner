# Spec Delta

## MODIFIED Requirements

### Requirement: Production build
The project SHALL provide a `build` script that type-checks the source and emits static production assets to a `client/dist/` directory.

#### Scenario: Successful build
- **WHEN** a developer runs `npm run build` on code with no type errors
- **THEN** the command exits with status 0
- **AND** `client/dist/index.html` and its referenced assets exist

#### Scenario: Build blocked by type error
- **WHEN** a developer runs `npm run build` on code containing a type error
- **THEN** the command exits with a non-zero status and reports the error location

### Requirement: Preview of production build
The project SHALL provide a `preview` script that serves the contents of `client/dist/` locally.

#### Scenario: Previewing a build
- **WHEN** a developer runs `npm run preview` after a successful build
- **THEN** the terminal prints a local URL
- **AND** opening that URL shows the application root view

### Requirement: Static type check
The project SHALL provide a `typecheck` script that reports type errors without emitting build output.

#### Scenario: Clean type check
- **WHEN** a developer runs `npm run typecheck` on code with no type errors
- **THEN** the command exits with status 0 and creates no files in `client/dist/`

## ADDED Requirements

### Requirement: Scripts run from the repository root
Every script in this specification SHALL be runnable from the repository root and SHALL cover every workspace that provides it. A single `npm ci` at the root SHALL install the dependencies of all workspaces.

#### Scenario: Root commands after a fresh clone
- **WHEN** a developer runs `npm ci` and then `npm run lint`, `npm run typecheck`, `npm test` and `npm run build` from the repository root
- **THEN** each command exits with status 0 without changing into a workspace directory

#### Scenario: Frontend lives in its own workspace
- **WHEN** a developer lists the repository root
- **THEN** the frontend source, `index.html` and Vite configuration are under `client/`, not at the root
