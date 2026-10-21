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
    components/       Reusable UI pieces (site header)
    hooks/            Reusable hooks (document title)
    test/             Test setup and helpers (jest-dom, renderWithRouter)
openspec/             Specs, change proposals and the MVP roadmap (OpenSpec)
```

The backend (`server/`) and the shared schemas (`shared/`) are added as workspaces in later steps. See `openspec/ROADMAP.md`.
