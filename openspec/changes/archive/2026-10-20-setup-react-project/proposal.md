# Proposal

## Why

Smart Doc Assistant has no application code yet — the repository holds only OpenSpec scaffolding and a `.gitignore` already prepared for a React/Node project. Every future feature needs a working front-end foundation (dev server, production build, type checking, linting, tests) before it can be built, so establishing it now unblocks all subsequent changes.

## What Changes

- Add a single-page React application written in TypeScript at the repository root, built with Vite and managed with npm.
- Add a minimal app shell that renders a "Smart Doc Assistant" page so the foundation is visibly working in the browser.
- Add standard npm scripts for local development, production build, preview, type checking, linting, and testing.
- Add a unit-test setup with one test covering the app shell, so later changes have a pattern to follow.
- Add a README describing prerequisites and how to run each script.
- Keep the existing `openspec/` directory and `.gitignore` intact (merge any scaffold ignore entries rather than overwriting).

## Capabilities

### New Capabilities
- `app-shell`: What a user sees when the application loads — the page title, the root view, and the baseline rendering behavior every feature will live inside.
- `build-tooling`: The developer-facing commands the project guarantees (run locally, build for production, type-check, lint, test) and what each must produce.

### Modified Capabilities
<!-- None: the project has no existing specs. -->

## Impact

- **New files**: `package.json`, `package-lock.json`, `index.html`, `src/`, `public/`, TypeScript, Vite, oxlint and test configuration, `README.md`.
- **Dependencies**: React, React DOM, Vite, TypeScript, oxlint, Vitest, React Testing Library (dev). Requires Node.js 20.19+ or 22.12+ (machine currently has Node 24 / npm 11).
- **Existing files**: `.gitignore` may gain entries from the scaffold; `openspec/` is untouched.
- **Out of scope**: routing, state management, styling frameworks, back-end/API or LLM integration, document upload/processing, CI pipelines, and deployment.
