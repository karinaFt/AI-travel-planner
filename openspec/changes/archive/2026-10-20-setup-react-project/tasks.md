# Tasks

## 1. Scaffold

- [x] 1.1 Generate a Vite `react-ts` project in a scratch directory outside the repo with `npm create vite@latest <tmp> -- --template react-ts` and verify it contains `package.json`, `index.html`, `src/`, and `vite.config.ts`
- [x] 1.2 Copy the generated files into the repository root, skipping `.gitignore`, and verify `openspec/` and the existing `.gitignore` are unchanged (`git status` shows only new files)
- [x] 1.3 Merge any entries from the generated `.gitignore` missing from the root one (e.g. `dist-ssr`, `*.local`) and verify with `git diff .gitignore` that only additions were made
- [x] 1.4 Set `name` to `smart-doc-assistant` and add `"engines": { "node": "^20.19.0 || >=22.12.0" }` in `package.json`, run `npm install`, and verify it exits 0 and creates `package-lock.json`

## 2. Build tooling

- [x] 2.1 Add `typecheck` (`tsc -b --noEmit`) to `package.json` and verify `npm run typecheck` exits 0 and no `dist/` directory is created
- [x] 2.2 Verify `npm run build` exits 0 and produces `dist/index.html`; then introduce a temporary type error in a source file, confirm the build exits non-zero with the file location, and revert it
- [x] 2.3 Verify `npm run lint` exits 0 on the scaffold; then add a temporary conditional hook call, confirm lint exits non-zero naming the rules-of-hooks rule (configured as `react/rules-of-hooks`, reported as `react-hooks(rules-of-hooks)`), and revert it
- [x] 2.4 Verify `npm run dev` prints a local URL that serves the page and that saving a source change updates the browser without restarting; verify `npm run preview` serves the built `dist/`

## 3. App shell

- [x] 3.1 Replace the template counter demo in `src/App.tsx` with a `<main>` containing `<h1>Smart Doc Assistant</h1>` and a short placeholder paragraph; remove unused demo assets and imports, and verify `npm run lint` and `npm run typecheck` still pass
- [x] 3.2 Set `<title>Smart Doc Assistant</title>` and add a `<noscript>` message stating JavaScript is required in `index.html`; verify the title appears in the browser tab
- [x] 3.3 Reduce `src/index.css` / `src/App.css` to a responsive base (system font stack, `box-sizing: border-box`, padded max-width container) and verify in browser devtools at 360px and 1440px widths that there is no horizontal scrollbar
- [x] 3.4 Load the app in the browser and verify the console shows no errors; with JavaScript disabled, verify the `<noscript>` message is shown

## 4. Tests

- [x] 4.1 Install `vitest`, `jsdom`, `@testing-library/react`, `@testing-library/dom` (peer of RTL), and `@testing-library/jest-dom` as dev dependencies; add a `test` block to `vite.config.ts` (`environment: 'jsdom'`, setup file `src/test/setup.ts` importing `@testing-library/jest-dom/vitest` and registering `cleanup`), using explicit `vitest` imports rather than globals so no tsconfig type changes are needed; verify `npm run typecheck` passes
- [x] 4.2 Add `test` (`vitest run`) and `test:watch` (`vitest`) scripts and write `src/App.test.tsx` asserting a level-1 heading named "Smart Doc Assistant" renders; verify `npm test` runs it and exits 0
- [x] 4.3 Temporarily break the assertion, confirm `npm test` exits non-zero and names the failing test, and revert it

## 5. Documentation

- [x] 5.1 Write `README.md` with the project name, Node.js `^20.19.0 || >=22.12.0` prerequisite, `npm ci` install step, and a table of every script (`dev`, `build`, `preview`, `typecheck`, `lint`, `test`, `test:watch`) with its purpose; verify each documented command runs as written

## 6. Integration check

- [x] 6.1 In a fresh clone (or after deleting `node_modules` and `dist`), run `npm ci`, `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build` in sequence and verify all exit 0
