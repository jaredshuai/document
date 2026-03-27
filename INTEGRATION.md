# Document Viewer Integration Contract

This document describes the integration contract for embedding the Document Viewer (powered by OnlyOffice) within docman or similar host applications.

---

## URL Format

The viewer accepts document URLs via query parameters:

| Parameter | Priority | Description |
|-----------|----------|-------------|
| `file`    | Higher   | Primary parameter for document URL (recommended) |
| `src`     | Lower    | Backward-compatible parameter for document URL |

**Priority rule:** When both `file` and `src` are present, `file` takes precedence.

**Examples:**

```
# Basic usage
https://viewer.example.com/?file=https://docman.example.com/docs/report.docx
https://viewer.example.com/?src=https://docman.example.com/docs/report.docx

# Both parameters present (file wins)
https://viewer.example.com/?file=https://docman.example.com/doc1.docx&src=https://docman.example.com/doc2.xlsx
# → Opens doc1.docx

# Combined with other parameters
https://viewer.example.com/?file=https://docman.example.com/docs/report.docx&locale=en
```

---

## Authentication

**The viewer performs a plain `fetch()` request to the document URL.**

### What this means:

- **No Authorization header forwarding** — The viewer's fetch request does not forward cookies, Bearer tokens, or any authentication headers from the viewer's origin.
- **No credential forwarding** — Session cookies, HTTP Basic Auth, or other credentials are not passed to the remote server.
- **Fresh request** — The fetch is made as an anonymous request from the browser.

### Implications for integrators:

