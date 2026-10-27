# Proposal

## Why

The app now has routes and a header, but it is styled with temporary plain CSS borrowed from a GitHub-like palette. It also switches to dark colors when the operating system does, which the MVP does not want. Every page built from step 4 onward (trip form, itinerary, budget, saved trips) needs the same colors, type, spacing and building blocks. Setting the visual language once, before those pages exist, avoids restyling each of them later. The home page is also still a placeholder and should welcome users properly.

## What Changes

- Add Tailwind CSS v4 to the client and define design tokens in one place:
  - a light, modern, pleasant palette: soft warm-white background, deep teal primary, coral accent, mint and sky tints, and ink-colored text;
  - typography: a serif display face for headings and a clean sans for UI text, both self-hosted;
  - radii, shadows and spacing.
- Use a single light theme. The current OS-driven dark mode is removed.
- Add reusable UI building blocks (`Button`, `ButtonLink`, `Card`, `Container`) that later steps use instead of ad-hoc styles.
- Restyle the header, the plan placeholder and the not-found page with the new tokens. Remove the temporary `layout.css`.
- Replace the placeholder home page with a landing page:
  - a hero with a headline, a value statement and a primary "Plan a trip" call to action;
  - a three-step "How it works" section;
  - a closing call to action;
  - a decorative, purely visual route illustration.
- Accessibility basics for all pages:
  - WCAG 2.1 AA contrast, verified by an automated test over the token pairs;
  - a visible focus indicator;
  - a "Skip to content" link;
  - after in-app navigation, focus moves to the new page's heading;
  - respect for reduced-motion preferences.

## Capabilities

### New Capabilities
<!-- None. -->

### Modified Capabilities
- `app-shell`:
  - The home page requirement changes to the landing page content.
  - New requirements cover the single light visual theme, readable contrast, visible keyboard focus, the skip link, focus moving to the page heading after navigation, and reduced motion.

## Impact

- **Code**: `client/vite.config.ts` (Tailwind plugin), `client/src/index.css` (Tailwind import, `@theme` tokens, base styles), `client/src/main.tsx` (font imports), new `client/src/components/ui/`, `client/src/components/SiteHeader.tsx`, `client/src/layouts/RootLayout.tsx`, all three pages, removal of `client/src/layout.css`, and the tests.
- **Dependencies** (client workspace): `tailwindcss`, `@tailwindcss/vite` (supports Vite 8), `@fontsource-variable/fraunces`, `@fontsource-variable/inter`.
- **Docs**: README notes about styling conventions. ROADMAP step 3 is marked done on archive.
- **Out of scope**: form controls and their error styles (they come with the trip form in step 4), icons for activity categories (step 10), dark mode, illustrations or images beyond one inline decorative SVG, and AI image generation.
