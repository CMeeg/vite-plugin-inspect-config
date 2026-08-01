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
		},
		rolldownOptions: {
			external: [/^node:/]
		}
	}
})
