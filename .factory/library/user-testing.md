# User Testing

Testing surface, required testing skills/tools, and resource cost classification per surface.

---

## Validation Surface

**Application:** Browser-based OnlyOffice document editor served from Docker container
**URL Pattern:** `http://localhost:8080/?src=<remote_url>` or `?file=<remote_url>`
**Key UI Elements:**
- `#iframe` — OnlyOffice editor container
- `#pwa-install` — PWA install prompt
- Control panel / FAB buttons (New, Open, etc.)

**Not testable via unit tests (require browser):**
- OnlyOffice editor initialization
- Document loading from URL (fetch + parse + render)
- Save/download flow
- File picker (File System Access API)
- Service Worker / PWA

---

## Validation Tool

**Primary:** Playwright (`@playwright/test`)
- Headless Chromium runs in Docker CI
- Must be installed: `pnpm add -D @playwright/test && npx playwright install chromium`
- Tests run as a CI job against Docker container (not dev server)

**Alternative for local dev:** `agent-browser` (Droid's built-in browser automation)
- Can be used for quick local smoke testing
- Not the source of truth for release

---

## Resource Cost Classification

**Per smoke test instance (headless browser):**
- RAM: ~200-400 MB
- CPU: moderate (initialization spikes)
- Concurrency: up to 4 parallel browser instances safely on typical CI runner
- Isolation: each test file gets its own browser context

**Max concurrent validators:** 3 (conservative for CI environment)

---

## Smoke Test Flows

### Flow 1: DOCX Open + Download
1. Navigate to `http://localhost:8080/?src=<docx_url>`
2. Wait for `#iframe` to contain OnlyOffice editor (look for `.docx` mode)
3. Verify no Error-level console entries
4. Trigger save (via `asc_onSaveCallback` mock or direct download button if accessible)
5. Verify downloaded file exists with non-zero size

### Flow 2: XLSX Open + Download
1. Navigate to `http://localhost:8080/?src=<xlsx_url>`
2. Wait for `#iframe` with spreadsheet editor
3. Verify no Error-level console entries
4. Trigger save
5. Verify downloaded file exists

### Flow 3: PPTX Open + Download
1. Navigate to `http://localhost:8080/?src=<pptx_url>`
2. Wait for `#iframe` with presentation editor
3. Verify no Error-level console entries
4. Trigger save
5. Verify downloaded file exists

### Flow 4: CSV Open + Download
1. Navigate to `http://localhost:8080/?src=<csv_url>`
2. Wait for `#iframe` with spreadsheet editor
3. Verify no Error-level console entries
4. Trigger save
5. Verify downloaded file exists (text content)

---

## Test File URLs

For smoke tests, use remote URLs with proper CORS headers:
- GitHub raw content URLs (cdn.jsdelivr.net, raw.githubusercontent.com) work well
- Or serve test fixtures via local HTTP server in CI

Example test URLs:
- DOCX: `https://cdn.jsdelivr.net/gh/GrdImage/office-testing-files@master/sample.docx`
- XLSX: `https://cdn.jsdelivr.net/gh/GrdImage/office-testing-files@master/sample.xlsx`
- PPTX: `https://cdn.jsdelivr.net/gh/GrdImage/office-testing-files@master/sample.pptx`
- CSV: `https://cdn.jsdelivr.net/gh/GrdImage/office-testing-files@master/sample.csv`

If these URLs are unavailable, use a local fixture server approach.

---

## Known Constraints

- OnlyOffice editor initialization takes 2-5 seconds — tests must account for this (waitForSelector, timeout)
- Editor download triggers a file download, not a page navigation — need Playwright `download` event handling
- CORS errors are common failure mode when test URLs don't set proper headers
- Headless Chromium in Docker may have font rendering issues — rely on editor API events, not visual screenshots for pass/fail