1. **The document URL must be publicly accessible** (or accessible to the viewer's origin without additional auth).
2. **If authentication is required**, the hosting application (docman) should:
   - Proxy the request through its own backend, or
   - Generate a pre-signed/short-lived URL with embedded token before passing to the viewer, or
   - Use a CORS-friendly endpoint that accepts the auth token via a different mechanism

---

## CORS Requirements

**The remote server hosting the document must allow cross-origin requests from the viewer's origin.**

### Required Headers:

```
Access-Control-Allow-Origin: https://viewer.example.com
# OR (if wildcard is acceptable)
Access-Control-Allow-Origin: *
```

### Additional recommended headers:

```
Access-Control-Allow-Methods: GET
Access-Control-Allow-Headers: Content-Type
Access-Control-Expose-Headers: Content-Disposition
```

### Same-origin alternative:

If the viewer and document server are served from the **same origin** (e.g., docman serves both the viewer and the documents), CORS headers are not required — the same-origin policy applies automatically.

---

## Content-Disposition Handling

The viewer extracts the filename for display using the following priority:

| Priority | Source | Example |
|----------|--------|---------|
| 1 | `Content-Disposition` HTTP header | `attachment; filename="Annual Report 2024.docx"` |
| 2 | URL pathname | `https://example.com/docs/report.docx` → `report.docx` |
| 3 | Fallback | `document` |

### Notes:

- The `Content-Disposition` header is read from the HTTP response and takes highest priority when present.
- If no `Content-Disposition` header is found, the filename is extracted from the URL pathname.
- The filename is used for display in the editor UI and for the downloaded file name.

---

## Supported File Types

### Tier 1 — Stable / Editable (Primary)

Fully supported with edit and save functionality:

| Format | MIME Type | Extension | Notes |
|--------|-----------|-----------|-------|
| Office Open XML Document | application/vnd.openxmlformats-officedocument.wordprocessingml.document | `.docx` | Primary word format |
| Office Open XML Spreadsheet | application/vnd.openxmlformats-officedocument.spreadsheetml.sheet | `.xlsx` | Primary spreadsheet format |
| Office Open XML Presentation | application/vnd.openxmlformats-officedocument.presentationml.presentation | `.pptx` | Primary presentation format |
| CSV | text/csv | `.csv` | Plain text tabular data |

### Tier 2 — View-Only (Conversion-Based)

These formats are supported via server-side conversion to OOXML. They open in the editor but may have limited edit fidelity:

| Format | MIME Type | Extension | Notes |
|--------|-----------|-----------|-------|
| Word Document | application/msword | `.doc` | Legacy format; converted to DOCX |
| Excel Spreadsheet | application/vnd.ms-excel | `.xls` | Legacy format; converted to XLSX |
| PowerPoint Presentation | application/vnd.ms-powerpoint | `.ppt` | Legacy format; converted to PPTX |
| OpenDocument Text | application/vnd.oasis.opendocument.text | `.odt` | Open standard; converted to DOCX |
| OpenDocument Spreadsheet | application/vnd.oasis.opendocument.spreadsheet | `.ods` | Open standard; converted to XLSX |
| OpenDocument Presentation | application/vnd.oasis.opendocument.presentation | `.odp` | Open standard; converted to PPTX |
| Rich Text Format | application/rtf | `.rtf` | Plain text with formatting; converted to DOCX |
| Plain Text | text/plain | `.txt` | No formatting |
| PDF | application/pdf | `.pdf` | View-only; rendered via OnlyOffice PDF viewer |

### Unsupported Formats

The following are **not supported** and will result in an error:

- Legacy formats not listed above (e.g., WordPerfect, Lotus 1-2-3)
- Image formats (should be embedded in documents, not opened directly)
- Compressed archives containing documents (must be extracted first)

---

## Known Limitations

### 1. No Save-Back to Server

The viewer does **not** automatically save changes back to the remote server.

- Users can **download** the edited document to their local machine via the editor's "Download" button
- There is no API or mechanism to push the edited file back to the original URL
- If save-back is required, the host application must implement a custom workflow (e.g., a "Save to docman" button that uploads the file via the host's API)

### 2. No Collaborative Editing

The viewer operates in **single-user mode**.

- No real-time co-editing (Google Docs-style)
- No conflict resolution or merging
- No presence indicators
- No comment threading across sessions

If collaborative editing is needed, consider using OnlyOffice's built-in document server in collaborative mode, or a different product designed for real-time collaboration.

### 3. No Permissions System Inside Viewer

The viewer does **not** enforce any permissions or access control.

- The viewer cannot check if the current user has read/write access to a document
- Permissions must be enforced by the host application **before** passing the document URL to the viewer
- The viewer assumes the URL is already authorized for access

### 4. No Document Versioning

The viewer does not track document versions or history.

- Opening the same URL twice always loads the current version from the server
- No "undo" across sessions
- No version comparison

### 5. No Offline Persistence of Edits

If a user edits a document while offline:

- The OnlyOffice editor may lose its state
- Edits made offline may not be recoverable

---

## Example Integration: Hosting in docman

### Step 1: Check permissions in your backend

```javascript
// Your backend (docman)
async function getDocumentUrl(userId, documentId) {
  const hasAccess = await checkUserAccess(userId, documentId);
  if (!hasAccess) {
    throw new ForbiddenError('User does not have access');
  }
  
  // Generate a short-lived pre-signed URL or proxy URL
  const documentUrl = await generateDownloadUrl(documentId);
  return documentUrl;
}
```

### Step 2: Render the viewer with the authorized URL

```html
<!-- Your frontend (docman) -->
<iframe 
  src="https://viewer.example.com/?file={{ documentUrl }}"
  style="width: 100%; height: 600px; border: none;">
</iframe>
```

### Step 3: Handle save-back (if needed)

```javascript
// Add a custom "Save to docman" button that calls your API
async function saveToDocman(blob) {
  const formData = new FormData();
  formData.append('file', blob);
  
  await fetch('/api/documents/' + documentId + '/upload', {
    method: 'POST',
    body: formData,
  });
}
```

---

## Summary

| Aspect | Behavior |
|--------|----------|
| URL Parameters | `?file=<URL>` (preferred) or `?src=<URL>`; `file` takes priority |
| Authentication | None forwarded; document URL must be publicly accessible or pre-authorized |
| CORS | Remote server must set `Access-Control-Allow-Origin` (unless same-origin) |
| Filename | Extracted from `Content-Disposition` header, then URL pathname |
| Primary Formats | DOCX, XLSX, PPTX, CSV (fully editable) |
| View-Only Formats | DOC, XLS, PPT, ODT, ODS, ODP, RTF, TXT, PDF (via conversion) |
| Save-Back | Not supported; user downloads locally |
| Collaboration | Not supported |
| Permissions | Not enforced inside viewer; host app must handle |
