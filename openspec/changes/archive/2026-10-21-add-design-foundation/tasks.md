# Tasks

## 1. Tailwind and tokens

- [x] 1.1 Install `tailwindcss`, `@tailwindcss/vite`, `@fontsource-variable/fraunces` and `@fontsource-variable/inter` in the client workspace, add the Tailwind plugin to `client/vite.config.ts`, and verify `npm ci`, `npm run typecheck` and `npm run build` exit 0
- [x] 1.2 Rewrite `client/src/index.css`: `@import "tailwindcss"`, `@theme` with the color, font, radius and shadow tokens from design D2, `color-scheme: light`, base styles (body canvas/ink/sans, headings in display font, global `:focus-visible` outline, reduced-motion rule), and remove the dark-mode media query; import both fonts in `client/src/main.tsx`; verify `npm run build` exits 0 and the built CSS contains the token names
- [x] 1.3 Add `client/src/theme/contrast.ts` (`contrastRatio(hexA, hexB)`) and `client/src/theme/contrast.test.ts` that parses `--color-*` tokens from `index.css?raw` and checks every pair in design D2 against its minimum (4.5 text, 3 non-text); temporarily set `--color-muted` to `#9AA5A6` to confirm the test fails, revert, and verify `npm test` passes

## 2. UI primitives

- [x] 2.1 Add `client/src/components/ui/` with `cx`, `buttonStyles`, `Button` (default `type="button"`), `ButtonLink` (router `Link`), `Card` (`as` prop), `Container` and `PageHeading` (`h1` with `tabIndex={-1}`); add tests that `Button` renders a `type="button"` button, `ButtonLink` renders a link with the given `href`, `Card as="li"` renders an `li`, and each `buttonStyles` variant yields different classes; verify `npm test` passes

## 3. Layout, header and focus behaviour

- [x] 3.1 Rebuild `RootLayout` (skip link → `SiteHeader` → `<main id="main" tabIndex={-1}>`) and restyle `SiteHeader` with tokens and an `aria-current` pill; delete `client/src/layout.css`; verify with RTL tests that the first Tab focuses "Skip to content" and activating it moves focus to `main`, and that existing header tests still pass
- [x] 3.2 Implement focus-after-navigation in `RootLayout` (skip initial render, focus `main h1` on later location changes, fall back to `main`) and switch all pages to `PageHeading`; verify with RTL tests that nothing is focused after initial render and that the "Plan a trip" heading is focused after clicking the header link

## 4. Pages

- [x] 4.1 Build the landing page per design D7 (hero with eyebrow, `h1`, value statement, primary `ButtonLink` "Plan a trip", "How it works" anchor link, `aria-hidden` decorative SVG; "How it works" `h2` with an `<ol>` of three `Card`s; closing mint section with a second "Plan a trip" link) and update `App.test.tsx` for the "Home page" scenarios (one `h1`, hero CTA navigates to `/plan`, ordered list of 3 steps, closing CTA links to `/plan`, illustration hidden from the accessibility tree); verify `npm test` passes
- [x] 4.2 Restyle `PlanPage` and `NotFoundPage` with `Container`, `PageHeading`, `Card` and `ButtonLink` (not-found link back home) keeping their texts; verify existing tests for both pages pass unchanged

## 5. Browser verification

- [x] 5.1 With `npm run dev`, verify on `/`, `/plan` and `/does-not-exist`: fonts load from the dev server (no external font requests in the network panel), no console errors, no horizontal scroll at 360px and 1440px, visible focus outline on every link and button when tabbing, skip link appears on first Tab and jumps past the header, focus lands on the heading after header navigation
- [x] 5.2 In DevTools, emulate `prefers-color-scheme: dark` and verify all pages stay light; emulate `prefers-reduced-motion: reduce` and verify buttons and cards no longer animate on hover/focus; take screenshots of the landing page at 360px and 1440px for review

## 6. Documentation and checks

- [x] 6.1 Update `README.md` with a short "Styling" section (Tailwind v4, tokens live in `client/src/index.css` `@theme`, contrast test guards them, primitives in `client/src/components/ui/`) and the updated `client/src/` layout; verify the documented commands run as written
- [x] 6.2 Run `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` and `npx @fission-ai/openspec@latest validate add-design-foundation --strict`; verify all pass

## Workflow follow-up

- Archive the change and mark step 3 as done in `openspec/ROADMAP.md`.
