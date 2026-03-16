/**
 * End-to-end workflow simulation tests.
 * These tests simulate complete user workflows without browser dependencies.
 */
import { describe, expect, it } from 'vitest';
import { oAscFileType } from '../file-types';
import {
  determineFilename,
  getFileExtension,
  isSupportedExtension,
  getMimeType,
  sanitizeFileName,
  isValidUrl,
  safeDecodeUri,
  extractDocumentUrl,
} from '../url-utils';
import { getDocumentType } from '../document-utils';
import {
  isValidRenderOfficeData,
  isValidChunkSequence,
  isValidFile,
} from '../type-guards';
import {
  updateRenderChunkState,
  hasMatchingRenderChunkMetadata,
  sortRenderChunks,
} from '../render-workflow';
import {
  determineSaveFormat,
  getSaveFormatOverride,
} from '../save-format';
import {
  isNewDocumentSupported,
  getNewDocumentTemplate,
} from '../document-template';
import {
  createEditorConfig,
  isEditableFileType,
  requiresConversion,
  getConversionTarget,
} from '../editor-config';
import {
  createConversionPaths,
  getParamsPath,
  createOutputFileName,
} from '../conversion-paths';
import { createConversionParams, escapeXml } from '../conversion-utils';
import {
  createSavePickerOptions,
  createOpenPickerOptions,
  getFileInputAccept,
} from '../file-picker';
import { formatErrorMessage, isNetworkError, isFileError, createErrorContext } from '../error-utils';
import { encodeToBytes, decodeBytes, hasUtf8Bom, concatBytes } from '../byte-utils';
import type { RenderOfficeData } from '../events';

// =============================================================================
// END-TO-END DOCUMENT LOADING WORKFLOW
// =============================================================================

describe('E2E: Document Loading from URL', () => {
  it('should complete URL-based document loading workflow', () => {
    // Step 1: Extract URL from query parameters
    const queryParams = { file: 'https://example.com/documents/report.docx' };
    const extractedUrl = extractDocumentUrl(queryParams);
    expect(extractedUrl).toBe('https://example.com/documents/report.docx');

    // Step 2: Validate URL
    expect(isValidUrl(extractedUrl!)).toBe(true);

    // Step 3: Decode URL if needed
    const decodedUrl = safeDecodeUri(extractedUrl!);
    expect(decodedUrl).toBe('https://example.com/documents/report.docx');

    // Step 4: Determine filename from URL
    const contentDisposition = 'attachment; filename="report.docx"';
    const filename = determineFilename({
      contentDisposition,
      url: decodedUrl,
    });
    expect(filename).toBe('report.docx');

    // Step 5: Extract extension
    const extension = getFileExtension(filename);
    expect(extension).toBe('docx');

    // Step 6: Check if supported
    expect(isSupportedExtension(extension)).toBe(true);

    // Step 7: Get document type
    const docType = getDocumentType(extension);
    expect(docType).toBe('word');

    // Step 8: Get MIME type
    const mimeType = getMimeType(extension);
    expect(mimeType).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document');

    // Step 9: Check if editable
    expect(isEditableFileType(extension)).toBe(true);

    // Step 10: Check if conversion needed
    expect(requiresConversion(extension)).toBe(false);
  });

  it('should complete URL-based document loading with encoded URL', () => {
    const encodedUrl = 'https://example.com/docs/%E4%B8%AD%E6%96%87%E6%96%87%E6%A1%A3.docx';

    // safeDecodeUri decodes the URL for display/processing
    const decodedUrl = safeDecodeUri(encodedUrl);
    expect(decodedUrl).toBe('https://example.com/docs/中文文档.docx');

    // When extracting filename, the URL pathname still contains the encoded chars
    // because extractFilenameFromUrl creates a new URL object
    const filename = determineFilename({ url: decodedUrl });
    // The filename will be extracted from the URL pathname
    // (URL constructor may re-encode non-ASCII characters)
    expect(filename).toBeDefined();
    expect(filename.endsWith('.docx')).toBe(true);

    const sanitized = sanitizeFileName(filename);
    expect(sanitized).toBeDefined();

    const extension = getFileExtension(sanitized);
    expect(extension).toBe('docx');
  });

  it('should handle legacy format conversion workflow', () => {
    // Legacy .doc file needs conversion
    const filename = 'legacy-document.doc';
    const extension = getFileExtension(filename);

    expect(isSupportedExtension(extension)).toBe(true);
    expect(requiresConversion(extension)).toBe(true);

    const conversionTarget = getConversionTarget(extension);
    expect(conversionTarget).toBe('docx');

    const paths = createConversionPaths(filename, conversionTarget);
    expect(paths.inputPath).toContain('.doc');
    expect(paths.outputPath).toContain('.docx');
  });

  it('should prioritize file parameter over src in extractDocumentUrl', () => {
    const params = { file: 'file-url.docx', src: 'src-url.docx' };
    expect(extractDocumentUrl(params)).toBe('file-url.docx');

    const paramsOnlySrc = { src: 'src-url.docx' };
    expect(extractDocumentUrl(paramsOnlySrc)).toBe('src-url.docx');

    const emptyParams = {};
    expect(extractDocumentUrl(emptyParams)).toBe(null);
  });
});

