---
name: backend-worker
description: Engineering baseline fixes, test classification, Docker smoke tests, and release documentation
---

# Backend Worker

NOTE: Startup and cleanup are handled by `worker-base`. This skill defines the WORK PROCEDURE.

## When to Use This Skill

Features involving:
- Build system fixes (cross-platform build script)
- Test suite analysis and consolidation
- Docker build validation
- Playwright smoke test creation
- Release documentation (integration contract, release verdict)

## Required Skills

- `agent-browser` — for local browser smoke testing during development (optional for quick checks)
- Manual CLI commands for CI validation

## Work Procedure

### Phase 1: Engineering Baseline

#### 1. Fix Cross-Platform Build (`fix-cross-platform-build`)

Read `bin/build.sh` and `package.json` first.

1. Create `bin/build.js` using Node.js `fs` module to:
   - Call `vite build` via `child_process.spawn`
   - Read `public/sw.js`
   - Replace `SW_VERSION_PLACEHOLDER` with actual timestamp using `data.replace()`
   - Write to `dist/sw.js`
2. Update `package.json` script: `"build": "node bin/build.js"`
3. Verify `pnpm exec vite build` works on Windows (no bash needed)
4. Verify `pnpm build` works in CI/Linux

#### 2. Classify Test Suite (`classify-test-suite`)

1. Run `pnpm test -- --reporter=verbose 2>&1 | head -100` to see all test files
2. Read each test file (or at least the first 50 lines) to determine its purpose
3. Create `TEST-CLASSIFICATION.md` with:

```
## Tier 1 — Release-Critical (Utility Coverage)
| File | Module | Coverage | Notes |
|------|--------|----------|-------|
| url-utils.test.ts | lib/url-utils.ts | 100% | Core URL/filename parsing |
...

## Tier 2 — Integration Smoke
| File | Purpose | Notes |
|------|---------|-------|
| e2e-workflow.test.ts | Cross-module workflow | Tests URL→filename→type flow |

## Tier 3 — Synthetic / Redundant (Candidates for Removal)
| File | Reason |
|------|--------|
| additional-coverage.test.ts | Overlaps with url-utils.test.ts coverage |
| cross-module.test.ts | 309 tests, largely same functions as Tier 1 |
...

```

Classification criteria:
- Tier 1: Pure utility functions, 100% coverage target
- Tier 2: Tests that span multiple modules (integration-like)
- Tier 3: Synthetic tests (Phase N naming, repeated assertions on same functions, coverage theatre)

#### 3. Consolidate Synthetic Tests (`consolidate-synthetic-tests`)

1. Remove or merge Tier 3 files into Tier 1/Tier 2
2. Keep key integration tests (e2e-workflow.test.ts, integration-*.test.ts)
3. Remove files that are purely for "coverage numbers" with no new assertions
4. Run `pnpm test` after changes — must still pass
5. Run `pnpm test:coverage` — Tier 1 modules must still be at 100%

#### 4. Verify Linux CI Baseline (`verify-linux-ci-baseline`)

1. Run `docker build -t ghcr.io/ranuts/document:test .`
2. Run `docker run --rm -p 8080:80 ghcr.io/ranuts/document:test &` then `curl http://localhost:8080/`
3. Run `docker compose -f docker-compose.yaml config --quiet`
4. Confirm all commands succeed

### Phase 2: Smoke Tests + Release

#### 5. Add Docker Smoke Tests (`add-docker-smoke-tests`)

1. Install Playwright: `pnpm add -D @playwright/test && npx playwright install chromium --with-deps`
2. Create `smoke/` directory with Playwright test files
3. Create `smoke/docx.spec.ts`, `smoke/xlsx.spec.ts`, `smoke/pptx.spec.ts`, `smoke/csv.spec.ts`
4. Create `smoke/playwright.config.ts` targeting `http://localhost:8080`
5. Each test:
   - Navigates to `?src=<test_url>`
   - Waits for `#iframe` to appear (editor container)
   - Checks for zero Error-level console entries
   - Triggers download and verifies file exists
6. Run tests: `npx playwright test` against running Docker container
7. Add to CI: add a `smoke` job in `.github/workflows/ci.yml`

#### 6. Produce Integration Contract (`produce-integration-contract`)

Create `INTEGRATION.md`:

```markdown
# Integration Contract: Document Viewer for Docman

## URL Format
- Parameter: `?file=<URL>` (priority) or `?src=<URL>` (backward compatible)
- Example: `https://viewer.example.com/?file=https://docman.example.com/preview/abc123`

## Authentication
- The viewer makes a plain `fetch()` request to the URL
- **No** Authorization header forwarding
- **No** cookie forwarding
- Docman must provide a URL that is publicly accessible OR pre-authenticated

