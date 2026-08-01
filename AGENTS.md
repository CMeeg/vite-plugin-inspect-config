# AGENTS.md

## Overview

- pnpm-workspace monorepo using Turbo with one real package: `packages/plugin` (published as `@meeg/vite-plugin-inspect-config`).
- `examples/vue-ts-project/` is a private workspace member that consumes the plugin via `workspace:*` for manual verification. The plugin's `main`/`module` point at `dist/`, so rebuild after changing plugin source before the example picks it up.
- The plugin has Vitest coverage for its output behavior. Runtime output is written under `.vite-config/`, which is ignored.

## Commands (run from repo root)

- Install: `pnpm install` (pnpm 11.18.0; Node from `.nvmrc` is 24.18.1)
- Build: `pnpm build` (Turbo)
- Lint/format: `pnpm lint` (`biome check`); apply fixes with `pnpm exec biome check --write`
- Typecheck: `pnpm check` (Turbo runs `tsc` in the plugin)
- Test: `pnpm test` (Turbo runs Vitest)
- Full local pipeline: `pnpm build && pnpm lint && pnpm check && pnpm test`

## Releasing

- Versions and publishing are Changesets-driven on `main` (`.github/workflows/release.yml`). Never hand-edit package versions; add a changeset instead (`pnpm changeset`).
- `changeset version` formats `package.json` files with the same multi-line style as Biome 2; package manifests are included in linting.

## Conventions / gotchas

- `typescript` and `vite` versions come from the pnpm catalog in `pnpm-workspace.yaml` (`~6.0.3` and `^8.2.0`); reference them as `"catalog:"` rather than pinning.
- Biome style: tabs, double quotes, no semicolons, no trailing commas, lineWidth 120, uses `.editorconfig`.
- Plugin API: exports `inspectConfig`; options default to `cwd: process.cwd()` and `outputDir: ".vite-config"`; writes resolved config to `<outputDir>/vite.config.json` in the `configResolved` hook. Peer dep: Vite `^6.0.0 || ^7.0.0 || ^8.0.0`. Node engine: `>=22.12.0`.
- `vite-tsconfig-paths` and `vite-plugin-externalize-deps` were removed; no aliases are used and the latter did not support Vite 8.
- `.gitignore` excludes `.vite-config/` (the plugin's runtime output).