// =============================================================================
// END-TO-END CHUNKED DOCUMENT LOADING WORKFLOW
// =============================================================================

describe('E2E: Chunked Document Loading', () => {
  const createChunk = (
    index: number,
    total: number,
    name: string = 'document.docx',
    size: number = 1000,
  ): RenderOfficeData => ({
    chunkIndex: index,
    totalChunks: total,
    data: `base64-chunk-data-${index}`,
    name,
    size,
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    lastModified: 1234567890000,
  });

  it('should complete chunked document loading workflow', () => {
    // Step 1: Receive first chunk
    const chunk1 = createChunk(0, 3);
    expect(isValidRenderOfficeData(chunk1)).toBe(true);

    let state = updateRenderChunkState([], chunk1);
    expect(state.status).toBe('waiting');
    expect(state.receivedChunks).toBe(1);

    // Step 2: Receive second chunk
    const chunk2 = createChunk(1, 3);
    expect(hasMatchingRenderChunkMetadata(chunk1, chunk2)).toBe(true);

    state = updateRenderChunkState(state.chunks, chunk2);
    expect(state.status).toBe('waiting');
    expect(state.receivedChunks).toBe(2);

    // Step 3: Receive third chunk
    const chunk3 = createChunk(2, 3);
    state = updateRenderChunkState(state.chunks, chunk3);

    // Step 4: Verify completion
    expect(state.status).toBe('ready');
    expect(state.receivedChunks).toBe(3);
    expect(state.chunks.length).toBe(3);

    // Step 5: Validate chunk sequence
    expect(isValidChunkSequence(state.chunks)).toBe(true);

    // Step 6: Sort chunks
    const sorted = sortRenderChunks(state.chunks);
    expect(sorted[0].chunkIndex).toBe(0);
    expect(sorted[1].chunkIndex).toBe(1);
    expect(sorted[2].chunkIndex).toBe(2);
  });

  it('should handle single-chunk documents', () => {
    const chunk = createChunk(0, 1);
    const state = updateRenderChunkState([], chunk);

    expect(state.status).toBe('ready');
    expect(state.chunks.length).toBe(1);
    expect(isValidChunkSequence(state.chunks)).toBe(true);
  });

  it('should handle metadata mismatch by resetting', () => {
    const chunk1 = createChunk(0, 2, 'document1.docx');
    let state = updateRenderChunkState([], chunk1);
    expect(state.status).toBe('waiting');

    // Chunk with different metadata
    const chunk2 = createChunk(1, 2, 'document2.docx');
    state = updateRenderChunkState(state.chunks, chunk2);

    expect(state.status).toBe('reset');
    if (state.status === 'reset') {
      expect(state.reason).toBe('metadata-mismatch');
    }
  });

  it('should handle chunk restart on new chunk 0', () => {
    const chunk1 = createChunk(0, 2, 'old-document.docx');
    let state = updateRenderChunkState([], chunk1);
    expect(state.status).toBe('waiting');

    // New document starts with chunk 0
    const chunk2 = createChunk(0, 3, 'new-document.docx');
    state = updateRenderChunkState(state.chunks, chunk2);

    expect(state.status).toBe('waiting');
    expect(state.chunks.length).toBe(1);
    expect(state.chunks[0].name).toBe('new-document.docx');
    expect(state.expectedChunks).toBe(3);
  });
});

