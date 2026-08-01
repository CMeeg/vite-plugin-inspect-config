import { mkdtemp, readFile, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { resolveConfig } from "vite"
import { afterEach, describe, expect, it, vi } from "vitest"

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
	it("returns a plugin with the expected name and configResolved hook", async () => {
		const { inspectConfig } = await import("../src/plugin")
		const plugin = inspectConfig() as unknown as TestPlugin
		expect(plugin.name).toBe("inspect-config")
		expect(typeof plugin.configResolved).toBe("function")
	})

	it("defaults cwd to process.cwd() and outputDir to .vite-config", async () => {
		const dir = await makeTempDir()
		const originalCwd = process.cwd()
		process.chdir(dir)
		try {
			vi.resetModules()
			const { inspectConfig } = await import("../src/plugin?default-cwd-test")
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
		const { inspectConfig } = await import("../src/plugin")
		const plugin = inspectConfig({ cwd: dir, outputDir: "custom-out" }) as unknown as TestPlugin
		await plugin.configResolved({ foo: "bar" })
		const content = await readFile(join(dir, "custom-out", "vite.config.json"), "utf8")
		expect(JSON.parse(content)).toEqual({ foo: "bar" })
	})

	it("writes the resolved config during vite's config resolution", async () => {
		const dir = await makeTempDir()
		const { inspectConfig } = await import("../src/plugin")
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
