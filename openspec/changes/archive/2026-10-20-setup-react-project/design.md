# Design

## Context

The repository root already contains `openspec/`, a React/Node-oriented `.gitignore`, and IDE folders (`.idea/`, `.claude/`, both git-ignored). There is no `package.json`. The development machine runs Windows 11 with Node 24.15 and npm 11.12. Motivation is in proposal.md - Why; required behavior is in `specs/app-shell/spec.md` and `specs/build-tooling/spec.md`.

## Goals / Non-Goals

**Goals:**
- Application lives at the repository root (no `client/` or `apps/` subfolder) so scripts run from the root.
- Keep the scaffold close to the official Vite `react-ts` template so upstream docs apply directly.
- Strict TypeScript from day one.
- Every script works identically in PowerShell, Git Bash, and on macOS/Linux.

**Non-Goals:**
- Monorepo/workspace structure, path aliases, CSS frameworks, Prettier, git hooks, CI. Each can be added later in its own change.
- Pinning to specific minor versions beyond what `npm install` writes to the lockfile.

## Decisions

### Vite `react-ts` template as the base
Use `npm create vite@latest` with the `react-ts` template.
- *Alternatives*: Next.js (server features not needed yet, heavier), hand-written config (more drift from documented defaults), Create React App (deprecated).

### Scaffold into a temporary directory, then copy into the root
`create-vite` prompts or refuses when the target directory is non-empty. Generate into a scratch directory outside the repo, then copy its files into the root, skipping `.gitignore` and merging any of its entries the existing `.gitignore` lacks (e.g. `dist-ssr`, `*.local`).
- *Alternatives*: scaffolding with `.` and choosing "ignore files and continue" (interactive, risks overwriting `.gitignore`); scaffolding into a subfolder (contradicts the root-level goal).

### Vitest + React Testing Library + jsdom for tests
Vitest shares Vite's config and transform pipeline, so no separate Babel/ts-jest setup. Add `@testing-library/react`, `@testing-library/jest-dom`, and `jsdom`. Configure the `test` block in `vite.config.ts` with `environment: 'jsdom'` and a setup file importing `@testing-library/jest-dom/vitest`. `npm test` runs `vitest run` (single run, exits) so it satisfies the spec; `test:watch` is offered for local use.
- *Alternatives*: Jest (needs extra transform config for TS/ESM).

### Scripts
| Script | Command | Notes |
|---|---|---|
| `dev` | `vite` | HMR provides the "no restart" behavior |
| `build` | `tsc -b && vite build` | Template default; type errors fail the build |
| `preview` | `vite preview` | |
| `typecheck` | `tsc -b --noEmit` | Added; no `dist/` output |
| `lint` | `oxlint` | Template `.oxlintrc.json` enables `react/rules-of-hooks` and `react/only-export-components` |
| `test` | `vitest run` | Added |
| `test:watch` | `vitest` | Added, convenience only |

### oxlint as the linter
The current template (create-vite 9.x) ships oxlint instead of ESLint. Keep it: it matches the "close to the template" goal, covers the React hooks rules the spec requires, and runs much faster.
- *Alternatives*: ESLint flat config with `eslint-plugin-react-hooks` (more dependencies and config to maintain, no extra rule coverage needed today).

`tsc -b` with project references writes `.tsbuildinfo` files; these are already ignored by `*.tsbuildinfo` in `.gitignore`.

### App shell content
Replace the template's counter demo with a minimal `App` component rendering an `<h1>Smart Doc Assistant</h1>` inside a `<main>` element, with a short placeholder paragraph. Set `<title>` in `index.html` to "Smart Doc Assistant" and add a `<noscript>` message. Remove the template's demo assets (`react.svg`, `vite.svg` usage) and reduce `App.css`/`index.css` to a small responsive base (system font stack, `max-width` container with side padding, `box-sizing: border-box`) so the 360px requirement holds.

### Node engine declaration
Add `"engines": { "node": "^20.19.0 || >=22.12.0" }` to `package.json`, matching Vite 8's own engine range, and state the same in the README.

## Risks / Trade-offs

- [Template contents change between Vite releases (e.g. script names, ESLint config)] → Implementation adapts to the generated files; the spec only fixes script names and outcomes, not their internals.
- [`tsc -b --noEmit` behavior with project references can differ across TypeScript versions] → Verify the typecheck task by confirming `dist/` is not created; fall back to `tsc -p tsconfig.app.json --noEmit` if needed.
- [Copying scaffold files could clobber existing root files] → Only `.gitignore` overlaps today; it is explicitly skipped and merged by hand.
- [Lockfile generated on Windows] → npm lockfiles are platform-neutral; `npm ci` on other OSes is unaffected.
