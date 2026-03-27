# Environment

Environment variables, external dependencies, and setup notes.

**What belongs here:** Required env vars, external API keys/services, dependency quirks, platform-specific notes.
**What does NOT belong here:** Service ports/commands (use `.factory/services.yaml`).

---

## Node.js & Package Manager

- Node.js 22+ required
- pnpm 10.28.0 (packageManager in package.json)
- Corepack enabled: `corepack enable` (for pnpm)
- DO NOT regenerate `pnpm-lock.yaml` — lockfile is committed and must stay in sync

## Test Data URLs (for smoke tests)

Smoke tests require publicly accessible remote file URLs with CORS headers.

**For DOCX:** Use a publicly accessible .docx file URL (e.g., from GitHub raw content or a CORS-enabled server).
**For XLSX:** Similarly need a public .xlsx URL.
**For PPTX:** Similarly need a public .pptx URL.
**For CSV:** Use a simple public .csv URL.

If no public CORS-enabled test URLs are available, smoke tests can use a local file server approach:
1. Start a local HTTP server serving test fixtures
2. Use localhost URLs for smoke tests
3. This is acceptable for internal CI smoke tests

## Windows-Specific

- `pnpm exec vite build` works directly on Windows (no bash required)
- `bin/build.sh` does NOT work on Windows (requires bash/MSYS2/Git Bash)
- Docker Desktop on Windows supports Linux containers
- VS Code + WSL2 is recommended for development on Windows

## Docker

- Linux containers only (even on Windows Docker Desktop)
- Base image: `node:22-alpine` for builder stage
- Runtime image: `joseluisq/static-web-server:latest`
- No external services needed (no postgres, redis, etc.)

## OnlyOffice SDK

- SDK assets in `public/sdkjs/` and `public/web-apps/`
- WASM x2t converter in `public/wasm/`
- These are pre-bundled vendor assets — do NOT rebuild or modify
