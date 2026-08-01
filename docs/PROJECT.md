# Project

## Problem

Vite plugin authors need to inspect the resolved configuration after plugins have modified it. Without this plugin, confirming those changes requires ad hoc logging or debugger setup.

## Who It Is For

Vite plugin authors and maintainers debugging configuration changes during development.

## Goals

- Write the resolved Vite configuration to a predictable JSON file.
- Support current Vite releases without adding unnecessary build tooling.
- Keep the plugin small, typed, and easy to verify in a consumer project.

## Success

- Consumers on supported Vite versions can install and run the plugin.
- `configResolved` output is written to the configured directory.
- Build, lint, typecheck, and test commands pass on the supported Node CI matrix.

## Scope

### In

- The `inspectConfig` Vite plugin and its output path options.
- Vite peer compatibility for versions 6, 7, and 8.
- Package build, type declarations, tests, and release documentation.

### Out

- A web UI for browsing configuration output.
- Configuration redaction, normalization, or schema validation.
- Support for Vite 5 after the 0.3 release.

## Constraints

- Minimum Node version is `>=22.12.0`; CI covers Node 22 and 24.
- The package is published from `packages/plugin` and releases are Changesets-driven.
- The repository uses pnpm 11, Turbo, TypeScript 6, Vite 8, and Biome 2.
- Runtime output remains local and is excluded from version control.

## Open Questions

- TODO: Confirm the long-term Vite peer support policy after Vite 8.
- TODO: Decide whether generated JSON should support redaction or stable serialization options.
- TODO: Confirm whether a documented public schema for the output is useful.

## Riskiest Unknowns

- TODO: Confirm the final declaration output path remains stable with `vite-plugin-dts` and Rolldown.
- TODO: Confirm Node built-ins remain external in all supported build modes.
- TODO: Confirm `vue-tsc` 3 behavior with TypeScript 6 in the example consumer.