// =============================================================================
// END-TO-END NEW DOCUMENT CREATION WORKFLOW
// =============================================================================

describe('E2E: New Document Creation', () => {
  it('should complete new document creation workflow for Word', () => {
    // Step 1: Check if supported
    const fileType = 'docx';
    expect(isNewDocumentSupported(fileType)).toBe(true);

    // Step 2: Get template
    const template = getNewDocumentTemplate(fileType);
    expect(template).toBeDefined();
    expect(typeof template).toBe('string');
    expect(template!.length).toBeGreaterThan(0);

    // Step 3: Create editor config
    const config = createEditorConfig({
      fileName: 'new-document.docx',
      fileType: 'docx',
      lang: 'en',
      events: {
        onAppReady: () => {},
        onDocumentReady: () => {},
        onSave: () => {},
        writeFile: () => {},
      },
    });

    expect(config.document.fileType).toBe('docx');
    expect(config.document.title).toBe('new-document.docx');
  });

  it('should complete new document creation workflow for Excel', () => {
    const fileType = 'xlsx';
    expect(isNewDocumentSupported(fileType)).toBe(true);

    const template = getNewDocumentTemplate(fileType);
    expect(template).toBeDefined();
    expect(typeof template).toBe('string');
  });

  it('should complete new document creation workflow for PowerPoint', () => {
    const fileType = 'pptx';
    expect(isNewDocumentSupported(fileType)).toBe(true);

    const template = getNewDocumentTemplate(fileType);
    expect(template).toBeDefined();
    expect(typeof template).toBe('string');
  });

  it('should handle unsupported document types', () => {
    expect(isNewDocumentSupported('pdf')).toBe(false);
    expect(getNewDocumentTemplate('pdf')).toBeUndefined();
    expect(getNewDocumentTemplate('unknown')).toBeUndefined();
  });
});

// =============================================================================
// END-TO-END DOCUMENT CONVERSION WORKFLOW
// =============================================================================

describe('E2E: Document Conversion', () => {
  it('should complete CSV to XLSX conversion workflow', () => {
    // Step 1: Identify source file
    const filename = 'data.csv';
    const extension = getFileExtension(filename);
    expect(extension).toBe('csv');

    // Step 2: Check if conversion needed
    expect(requiresConversion(extension)).toBe(true);

    // Step 3: Get conversion target
    const targetExt = getConversionTarget(extension);
    expect(targetExt).toBe('xlsx');

    // Step 4: Create conversion paths
    const paths = createConversionPaths(filename, targetExt);
    expect(paths.inputPath).toContain('data.csv');
    expect(paths.outputPath).toContain('xlsx');

    // Step 5: Create conversion params
    const params = createConversionParams(paths.inputPath, paths.outputPath);
    expect(params).toContain('<m_sFileFrom>');
    expect(params).toContain('<m_sFileTo>');
    expect(params).toContain('data.csv');

    // Step 6: Get params path
    const paramsPath = getParamsPath();
    expect(paramsPath).toContain('params.xml');

    // Step 7: Create output filename
    const outputName = createOutputFileName('data', 'xlsx');
    expect(outputName).toBe('data.xlsx');
  });

  it('should handle BOM in CSV conversion', () => {
    const csvContent = 'name,value\n"test","123"';
    const csvBytes = encodeToBytes(csvContent);

    // Check for UTF-8 BOM
    expect(hasUtf8Bom(csvBytes)).toBe(false);

    // Add BOM
    const BOM = new Uint8Array([0xef, 0xbb, 0xbf]);
    const csvWithBom = concatBytes(BOM, csvBytes);

    expect(hasUtf8Bom(csvWithBom)).toBe(true);

    // Decode should handle BOM
    const decoded = decodeBytes(csvWithBom);
    expect(decoded).toBe(csvContent);
  });

  it('should complete DOC to DOCX conversion workflow', () => {
    const filename = 'legacy.doc';
    const extension = getFileExtension(filename);

    expect(requiresConversion(extension)).toBe(true);
    expect(getConversionTarget(extension)).toBe('docx');

    const paths = createConversionPaths(filename, 'docx');
    expect(paths.inputPath).toContain('.doc');
    expect(paths.outputPath).toContain('.docx');
  });
});

