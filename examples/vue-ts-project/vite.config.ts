import { defineConfig } from "vite"
import vue from "@vitejs/plugin-vue"
import { inspectConfig } from "@meeg/vite-plugin-inspect-config"

// https://vite.dev/config/
export default defineConfig({
	plugins: [vue(), inspectConfig()]
})
