# Proposal

## Why

The MVP will add an Express backend (`server/`) and schemas shared by both sides (`shared/`). Today the frontend sits at the repository root, so frontend, backend and shared code would mix in one folder and one dependency list. Moving the frontend into its own `client/` npm workspace now, while it is still a small scaffold, gives each part a clear boundary before any feature work starts.

## What Changes

- Turn the repository root into an npm workspaces root (`"workspaces": ["client"]`). `server` and `shared` join in later changes.
- Move the frontend into `client/`: `index.html`, `public/`, `src/`, `vite.config.ts` and its tsconfig files. It gets its own `package.json` with the React, Vite and test dependencies.
- Keep the root scripts with the same names (`dev`, `build`, `preview`, `typecheck`, `lint`, `test`, `test:watch`). They delegate to the workspace, so developers still run everything from the root.
- The production build output moves from `dist/` to `client/dist/`.
- Keep one lockfile (`package-lock.json`) and lint configuration (`.oxlintrc.json`, with oxlint as a root dev dependency) at the root.
- Update the README project layout and the build paths.
- There is no user-visible change: the app looks and behaves exactly as before.

## Capabilities

### New Capabilities
<!-- None. -->

### Modified Capabilities
- `build-tooling`: The production build, preview and type-check requirements refer to the new `client/dist/` output location. A new requirement says that all scripts run from the repository root across workspaces.

## Impact

- **Moved**: `index.html`, `public/`, `src/`, `vite.config.ts`, `tsconfig.json`, `tsconfig.app.json` and `tsconfig.node.json` move into `client/`.
- **Changed**: root `package.json` (workspaces and delegating scripts), new `client/package.json`, `package-lock.json` (regenerated), `.gitignore` (if needed), `README.md`.
- **Unchanged**: `openspec/`, `.oxlintrc.json` (still at the root), app source code and behavior, and the `app-shell` spec.
- **Out of scope**: renaming the app, and creating `server/` or `shared/`. Those are later roadmap steps (see `openspec/ROADMAP.md`).
