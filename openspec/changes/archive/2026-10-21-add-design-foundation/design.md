# Design

## Context

After step 2, the client has these pieces:
- `RootLayout`: `SiteHeader` plus a single `<main className="page">` with an `<Outlet/>`;
- three pages: `HomePage`, `PlanPage`, `NotFoundPage`;
- a `useDocumentTitle` hook;
- plain CSS: `index.css` (tokens, a dark-mode media query and a reset) and `layout.css` (temporary header and page styles).

Tests use `renderWithRouter` and assert content and navigation by role and text, not by class names. That keeps them valid through a restyle. The roadmap decided on a calm, editorial look (serif display, sans body), WCAG AA, no dark mode. The user refined it to a "light, modern, pleasant" palette.

## Goals / Non-Goals

**Goals:**
- One source of truth for visual tokens, usable as Tailwind utilities.
- A handful of primitives, so feature steps compose pages without inventing styles.
- Contrast that is verified by a test, not by eye.

**Non-Goals:**
- Form controls (`Field`, inputs, selects, radio cards). They arrive with their first real use in step 4.
- An icon library, dark mode, theming, and a component documentation tool (Storybook).
- Visual regression tests.

## Decisions

### D1. Tailwind CSS v4 through `@tailwindcss/vite`
Add `tailwindcss` and `@tailwindcss/vite` 4.3.x to the client workspace. The plugin's peer range includes Vite 8. `index.css` starts with `@import "tailwindcss";` and defines tokens in `@theme`. There is no `tailwind.config.js`, because v4 is CSS-first.
- *Alternative*: keep plain CSS modules. That gives more files and naming decisions per component, and the roadmap already chose Tailwind.
- *Alternative*: a component library (MUI, Chakra). Its admin-dashboard look is exactly what the brief says to avoid.

### D2. Tokens (light theme only)
Values were checked with the WCAG formula. Ratios are given against the background they are used on.

| Token | Value | Use | Contrast |
|---|---|---|---|
| `--color-canvas` | `#FAFAF7` | page background (soft warm white) | — |
| `--color-surface` | `#FFFFFF` | cards, header | — |
| `--color-mint` | `#ECF7F4` | tinted sections, step numbers | — |
| `--color-sky` | `#EAF4FB` | secondary tint | — |
| `--color-coral-soft` | `#FFEDE7` | warm highlight background | — |
| `--color-ink` | `#1C2B2D` | headings, body text | 13.1–14.7 on all backgrounds |
| `--color-muted` | `#526366` | secondary text | 5.65–6.30 |
| `--color-primary` | `#0F766E` | buttons, links, focus ring | 5.00–5.47; white on it 5.47 |
| `--color-primary-hover` | `#115E59` | hover/pressed | white on it 7.58 |
| `--color-coral` | `#E8664F` | decorative accent only (shapes, illustration) | 3.12 (non-text only) |
| `--color-coral-text` | `#B4432C` | accent text, such as an eyebrow label | 4.90–5.31 |
| `--color-line` | `#DCE5E3` | dividers, card borders (decorative) | — |
| `--color-line-strong` | `#748886` | control boundaries (step 4) | 3.58–3.74 |

- Fonts: `--font-display: "Fraunces Variable", Georgia, serif` and `--font-sans: "Inter Variable", system-ui, sans-serif`. They are self-hosted with `@fontsource-variable/*` and imported in `main.tsx`, so no requests go to external font CDNs.
- Radii: `--radius-card: 1.25rem` and `--radius-pill: 999px` (buttons). Shadow: one soft `--shadow-card` (low-opacity ink). Layout width: `Container` uses `max-w-6xl` with responsive padding (`px-4 sm:px-6 lg:px-8`).
- `color-scheme: light` on `:root`. The dark-mode media query is deleted.

### D3. Contrast test reads the real CSS
`client/src/theme/contrast.test.ts` reads `../index.css` from disk with `node:fs` (resolved from `import.meta.url`), parses the `--color-*` declarations inside `@theme`, and checks a declared list of `[foreground, background, minimum]` pairs with a small `contrastRatio()` helper in `client/src/theme/contrast.ts`. Changing a token that breaks AA fails `npm test`.
- *Why not `?raw` as in the step 2 `index.html` test*: Vitest does not process CSS by default, so `index.css?raw` is an empty string in tests. Turning on CSS processing would run Tailwind in every test run. The test file opts into Node types with `/// <reference types="node" />`, so the app tsconfig stays browser-only.

