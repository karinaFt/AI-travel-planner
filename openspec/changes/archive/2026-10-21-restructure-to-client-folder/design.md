# Design

## Context

The Vite + React scaffold lives at the repository root, with one `package.json` (name `smart-doc-assistant`), `tsconfig.json` referencing `tsconfig.app.json` (includes `src`) and `tsconfig.node.json` (includes `vite.config.ts`), oxlint configured in the root `.oxlintrc.json`, and Vitest configured inside `vite.config.ts` with `src/test/setup.ts`. The roadmap (`openspec/ROADMAP.md`) adds `server/` and `shared/` workspaces later.

## Goals / Non-Goals

**Goals:**
- A workspace layout that `server/` and `shared/` can join by adding one entry to `workspaces`.
- No behavioral change for users, and the same root command names for developers.
- Git history preserved for moved files (`git mv`).

**Non-Goals:**
- Adding `server/` or `shared/` (empty placeholders would only add noise).
- Changing any app code, dependency versions or lint rules.
- Turborepo, Nx or pnpm.

## Decisions

### D1. npm workspaces with a thin root
Root `package.json`:
```jsonc
{
  "name": "smart-doc-assistant",
  "private": true,
  "type": "module",
  "engines": { "node": "^20.19.0 || >=22.12.0" },
  "workspaces": ["client"],
  "scripts": {
    "dev": "npm run dev -w client",
    "build": "npm run build --workspaces --if-present",
    "preview": "npm run preview -w client",
    "typecheck": "npm run typecheck --workspaces --if-present",
    "lint": "oxlint",
    "test": "npm run test --workspaces --if-present",
    "test:watch": "npm run test:watch -w client"
  },
  "devDependencies": { "oxlint": "…" }
}
```
`client/package.json` (`"name": "@travel-planner/client"`, `private`, `type: module`) takes over the current `dependencies` and the React, Vite, TypeScript and test `devDependencies`, keeping the same versions and its existing scripts (`dev`, `build`, `preview`, `typecheck`, `test`, `test:watch`).
- `build`, `typecheck` and `test` use `--workspaces --if-present`, so they automatically cover `server` and `shared` when those join. `dev`, `preview` and `test:watch` target `client` explicitly, because running several watch processes needs `concurrently` (added together with the server).
- *Alternative*: a single package.json with folders only. It was rejected by the user in favour of clear dependency boundaries.

### D2. Lint stays at the root
oxlint is fast and repo-wide, and one `.oxlintrc.json` at the root lints `client/` now and `server/`/`shared/` later. Its `$schema` path `./node_modules/oxlint/...` still resolves because oxlint is a root dev dependency.

### D3. TypeScript per workspace
`tsconfig.json`, `tsconfig.app.json` and `tsconfig.node.json` move into `client/` unchanged (their paths are relative). `tsBuildInfoFile` paths (`./node_modules/.tmp/...`) then resolve inside `client/node_modules` if it exists, otherwise inside the created folder, and both are git-ignored. A root `tsconfig.json` is not needed until `shared/` exists.

### D4. Moves with `git mv`; one lockfile
`git mv index.html public src vite.config.ts tsconfig*.json client/`. After that, delete the root `node_modules` and run `npm install` to regenerate `package-lock.json` for the workspace layout (dependencies are hoisted to the root `node_modules`). The old `dist/` is deleted; `.gitignore` already ignores `dist/` at any depth.

### D5. Vite root
Vite runs with `client/` as its working directory (npm runs workspace scripts there), so `index.html`, `public/` and `vite.config.ts` resolve without config changes. The test setup path `./src/test/setup.ts` is relative and keeps working.

## Risks / Trade-offs

- [Hoisting differences: a package that resolved before might not after] → Covered by running the full lint, typecheck, test and build sequence plus `dev`/`preview` checks in tasks.
- [IDE caches (`.idea/`) point to old paths] → Reload the project in the IDE. This is local only.
- [`npm run lint` output paths change (`client/src/...`)] → Cosmetic.
- [The spec still says the app identifies as "Smart Doc Assistant" while the README already says "AI Travel Planner"] → Intentional. The rename is roadmap step 2 (`add-routing-and-rename`).

## Migration Plan

Developers pull, delete `node_modules`, run `npm ci`, and keep using the same root commands. To roll back, revert the commit.