// =============================================================================
// END-TO-END SAVE WORKFLOW
// =============================================================================

describe('E2E: Document Save Workflow', () => {
  it('should complete standard save workflow', () => {
    // Step 1: Determine save format
    const formatCode = oAscFileType.DOCX;
    const originalFilename = 'document.docx';

    const saveFormat = determineSaveFormat(formatCode, originalFilename);
    // determineSaveFormat returns uppercase format names
    expect(saveFormat.toLowerCase()).toBe('docx');

    // Step 2: Get MIME type
    const mimeType = getMimeType(saveFormat!.toLowerCase());
    expect(mimeType).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document');

    // Step 3: Create save picker options
    const pickerOptions = createSavePickerOptions(originalFilename, mimeType);
    expect(pickerOptions.suggestedName).toBe('document.docx');
    expect(pickerOptions.types).toHaveLength(1);
  });

  it('should complete CSV save with override workflow', () => {
    // CSV file edited as XLSX, save back as CSV
    const formatCode = oAscFileType.CSV;
    const originalFilename = 'data.csv';

    const override = getSaveFormatOverride(originalFilename);
    // getSaveFormatOverride returns uppercase
    expect(override?.toLowerCase()).toBe('csv');

    const saveFormat = determineSaveFormat(formatCode, originalFilename);
    expect(saveFormat.toLowerCase()).toBe('csv');
  });

  it('should handle save format for presentations', () => {
    const formatCode = oAscFileType.PPTX;
    const saveFormat = determineSaveFormat(formatCode, 'presentation.pptx');
    expect(saveFormat.toLowerCase()).toBe('pptx');

    const mimeType = getMimeType(saveFormat!.toLowerCase());
    expect(mimeType).toBe('application/vnd.openxmlformats-officedocument.presentationml.presentation');
  });
});

// =============================================================================
// END-TO-END ERROR HANDLING WORKFLOW
// =============================================================================

describe('E2E: Error Handling', () => {
  it('should complete network error handling workflow', () => {
    // Step 1: Create network error
    const networkError = new TypeError('Failed to fetch');

    // Step 2: Create error context
    const context = createErrorContext(networkError, {
      operation: 'document-load',
      context: { url: 'https://example.com/doc.docx' },
    });
    expect(context.operation).toBe('document-load');
    expect(context.message).toBe('Failed to fetch');

    // Step 3: Classify network error
    expect(isNetworkError(networkError)).toBe(true);

    // Step 4: Format error message
    const message = formatErrorMessage(networkError);
    expect(message).toBe('Failed to fetch');
  });

  it('should complete file error handling workflow', () => {
    const fileError = new Error('File not found');
    fileError.name = 'NotFoundError';

    expect(isFileError(fileError)).toBe(true);

    const message = formatErrorMessage(fileError);
    expect(message).toContain('File not found');
  });

  it('should handle nested error chains', () => {
    const cause = new Error('Network timeout');
    const mainError = new Error('Document load failed', { cause });

    const formatted = formatErrorMessage(mainError);
    expect(formatted).toContain('Document load failed');
  });
});

// =============================================================================
// END-TO-END FILE PICKER WORKFLOW
// =============================================================================

