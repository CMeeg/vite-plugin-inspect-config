# AGENTS.md

## Overview

- pnpm-workspace monorepo (lerna + changesets + nx) with one real package: `packages/plugin` (published as `@meeg/vite-plugin-inspect-config`).
- `examples/vue-ts-project/` is a private workspace member that consumes the plugin via `workspace:*` for manual verification. The plugin's `main`/`module` point at `dist/`, so you must rebuild after changing plugin source before the example picks it up.
- No tests exist. Root `pnpm test` is a stub that exits 1.

## Commands (run from repo root)

- Install: `pnpm install` (pnpm 9, pinned by `packageManager`; Node from `.nvmrc` = v22.11.0)
- Build: `pnpm lerna run build`
- Typecheck: `pnpm lerna run check` (`tsc` in the plugin)
- Lint/format: `pnpm lerna run lint` (`biome check`); apply fixes with `pnpm exec biome check --write`
- CI (`ci.yml`) runs: `build` -> `lint` -> `check`. `lerna run <script>` only runs in packages that define that script (the example has no `lint`/`check`).

## Releasing

- Versions and publishing are Changesets-driven on `main` (`.github/workflows/release.yml`). Never hand-edit package versions; add a changeset instead (`pnpm changeset`).
- `changeset version` reformats `package.json` files (multi-line arrays), which is why Biome is configured to ignore `**/package.json` — don't "fix" that formatting.

## Conventions / gotchas

- `typescript` and `vite` versions come from the pnpm catalog in `pnpm-workspace.yaml`; reference them as `"catalog:"` rather than pinning.
- Biome style: tabs, double quotes, no semicolons, no trailing commas, lineWidth 120, uses `.editorconfig`.
- Plugin API: exports `inspectConfig`; options default to `cwd: process.cwd()` and `outputDir: ".vite-config"`; writes resolved config to `<outputDir>/vite.config.json` in the `configResolved` hook. Peer dep: Vite `^5.0.0 || ^6.0.0`.
- `.gitignore` excludes `.vite-config/` (the plugin's runtime output).
