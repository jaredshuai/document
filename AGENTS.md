# AGENTS.md

## Cursor Cloud specific instructions

### Overview

This is a pure frontend document editor (OnlyOffice-based) — no backend, no databases, no external services required. All document processing happens client-side via WebAssembly.

### Key commands

Standard dev commands are in `package.json`. Quick reference:

| Task | Command |
|------|---------|
| Dev server | `pnpm dev` (Vite on port 5173) |
| Lint | `pnpm run lint:ts` (oxlint + tsc) |
| Tests | `pnpm test` (Vitest, 2700+ tests) |
| Build | `pnpm build` (runs format first per user convention) |
| Format | `pnpm run format` (Prettier) |

### Gotchas

- **esbuild build scripts**: pnpm 10 blocks postinstall scripts by default. After `pnpm install`, esbuild's native binary may not be linked, but Vite resolves it through Node.js module resolution so `pnpm dev`, `pnpm test`, and `pnpm build` all work without extra steps.
- **`lint:docker` requires Docker**: The full `pnpm run lint` includes `lint:docker` which validates `docker-compose.yaml`. Use `pnpm run lint:ts` for code-only linting when Docker is not available.
- **Browser-dependent modules are not unit tested**: Tests cover pure utility functions only. OnlyOffice integration, DOM manipulation, and WASM modules are excluded by design.
- **Build script shell compatibility**: `bin/build.sh` uses `[[ ]]` bash syntax but is invoked with `sh`. This causes a harmless warning on Linux (`[[: not found`) but the build completes successfully.
