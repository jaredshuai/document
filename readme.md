# OnlyOffice Web

<p align="center">
  <a href="https://github.com/ranuts/document/actions/workflows/ci.yml">
    <img src="https://github.com/ranuts/document/actions/workflows/ci.yml/badge.svg" alt="CI Status">
  </a>
  <a href="https://github.com/ranuts/document/blob/main/LICENSE">
    <img src="https://img.shields.io/github/license/ranuts/document" alt="License">
  </a>
  <a href="https://github.com/ranuts/document/releases">
    <img src="https://img.shields.io/github/v/release/ranuts/document" alt="Version">
  </a>
  <a href="https://ranuts.github.io/document/">
    <img src="https://img.shields.io/badge/Live-Demo-brightgreen" alt="Live Demo">
  </a>
  <img src="https://img.shields.io/badge/Coverage-100%25-brightgreen" alt="Test Coverage">
</p>

<p align="center">
  <b>English</b> | <a href="readme.zh.md">中文</a>
</p>

A local web-based document editor based on OnlyOffice, allowing you to edit documents directly in your browser without server-side processing, ensuring your privacy and security.

## ✨ Key Features

- 🔒 **Privacy-First**: All document processing happens locally in your browser, with no uploads to any server
- 📝 **Multi-Format Support**: Supports DOCX, XLSX, PPTX, CSV, and many other document formats
- ⚡ **Real-Time Editing**: Provides smooth real-time document editing experience
- 🚀 **No Server Required**: Pure frontend implementation with no server-side processing needed
- 🎯 **Ready to Use**: Start editing documents immediately by opening the webpage
- 🌐 **Open from URL**: Load documents directly from remote URLs via URL parameters
- 🌍 **Multi-Language**: Supports multiple languages (English, Chinese) with easy switching

## 📖 Usage

### Basic Usage

