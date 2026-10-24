---
name: electrobun-svelte
description: Wire Svelte 5 into an Electrobun app that has already been created with `bunx electrobun init`. Use this whenever the user wants Electrobun with Svelte, Vite-based HMR, or needs the frontend/main-process wiring repaired.
disable-model-invocation: true
---

# Electrobun + Svelte

Assume the project already exists from `bunx electrobun init`. Do not cover initial bootstrapping. Focus on wiring Svelte 5 into the generated app.

Read `llms.txt` in the project first. Do not repeat Electrobun basics that are already documented there. Keep this skill focused on the Svelte-specific layer.

## Required wiring

1. Install Svelte 5, `vite`, and `@sveltejs/vite-plugin-svelte`.
2. Put the frontend under `src/mainview/`.
3. Configure Vite with:
   - `root: "src/mainview"`
   - `build.outDir: "../../dist"`
   - dev server on port `5173`
   - `strictPort: true`
4. Use `vitePreprocess()` in `svelte.config.js`.
5. In `electrobun.config.ts`, copy `dist/index.html` and `dist/assets` into `views/mainview/`.
6. Ignore `dist/**` in Electrobun watch mode.
7. Set an application menu in the Bun main process with standard roles for `undo`, `redo`, `cut`, `copy`, `paste`, `selectAll`, and `quit`. On macOS, `cmd+c`, `cmd+v`, `cmd+z`, and similar shortcuts do not work correctly until the application menu is installed with those roles.
8. In the Bun main process, load `http://localhost:5173` in dev when reachable, otherwise fall back to `views://mainview/index.html`.
9. In `src/mainview/main.ts`, mount the app with Svelte 5 `mount(...)`.
10. Keep scripts minimal:

- `start`: `vite build && electrobun dev`
- `dev`: `electrobun dev --watch`
- `dev:hmr`: run Vite and Electrobun together
- `hmr`: `vite --port 5173`
- `typecheck`: `bunx tsc --noEmit`

## Checks

- all Svelte packages must be compatible with Svelte 5
- if you see `svelte/internal`, a dependency is targeting old Svelte internals
- if standard macOS shortcuts do not work, check that the application menu is installed with the built-in edit roles
- if HMR does not load, check Vite on port `5173` and keep `strictPort: true`
- if Electrobun loops on rebuilds, ensure `watchIgnore: ["dist/**"]`

## Verify

Run `bun run typecheck` and `vite build`, then confirm `bun run dev` loads bundled assets and `bun run dev:hmr` loads from Vite.
