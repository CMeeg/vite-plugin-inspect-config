# Vite 8 Toolchain Upgrade — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade this monorepo to the current toolchain (vite 8, TypeScript 6, Biome 2, changesets 2, turbo replacing lerna/nx, Node 24 LTS) and widen the plugin's Vite peer range to `^6 || ^7 || ^8` so consumers on Vite 8 can use it — while gaining test coverage via vitest.

**Architecture:** Add vitest tests against the current vite-6 baseline first, then perform the upgrade in four independently-verifiable slices (tooling swap → dependency bump + build simplification → Biome migration → CI), finishing with a minor-only changeset and docs. Each slice keeps `build`/`test`/`lint`/`check` green and commits.

**Tech Stack:** pnpm 11 (workspace catalogs), turbo 2, vite 8 (Rolldown), TypeScript 6, Biome 2, changesets 2, vitest 4, vue 3.5, @vitejs/plugin-vue 6, vue-tsc 3, vite-plugin-dts 5.

## Global Constraints

- Monorepo layout: `packages/plugin` (published `@meeg/vite-plugin-inspect-config`) + `examples/vue-ts-project` (private, consumes plugin via `workspace:*`).
- Vite peer range for the plugin: `^6.0.0 || ^7.0.0 || ^8.0.0`. Node engines: `>=22.12.0`.
- `.nvmrc` → `v24.18.1`; CI matrix `[22.x, 24.x]`; `packageManager` → `pnpm@11.18.0` (needs node >=22.13).
- Catalog in `pnpm-workspace.yaml`: `typescript: ~6.0.3`, `vite: ^8.2.0`. Reference as `"catalog:"`.
- Remove lerna + nx **entirely** (delete `lerna.json`, `nx.json`, `lerna` dep). Replace with `turbo` + `turbo.json` (`tasks` syntax — `pipeline` is deprecated in turbo 2).
- Biome style: tabs, double quotes, no semicolons, no trailing commas, lineWidth 120. Biome 2 formats `package.json` always-multi-line → **drop** the `**/package.json` formatter ignore.
- Changeset bump is **minor only** (0.2.0 → 0.3.0). Never bump to 1.0.0. Never hand-edit versions.
- Drop `vite-tsconfig-paths` and `vite-plugin-externalize-deps` (no aliases used anywhere; externalize-deps peer caps at vite `^7`).
- No code comments. Conventional commits matching repo style.

---

### Task 0: Revert the exploratory vitest scaffolding

**Files:**
- Restore: `packages/plugin/package.json`
- Restore: `pnpm-lock.yaml`
- Delete: `packages/plugin/tests/` (untracked)

- [ ] **Step 1: Restore modified files**
```bash
git restore packages/plugin/package.json pnpm-lock.yaml
```
- [ ] **Step 2: Delete the untracked test dir**
```bash
rm -rf packages/plugin/tests
```
- [ ] **Step 3: Verify clean tree**
```bash
git status
```
Expected: `On branch feature/upgrade`, `nothing to commit, working tree clean`.
- [ ] **Step 4: Prune vitest from node_modules**
```bash
pnpm install
```
(Optional; `node_modules/` is gitignored. No commit — tree is back to HEAD.)

---

### Task 1: Add vitest tests on the current (vite 6) baseline

**Files:**
- Modify: `packages/plugin/package.json` — add `test` script + `vitest` devDep
- Create: `packages/plugin/tests/inspect-config.test.ts`

**Interfaces:**
- Consumes: `inspectConfig(options?: Partial<{ outputDir?: string; cwd: string }>)` from `src/plugin.ts`, returning a vite `PluginOption` with a `configResolved` hook; vite's `resolveConfig(inlineConfig, command)`.
- Produces: a passing test suite proving the plugin writes `<outputDir>/vite.config.json` — the regression gate the upgrade re-runs on vite 8.