describe('E2E: File Picker', () => {
  it('should complete save picker workflow', () => {
    const filename = 'report.docx';
    const mimeType = getMimeType('docx');

    const options = createSavePickerOptions(filename, mimeType);

    expect(options.suggestedName).toBe('report.docx');
    expect(options.types).toHaveLength(1);
    expect(options.types[0].accept).toBeDefined();
  });

  it('should complete open picker workflow', () => {
    const extensions = ['docx', 'xlsx', 'pptx'];
    const options = createOpenPickerOptions(extensions);

    expect(options.types.length).toBeGreaterThan(0);
    expect(options.multiple).toBe(false);
  });

  it('should generate file input accept string', () => {
    const accept = getFileInputAccept();

    expect(accept).toContain('.docx');
    expect(accept).toContain('.xlsx');
    expect(accept).toContain('.pptx');
  });
});

// =============================================================================
// END-TO-END EDITOR CONFIGURATION WORKFLOW
// =============================================================================

describe('E2E: Editor Configuration', () => {
  it('should complete editor config generation workflow', () => {
    const filename = 'report.docx';
    const fileType = 'docx';

    const config = createEditorConfig({
      fileName: filename,
      fileType: fileType,
      lang: 'en',
      events: {
        onAppReady: () => {},
        onDocumentReady: () => {},
        onSave: () => {},
        writeFile: () => {},
      },
    });

    expect(config.document.url).toBe(filename);
    expect(config.document.fileType).toBe('docx');
    expect(config.document.title).toBe(filename);
    expect(config.editorConfig.lang).toBe('en');
  });

  it('should handle conversion-required files', () => {
    const config = createEditorConfig({
      fileName: 'legacy.doc',
      fileType: 'doc',
      lang: 'en',
      events: {
        onAppReady: () => {},
        onDocumentReady: () => {},
        onSave: () => {},
        writeFile: () => {},
      },
    });

    expect(config.document.fileType).toBe('doc');
    expect(requiresConversion('doc')).toBe(true);
  });
});

// =============================================================================
// END-TO-END VALIDATION WORKFLOW
// =============================================================================

describe('E2E: Validation Pipelines', () => {
  it('should validate complete RenderOfficeData', () => {
    const data: RenderOfficeData = {
      chunkIndex: 0,
      totalChunks: 1,
      data: 'base64-data',
      name: 'document.docx',
      size: 1000,
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      lastModified: Date.now(),
    };

    expect(isValidRenderOfficeData(data)).toBe(true);

    const state = updateRenderChunkState([], data);
    expect(state.status).toBe('ready');
  });

  it('should detect invalid RenderOfficeData', () => {
    const invalidData = {
      chunkIndex: -1, // Invalid
      totalChunks: 1,
      data: 'base64-data',
      name: 'document.docx',
      size: 1000,
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      lastModified: Date.now(),
    };

    expect(isValidRenderOfficeData(invalidData as RenderOfficeData)).toBe(false);
  });

  it('should validate file object', () => {
    const fileName = 'document.docx';
    const size = 1000;

    // isValidFile takes (fileName, size, options) parameters
    expect(isValidFile(fileName, size)).toBe(true);
    expect(isValidFile('', size)).toBe(false);
    expect(isValidFile(fileName, -1)).toBe(false);
  });
});

// =============================================================================
// END-TO-END UNICODE AND SPECIAL CHARACTER HANDLING
// =============================================================================

