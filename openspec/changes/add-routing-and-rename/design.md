# Design

## Context

`client/src/App.tsx` renders one static `<main>` with an `<h1>Smart Doc Assistant</h1>`. Styling is plain CSS:
- `index.css` has tokens, light and dark colors, and a reset;
- `App.css` has a centered container.

Tests render `<App />` directly with React Testing Library. There is no router. This is roadmap step 2. Step 3 replaces the styling with Tailwind and builds the real landing page, so the styling here is deliberately minimal and disposable. See proposal.md for motivation.

## Goals / Non-Goals

**Goals:**
- A route table and layout that later steps extend by adding one `<Route>` each.
- Components that are testable without a browser URL. Tests pick the starting URL.
- A rename that is complete: no "Smart Doc Assistant" left in user-facing output.

**Non-Goals:**
- Visual design, icons and fonts (step 3).
- Moving focus to the new page heading on navigation and announcing route changes. This is worth doing once real pages exist and is noted for step 3.
- Data loaders, lazy routes and code splitting.

## Decisions

### D1. React Router in declarative ("library") mode
Use `react-router` (the current major, 8.x at the time of writing) with `<BrowserRouter>`, `<Routes>`, `<Route>`, `<Outlet>`, `<Link>` and `<NavLink>`.
- *Why not data mode (`createBrowserRouter`)*: there are no loaders or actions. Saved trips use localStorage through React state, and generation is a user-triggered POST. Declarative mode is the smallest API to learn, and switching later is mechanical.
- *Why not framework mode*: it brings its own Vite plugin and file conventions, which is too much change for this project.
- During implementation, confirm in the installed version's docs that these components are exported from `react-router` and that `NavLink` sets `aria-current="page"`. If the API differs, follow the installed version and note it in this file.

### D2. Router provider lives in `main.tsx`, routes live in `App.tsx`
```
main.tsx   <StrictMode><BrowserRouter><App/></BrowserRouter></StrictMode>
App.tsx    <Routes>
             <Route element={<RootLayout/>}>
               <Route index element={<HomePage/>}/>
               <Route path="plan" element={<PlanPage/>}/>
               <Route path="*" element={<NotFoundPage/>}/>
             </Route>
           </Routes>
```
Because `App` contains no router, tests wrap it in `<MemoryRouter initialEntries={['/plan']}>` and can start at any URL. A small helper `renderWithRouter(ui, { route })` in `client/src/test/` keeps tests short.

### D3. File layout
```
client/src/
  layouts/RootLayout.tsx        SiteHeader + <main><Outlet/></main>
  components/SiteHeader.tsx     app name link + <nav aria-label="Main"> with NavLinks
  pages/HomePage.tsx
  pages/PlanPage.tsx
  pages/NotFoundPage.tsx
  hooks/useDocumentTitle.ts     sets document.title = page ? `${page} · AI Travel Planner` : 'AI Travel Planner'
  test/renderWithRouter.tsx
```
`<main>` lives once in the layout, so pages render only their content and there is exactly one `main` landmark per page.

### D4. Page titles via a tiny hook
`useDocumentTitle(pageName?)` runs in a `useEffect` and sets `document.title`. React 19 can also hoist a `<title>` element rendered in components. The hook was chosen because it is explicit, easy to unit-test, and the behavior is obvious to someone learning. `index.html` keeps a static `<title>AI Travel Planner</title>` for the moment before JavaScript runs.

### D5. Current-link styling
`NavLink` gives `aria-current="page"` to the active link. CSS targets `[aria-current="page"]` (underline and bold), so the visual state and the accessible state cannot drift apart. The "Home" link uses `end` so it is not active on `/plan`.

### D6. Unknown URLs in dev and preview
Vite's dev server and `vite preview` both default to `appType: 'spa'`, which serves `index.html` for unknown paths. The client router then renders `NotFoundPage`. No config change is expected. A task verifies this for both servers. Static hosting rewrites are out of scope (no deployment yet).

### D7. Minimal styling
`App.css` becomes `layout.css`, holding the header row (name left, nav right, wrapping on narrow screens), a page container and focus-visible outlines. Existing `index.css` tokens are reused. All of this is replaced in step 3.

## Risks / Trade-offs

- [React Router major versions change APIs] → Declarative-mode components have been stable across majors. D1 asks to confirm against the installed version's docs.
- [Two places hold the app name (`index.html`, the hook and the header)] → A single `APP_NAME` constant in `client/src/config.ts` for code. `index.html` is static and is checked by a test that reads the file.
- [StrictMode double-invokes effects in dev] → `useDocumentTitle` is idempotent, so this is harmless.
- [The placeholder plan page ships temporary copy] → It is replaced in step 4. The spec requirement for it is minimal on purpose.

## Migration Plan

There is no data. Links to `/` keep working. When archiving, update the `app-shell` main spec Purpose to the new name. This is a tracked task, because `## Purpose` in a delta for an existing capability is ignored.
