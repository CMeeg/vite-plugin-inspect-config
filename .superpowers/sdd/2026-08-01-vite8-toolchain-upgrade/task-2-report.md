# Task 2 Report

## Status

Implemented Task 2 and verified the complete Turbo pipeline.

## Toolchain

- Runtime during verification: Node `v24.16.0`
- Requested `.nvmrc`: `v24.18.1`
- Package manager: pnpm `11.18.0`
- Turbo: `2.10.8`
- Vite: `6.0.3`
- Vitest: `3.2.7`

## Files Changed

- `.gitignore`: removed `.nx/cache` and `.nx/workspace-data`; added `.turbo/`.
- `.nvmrc`: changed to `v24.18.1`.
- `package.json`: replaced Lerna scripts and dependency with Turbo scripts and `turbo ^2.10.8`; set `packageManager` to `pnpm@11.18.0`.
- `pnpm-lock.yaml`: regenerated with pnpm 11.18.0.
- `pnpm-workspace.yaml`: added pnpm 11 `allowBuilds` entries for `@biomejs/biome` and `esbuild`.
- `turbo.json`: added Turbo 2 `tasks` graph from the brief.
- `lerna.json`: deleted.
- `nx.json`: deleted.

No CI workflows, documentation, Vite, TypeScript, Biome, Changesets, example, or plugin dependency versions were changed.

## Commands and Output

### Package manager activation and install

```text
$ node --version && corepack --version && corepack use pnpm@11.18.0
v24.16.0
0.35.0
Installing pnpm@11.18.0 in the project...
[ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY]
```

Activation was retried with `CI=true`; pnpm 11 then reported the lockfile was stale because `lerna` was replaced by `turbo`. The package manager field was kept at the exact brief value `pnpm@11.18.0` rather than Corepack's optional integrity suffix.

```text
$ pnpm install --no-frozen-lockfile
Lockfile passes supply-chain policies
Packages: +250
...
[ERR_PNPM_IGNORED_BUILDS] Ignored build scripts: @biomejs/biome@1.9.4, esbuild@0.24.0
```

The pnpm 11-generated `allowBuilds` configuration was set to `true` only for those two reported packages. The subsequent install completed successfully:

```text
$ pnpm install --no-frozen-lockfile
Lockfile is up to date, resolution step is skipped
@biomejs/biome postinstall: Done
esbuild postinstall: Done
Done in 1.4s using pnpm v11.18.0
```

### Required verification

```text
$ pnpm build && pnpm lint && pnpm check && pnpm test
```

Results:

- `pnpm build`: 2 Turbo tasks successful. Plugin and Vue example built with Vite `6.0.3`.
- `pnpm lint`: 1 task successful. Biome checked 5 files with no fixes.
- `pnpm check`: 2 Turbo tasks successful, including the build dependency and TypeScript check.
- `pnpm test`: 1 task successful. Vitest `3.2.7`: 1 test file and 4 tests passed.

Additional checks:

```text
$ pnpm --version && pnpm exec turbo --version
11.18.0
2.10.8

$ git diff --check
# no output; exit 0
```

## Concerns

- The environment used for verification is Node `v24.16.0`; `.nvmrc` now requests `v24.18.1`.
- pnpm reported one deprecated transitive subdependency (`tsconfck@3.1.4`) and peer dependency warnings during installation. These are pre-existing dependency-tree concerns and were not changed in this task.
- The initial Corepack activation required `CI=true` because the shell had no TTY for pnpm's modules-directory purge confirmation.

## Review Fix

Removed the remaining legacy `lerna-debug.log` ignore entry from `.gitignore`.

Focused verification:

```text
$ git diff --check
# no output; exit 0

$ git grep -n lerna -- .gitignore package.json turbo.json lerna.json nx.json
# no output; exit 1 because deleted files are absent and no scoped matches remain
```
