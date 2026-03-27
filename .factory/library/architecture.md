# Architecture

Architectural decisions, patterns discovered, and key system design.

---

## Document Editor Architecture

### Entry Point
- `index.ts` — main entry, initializes UI, checks URL params (`file`/`src`), loads OnlyOffice editor
- URL params: `?file=<URL>` or `?src=<URL>` (priority: `file` > `src`)

### Core Modules (`lib/`)

| File | Purpose |
|------|---------|
| `document.ts` | Opens documents (from file picker or URL), triggers conversion + editor |
| `converter.ts` | Singleton X2TConverter — loads WASM, converts file/blob to editor-ready format |
| `document-converter.ts` | X2TConverter class — wraps OnlyOffice x2t WASM, handles file→bin→download |
| `onlyoffice-editor.ts` | Creates OnlyOffice DocEditor instance, handles save/write events |
| `url-utils.ts` | Pure functions: URL parsing, filename extraction, sanitization |
| `document-utils.ts` | Document type mapping (docx→word, xlsx→cell, pptx→slide) |
| `file-types.ts` | OnlyOffice numeric file type constants |
| `events.ts` | Message handling from iframe/OnlyOffice |
| `store/index.ts` | Simple signal-based state (fileName, file, url) |

### Edit/Save Flow
1. User opens URL → `openDocumentFromUrl()` in `document.ts`
2. Fetch URL → create File object → store in signal
3. `handleDocumentOperation()` calls `convertDocument()` to convert file to OOXML bin
4. `createEditorInstance()` creates OnlyOffice DocEditor in `#iframe`
5. User edits → OnlyOffice fires `onSave` event
6. `handleSaveDocument()` calls `convertBinToDocumentAndDownload()` → triggers browser download

### Conversion Pipeline
- Legacy formats (doc/xls/ppt) → converted to OOXML via x2t WASM
- OOXML formats (docx/xlsx/pptx) → served directly to editor
- CSV → OnlyOffice handles as spreadsheet format

### State Management
- `store/index.ts` uses `ranuts/utils` createSignal
- State: `{ fileName, file?: File, url?: string }`
- No persistence (intentionally — preview-only, no backend)

### Supported File Types
- **Editable (primary):** DOCX, XLSX, PPTX, CSV
- **Editable (secondary):** DOC, XLS, PPT, ODT, ODS, ODP, RTF, TXT
- **View-only:** PDF

---

## Build System

- **Vite** for bundling (vite.config.ts)
- **Cross-platform build:** `bin/build.js` (Node.js) replaces `bin/build.sh` (bash)
- Build output: `dist/` (static files, served by nginx/static-web-server)
- Service Worker: `public/sw.js` → copied to `dist/sw.js` with timestamp injection

---

## Docker Deployment

- Multi-stage build: Node builder → static web server
- `joseluisq/static-web-server:latest` serves `dist/` on port 80
- No server-side processing — purely static files
- Optional basic auth via `SERVER_BASIC_AUTH` env var

---

## Browser Dependencies

The following are NOT unit-testable in Node.js environment:
- OnlyOffice DocEditor API (`window.DocsAPI.DocEditor`)
- File System Access API (`showOpenFilePicker`, `showSaveFilePicker`)
- Service Worker API
- Blob/URL.createObjectURL
- fetch API (used in document.ts)

These are integration-tested via Playwright smoke tests, not unit tests.
