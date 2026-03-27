# Release Readiness Report

## Verdict: NOT READY

**Reason:** Smoke tests (VAL-SMOKE-001 through VAL-SMOKE-008) exist but have implementation bugs that prevent them from running successfully. All Phase 1 (engineering baseline) assertions pass, but Phase 2 smoke validation is blocked.

---

## Concrete Blockers

The following validation assertions are failing and must be resolved before release:

| Assertion ID | Status | Blocker Description |
|--------------|--------|---------------------|
| VAL-SMOKE-001 | **FAILED** | DOCX editor initialization test - baseURL resolution bug in `smoke/docx.spec.ts` |
| VAL-SMOKE-002 | **FAILED** | XLSX editor initialization test - baseURL resolution bug in `smoke/xlsx.spec.ts` |
| VAL-SMOKE-003 | **FAILED** | PPTX editor initialization test - baseURL resolution bug in `smoke/pptx.spec.ts` |
| VAL-SMOKE-004 | **FAILED** | CSV editor initialization test - baseURL resolution bug in `smoke/csv.spec.ts` |
| VAL-SMOKE-005 | **FAILED** | DOCX download test - same baseURL resolution bug |
| VAL-SMOKE-006 | **FAILED** | XLSX download test - same baseURL resolution bug |
| VAL-SMOKE-007 | **FAILED** | PPTX download test - same baseURL resolution bug |
| VAL-SMOKE-008 | **FAILED** | CSV download test - same baseURL resolution bug |
| VAL-DOCKER-002 | **FAILED** | Docker container serves app - depends on smoke tests passing |
| VAL-DOCKER-003 | **FAILED** | Smoke tests run against Docker - smoke tests have bugs |
| VAL-RELEASE-001 | **NOT READY** | Tier-1 assertions passed, but smoke tests fail |
| VAL-RELEASE-002 | **NOT READY** | Smoke/Docker assertions fail |
| VAL-RELEASE-003 | **NOT READY** | Docker path not validated |

### Root Cause: Smoke Test Bug

The smoke tests use relative URLs (`/?src=...`) which should be resolved against the `baseURL` from `playwright.config.ts`. However, the tests fail with:

```
Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
navigating to "/?src=https%3A%2F%2Fraw.githubusercontent.com..."
```

This indicates the browser is treating `/?src=...` as a file path instead of resolving it against `http://localhost:8080`. The `baseURL: process.env.APP_URL || 'http://localhost:8080'` configuration is not being applied correctly when `page.goto()` is called.

---

## Milestone Summary

### Phase 1: Engineering Baseline ✅ PASSED

| Feature | Status | Evidence |
|---------|--------|----------|
| Cross-platform build (`bin/build.js`) | ✅ Complete | `pnpm build` succeeds on Linux and Windows |
| Test suite classification (Tier 1/2/3) | ✅ Complete | `TEST-CLASSIFICATION.md` created |
| Synthetic test consolidation | ✅ Complete | 59 test files → 28 files (1399 tests) |
| Linux CI baseline verified | ✅ Complete | `pnpm lint`, `pnpm test`, `pnpm build` all pass |
| Docker build and run | ✅ Complete | Image builds and serves on port 8080 |

**Phase 1 Assertions:** All passed (VAL-BUILD-001 through VAL-BUILD-004, VAL-LINT-001 through VAL-LINT-004, VAL-TEST-001 through VAL-TEST-004, VAL-DOCKER-001)

### Phase 2: Smoke Validation ❌ FAILED

| Feature | Status | Evidence |
|---------|--------|----------|
| Playwright smoke tests (DOCX/XLSX/PPTX/CSV) | ❌ Buggy | Files exist in `smoke/` but have baseURL resolution bug |
| Integration contract | ✅ Complete | `INTEGRATION.md` created |

**Phase 2 Assertions:** VAL-SMOKE-* (8 assertions), VAL-DOCKER-002, VAL-DOCKER-003, VAL-RELEASE-* (3 assertions) - all failing or not ready

---

## Validation Summary

### Passed Assertions (14)
- VAL-BUILD-001, VAL-BUILD-002, VAL-BUILD-003, VAL-BUILD-004
- VAL-LINT-001, VAL-LINT-002, VAL-LINT-003, VAL-LINT-004
- VAL-TEST-001, VAL-TEST-002, VAL-TEST-003, VAL-TEST-004
- VAL-DOCKER-001
- VAL-RELEASE-004

### Failed/Not Ready Assertions (11)
- VAL-SMOKE-001 through VAL-SMOKE-008 (8 failed)
- VAL-DOCKER-002, VAL-DOCKER-003 (2 failed)
- VAL-RELEASE-001, VAL-RELEASE-002, VAL-RELEASE-003 (3 not ready)

---

## Release Checklist (For When Ready)

- [ ] Fix smoke test baseURL resolution bug in `smoke/*.spec.ts`
- [ ] Verify smoke tests pass against Docker container on port 8080
- [ ] Confirm VAL-SMOKE-001 through VAL-SMOKE-008 all pass
- [ ] Confirm VAL-DOCKER-002 and VAL-DOCKER-003 pass
- [ ] Verify VAL-RELEASE-001, VAL-RELEASE-002, VAL-RELEASE-003 all pass
- [ ] All CI jobs green (lint, test, build, smoke)
- [ ] Docker image tagged for release
- [ ] INTEGRATION.md reviewed by docman team

---

## Fix Required for Smoke Tests

The smoke tests in `smoke/*.spec.ts` need to be updated to use absolute URLs instead of relative URLs. Change:

```typescript
// BEFORE (broken)
await page.goto(`/?src=${encodeURIComponent(DOCX_URL)}`);

// AFTER (fixed)
await page.goto(`http://localhost:8080/?src=${encodeURIComponent(DOCX_URL)}`);
```

Or ensure the `baseURL` is properly applied by using:

```typescript
await page.goto(new URL(`/?src=${encodeURIComponent(DOCX_URL)}`, 'http://localhost:8080').href);
```

Alternatively, fix the Playwright configuration to ensure `baseURL` is properly inherited by the browser context.

---

## Verification Commands

```bash
# Baseline validation (all pass)
pnpm exec tsc --noEmit    # VAL-LINT-001
pnpm exec oxlint          # VAL-LINT-002
docker compose -f docker-compose.yaml config --quiet  # VAL-LINT-003
pnpm test                 # VAL-TEST-001
pnpm build                # VAL-BUILD-001

# Docker validation
docker build -t ghcr.io/ranuts/document:test .
docker run --rm -d -p 8080:80 ghcr.io/ranuts/document:test
curl -sf http://localhost:8080/  # Should return HTML with "Document Editor"

# Smoke tests (currently broken)
APP_URL=http://localhost:8080 pnpm exec playwright test smoke
```