## CORS Requirements
- Remote server must include `Access-Control-Allow-Origin: <viewer_origin>` header
- If the URL is a same-origin URL (docman serves both), CORS headers are not needed

## Content-Disposition
- If the server returns `Content-Disposition: attachment; filename="..."` header, the viewer extracts the filename from it
- Otherwise, filename is extracted from URL pathname

## Supported File Types

### Primary (Fully Editable)
| Type | Extension | Notes |
|------|-----------|-------|
| Word | DOCX | Fully editable |
| Excel | XLSX | Fully editable |
| PowerPoint | PPTX | Fully editable |
| CSV | CSV | Fully editable (spreadsheet mode) |

### Secondary (Editable after conversion)
| Type | Extension | Conversion |
|------|-----------|------------|
| Word | DOC | Converted to DOCX on open |
| Excel | XLS | Converted to XLSX on open |
| PowerPoint | PPT | Converted to PPTX on open |
| OpenDocument | ODT, ODS, ODP | Converted to OOXML on open |
| Rich Text | RTF | Converted on open |
| Text | TXT | Direct open |

### View-Only
| Type | Extension | Notes |
|------|-----------|-------|
| PDF | PDF | View only, no editing |

## Known Limitations

1. **No save-back to docman**: Users download edited files manually. The viewer does not send files back to any server.
2. **No collaborative editing**: Single-user only. No real-time co-editing, comments, or track-changes.
3. **No permissions system inside viewer**: Anyone with the URL can view and edit.
4. **File size**: Large files may take longer to load (WASM conversion overhead).
5. **Font dependencies**: Some documents may not render correctly if they reference fonts not available in the viewer.

## Lifecycle
1. User opens preview URL in browser
2. Viewer fetches document from docman's preview URL
3. User edits document in browser (changes are local)
4. User downloads edited file
5. URL/session is discarded — no state persists in viewer
```

#### 7. Produce Release Readiness Verdict (`produce-release-readiness-verdict`)

1. Read `validation-state.json`
2. If all assertions passed: verdict = "READY"
3. If blockers: verdict = "NOT READY" with specific IDs
4. Create `RELEASE.md`:

```markdown
# Release Readiness Report

## Verdict: READY / NOT READY

## Milestone Summary

### Phase 1: Engineering Baseline
- [x] Cross-platform build fix (bin/build.js)
- [x] Test suite classification (Tier 1/2/3)
- [x] Synthetic test consolidation (59 → ~XX files)
- [x] Linux CI baseline verified

### Phase 2: Smoke Validation
- [x] Docker smoke tests for DOCX/XLSX/PPTX/CSV
- [x] Integration contract documented
- [x] Release readiness verdict

## Release Checklist
- [ ] All CI jobs green
- [ ] Smoke tests pass in Docker CI
- [ ] INTEGRATION.md reviewed by docman team
- [ ] Docker image tagged for release
```

## Example Handoff

```json
{
  "salientSummary": "Created bin/build.js for cross-platform build, classified 59 test files into Tier 1/2/3, removed 22 Tier-3 synthetic files, and verified Linux CI baseline (docker build + docker run + lint + test + build all pass).",
  "whatWasImplemented": "bin/build.js (Node.js cross-platform build script replacing bash), TEST-CLASSIFICATION.md (full tier classification of all 59 test files), removed 22 Tier-3 test files with no coverage loss, all Tier-1 modules maintained at 100% coverage.",
  "whatWasLeftUndone": "Smoke tests not yet added (pending in next feature); integration contract draft written but needs review",
  "verification": {
    "commandsRun": [
      { "command": "docker build -t ghcr.io/ranuts/document:test .", "exitCode": 0, "observation": "Build succeeded" },
      { "command": "docker run --rm -d -p 8080:80 ghcr.io/ranuts/document:test && sleep 2 && curl -sf http://localhost:8080/", "exitCode": 0, "observation": "App served on 8080" },
      { "command": "pnpm test", "exitCode": 0, "observation": "2594 tests passed (reduced from 2726)" }
    ],
    "interactiveChecks": []
  },
  "tests": {
    "added": [
      { "file": "smoke/docx.spec.ts", "cases": ["open remote DOCX, editor initializes, download produces file"] }
    ],
    "removed": [
      { "file": "lib/__tests__/additional-coverage.test.ts", "reason": "Tier-3 synthetic, overlaps with url-utils coverage" }
    ]
  },
  "discoveredIssues": [
    { "severity": "info", "description": "22 Tier-3 test files removed — no coverage regression", "suggestedFix": null }
  ]
}
```

## When to Return to Orchestrator

- Docker build fails after repeated attempts
- Removing tests causes coverage regression on Tier-1 modules
- Smoke test URLs are not accessible (CORS issues) — need guidance on test fixtures
- Fundamental blocker discovered that prevents reaching release-ready state