### D4. UI primitives in `client/src/components/ui/`
- `buttonStyles({ variant: 'primary' | 'secondary' | 'ghost', size: 'md' | 'lg' })` returns a class string, shared by:
  - `Button`: a native `<button>` that defaults `type="button"`;
  - `ButtonLink`: React Router's `Link` styled as a button, used for navigation CTAs, so they stay real links.
- `Card`: a surface with border, radius, shadow and padding. It accepts an `as` prop for semantic elements (`li`, `section`, `article`).
- `Container`: a centered max-width wrapper.
- Styles are plain Tailwind class strings in each component, without `clsx` or `tailwind-merge`. A tiny `cx(...classes)` helper joins conditional classes.
- Focus style everywhere is `focus-visible:outline-2 outline-offset-2 outline-primary`. A global base rule in `index.css` also covers bare links.

### D5. Layout and header
- `RootLayout`: skip link (`sr-only focus:not-sr-only`, positioned top-left) → `SiteHeader` → `<main id="main" tabIndex={-1}>`. There is no footer yet.
- `SiteHeader`: a white bar with a bottom border, the app name in the display font, and nav links as pill-shaped links. The active link (`aria-current="page"`) gets a mint background and teal text.
- `layout.css` is deleted, and every page uses `Container` and utilities.

### D6. Focus management on navigation
`RootLayout` uses `useLocation()`. A `useEffect` keyed on `location.key` skips the first run (initial load) via a ref. On later runs it focuses `main h1`, which pages render with `tabIndex={-1}` through a shared `PageHeading` component. The heading gets `outline-none` only for programmatic focus, so keyboard users still see focus on interactive elements. If a page has no heading, focus falls back to `<main>`.
- *Alternative*: an ARIA live region announcing the title. It was rejected because moving focus also resets the Tab start point, which a live region does not.

### D7. Landing page structure
```
<section hero>      eyebrow "AI travel planner" (coral-text) · h1 (display, 3xl→6xl)
                     · value statement · ButtonLink primary lg "Plan a trip"
                     · ghost link "How it works" (#how-it-works)
                     · decorative SVG (dashed route, three pins, soft mint/sky/coral blobs), aria-hidden
<section #how-it-works> h2 "How it works" · <ol> of 3 Cards with numbered mint badges:
                     1 Describe your trip · 2 Get an AI itinerary · 3 Refine and keep it
<section closing>   mint band · h2 "Ready when you are" · ButtonLink "Plan a trip"
```
Copy is in English. There are no stock photos or generated images. Hover lifts on cards and buttons use `transition` with `motion-reduce:transition-none`. A global `@media (prefers-reduced-motion: reduce)` rule caps durations at 0.01s.

### D8. Tests
- Update `App.test.tsx` for the new landing copy, including the hero CTA and closing CTA links, the "How it works" ordered list with 3 items, and the `aria-hidden` illustration.
- Add tests for:
  - skip link: it is first in tab order and moves focus to `main`;
  - focus after navigation: the heading is focused after clicking a nav link, and nothing is focused on initial render;
  - `buttonStyles` variants: distinct classes per variant;
  - the contrast test.
- Browser checks cover the OS dark-mode case (DevTools "Emulate prefers-color-scheme: dark"), visible focus, reduced motion (DevTools "Emulate prefers-reduced-motion") and no horizontal scroll at 360px and 1440px.

## Risks / Trade-offs

- [Tailwind class strings get long] → Primitives keep repeats in one place. Feature code mostly composes primitives.
- [Two variable fonts add weight] → The Fontsource default import declares every subset with `unicode-range`. The browser downloads only the subsets the page's text needs (Latin for English UI), with `font-display: swap`. This is acceptable for an MVP.
- [The palette is a taste decision] → Every value lives in `@theme` and the contrast test guards changes, so a later re-tint is a one-file edit.
- [Focusing the heading on every navigation could surprise mouse users] → Headings have no visible outline when focused programmatically. The behavior is invisible except to keyboard and screen-reader users.
- [jsdom does not compute Tailwind styles] → Tests assert roles, attributes and focus, not visuals. Visuals are checked in the browser tasks.

## Migration Plan

This change is purely client-side, with no data. Removing the dark theme changes appearance only for users with an OS dark preference, which is intended (see the spec). To roll back, revert the commit.
