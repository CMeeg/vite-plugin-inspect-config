import { defineConfig } from "vite"
import dts from "vite-plugin-dts"
import { externalizeDeps } from "vite-plugin-externalize-deps"
import tsconfigPaths from "vite-tsconfig-paths"

// https://vite.dev/config/
export default defineConfig({
	plugins: [tsconfigPaths(), externalizeDeps(), dts()],
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
