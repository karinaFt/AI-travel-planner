# Tasks

## 1. Move the frontend

- [x] 1.1 Run `git mv index.html public src vite.config.ts tsconfig.json tsconfig.app.json tsconfig.node.json client/` (creating `client/` first) and verify with `git status` that the files show as renamed, not deleted and added
- [x] 1.2 Create `client/package.json` (`@travel-planner/client`, private, `type: module`, the current React/Vite/TypeScript/test dependencies at their current versions, scripts `dev`, `build`, `preview`, `typecheck`, `test`, `test:watch`) and verify that every dependency from the old root `package.json` except `oxlint` is in it

## 2. Workspace root

- [x] 2.1 Rewrite the root `package.json` as the workspaces root (`workspaces: ["client"]`, `engines`, delegating scripts per design D1, `oxlint` as the only dev dependency); delete root `node_modules` and old `dist/`, run `npm install`, and verify `package-lock.json` lists the `client` workspace and `npm ci` exits 0
- [x] 2.2 Verify `npm run lint` at the root lints `client/src` (temporarily add a conditional hook call, confirm a non-zero exit naming the file and rule, revert)

## 3. Verify build tooling from the root

- [x] 3.1 Run `npm run typecheck`, `npm test` and `npm run build` from the root and verify all exit 0 and `client/dist/index.html` exists while no root `dist/` is created
- [x] 3.2 Introduce a temporary type error in `client/src/App.tsx`, verify `npm run build` exits non-zero with the file location, and revert it
- [x] 3.3 Run `npm run dev`, open the printed URL, verify the page renders without console errors and that saving a change in `client/src/App.tsx` updates the browser; then verify `npm run preview` serves the build

## 4. Documentation

- [x] 4.1 Update `README.md`: the project layout tree (`client/` workspace, root `openspec/`), the note that all commands run from the root, and `client/dist/` as the build output; verify each documented command runs as written
- [x] 4.2 Run `npx @fission-ai/openspec@latest validate restructure-to-client-folder --strict` and verify it passes

## Workflow follow-up

- Archive the change, then mark step 1 as done in `openspec/ROADMAP.md`.
