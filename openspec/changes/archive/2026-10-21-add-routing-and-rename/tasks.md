# Tasks

## 1. Dependencies

- [x] 1.1 Install `react-router` and dev `@testing-library/user-event` in the client workspace (`npm install react-router -w client`, `npm install -D @testing-library/user-event -w client`); confirm from the installed version's docs that `BrowserRouter`, `MemoryRouter`, `Routes`, `Route`, `Outlet`, `Link`, `NavLink` are exported from `react-router` (note any API difference in design.md D1) and verify `npm ci` and `npm run typecheck` exit 0

## 2. Rename

- [x] 2.1 Add `client/src/config.ts` with `APP_NAME = 'AI Travel Planner'`; update `client/index.html` `<title>` and `<noscript>` text to "AI Travel Planner"; add a test that reads `client/index.html` and asserts the new title and noscript text and the absence of "Smart Doc Assistant"; verify `npm test` passes

## 3. Routing skeleton

- [x] 3.1 Add `useDocumentTitle` hook and unit-test it ("AI Travel Planner" without a page name, "Plan a trip · AI Travel Planner" with one)
- [x] 3.2 Add `client/src/test/renderWithRouter.tsx` (wraps UI in `MemoryRouter` with an initial route); create `RootLayout` (header + single `<main>` + `<Outlet/>`), `SiteHeader` (app name `Link` to `/`, `<nav aria-label="Main">` with `NavLink` "Home" (`end`) and "Plan a trip"), `HomePage`, `PlanPage`, `NotFoundPage`, each setting its title; turn `App.tsx` into the route table and wrap `App` in `BrowserRouter` in `main.tsx`
- [x] 3.3 Replace `App.test.tsx` with tests covering every app-shell scenario that runs in jsdom: header name links to `/`; home page has one `h1`, the description and a "Plan a trip" link that shows `/plan`; `/plan` shows the "Plan a trip" heading and coming-soon text; header navigation marks the active link with `aria-current="page"` (and "Home" not active on `/plan`); `/does-not-exist` shows "Page not found" with a working link home; page titles match for all three pages; no page contains "Smart Doc Assistant"; verify `npm test` passes

## 4. Minimal styling

- [x] 4.1 Rename `App.css` to `layout.css` and add header row styles (name + nav, wraps on narrow screens), page container, `[aria-current="page"]` styling and `:focus-visible` outlines; verify `npm run lint`, `npm run typecheck` and `npm run build` exit 0

## 5. Browser verification

- [x] 5.1 With `npm run dev`, verify in the browser: clicking header and page links switches pages without full reload; back button returns to `/` with "Home" current; tabbing shows visible focus on all three header links and Enter activates them; opening `/plan` and `/does-not-exist` directly works; tab titles match the spec; no console errors on any page; at 360px and 1440px no horizontal scrollbar on all three pages
- [x] 5.2 Run `npm run build` and `npm run preview`, open `/plan` and `/does-not-exist` directly in the browser and verify both render the correct page

## 6. Documentation and specs

- [x] 6.1 Update `README.md` (one-line description of the planner, `client/src/` layout with `layouts/`, `pages/`, `components/`, `hooks/`) and verify the documented commands still run as written
- [x] 6.2 Run `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` and `npx @fission-ai/openspec@latest validate add-routing-and-rename --strict`; verify all pass

## Workflow follow-up

- On archive, after syncing, reword the `## Purpose` of `openspec/specs/app-shell/spec.md` to describe AI Travel Planner's page frame (header, navigation, routed pages) instead of Smart Doc Assistant, and run `openspec validate app-shell --type spec --strict`.
- Mark step 2 as done in `openspec/ROADMAP.md`.
