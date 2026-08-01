# Memory

- 2026-08-01: Chose TypeScript 6.0.3 over TypeScript 7 for ecosystem safety.
- 2026-08-01: Moved to pnpm 11 as the latest workspace package manager.
- 2026-08-01: Set the Vite peer range to `^6.0.0 || ^7.0.0 || ^8.0.0`; Vite 5 is EOL and is dropped.
- 2026-08-01: Set the Node engine to `>=22.12.0` and the CI matrix to Node 22 and 24.
- 2026-08-01: Replaced lerna and nx with Turbo for workspace task orchestration.
- 2026-08-01: Used Vitest 3.2.7 as the Vite 6 baseline because Vitest 4 crashed on Vite 6.
- 2026-08-01: Removed `vite-tsconfig-paths` because the package has no aliases, and removed `vite-plugin-externalize-deps` because its Vite peer range capped at 7.
- 2026-08-01: Biome 2 formats `package.json` files directly, so the package.json formatter ignore is no longer needed.