> **Why vitest 3.2.7 and not 4.1.10 here:** vitest 4.1.10 crashes on the current vite 6.0.3 (`TypeError: Cannot read properties of undefined (reading 'length')` at vite's `ModuleRunner` — observed during exploration). vitest 3.2.7 bundles `vite ^5||^6||^7` as a dependency and is the correct baseline tool. Task 3 bumps it to 4.1.10 (peer `^6||^7||^8`).

- [ ] **Step 1: Add vitest + test script to the plugin**

Edit `packages/plugin/package.json`:
- scripts: add `"test": "vitest run"`
- devDependencies: add `"vitest": "^3.2.7"`

- [ ] **Step 2: Write the test file**

`packages/plugin/tests/inspect-config.test.ts`:
```ts
import { mkdtemp, readFile, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import { resolveConfig } from "vite"
import { inspectConfig } from "../src/plugin"

interface TestPlugin {
	name: string
	configResolved: (config: unknown) => Promise<void> | void
}

const tempDirs: string[] = []

async function makeTempDir(): Promise<string> {
	const dir = await mkdtemp(join(tmpdir(), "inspect-config-"))
	tempDirs.push(dir)
	return dir
}

afterEach(async () => {
	await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })))
})

describe("inspectConfig", () => {
	it("returns a plugin with the expected name and configResolved hook", () => {
		const plugin = inspectConfig() as unknown as TestPlugin
		expect(plugin.name).toBe("inspect-config")
		expect(typeof plugin.configResolved).toBe("function")
	})

	it("defaults cwd to process.cwd() and outputDir to .vite-config", async () => {
		const dir = await makeTempDir()
		const originalCwd = process.cwd()
		process.chdir(dir)
		try {
			const plugin = inspectConfig() as unknown as TestPlugin
			await plugin.configResolved({ root: dir })
			const content = await readFile(join(dir, ".vite-config", "vite.config.json"), "utf8")
			expect(JSON.parse(content)).toEqual({ root: dir })
		} finally {
			process.chdir(originalCwd)
		}
	})

	it("writes the resolved config to a custom outputDir", async () => {
		const dir = await makeTempDir()
		const plugin = inspectConfig({ cwd: dir, outputDir: "custom-out" }) as unknown as TestPlugin
		await plugin.configResolved({ foo: "bar" })
		const content = await readFile(join(dir, "custom-out", "vite.config.json"), "utf8")
		expect(JSON.parse(content)).toEqual({ foo: "bar" })
	})

	it("writes the resolved config during vite's config resolution", async () => {
		const dir = await makeTempDir()
		await resolveConfig(
			{
				configFile: false,
				root: dir,
				logLevel: "silent",
				plugins: [inspectConfig({ cwd: dir })]
			},
			"build"
		)
		const content = await readFile(join(dir, ".vite-config", "vite.config.json"), "utf8")
		expect(JSON.parse(content)).toMatchObject({ root: dir })
	})
})
```

- [ ] **Step 3: Install**
```bash
pnpm install
```
- [ ] **Step 4: Run the tests (must pass on vite 6)**
```bash
pnpm --filter @meeg/vite-plugin-inspect-config test
```
Expected: 4 passing tests.
- [ ] **Step 5: Lint the new file**
```bash
pnpm --filter @meeg/vite-plugin-inspect-config lint
```
- [ ] **Step 6: Commit**
```bash
git add packages/plugin/package.json packages/plugin/tests pnpm-lock.yaml
git commit -m "test: add inspect-config unit and integration tests"
```

---

### Task 2: Replace lerna/nx with turbo, switch to pnpm 11, update .nvmrc

**Files:**
- Modify: `package.json` (root)
- Create: `turbo.json`
- Delete: `lerna.json`, `nx.json`
- Modify: `.gitignore`
- Modify: `.nvmrc`

- [ ] **Step 1: Rewrite root scripts and devDependencies**

`package.json` (root) target:
```json
{
	"name": "vite-plugin-inspect-config",
	"private": true,
	"author": "Chris Meagher",
	"license": "MIT",
	"type": "module",
	"scripts": {
		"build": "turbo run build",
		"check": "turbo run check",
		"lint": "turbo run lint",
		"publish": "changeset publish",
		"test": "turbo run test",
		"version": "changeset version && pnpm install --no-frozen-lockfile"
	},
	"devDependencies": {
		"@biomejs/biome": "1.9.4",
		"@changesets/cli": "^2.27.10",
		"turbo": "^2.10.8"
	},
	"packageManager": "pnpm@11.18.0"
}
```
(Removes `lerna` script + dep and the `test` stub; adds `build`/`lint`/`check`/`test` via turbo.)

- [ ] **Step 2: Create `turbo.json`**
```json
{
	"$schema": "https://turbo.build/schema.json",
	"tasks": {
		"build": { "dependsOn": ["^build"], "cache": true },
		"check": { "dependsOn": ["^build"], "cache": true },
		"lint": { "cache": true },
		"test": { "cache": true }
	}
}
```
`build`/`check` depend on `^build` so the example's `build` runs after the plugin's (parity with the old `nx.json` `targetDefaults`).

- [ ] **Step 3: Delete lerna/nx files**
```bash
git rm lerna.json nx.json
```
- [ ] **Step 4: Update `.gitignore`** — remove `.nx/cache` and `.nx/workspace-data`; add `.turbo/` (keep `.vite-config/`, `dist/`, `node_modules/`, etc.).
- [ ] **Step 5: Update `.nvmrc`** → `v24.18.1`
- [ ] **Step 6: Activate pnpm 11 and reinstall**
```bash
corepack use pnpm@11.18.0
pnpm install
```
Fallback if corepack shims aren't on PATH: `npx -y pnpm@11.18.0 install`. (pnpm 11 needs node >=22.13; env has 24.16.0.)
> Checkpoint: if pnpm 11 reports ignored build scripts (esbuild/rolldown native bins), approve them — `pnpm approve-builds` or add `onlyBuiltDependencies` to `.npmrc`.
- [ ] **Step 7: Verify the whole pipeline via turbo**
```bash
pnpm build && pnpm lint && pnpm check && pnpm test
```
All green (vitest 3 still on vite 6).
- [ ] **Step 8: Commit**
```bash
git add package.json turbo.json pnpm-lock.yaml .gitignore .nvmrc
git commit -m "chore: replace lerna and nx with turbo, move to pnpm 11"
```

---

### Task 3: Upgrade the toolchain and simplify the plugin build

**Files:**
- Modify: `pnpm-workspace.yaml`
- Modify: `package.json` (root — biome/changesets versions)
- Modify: `packages/plugin/package.json`
- Modify: `packages/plugin/vite.config.ts`
- Modify: `packages/plugin/tsconfig.json`
- Modify: `examples/vue-ts-project/package.json`

**Interfaces:**
- Consumes: Task 1's test suite (unchanged; vitest API is stable 3→4).
- Produces: `dist/plugin.js`, `dist/plugin.cjs`, `dist/src/plugin.d.ts` (or path confirmed at build time) matching the package `types` field; node builtins (`node:fs`, `node:path`) left external.

- [ ] **Step 1: Update the catalog** — `pnpm-workspace.yaml`:
```yaml
catalog:
  typescript: ~6.0.3
  vite: ^8.2.0
```
- [ ] **Step 2: Bump root tooling** — root `package.json`: `@biomejs/biome` `2.5.6`, `@changesets/cli` `^2.31.1`.
- [ ] **Step 3: Update the plugin manifest**

`packages/plugin/package.json` target deltas:
- `peerDependencies.vite`: `"^6.0.0 || ^7.0.0 || ^8.0.0"`
- `engines.node`: `">=22.12.0"`
- `devDependencies`: remove `vite-plugin-externalize-deps`, remove `vite-tsconfig-paths`; set `@types/node` `^24.13.3`, `vite-plugin-dts` `^5.0.3`, `vitest` `^4.1.10`; keep `typescript`/`vite` at `catalog:`; keep `"test": "vitest run"`.

- [ ] **Step 4: Simplify `packages/plugin/vite.config.ts`** (full file):
```ts
import { defineConfig } from "vite"
import dts from "vite-plugin-dts"

// https://vite.dev/config/
export default defineConfig({
	plugins: [dts()],
	build: {
		lib: {
			entry: {
				plugin: "src/plugin.ts"
			},
			formats: ["es", "cjs"],
			name: "inspect-config"
		}
	}
})
```
Rationale: no `~/*` aliases are used (verified by grep), so `vite-tsconfig-paths` is dead weight; `vite-plugin-externalize-deps@0.10.0`'s peer caps at vite `^7` so it can't run on vite 8, and the plugin's only non-node import (`PluginOption` from `vite`) is type-only and erased.

- [ ] **Step 5: Clean `packages/plugin/tsconfig.json`** — remove `baseUrl` and the `paths` block (dead alias). Keep everything else.
- [ ] **Step 6: Bump example deps** — `examples/vue-ts-project/package.json`: `vue` `^3.5.40`, `@vitejs/plugin-vue` `^6.0.8`, `vue-tsc` `^3.3.9` (peer `typescript >=5.0.0`, ok with TS 6). Keep `@meeg/vite-plugin-inspect-config: workspace:*`, `typescript`/`vite` at `catalog:`.
- [ ] **Step 7: Install**
```bash
pnpm install
```
- [ ] **Step 8: Build and inspect the output**
```bash
pnpm build
```
Check:
- `dist/plugin.js` / `dist/plugin.cjs` keep `node:fs`/`node:path` as imports (not bundled). If bundled → add `build.rolldownOptions.external: [/^node:/]` to `vite.config.ts` and rebuild.
- d.ts emitted path matches `types: "./dist/src/plugin.d.ts"` (vite-plugin-dts v5 + Rolldown may move it). If changed → update the `types` field to the actual path.
- [ ] **Step 9: Run tests (vitest 4 on vite 8)**
```bash
pnpm test
```
Expected: same 4 tests pass.
- [ ] **Step 10: Typecheck with tsc 6**
```bash
pnpm check
```
- [ ] **Step 11: Build the example consumer**
```bash
pnpm --filter vue-ts-project build
```
Expected: `vue-tsc -b && vite build` green against the rebuilt plugin (vite 8 + vue 3.5.40 + vue-tsc 3). Optionally `pnpm --filter vue-ts-project dev` briefly and confirm `.vite-config/vite.config.json` is written.
- [ ] **Step 12: Commit**
```bash
git add -A
git commit -m "feat: support vite 8, upgrade to typescript 6 and current toolchain"
```

---

### Task 4: Biome 2 migration and drop the package.json formatter ignore

**Files:**
- Modify: `biome.jsonc`

- [ ] **Step 1: Migrate the config**
```bash
pnpm exec biome migrate --write
```
- [ ] **Step 2: Review the diff** — expect schema URL → `2.5.6`, `organizeImports` → `assist` action, `include`/`ignore` → `includes`. Reject any surprise rule-severity injections that don't match current intent.
- [ ] **Step 3: Drop the package.json formatter ignore** — remove `formatter.ignore: ["**/package.json"]` and the comment block above it. Biome 2 always formats `package.json` objects/arrays multi-line, which matches changesets output — the original reason for the ignore no longer applies.
- [ ] **Step 4: Lint clean, including package.json files**
```bash
pnpm lint
```
- [ ] **Step 5: Commit**
```bash
git add biome.jsonc
git commit -m "chore: migrate to biome 2 and format package.json files"
```

---

### Task 5: Update CI and release workflows

**Files:**
- Modify: `.github/workflows/ci.yml`
- Modify: `.github/workflows/release.yml`

- [ ] **Step 1: Rewrite `ci.yml`** — node matrix + turbo commands + test step:
```yaml
jobs:
  lint:
    name: Lint
    runs-on: ubuntu-latest
    timeout-minutes: 5
    strategy:
      matrix:
        node-version: [22.x, 24.x]
    steps:
      - uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: "pnpm"

      - run: pnpm install
      - run: pnpm build
      - run: pnpm lint
      - run: pnpm check
      - run: pnpm test
```
(Keep the existing `on`/`concurrency` blocks. Replaces all three `pnpm lerna run <x>` steps.)
- [ ] **Step 2: Update `release.yml`** — `pnpm lerna run build` → `pnpm build`; bump `pnpm/action-setup@v3` → `@v4`. Keep `node-version-file: ".nvmrc"` (now v24.18.1) and the changesets/action block.
- [ ] **Step 3: Commit**
```bash
git add .github/workflows/ci.yml .github/workflows/release.yml
git commit -m "ci: run on node 22 and 24, use turbo, add test step"
```

---

### Task 6: Minor-only changeset and documentation

**Files:**
- Create: `.changeset/wise-otters-build.md`
- Create: `docs/PROJECT.md`
- Create: `docs/MEMORY.md`
- Modify: `AGENTS.md`

- [ ] **Step 1: Write the changeset (minor bump)**
```markdown
---
"@meeg/vite-plugin-inspect-config": minor
---

feat: support Vite 7 and 8

Add `^7.0.0` and `^8.0.0` to the Vite peer range and raise the minimum Node version to `>=22.12.0`. Drops Vite 5 support.
```
(`minor` from 0.2.0 → 0.3.0; never reaches 1.0.0.)

- [ ] **Step 2: Prove `changeset version` output is Biome-stable, then restore**
```bash
pnpm exec changeset version
pnpm lint
git restore packages/plugin/package.json packages/plugin/CHANGELOG.md
# re-create .changeset/wise-otters-build.md (Step 1's file was consumed by version)
```
Expected: `pnpm lint` passes with the versioned package.json (biome 2 multi-line format matches changesets). Restore leaves the repo in "upgraded + changeset pending" state so CI applies it on merge.
- [ ] **Step 3: Write `docs/PROJECT.md`** — Problem, Who it's for, Goals, Success, Scope (in/out), Constraints, Open questions, Riskiest unknowns (Rolldown d.ts emit, node-builtin externalization, vue-tsc 3 + TS 6).
- [ ] **Step 4: Write `docs/MEMORY.md`** — dated entries: TS 6.0.3 chosen over 7 (ecosystem safety); pnpm 11 (latest); vite peer `^6||^7||^8` dropping EOL v5; engines `>=22.12.0` + CI matrix 22/24; turbo replaces lerna/nx; vitest 3.2.7 baseline because vitest 4 crashes on vite 6; dropped vite-tsconfig-paths/externalize-deps; biome 2 formats package.json.
- [ ] **Step 5: Update `AGENTS.md`** — commands (`pnpm build`/`lint`/`check`/`test` via turbo), pnpm 11 / node 24.18.1, catalog versions (TS ~6.0.3, vite ^8.2.0), peer `^6||^7||^8`, engines `>=22.12.0`, biome 2 formats package.json (remove the old gotcha), removed plugins.
- [ ] **Step 6: Commit**
```bash
git add .changeset docs AGENTS.md
git commit -m "chore: document upgrade, add changeset"
```

---

## Self-review

- **Spec coverage:** revert ✓ (T0); tests before upgrade + re-run as post-upgrade verification ✓ (T1, T3:9); full dep upgrade ✓ (T2–T4); turbo replaces lerna/nx ✓ (T2); vite-plugin necessity checked & two dropped ✓ (T3:4); biome 2 with formatter-ignore dropped ✓ (T4:3); node LTS 24 + active LTS support ✓ (`.nvmrc`, engines, CI matrix T5); minor-only changeset ✓ (T6:1); docs ✓ (T6:3–5).
- **Placeholder scan:** all configs and the test file are written out in full.
- **Type consistency:** `TestPlugin` interface and `inspectConfig` signature match between T1 and the source; `catalog:` refs consistent across T3.

**Riskiest unknowns (with fallbacks):** vite-plugin-dts v5 emit path on Rolldown (fix `types` field); node-builtin externalization (add `rolldownOptions.external`); pnpm 11 build-script approval (approve via `pnpm approve-builds`); vue-tsc 3 + TS 6 (pin example TS to `~5.9.3` if it breaks).
