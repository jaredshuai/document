# Release Readiness Report

## Verdict: NOT READY

**Reason:** Smoke tests (VAL-SMOKE-001 through VAL-SMOKE-008) exist but have incorrect test assertions that prevent them from detecting OnlyOffice editor initialization. All Phase 1 (engineering baseline) assertions pass, and Docker serves the app correctly.

---

## Concrete Blockers

The following validation assertions are failing and must be resolved before release:

| Assertion ID | Status | Blocker Description |
|--------------|--------|---------------------|
| VAL-SMOKE-001 | **FAILED** | DOCX smoke test - `waitForSelector('#iframe')` waits for placeholder div to be visible, but OnlyOffice replaces this div with an iframe. The placeholder is hidden. |
| VAL-SMOKE-002 | **FAILED** | XLSX smoke test - same assertion issue |
| VAL-SMOKE-003 | **FAILED** | PPTX smoke test - same assertion issue |
| VAL-SMOKE-004 | **FAILED** | CSV smoke test - same assertion issue |
| VAL-SMOKE-005 | **FAILED** | DOCX download test - blocked by assertion issue |
| VAL-SMOKE-006 | **FAILED** | XLSX download test - blocked by assertion issue |
| VAL-SMOKE-007 | **FAILED** | PPTX download test - blocked by assertion issue |
| VAL-SMOKE-008 | **FAILED** | CSV download test - blocked by assertion issue |
| VAL-DOCKER-003 | **FAILED** | Depends on smoke tests passing - smoke tests have assertion bugs |
| VAL-RELEASE-002 | **NOT READY** | Smoke test assertions need fixing |

### Root Cause: Incorrect Test Assertions

The smoke tests use `waitForSelector('#iframe', { timeout: 30000 })` which waits for the `#iframe` placeholder div to be visible. However:

1. The `#iframe` div is initially hidden (empty placeholder)
2. OnlyOffice SDK replaces this div with an `<iframe>` element
3. After OnlyOffice initializes, the `#iframe` div no longer exists in the DOM
4. The test incorrectly waits for visibility of a hidden placeholder

**Evidence from test run:**
```
locator resolved to hidden <div id="iframe"></div>
Page snapshot shows menu buttons (not editor), meaning OnlyOffice never initialized from test's perspective
```

**Note:** The smoke tests already use absolute URLs (`http://localhost:8080/?src=...`) - the "baseURL resolution bug" mentioned in earlier validation has been fixed (commit 2cbaa63).

---

## Milestone Summary

### Phase 1: Engineering Baseline ✅ PASSED

| Feature | Status | Evidence |
|---------|--------|----------|
| Cross-platform build (`bin/build.js`) | ✅ Complete | `pnpm build` succeeds |
| Test suite classification (Tier 1/2/3) | ✅ Complete | `TEST-CLASSIFICATION.md` created |
| Synthetic test consolidation | ✅ Complete | 59 test files → 28 files (1399 tests) |
| Linux CI baseline verified | ✅ Complete | `pnpm lint`, `pnpm test`, `pnpm build` all pass |
| Docker build and run | ✅ Complete | Image builds and serves on port 8080 |

**Phase 1 Assertions:** All passed (VAL-BUILD-001 through VAL-BUILD-004, VAL-LINT-001 through VAL-LINT-004, VAL-TEST-001 through VAL-TEST-004, VAL-DOCKER-001)

### Phase 2: Smoke Validation ❌ FAILED (Test Assertion Bug)

| Feature | Status | Evidence |
|---------|--------|----------|
| Playwright smoke tests (DOCX/XLSX/PPTX/CSV) | ❌ Incorrect assertions | Files exist in `smoke/` with correct URLs, but `waitForSelector('#iframe')` is wrong |
| Integration contract | ✅ Complete | `INTEGRATION.md` created |

---

## Validation Summary

### Passed Assertions (16)
- VAL-BUILD-001, VAL-BUILD-002, VAL-BUILD-003, VAL-BUILD-004
- VAL-LINT-001, VAL-LINT-002, VAL-LINT-003, VAL-LINT-004
- VAL-TEST-001, VAL-TEST-002, VAL-TEST-003, VAL-TEST-004
- VAL-DOCKER-001, VAL-DOCKER-002
- VAL-RELEASE-001, VAL-RELEASE-003, VAL-RELEASE-004

### Failed/Not Ready Assertions (4)
- VAL-SMOKE-001 through VAL-SMOKE-008 (8 failed - incorrect test assertions)
- VAL-DOCKER-003 (depends on smoke tests)
- VAL-RELEASE-002 (smoke tests need fixing)

---

## Release Checklist (For When Ready)

- [ ] Fix smoke test assertions in `smoke/*.spec.ts` - replace `waitForSelector('#iframe')` with logic that detects OnlyOffice iframe appearance
- [ ] Verify smoke tests pass against Docker container on port 8080
- [ ] Confirm VAL-SMOKE-001 through VAL-SMOKE-008 all pass
- [ ] Confirm VAL-DOCKER-003 passes
- [ ] Verify VAL-RELEASE-002 passes
- [ ] All CI jobs green (lint, test, build, smoke)
- [ ] Docker image tagged for release
- [ ] INTEGRATION.md reviewed by docman team

---

## Fix Required for Smoke Tests

The smoke tests in `smoke/*.spec.ts` need to detect OnlyOffice initialization correctly:

```typescript
// BEFORE (incorrect - waits for hidden placeholder div)
await page.waitForSelector('#iframe', { timeout: 30000 });

// AFTER (correct - wait for iframe to appear inside #iframe container)
// Option 1: Wait for any iframe to appear
await page.waitForSelector('iframe', { timeout: 30000 });

// Option 2: Wait for the #iframe div to be replaced by an iframe
// (OnlyOffice replaces #iframe div with iframe element)
await page.waitForFunction(() => {
  const container = document.querySelector('#iframe');
  return container && container.tagName === 'IFRAME';
}, { timeout: 30000 });

// Option 3: Wait for OnlyOffice ready signal
await page.waitForFunction(() => {
  return (window as any).DocsAPI?.DocEditor?.instances?.size > 0;
}, { timeout: 30000 });
```

---

## Verification Commands

```bash
# Baseline validation (all pass)
pnpm exec tsc --noEmit    # VAL-LINT-001 - PASSED
pnpm exec oxlint          # VAL-LINT-002 - PASSED
docker compose -f docker-compose.yaml config --quiet  # VAL-LINT-003 - PASSED
pnpm test                 # VAL-TEST-001 - PASSED (1399 tests)
pnpm build                # VAL-BUILD-001 - PASSED

# Docker validation
docker build -t ghcr.io/ranuts/document:test .  # VAL-BUILD-003 - PASSED
docker run --rm -d -p 8080:80 ghcr.io/ranuts/document:test
curl -sf http://localhost:8080/  # VAL-DOCKER-002 - PASSED (returns HTML)

# Smoke tests (need assertion fix)
# Currently fail due to incorrect waitForSelector('#iframe')
# APP_URL=http://localhost:8080 pnpm exec playwright test smoke
```
