# Smart Doc Assistant

A single-page React application built with Vite and TypeScript.

## Prerequisites

- Node.js `^20.19.0 || >=22.12.0` (the range Vite requires)
- npm (ships with Node.js)

## Getting started

```sh
npm ci
npm run dev
```

Open the local URL printed in the terminal (by default http://localhost:5173/). Changes to files in `src/` show up in the browser without restarting the server.

## Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Start the local development server with hot module replacement. |
| `npm run build` | Type-check the project and build production assets into `dist/`. |
| `npm run preview` | Serve the contents of `dist/` locally (run `npm run build` first). |
| `npm run typecheck` | Report TypeScript errors without writing any output. |
| `npm run lint` | Lint the source with [oxlint](https://oxc.rs/docs/guide/usage/linter), including React hooks rules. |
| `npm test` | Run the unit test suite once with Vitest and exit. |
| `npm run test:watch` | Run Vitest in watch mode, re-running tests as files change. |

## Project layout

```
index.html          HTML entry point
public/             Static files copied as-is to the build
src/
  main.tsx          Mounts the React app
  App.tsx           Root view
  App.test.tsx      Tests for the root view
  test/setup.ts     Test environment setup (jest-dom matchers, cleanup)
openspec/           Specs and change proposals (OpenSpec)
```
