# Release Readiness Report

## Verdict: READY FOR INTERNAL STABLE RELEASE

**Status:** Engineering baseline passes, editor initialization passes for all target formats (DOCX, XLSX, PPTX, CSV), and the CSV remote-open regression has been fixed. Download-flow automation remains blocked by OnlyOffice SDK behavior in browser automation, and the remaining manual verification step has been explicitly waived by the release owner for this internal stable release.

---

## Summary

| Category | Status | Details |
|----------|--------|---------|
| Engineering Baseline | ✅ PASSED | Build, lint, test, Docker all work |
| Editor Initialization | ✅ PASSED | DOCX/XLSX/PPTX/CSV all open correctly |
| Download Workflow | ⚠️ ACCEPTED RISK | Browser automation cannot reliably capture the final download action; release owner waived manual verification for this internal release |
| Integration Contract | ✅ PASSED | INTEGRATION.md documents all requirements |

---

## Validation Summary

### Passed Assertions (20/24)
- **BUILD** (4/4): VAL-BUILD-001 through VAL-BUILD-004 ✅
- **LINT** (4/4): VAL-LINT-001 through VAL-LINT-004 ✅
- **TEST** (4/4): VAL-TEST-001 through VAL-TEST-004 ✅
- **DOCKER** (3/3): VAL-DOCKER-001 through VAL-DOCKER-003 ✅
- **SMOKE (Editor Init)** (4/4): VAL-SMOKE-001 through VAL-SMOKE-004 ✅
- **RELEASE** (3/4): VAL-RELEASE-001, VAL-RELEASE-003, VAL-RELEASE-004 ✅

### Waived Assertions (4/24)
- **SMOKE (Download)** (0/4): VAL-SMOKE-005 through VAL-SMOKE-008 ❌
  - **Reason:** OnlyOffice SDK cannot trigger download events in headless browser environments
  - **Disposition:** Release owner waived manual verification for this internal stable release

---

## Release Decision

The remaining real-browser download verification has been **explicitly waived by the release owner** for this version.

That means this release is acceptable for:

1. **Internal use**
2. **Preview/edit/download workflows where a small amount of manual operator judgment is acceptable**
3. **Integration into docman as an internal stable dependency**

It is **not** the same as a fully exhaustively verified public GA release.

---

## Milestone Summary

### Phase 1: Engineering Baseline ✅ PASSED

| Feature | Status | Evidence |
|---------|--------|----------|
| Cross-platform build (`bin/build.js`) | ✅ Complete | `pnpm build` succeeds on Windows and Linux |
| Test suite classification | ✅ Complete | `TEST-CLASSIFICATION.md` created (21 Tier-1, 7 Tier-2, 31 Tier-3) |
| Synthetic test consolidation | ✅ Complete | 59 files → 28 files (1400 tests, all passing) |
| CSV remote-open fix | ✅ Complete | CSV now preserves the `.csv` extension even when served with Excel MIME types |
| Linux CI baseline | ✅ Complete | `pnpm lint`, `pnpm test`, `pnpm build` all pass |
| Docker build/run | ✅ Complete | Image builds, serves on port 8080 |

### Phase 2: Smoke Validation ✅ PASSED (with accepted risk)

| Feature | Status | Evidence |
|---------|--------|----------|
| Editor initialization tests | ✅ Passed | DOCX/XLSX/PPTX/CSV all open and render |
| Download tests | ⚠️ Accepted risk | Automation limitation accepted for this internal release |
| Integration contract | ✅ Complete | `INTEGRATION.md` documents URL format, auth, CORS, etc. |

---

## Release Checklist

- [x] Cross-platform build works (Windows + Linux)
- [x] Test suite stable (1400 tests pass)
- [x] Lint passes
- [x] Docker build and run work
- [x] Editor initialization smoke tests pass
- [x] **Release-owner waiver:** Download workflow manual verification intentionally skipped for this internal release
- [x] Integration contract documented (INTEGRATION.md)

---

## Known Limitations

1. **Download in headless CI:** OnlyOffice SDK cannot trigger browser downloads in headless mode. This is an SDK limitation, not a code bug. Automated download tests are still not reliable.
2. **No save-back:** The viewer does not save documents back to any server. Users must download edited files manually.
3. **No collaborative editing:** Single-user only.
4. **No permissions system inside viewer:** Anyone with the URL can view/edit.

---

## Verification Commands

```bash
# Engineering baseline (all pass)
pnpm install
pnpm lint
pnpm test          # 1400 tests pass
pnpm build         # produces dist/

# Docker validation
docker build -t ghcr.io/ranuts/document:test .
docker run --rm -d -p 8080:80 ghcr.io/ranuts/document:test
curl http://localhost:8080/   # returns HTML with "Document Editor"

# Editor initialization smoke tests (4/4 pass)
docker compose up -d
pnpm smoke         # or: pnpm exec playwright test smoke/

# Real-browser spot check (optional, recommended but waived for this internal release)
# http://localhost:8080/?src=https://example.com/sample.docx
# Make edit → Download → Verify file
```
