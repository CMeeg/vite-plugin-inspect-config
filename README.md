# vite-plugin-inspect-config

A Vite plugin to write the [resolved config](https://main.vite.dev/guide/api-plugin.html#configresolved) to disk for easy inspection.

This plugin is intended to be used by plugin authors who wish to view config changes made by plugins for debugging purposes i.e. "did my plugin mutate the config how I intended it to"!

## Getting started

Add the package as a dev dependency:

`npm install -D @meeg/vite-plugin-inspect-config`

Add the plugin to your Vite config:

```ts
import { inspectConfig } from "@meeg/vite-plugin-inspect-config"
import { defineConfig } from "vite"

export default defineConfig({
	plugins: [
		inspectConfig()
	]
})
```

Now when you run `vite dev` or `vite build` the [resolved config](https://main.vite.dev/guide/api-plugin.html#configresolved) will be written to `.vite-config/vite.config.json`.

> You may want to add `.vite-config/` to your `.gitignore`.

## Usage

The `inspectConfig()` function accepts an `InspectConfigPluginOptions` object that can be used for configuration:

| Key | Description | Default |
|-----|-------------|---------|
| `cwd` | The current working directory of the Vite project. | `process.cwd()` |
| `outputDir` | The path to the directory where `vite.config.json` will be written. The path is relative to `cwd`. | `".vite-config"` |
