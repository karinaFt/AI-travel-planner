# Proposal

## Why

The product is now an AI Travel Planner, but the app still calls itself "Smart Doc Assistant" and has a single static view with no way to have more than one page. Every following roadmap step (landing page, trip form, trip pages, saved trips) needs URLs and a shared page frame. So the rename and client-side routing come first, before any feature UI.

## What Changes

- **BREAKING** (spec-level): rename the app from "Smart Doc Assistant" to "AI Travel Planner" in the browser title, the visible app name and the no-JavaScript notice.
- Add client-side routing with three pages:
  - `/`: a simple home page with a heading, one sentence and a "Plan a trip" link;
  - `/plan`: a placeholder that says the trip form is coming;
  - any unknown URL: a not-found page with a link home.
- Add a header shown on every page. It holds the app name, which links home, and navigation links "Home" and "Plan a trip". The current page's link is marked as current.
- Give each page its own browser tab title, such as "Plan a trip · AI Travel Planner".
- Keep the current plain CSS, extended minimally for the header and pages. The visual design, Tailwind and the real landing page are roadmap step 3 (`add-design-foundation`).

## Capabilities

### New Capabilities
<!-- None. -->

### Modified Capabilities
- `app-shell`:
  - The app identifies itself as "AI Travel Planner" through the browser title and the header.
  - The no-JavaScript notice uses the new name.
  - The clean-load and viewport requirements apply to every page, not only the root view.
  - New requirements cover the home page, the plan placeholder, navigation, page titles and unknown routes.

## Impact

- **Code**: `client/index.html`, `client/src/main.tsx`, `client/src/App.tsx` (becomes the route table), new `client/src/layouts/`, `client/src/pages/` and `client/src/components/` (header), `client/src/App.css` and `client/src/index.css`, `client/src/App.test.tsx` and new tests.
- **Dependencies**: `react-router` (client workspace). Dev: `@testing-library/user-event` (client workspace) for navigation tests.
- **Specs**: the `app-shell` main spec's Purpose is reworded to the new name when the change is archived.
- **Unchanged**: the package and repository names (`smart-doc-assistant`), the build tooling, and the dark-mode colors already in `index.css`. Whether to keep dark mode is decided in step 3.
- **Out of scope**: visual design system, landing page content, the trip form, and any backend.