describe('E2E: Unicode and Special Characters', () => {
  it('should handle Chinese filenames throughout workflow', () => {
    const filename = '中文文档.docx';

    // Sanitize
    const sanitized = sanitizeFileName(filename);
    expect(sanitized).toBe('中文文档.docx');

    // Extract extension
    const ext = getFileExtension(sanitized);
    expect(ext).toBe('docx');

    // Check support
    expect(isSupportedExtension(ext)).toBe(true);

    // Get MIME
    const mime = getMimeType(ext);
    expect(mime).toBeDefined();
  });

  it('should handle Japanese filenames throughout workflow', () => {
    const filename = 'ドキュメント.xlsx';

    const sanitized = sanitizeFileName(filename);
    expect(sanitized).toBe('ドキュメント.xlsx');

    const ext = getFileExtension(sanitized);
    expect(ext).toBe('xlsx');
  });

  it('should handle emoji in filenames', () => {
    const filename = 'document-📄-test.pptx';

    const sanitized = sanitizeFileName(filename);
    expect(sanitized).toBe('document-📄-test.pptx');

    const ext = getFileExtension(sanitized);
    expect(ext).toBe('pptx');
  });

  it('should handle illegal characters in filenames', () => {
    const filename = 'file<>:"/\\|?.docx';

    const sanitized = sanitizeFileName(filename);
    // Illegal characters should be removed
    expect(sanitized).not.toContain('<');
    expect(sanitized).not.toContain('>');
    expect(sanitized).not.toContain(':');
    expect(sanitized).not.toContain('"');
    expect(sanitized).not.toContain('/');
    expect(sanitized).not.toContain('\\');
    expect(sanitized).not.toContain('|');
    expect(sanitized).not.toContain('?');
    expect(sanitized).toMatch(/\.docx$/);
  });
});

// =============================================================================
// END-TO-END BYTES AND ENCODING WORKFLOW
// =============================================================================

describe('E2E: Bytes and Encoding', () => {
  it('should complete text encoding/decoding workflow', () => {
    const text = 'Hello, 世界! 🌍';

    // Encode to UTF-8
    const bytes = encodeToBytes(text);
    expect(bytes).toBeInstanceOf(Uint8Array);

    // Decode back
    const decoded = decodeBytes(bytes);
    expect(decoded).toBe(text);
  });

  it('should handle BOM throughout workflow', () => {
    const text = 'name,value\n测试,123';

    // Create without BOM
    const bytesNoBom = encodeToBytes(text);
    expect(hasUtf8Bom(bytesNoBom)).toBe(false);

    // Add BOM
    const BOM = new Uint8Array([0xef, 0xbb, 0xbf]);
    const bytesWithBom = concatBytes(BOM, bytesNoBom);
    expect(hasUtf8Bom(bytesWithBom)).toBe(true);

    // Decode should skip BOM
    const decoded = decodeBytes(bytesWithBom);
    expect(decoded).toBe(text);
  });

  it('should handle byte concatenation', () => {
    const chunk1 = encodeToBytes('Hello ');
    const chunk2 = encodeToBytes('World!');

    const combined = concatBytes(chunk1, chunk2);
    const decoded = decodeBytes(combined);

    expect(decoded).toBe('Hello World!');
  });
});

// =============================================================================
// END-TO-END CONVERSION PARAMS WORKFLOW
// =============================================================================

describe('E2E: Conversion Parameters', () => {
  it('should generate valid XML for conversion', () => {
    const params = createConversionParams(
      '/working/input.docx',
      '/working/output.pdf',
      '<m_bIsNoBase64>true</m_bIsNoBase64>'
    );

    expect(params).toContain('<?xml');
    expect(params).toContain('<m_sFileFrom>');
    expect(params).toContain('/working/input.docx');
    expect(params).toContain('<m_sFileTo>');
    expect(params).toContain('/working/output.pdf');
    expect(params).toContain('<m_bIsNoBase64>true</m_bIsNoBase64>');
  });

  it('should require path sanitization before creating params', () => {
    // Paths with special characters should be sanitized BEFORE passing to createConversionParams
    const unsafePath = '/working/test<file>.docx';
    const sanitizedPath = escapeXml(unsafePath);

    expect(sanitizedPath).toContain('&lt;');
    expect(sanitizedPath).toContain('&gt;');

    // Now it's safe to use in XML
    const params = createConversionParams(sanitizedPath, '/working/output.pdf');
    expect(params).toContain('&lt;');
    expect(params).toContain('&gt;');
  });
});