1. Visit the [Online Editor](https://ranuts.github.io/document/)
2. Upload your document files or open from URL
3. Edit directly in your browser
4. Download the edited documents

### Offline Usage (PWA)

This application supports offline usage via PWA (Progressive Web App) technology.

1. Visit the editor using a supported browser (Chrome, Edge, etc.) over **HTTPS** (or localhost).
2. Click the **Install** icon in the address bar to install the app.
3. Once installed, the editor can be launched from your application menu and will work without an internet connection.

**Note**: Due to browser security restrictions, Service Workers (required for offline support) do not work when opening `index.html` directly from the filesystem (`file://` protocol). You must use a local server or the installed PWA.

### URL Parameters

| Parameter | Description                                  | Values/Type | Priority |
| --------- | -------------------------------------------- | ----------- | -------- |
| `locale`  | Set interface language                       | `en`, `zh`  | -        |
| `src`     | Open document from URL (recommended)         | URL string  | Low      |
| `file`    | Open document from URL (backward compatible) | URL string  | High     |

**Examples:**

```bash
# Set language
?locale=zh

# Open document from URL
?src=https://example.com/document.docx

# Combine parameters
?locale=zh&src=https://example.com/doc.docx
```

**Note**: When both `file` and `src` are provided, `file` takes priority. Remote URLs must support CORS.

### Embed in a Host Web Page

You can embed the editor in an iframe and control it from the host page either through a same-origin API or a lightweight `postMessage` bridge.

#### Quick Demo

After starting the app locally, open `/embed-demo.html` to see a working host-page example. The demo page:

- Embeds the editor in an iframe
- Sends `CREATE_NEW` and `OPEN_DOCUMENT_URL` commands through `postMessage`
- Shows the same iframe-based integration pattern that a host page can reuse

#### Option A: Same-Origin Direct API

```html
<iframe id="office-editor" src="/"></iframe>
<button onclick="openWord()">New Word</button>

<script>
  async function openWord() {
    const editorWindow = document.getElementById('office-editor').contentWindow;
    await editorWindow.onCreateNew('.docx');
  }
</script>
```

#### Option B: postMessage Bridge

```html
<iframe id="office-editor" src="https://editor.example.com/"></iframe>
<button onclick="openWordViaMessage()">New Word</button>

<script>
  function encodeMessage(data) {
    return btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(data))));
  }

  function openWordViaMessage() {
    const frame = document.getElementById('office-editor');
    frame.contentWindow.postMessage(
      encodeMessage({
        id: `host-${Date.now()}`,
        type: 'CREATE_NEW',
        payload: { ext: '.docx' },
      }),
      'https://editor.example.com'
    );
  }
</script>
```

Supported host commands:

- `PING`
- `CREATE_NEW` with payload `{ ext: '.docx' | '.xlsx' | '.pptx' }`
- `OPEN_DOCUMENT_URL` with payload `{ url: 'https://example.com/file.docx', fileName?: 'custom.docx' }`
- `CLOSE_EDITOR`

#### Integration Notes

- Same-origin direct method calls require the iframe to be **same-origin**
- `postMessage` control works better for plugin-like integrations and cross-window communication
- Opening a remote file still requires the remote server to allow **CORS**
- You can also preload a document by setting the iframe URL to `/?src=<encoded-url>`

### As a Component Library

This project provides foundational services for document preview components in the [@ranui/preview](https://www.npmjs.com/package/@ranui/preview) WebComponent library.

📚 **Preview Component Documentation**: [https://chaxus.github.io/ran/src/ranui/preview/](https://chaxus.github.io/ran/src/ranui/preview/)

## 🛠️ Technical Architecture

- **OnlyOffice SDK**: Provides powerful document editing capabilities
- **WebAssembly**: Implements document format conversion through x2t-wasm
- **Pure Frontend Architecture**: All functionality runs in the browser

## 🚀 Deployment

### Docker

```bash
# docker run
docker run -d --name document -p 8080:80 ghcr.io/ranuts/document:latest

# docker compose
services:
  document:
    image: ghcr.io/ranuts/document:latest
    container_name: document
    ports:
      - 8080:80
```

#### Advanced Configuration

```yaml
name: document
services:
  document:
    image: ghcr.io/ranuts/document:latest
    container_name: document
    ports:
      - 8080:80
    # Advanced Configuration
    volumes:
      # Add certificates
      - certificate_path:/ssl
    environment:
      # Set account
      # Format username:password, password must be encoded using BCrypt hash function.
      # To get BCrypt encryption result, replace $ in the encrypted result with $$ for escaping.
      SERVER_BASIC_AUTH: 'username:BCrypt_encrypted_password'
      # Use certificate
      SERVER_HTTP2_TLS: true
      SERVER_HTTP2_TLS_CERT: certificate_path
      SERVER_HTTP2_TLS_KEY: private_key_path
```

### Important Notes

- **CORS**: Remote servers must support CORS when using `src` or `file` parameters
- **File Size**: Large files may take longer to load

## 🔧 Local Development

```bash
git clone https://github.com/ranuts/document.git
cd document
npm install
npm run dev
```

### Running Tests

The project uses [Vitest](https://vitest.dev/) for testing. Test files are located in `lib/__tests__/`.

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage report
pnpm test:coverage
```

#### Test Coverage

The project focuses on testing pure utility functions that can be reliably unit tested:

| Module | Coverage | Description |
|--------|----------|-------------|
| `lib/file-types.ts` | 100% | File type constants and reverse mapping |
| `lib/url-utils.ts` | 100% | URL/filename parsing, language normalization, file sanitization |
| `lib/language-types.ts` | 100% | Language code enums and utilities |
| `lib/conversion-utils.ts` | 100% | Document conversion parameter generation |
| `lib/conversion-paths.ts` | 100% | X2T virtual file system paths |
| `lib/i18n-messages.ts` | 100% | Internationalization messages and validation |
| `lib/type-guards.ts` | 100% | Runtime type validation for external data |
| `lib/error-utils.ts` | 100% | Error handling, formatting, and classification |
| `lib/byte-utils.ts` | 100% | UTF-8 BOM handling, byte encoding/decoding |
| `lib/empty_bin.ts` | 100% | Empty document templates for new files |
| `lib/document-utils.ts` | 100% | Document type detection, MIME types |
| `lib/render-workflow.ts` | 100% | Chunked document loading workflow |
| `lib/document-template.ts` | 100% | New document template utilities |
| `lib/save-format.ts` | 100% | Save format determination |
| `lib/editor-utils.ts` | 100% | Editor delay utilities |
| `lib/editor-config.ts` | 100% | Editor configuration helpers |
| `lib/operation-queue.ts` | 100% | Sequential async operation queue |
| `lib/file-picker.ts` | 100% | File System API picker utilities |
| `lib/media-url.ts` | 100% | Media URL utilities for editor |
| `store/index.ts` | 100% | State management store |

**Key Testable Functions** (`lib/url-utils.ts`):
- `sanitizeFileName()` - Sanitizes filenames by removing illegal characters
- `getMimeType()` - Returns MIME type for file extension
- `getFileDescription()` - Returns human-readable file type descriptions
- `extractFileType()` - Extracts file type from MIME type or filename
- `normalizeLanguage()` - Normalizes language codes (zh-CN → zh)
- `determineFilename()` - Priority-based filename determination

**Type Guards** (`lib/type-guards.ts`):
- `isValidRenderOfficeData()` - Validates chunked file data from message codec
- `isValidChunkSequence()` - Validates chunk array completeness
- `isValidFile()` - Validates file name/size constraints

**Error Utilities** (`lib/error-utils.ts`):
- `formatErrorMessage()` - Safely extracts error messages from unknown values
- `isNetworkError()` - Classifies network-related errors
- `isFileError()` - Classifies file-related errors
- `safeAsync()` - Wraps async functions with safe error handling

**Note**: Browser-dependent modules (UI, OnlyOffice integration, DOM manipulation) are not unit tested as they require browser environments. The focus is on testing testable pure functions.

Tests are automatically run in CI on every push and pull request. Coverage reports are generated as part of the CI pipeline.

## 🔤 Font Management

### Font Files in This Project

This project is designed as an open-source solution, and therefore does not include proprietary font files such as **Arial**, **Times New Roman**, **Microsoft YaHei**, **SimSun**, and other Windows system fonts that are subject to copyright restrictions. These font references remain in the configuration files for compatibility with existing documents, but the actual font files have been removed to ensure compliance with open-source licensing requirements.

### Adding Fonts

To add fonts that are already configured in the project (such as Arial, Times New Roman, etc.), simply place the font files in the `public/fonts/` directory and rename them to match their corresponding index in the `__fonts_files` array in `public/sdkjs/common/AllFonts.js`.

**Example: Adding Arial Font**

If you want to add the Arial font to the project:

1. Check `AllFonts.js` and find that Arial regular font uses index `223` in the `__fonts_files` array
2. Place your Arial font file in `public/fonts/` and rename it to `223` (no extension needed)
3. The font file should be located at `public/fonts/223`
4. When the application references index `223`, it will automatically load the font file from `public/fonts/223`

Similarly, for other Arial variants:

- Arial Bold uses index `226` → place font file as `public/fonts/226`
- Arial Italic uses index `224` → place font file as `public/fonts/224`
- Arial Bold Italic uses index `225` → place font file as `public/fonts/225`

You can find the index for any font by checking the `__fonts_infos` array in `AllFonts.js`, where each font entry specifies the indices for its regular, bold, italic, and bold-italic variants.

**Note**: Only use open-source fonts or fonts for which you have proper licensing rights. Ensure compliance with font licensing terms before adding any font files.

## 📚 References

- [onlyoffice-x2t-wasm](https://github.com/cryptpad/onlyoffice-x2t-wasm) - WebAssembly-based document converter
- [se-office](https://github.com/Qihoo360/se-office) - Secure document editor
- [web-apps](https://github.com/ONLYOFFICE/web-apps) - OnlyOffice web applications
- [sdkjs](https://github.com/ONLYOFFICE/sdkjs) - OnlyOffice JavaScript SDK
- [onlyoffice-web-local](https://github.com/sweetwisdom/onlyoffice-web-local) - Local web-based OnlyOffice implementation

## 🤝 Contributing

Issues and Pull Requests are welcome to help improve this project!

Please read the [Contributing Guidelines](CONTRIBUTING.md) for detailed information on:

- Development setup
- Testing guidelines
- Code style requirements
- Pull request process

## 📄 License

See the [LICENSE](LICENSE) file for details.
