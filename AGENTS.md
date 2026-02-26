# AGENTS.md

## Cursor Cloud specific instructions

### Overview

Pure client-side React SPA — a space colonization algorithm generative art tool. No backend, no database, no external services. Single `package.json` at the repo root.

### Dev server

- `pnpm dev` starts Vite on port 5173 with HMR.
- Use `pnpm dev --host 0.0.0.0` to expose outside localhost (needed for Cloud Agent browser testing).

### Type-checking and linting

- `npx tsc --noEmit` — TypeScript strict type-check. There is no separate ESLint config; `tsc` is the primary lint tool.
- The `pnpm build` script runs `tsc && vite build`.

### Build

- `pnpm build` — production build to `dist/`.

### Gotchas

- **esbuild build scripts**: pnpm 10 blocks esbuild's postinstall by default. The repo includes `pnpm.onlyBuiltDependencies: ["esbuild"]` in `package.json` to allow it. If this field is missing, `pnpm install` will succeed but Vite will fail at runtime because esbuild has no binary.
- **No dedicated test runner**: The project has no test framework configured (no Jest, Vitest, etc.). Validation is done via `tsc --noEmit` and manual browser testing.
- **State persistence**: App config is stored in `localStorage` and encoded into the URL. Clearing localStorage or changing the URL will reset configuration.
