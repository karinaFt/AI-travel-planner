# AI Travel Planner

Plan a multi-day trip with AI. You enter your travel preferences, get a day-by-day itinerary, adjust the activities and their estimated costs, and keep your trips in the browser. It is a single-page React application built with Vite and TypeScript.

## Prerequisites

- Node.js `^20.19.0 || >=22.12.0` (the range Vite requires)
- npm (ships with Node.js)

## Getting started

```sh
npm ci
npm run dev
```

All commands run from the repository root. It is an [npm workspaces](https://docs.npmjs.com/cli/using-npm/workspaces) root, and each script is forwarded to the workspaces that provide it.

Open the local URL printed in the terminal (by default http://localhost:5173/). Changes to files in `client/src/` show up in the browser without restarting the server.

## Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Start the local development server with hot module replacement. |
| `npm run build` | Type-check the project and build production assets into `client/dist/`. |
| `npm run preview` | Serve the contents of `client/dist/` locally (run `npm run build` first). |
| `npm run typecheck` | Report TypeScript errors without writing any output. |
| `npm run lint` | Lint the source with [oxlint](https://oxc.rs/docs/guide/usage/linter), including React hooks rules. |
| `npm test` | Run the unit test suite once with Vitest and exit. |
| `npm run test:watch` | Run Vitest in watch mode, re-running tests as files change. |

## Project layout

```
package.json          Workspaces root: shared scripts, oxlint, single lockfile
.oxlintrc.json        Lint rules for every workspace
shared/               Isomorphic code workspace (@travel-planner/shared)
  src/trip-basics.ts  Trip basics schema (Zod), currencies, limits, messages
  src/dates.ts        YYYY-MM-DD helpers (date-fns)
client/               Frontend workspace (@travel-planner/client)
  package.json        Frontend dependencies and scripts
  index.html          HTML entry point
  vite.config.ts      Vite and Vitest configuration
  public/             Static files copied as-is to the build
  src/
    main.tsx          Mounts the React app inside the browser router
    App.tsx           Route table (/, /plan, not-found)
    App.test.tsx      App shell and navigation tests
    config.ts         App-wide constants (app name)
    layouts/          Page frame shared by all routes (header + main)
    pages/            One component per route
    index.css         Tailwind import, design tokens (@theme) and base styles
    components/       Site header and other shared pieces
      ui/             UI primitives: Button, ButtonLink, Card, Container, PageHeading,
                      Field, TextInput, DateInput, Select
    features/
      trip-setup/     Trip basics form, its raw-input schema and the summary
    hooks/            Reusable hooks (document title)
    theme/            Contrast helper and the test that guards the token palette
    test/             Test setup and helpers (jest-dom, renderWithRouter)
openspec/             Specs, change proposals and the MVP roadmap (OpenSpec)
```

The backend (`server/`) is added as a workspace in a later step. See `openspec/ROADMAP.md`.

## Shared code

`shared/` holds validation and types that both the browser and the future server must agree on.

- **It is consumed as TypeScript source, with no build step.** Its `package.json` exports `./src/index.ts`, and Vite, Vitest and `tsc` compile it directly. After pulling changes that add or rename a workspace, run `npm install` so npm re-links it.
- **It must stay free of DOM and React code.** Its tsconfig has no DOM types.

The trip basics rules (`tripBasicsSchema`):

| Field | Rule |
|---|---|
| Destination | Required; 2–100 characters after trimming |
| Start and end dates | Real calendar dates as `YYYY-MM-DD`; the end is not before the start; at most 14 days, counting both ends |
| Budget | Greater than 0; at most 10,000,000; at most 2 decimals |
| Currency | One of USD, EUR, GBP, UAH, PLN, CZK, CHF, JPY, CAD, AUD (default EUR) |
| Travelers | Whole number from 1 to 20 (default 1) |

The form in `client/src/features/trip-setup/formSchema.ts` parses the raw input strings, reuses these rules, and adds one browser-only rule: the start date can't be in the past (in the user's time zone).

## Styling

- **Tailwind CSS v4** runs through the `@tailwindcss/vite` plugin. There is no `tailwind.config.js`; the configuration lives in CSS.
- **Design tokens** live in one place: the `@theme` block in `client/src/index.css`. It holds the colors, fonts, radii and shadow, and they are available as utilities such as `bg-canvas`, `text-muted`, `bg-primary`, `font-display` and `rounded-card`.
- **The app has a single light theme on purpose**, so it ignores the operating system's dark-mode setting.
- **Contrast is tested.** `client/src/theme/contrast.test.ts` reads the tokens from `index.css` and checks every text and background pair against WCAG AA. If a token change breaks contrast, `npm test` fails.
- **Fonts** are Fraunces (headings) and Inter (UI text). They are self-hosted through Fontsource, so no requests go to external font services.
- **Build pages from the primitives** in `client/src/components/ui/` instead of one-off styles. Page titles use `PageHeading`, because the layout moves focus to it after navigation.
- **Don't animate `outline-color`.** Avoid the bare `transition` utility on focusable elements and list the animated properties explicitly, for example `transition-[color,background-color]`. Otherwise the focus ring fades in from the text color.
