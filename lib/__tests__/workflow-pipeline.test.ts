/**
 * Phase 91: Advanced Workflow Pipeline Tests
 *
 * Tests comprehensive document processing pipelines that span multiple modules
 * and verify real-world workflow scenarios.
 */

import { describe, it, expect } from 'vitest';
import {
  determineFilename,
  getFileExtension,
  isSupportedExtension,
  sanitizeFileName,
  getMimeType,
  getFileDescription,
  extractDocumentUrl,
  safeDecodeUri,
  isValidUrl,
  extractFilenameFromContentDisposition,
} from '../url-utils';
import {
  getDocumentType,
  getMimeTypeFromExtension,
} from '../document-utils';
import {
  createConversionParams,
  escapeXml,
  createOutputFilename,
} from '../conversion-utils';
import {
  isValidRenderOfficeData,
  isValidChunkSequence,
  isValidFile,
} from '../type-guards';
import type { RenderOfficeData } from '../events';
import {
  formatErrorMessage,
  isError,
  isErrorLike,
  isNetworkError,
  isFileError,
  createErrorContext,
  safeAsync,
} from '../error-utils';
import {
  isNewDocumentSupported,
  getNewDocumentTemplate,
  requireNewDocumentTemplate,
} from '../document-template';
import {
  determineSaveFormat,
  getSaveFormatOverride,
  hasFileExtension,
} from '../save-format';
import {
  isPresentationType,
  getEditorCleanupDelay,
  EDITOR_DELAYS,
} from '../editor-utils';
import {
  createEditorConfig,
  isEditableFileType,
  requiresConversion,
  getConversionTarget,
} from '../editor-config';
import { createOperationQueue, isQueueTimeoutError, DEFAULT_QUEUE_TIMEOUT } from '../operation-queue';
import {
  createFilePickerType,
  createSavePickerOptions,
  createOpenPickerOptions,
  getSupportedEditExtensions,
  getFileInputAccept,
} from '../file-picker';
import {
  createConversionPaths,
  getParamsPath,
  getWorkingPath,
  extractFileName,
  WORKING_DIR,
  MEDIA_DIR,
  FONTS_DIR,
  THEMES_DIR,
} from '../conversion-paths';
import {
  validateWriteFileData,
  createMediaUrlKey,
  isValidUint8Array,
  isValidFileName,
} from '../media-url';
import {
  updateRenderChunkState,
  hasMatchingRenderChunkMetadata,
  sortRenderChunks,
} from '../render-workflow';
import {
  encodeToBytes,
  decodeBytes,
  hasUtf8Bom,
  addUtf8Bom,
  concatBytes,
  UTF8_BOM,
} from '../byte-utils';

describe('Phase 91: Advanced Workflow Pipeline Tests', () => {
  describe('Document Loading Pipeline Workflow', () => {
    it('should process URL document loading workflow end-to-end', () => {
      // Step 1: Extract URL from query parameters
      const queryParams = { file: 'https://example.com/documents/report%202024.docx' };
      const documentUrl = extractDocumentUrl(queryParams);
      expect(documentUrl).toBe('https://example.com/documents/report%202024.docx');

      // Step 2: Validate URL
      expect(isValidUrl(documentUrl!)).toBe(true);

      // Step 3: Safe decode URI
      const decodedUrl = safeDecodeUri(documentUrl!);
      expect(decodedUrl).toBe('https://example.com/documents/report 2024.docx');

      // Step 4: Extract filename from URL (URL-encoded)
      const filename = determineFilename({ url: documentUrl! });
      expect(filename).toBe('report%202024.docx'); // URL-encoded

      // Step 5: Get file extension
      const extension = getFileExtension(filename);
      expect(extension).toBe('docx');

      // Step 6: Validate supported extension
      expect(isSupportedExtension(extension)).toBe(true);

      // Step 7: Get document type
      const docType = getDocumentType(extension);
      expect(docType).toBe('word');

      // Step 8: Get MIME type
      const mimeType = getMimeType(extension);
      expect(mimeType).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document');

      // Step 9: Check if editable
      expect(isEditableFileType(extension)).toBe(true);

      // Step 10: Check if requires conversion
      expect(requiresConversion(extension)).toBe(false);
    });

    it('should process Content-Disposition header workflow', () => {
      // Simulate Content-Disposition header from HTTP response
      const contentDisposition = 'attachment; filename="Financial Report (2024).xlsx"';
      const url = 'https://example.com/download/file?id=123';

      // Step 1: Extract filename from Content-Disposition
      const filenameFromHeader = extractFilenameFromContentDisposition(contentDisposition);
      expect(filenameFromHeader).toBe('Financial Report (2024).xlsx');

      // Step 2: Determine filename (Content-Disposition takes priority)
      const finalFilename = determineFilename({ contentDisposition, url });
      expect(finalFilename).toBe('Financial Report (2024).xlsx');

      // Step 3: Sanitize filename
      const sanitized = sanitizeFileName(finalFilename);
      expect(sanitized).toBe('Financial Report (2024).xlsx');

      // Step 4: Get document type
      const extension = getFileExtension(sanitized);
      expect(extension).toBe('xlsx');
      expect(getDocumentType(extension)).toBe('cell');
    });

    it('should handle legacy format conversion workflow', () => {
      // Legacy .doc file needs conversion to .docx
      const filename = 'legacy-document.doc';
      const extension = getFileExtension(filename);

      // Step 1: Check supported
      expect(isSupportedExtension(extension)).toBe(true);

      // Step 2: Get document type
      const docType = getDocumentType(extension);
      expect(docType).toBe('word');

      // Step 3: Check if requires conversion
      expect(requiresConversion(extension)).toBe(true);

      // Step 4: Get conversion target
      const targetExtension = getConversionTarget(extension);
      expect(targetExtension).toBe('docx');

      // Step 5: Create conversion paths - note: output is inputPath.targetExtension
      const paths = createConversionPaths(filename, targetExtension);
      expect(paths.inputPath).toContain('legacy-document.doc');
      expect(paths.outputPath).toMatch(/legacy-document\.doc\.docx$/);

      // Step 6: Create conversion params
      const params = createConversionParams(paths.inputPath, paths.outputPath);
      expect(params).toContain('<m_sFileFrom>');
      expect(params).toContain('<m_sFileTo>');
    });

    it('should handle CSV special conversion workflow', () => {
      const filename = 'data-export.csv';
      const extension = getFileExtension(filename);

      // Step 1: Check document type
      expect(getDocumentType(extension)).toBe('cell');

      // Step 2: Check conversion requirement
      expect(requiresConversion(extension)).toBe(true);

      // Step 3: Get conversion target
      const targetExtension = getConversionTarget(extension);
      expect(targetExtension).toBe('xlsx');

      // Step 4: Create conversion paths
      const paths = createConversionPaths(filename, targetExtension);
      expect(paths.outputPath).toContain('.xlsx');

      // Step 5: CSV has special handling - check MIME type
      const mimeType = getMimeType(extension);
      expect(mimeType).toBe('text/csv');
    });
  });

  describe('New Document Creation Workflow', () => {
    it('should process new document creation workflow for each supported type', () => {
      const supportedTypes = ['docx', 'xlsx', 'pptx'];

      for (const fileType of supportedTypes) {
        // Step 1: Check if new document is supported
        expect(isNewDocumentSupported(fileType)).toBe(true);

        // Step 2: Get template
        const template = getNewDocumentTemplate(fileType);
        expect(template).toBeDefined();
        expect(template!.length).toBeGreaterThan(0);

        // Step 3: Get document type
        const docType = getDocumentType(fileType);
        expect(['word', 'cell', 'slide']).toContain(docType);

        // Step 4: Get MIME type
        const mimeType = getMimeType(fileType);
        expect(mimeType).toBeDefined();

        // Step 5: Check editable
        expect(isEditableFileType(fileType)).toBe(true);

        // Step 6: Check conversion requirement
        expect(requiresConversion(fileType)).toBe(false);
      }
    });

    it('should reject new document creation for unsupported types', () => {
      const unsupportedTypes = ['doc', 'xls', 'ppt', 'pdf', 'txt'];

      for (const fileType of unsupportedTypes) {
        expect(isNewDocumentSupported(fileType)).toBe(false);
        expect(getNewDocumentTemplate(fileType)).toBeUndefined();
        expect(() => requireNewDocumentTemplate(fileType)).toThrow();
      }
    });

    it('should create proper document template workflow', () => {
      const fileType = 'docx';

      // Step 1: Get template
      const template = requireNewDocumentTemplate(fileType);
      expect(typeof template).toBe('string');
      expect(template.length).toBeGreaterThan(0);

      // Step 2: Create editor config
      const config = createEditorConfig({
        fileName: 'new-doc.docx',
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
    });
  });

  describe('Save Format Determination Workflow', () => {
    it('should determine save format for modern Office files', () => {
      const testCases = [
        { originalFileName: 'document.docx', formatCode: 65, expected: 'DOCX' },
        { originalFileName: 'spreadsheet.xlsx', formatCode: 257, expected: 'XLSX' },
        { originalFileName: 'presentation.pptx', formatCode: 129, expected: 'PPTX' },
      ];

      for (const { originalFileName, formatCode, expected } of testCases) {
        const saveFormat = determineSaveFormat(formatCode, originalFileName);
        expect(saveFormat).toBe(expected);
      }
    });

    it('should handle CSV override workflow', () => {
      const originalFileName = 'data.csv';
      const formatCode = 257; // XLSX format code

      // Step 1: Check for save format override
      const override = getSaveFormatOverride(originalFileName);
      expect(override).toBe('CSV'); // Returns uppercase

      // Step 2: Has file extension check
      expect(hasFileExtension(originalFileName, 'csv')).toBe(true);

      // Step 3: Determine save format with override
      const saveFormat = determineSaveFormat(formatCode, originalFileName);
      expect(saveFormat).toBe('CSV'); // Override takes effect
    });

    it('should handle legacy format save workflow', () => {
      const legacyFiles = [
        { name: 'old-doc.doc', expectedType: 'word' },
        { name: 'old-xls.xls', expectedType: 'cell' },
        { name: 'old-ppt.ppt', expectedType: 'slide' },
      ];

      for (const { name, expectedType } of legacyFiles) {
        const extension = getFileExtension(name);
        const docType = getDocumentType(extension);
        expect(docType).toBe(expectedType);
      }
    });
  });

  describe('Editor Configuration Workflow', () => {
    it('should create complete editor configuration workflow', () => {
      const fileName = 'document.docx';
      const fileType = 'docx';
      const lang = 'en';
      const events = {
        onAppReady: () => {},
        onDocumentReady: () => {},
        onSave: () => {},
        writeFile: () => {},
      };

      // Step 1: Create editor config
      const config = createEditorConfig({ fileName, fileType, lang, events });

      // Step 2: Verify document configuration
      expect(config.document.title).toBe(fileName);
      expect(config.document.fileType).toBe('docx');
      expect(config.document.permissions.edit).toBe(true);

      // Step 3: Verify editor configuration
      expect(config.editorConfig.lang).toBe('en');
      expect(config.editorConfig.customization.help).toBe(false);
    });

    it('should calculate editor cleanup delay workflow', () => {
      const testCases = [
        { fileType: 'pptx', hasExistingEditor: true, expectedDelay: EDITOR_DELAYS.PRESENTATION_SWITCH },
        { fileType: 'pptx', hasExistingEditor: false, expectedDelay: EDITOR_DELAYS.NEW_EDITOR },
        { fileType: 'docx', hasExistingEditor: true, expectedDelay: EDITOR_DELAYS.STANDARD_SWITCH },
        { fileType: 'xlsx', hasExistingEditor: false, expectedDelay: EDITOR_DELAYS.NEW_EDITOR },
      ];

      for (const { fileType, hasExistingEditor, expectedDelay } of testCases) {
        expect(isPresentationType(fileType)).toBe(fileType === 'pptx');
        const delay = getEditorCleanupDelay(fileType, hasExistingEditor);
        expect(delay).toBe(expectedDelay);
      }
    });
  });

  describe('File Picker Options Workflow', () => {
    it('should create save picker options workflow', () => {
      const fileName = 'report.xlsx';
      const mimeType = getMimeType('xlsx');

      // Step 1: Create file picker type
      const pickerType = createFilePickerType('xlsx', mimeType);
      expect(pickerType.accept).toBeDefined();
      expect(pickerType.accept[mimeType]).toContain('.xlsx');

      // Step 2: Create save picker options
      const options = createSavePickerOptions(fileName, mimeType);
      expect(options.suggestedName).toBe(fileName);
      expect(options.types).toHaveLength(1);
    });

    it('should create open picker options workflow', () => {
      const extensions = ['docx', 'xlsx', 'pptx'];

      // Step 1: Get supported edit extensions
      const supportedExtensions = getSupportedEditExtensions();
      expect(supportedExtensions.length).toBeGreaterThan(0);

      // Step 2: Create open picker options
      const options = createOpenPickerOptions(extensions);
      expect(options.types).toBeDefined();
      expect(options.multiple).toBe(false); // default is false

      // Step 3: Get file input accept string
      const acceptString = getFileInputAccept();
      expect(acceptString).toContain('.docx');
      expect(acceptString).toContain('.xlsx');
      expect(acceptString).toContain('.pptx');
    });
  });

  describe('Conversion Paths Workflow', () => {
    it('should create complete conversion paths workflow', () => {
      const fileName = 'document.docx';
      const targetExtension = 'pdf';

      // Step 1: Create conversion paths
      const paths = createConversionPaths(fileName, targetExtension);
      expect(paths.inputPath).toContain(WORKING_DIR);
      expect(paths.inputPath).toContain(fileName);
      expect(paths.outputPath).toContain('.pdf');

      // Step 2: Get params path
      const paramsPath = getParamsPath();
      expect(paramsPath).toContain('params.xml');

      // Step 3: Get working path
      const workingPath = getWorkingPath(fileName);
      expect(workingPath).toContain(WORKING_DIR);

      // Step 4: Extract filename from path
      const extractedName = extractFileName(paths.inputPath);
      expect(extractedName).toBe(fileName);
    });

    it('should use correct directory constants', () => {
      expect(WORKING_DIR).toBe('/working');
      expect(MEDIA_DIR).toBe('/working/media');
      expect(FONTS_DIR).toBe('/working/fonts');
      expect(THEMES_DIR).toBe('/working/themes');
    });
  });

  describe('Media URL Workflow', () => {
    it('should validate and process media URL workflow', () => {
      const fileName = 'image.png';
      const data = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]); // PNG header

      // Step 1: Validate file name
      expect(isValidFileName(fileName)).toBe(true);

      // Step 2: Validate Uint8Array
      expect(isValidUint8Array(data)).toBe(true);

      // Step 3: Validate write file data
      const result = validateWriteFileData(data, fileName);
      expect(result.isValid).toBe(true);
      if (result.isValid) {
        expect(result.fileExtension).toBe('png');
        expect(result.mimeType).toBe('image/png');
      }

      // Step 4: Create media URL key
      const key = createMediaUrlKey(fileName);
      expect(key).toBe('media/image.png');
    });

    it('should reject invalid media URL data', () => {
      expect(isValidFileName('')).toBe(false);
      expect(isValidFileName(null as unknown as string)).toBe(false);
      expect(isValidUint8Array(null as unknown as Uint8Array)).toBe(false);
      expect(isValidUint8Array(new Uint8Array(0))).toBe(false);
      // validateWriteFileData checks for Uint8Array instance but not length
      expect(validateWriteFileData(null, 'test.png').isValid).toBe(false);
      expect(validateWriteFileData(new Uint8Array([1, 2, 3]), '').isValid).toBe(false);
      expect(validateWriteFileData('not-array', 'test.png').isValid).toBe(false);
    });
  });

  describe('Render Workflow Pipeline', () => {
    const createChunk = (index: number, total: number, name = 'document.pdf'): RenderOfficeData => ({
      chunkIndex: index,
      data: 'base64data',
      lastModified: 1234567890,
      name,
      size: 1024,
      totalChunks: total,
      type: 'application/pdf',
    });

    it('should process chunk accumulation workflow', () => {
      // Step 1: Start with empty chunks
      let chunks: RenderOfficeData[] = [];

      // Step 2: Accumulate chunks
      const result1 = updateRenderChunkState(chunks, createChunk(0, 3));
      expect(result1.status).toBe('waiting');
      expect(result1.receivedChunks).toBe(1);

      chunks = result1.chunks;
      const result2 = updateRenderChunkState(chunks, createChunk(1, 3));
      expect(result2.status).toBe('waiting');
      expect(result2.receivedChunks).toBe(2);

      chunks = result2.chunks;
      const result3 = updateRenderChunkState(chunks, createChunk(2, 3));
      expect(result3.status).toBe('ready');
      expect(result3.chunks).toHaveLength(3);
    });

    it('should detect metadata mismatch in chunk workflow', () => {
      // Start with first chunk
      const chunks: RenderOfficeData[] = [createChunk(0, 2, 'doc1.pdf')];

      // Try to add chunk with different metadata
      const result = updateRenderChunkState(chunks, createChunk(1, 2, 'doc2.pdf'));

      expect(result.status).toBe('reset');
      if (result.status === 'reset') {
        expect(result.reason).toBe('metadata-mismatch');
      }
    });

    it('should sort chunks by sequence', () => {
      const chunks = [
        createChunk(2, 3),
        createChunk(0, 3),
        createChunk(1, 3),
      ];

      const sorted = sortRenderChunks(chunks);
      expect(sorted[0].chunkIndex).toBe(0);
      expect(sorted[1].chunkIndex).toBe(1);
      expect(sorted[2].chunkIndex).toBe(2);
    });

    it('should check metadata matching', () => {
      const chunk1 = createChunk(0, 3);
      const chunk2 = createChunk(1, 3);
      const chunk3 = createChunk(0, 3, 'different.pdf');

      expect(hasMatchingRenderChunkMetadata(chunk1, chunk2)).toBe(true);
      expect(hasMatchingRenderChunkMetadata(chunk1, chunk3)).toBe(false);
    });
  });

  describe('Byte Utilities Workflow', () => {
    it('should process text encoding workflow', () => {
      const text = 'Hello, World! 你好世界';

      // Step 1: Encode text to bytes
      const encoded = encodeToBytes(text);
      expect(encoded).toBeInstanceOf(Uint8Array);
      expect(encoded.length).toBeGreaterThan(0);

      // Step 2: Check for BOM (not added by default)
      expect(hasUtf8Bom(encoded)).toBe(false);

      // Step 3: Add BOM
      const withBom = addUtf8Bom(encoded);
      expect(hasUtf8Bom(withBom)).toBe(true);

      // Step 4: Decode back to text
      const decoded = decodeBytes(withBom);
      expect(decoded).toBe(text);
    });

    it('should process byte concatenation workflow', () => {
      const chunk1 = new Uint8Array([1, 2, 3]);
      const chunk2 = new Uint8Array([4, 5, 6]);
      const chunk3 = new Uint8Array([7, 8, 9]);

      // Step 1: Concatenate bytes
      const combined = concatBytes(chunk1, chunk2, chunk3);
      expect(combined).toHaveLength(9);
      expect(combined).toEqual(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9]));

      // Step 2: Empty array handling
      const single = concatBytes(chunk1);
      expect(single).toEqual(chunk1);
    });

    it('should handle BOM in text files workflow', () => {
      // Simulate CSV file with BOM
      const csvContent = 'Name,Email,Phone\nJohn,john@example.com,123-456-7890';
      const csvWithBom = addUtf8Bom(encodeToBytes(csvContent));

      // Step 1: Check BOM presence
      expect(hasUtf8Bom(csvWithBom)).toBe(true);

      // Step 2: Decode (should handle BOM correctly)
      const decoded = decodeBytes(csvWithBom);
      expect(decoded).toBe(csvContent);

      // Step 3: UTF8_BOM constant
      expect(UTF8_BOM).toEqual(new Uint8Array([0xef, 0xbb, 0xbf]));
    });
  });

  describe('Error Handling Workflow', () => {
    it('should process error classification workflow', () => {
      // Step 1: Create various error types
      const networkError = new Error('Network request failed');
      (networkError as unknown as Record<string, unknown>).code = 'ENOTFOUND';

      const fileError = new Error('File not found');
      (fileError as unknown as Record<string, unknown>).code = 'ENOENT';

      const genericError = new Error('Something went wrong');

      // Step 2: Classify errors
      expect(isError(networkError)).toBe(true);
      expect(isErrorLike(networkError)).toBe(true);
      expect(isNetworkError(networkError)).toBe(true);
      expect(isFileError(networkError)).toBe(false);

      expect(isFileError(fileError)).toBe(true);
      expect(isNetworkError(fileError)).toBe(false);

      expect(isNetworkError(genericError)).toBe(false);
      expect(isFileError(genericError)).toBe(false);
    });

    it('should format error messages in workflow', () => {
      const error1 = new Error('Test error message');
      const error2 = { message: 'Error-like object' };
      const error3 = 'String error';

      // Step 1: Format error messages
      expect(formatErrorMessage(error1)).toBe('Test error message');
      expect(formatErrorMessage(error2)).toBe('Error-like object');
      expect(formatErrorMessage(error3)).toBe('String error');

      // Step 2: Fallback handling
      expect(formatErrorMessage(null, 'Default message')).toBe('Default message');
      expect(formatErrorMessage(undefined, 'Default message')).toBe('Default message');
    });

    it('should create error context in workflow', () => {
      const error = new Error('Conversion failed');

      // Step 1: Create error context
      const context = createErrorContext(error, {
        operation: 'document-conversion',
        context: { fileName: 'document.doc' },
      });

      expect(context.message).toBe('Conversion failed');
      expect(context.operation).toBe('document-conversion');
      expect(context.context).toEqual({ fileName: 'document.doc' });
      expect(context.timestamp).toBeDefined();
    });

    it('should handle safe async operations in workflow', async () => {
      // Step 1: Successful operation
      const [result1, error1] = await safeAsync(async () => 'success');
      expect(result1).toBe('success');
      expect(error1).toBeNull();

      // Step 2: Failed operation
      const [result2, error2] = await safeAsync(async () => {
        throw new Error('Operation failed');
      });
      expect(result2).toBeNull();
      expect(error2).toBeDefined();
      expect(error2?.message).toBe('Operation failed');
    });
  });

  describe('Type Guards Validation Workflow', () => {
    it('should validate RenderOfficeData in workflow', () => {
      const validData = {
        chunkIndex: 0,
        data: 'base64data',
        lastModified: Date.now(),
        name: 'document.pdf',
        size: 1024,
        totalChunks: 1,
        type: 'application/pdf',
      };

      const invalidData = {
        chunkIndex: 0,
        data: 123, // should be string
        lastModified: Date.now(),
        name: 'document.pdf',
        size: 1024,
        totalChunks: 1,
        type: 'application/pdf',
      };

      // Step 1: Validate RenderOfficeData
      expect(isValidRenderOfficeData(validData)).toBe(true);
      expect(isValidRenderOfficeData(invalidData)).toBe(false);
      expect(isValidRenderOfficeData(null)).toBe(false);
      expect(isValidRenderOfficeData({})).toBe(false);
    });

    it('should validate chunk sequence in workflow', () => {
      const createChunk = (index: number, total: number) => ({
        chunkIndex: index,
        data: 'base64data',
        lastModified: Date.now(),
        name: 'document.pdf',
        size: 1024,
        totalChunks: total,
        type: 'application/pdf',
      });

      const validChunks = [
        createChunk(0, 3),
        createChunk(1, 3),
        createChunk(2, 3),
      ];

      const invalidChunks = [
        createChunk(0, 3),
        createChunk(1, 3), // missing chunk 2
      ];

      // Step 1: Validate chunk sequences
      expect(isValidChunkSequence(validChunks)).toBe(true);
      expect(isValidChunkSequence(invalidChunks)).toBe(false);
      expect(isValidChunkSequence([])).toBe(false);
      expect(isValidChunkSequence(null as unknown as RenderOfficeData[])).toBe(false);
    });

    it('should validate file in workflow', () => {
      // Step 1: Validate files
      expect(isValidFile('document.pdf', 1024)).toBe(true);
      expect(isValidFile('', -1)).toBe(false);
      expect(isValidFile('large.pdf', Number.MAX_SAFE_INTEGER)).toBe(true); // size is valid, just large
      expect(isValidFile('', 0)).toBe(false); // empty name
      expect(isValidFile('test.docx', -5)).toBe(false); // negative size
    });
  });

  describe('Operation Queue Workflow', () => {
    it('should process operations sequentially in workflow', async () => {
      const queue = createOperationQueue({ timeout: DEFAULT_QUEUE_TIMEOUT });
      const results: number[] = [];

      // Step 1: Queue operations
      const op1 = queue(async () => {
        results.push(1);
        return 'result1';
      });

      const op2 = queue(async () => {
        results.push(2);
        return 'result2';
      });

      const op3 = queue(async () => {
        results.push(3);
        return 'result3';
      });

      // Step 2: Wait for all to complete
      const [r1, r2, r3] = await Promise.all([op1, op2, op3]);

      // Step 3: Verify results
      expect(r1).toBe('result1');
      expect(r2).toBe('result2');
      expect(r3).toBe('result3');
      expect(results).toEqual([1, 2, 3]);
    });

    it('should detect queue timeout errors', () => {
      const timeoutError = new Error('Operation queue timeout');
      const otherError = new Error('Other error');

      expect(isQueueTimeoutError(timeoutError)).toBe(true);
      expect(isQueueTimeoutError(otherError)).toBe(false);
      expect(isQueueTimeoutError(null)).toBe(false);
      expect(isQueueTimeoutError('string')).toBe(false);
    });
  });

  describe('XML Conversion Params Workflow', () => {
    it('should create valid XML conversion params in workflow', () => {
      const inputPath = '/working/document.doc';
      const outputPath = '/working/document.docx';

      // Step 1: Create conversion params
      const params = createConversionParams(inputPath, outputPath);

      // Step 2: Verify XML structure
      expect(params).toContain('<?xml');
      expect(params).toContain('<m_sFileFrom>');
      expect(params).toContain(inputPath);
      expect(params).toContain('<m_sFileTo>');
      expect(params).toContain(outputPath);

      // Step 3: Additional params as string
      const additionalXml = '<m_nFormatFrom>65</m_nFormatFrom>\n<m_nFormatTo>128</m_nFormatTo>';
      const paramsWithAdditional = createConversionParams(inputPath, outputPath, additionalXml);
      expect(paramsWithAdditional).toContain('m_nFormatFrom');
      expect(paramsWithAdditional).toContain('m_nFormatTo');
    });

    it('should escape XML special characters in workflow', () => {
      const testCases = [
        { input: 'Hello & World', expected: 'Hello &amp; World' },
        { input: 'A < B', expected: 'A &lt; B' },
        { input: 'B > A', expected: 'B &gt; A' },
        { input: 'Quote "test"', expected: 'Quote &quot;test&quot;' },
        { input: "Apostrophe 'test'", expected: "Apostrophe &apos;test&apos;" },
      ];

      for (const { input, expected } of testCases) {
        expect(escapeXml(input)).toBe(expected);
      }

      // Step 2: Verify all special chars are escaped
      const allSpecial = escapeXml('& < > " \'');
      expect(allSpecial).toBe('&amp; &lt; &gt; &quot; &apos;');
    });

    it('should create output filename in workflow', () => {
      const testCases = [
        { base: 'document', extension: 'docx', expected: 'document.docx' },
        { base: 'report.xlsx', extension: 'pdf', expected: 'report.xlsx.pdf' },
        { base: 'presentation', extension: 'pptx', expected: 'presentation.pptx' },
      ];

      for (const { base, extension, expected } of testCases) {
        expect(createOutputFilename(base, extension)).toBe(expected);
      }
    });
  });

  describe('Cross-Module Consistency Workflow', () => {
    it('should maintain MIME type consistency across modules', () => {
      const extensions = ['docx', 'xlsx', 'pptx', 'pdf', 'csv'];

      for (const ext of extensions) {
        // Step 1: Get MIME type from url-utils
        const mimeType1 = getMimeType(ext);

        // Step 2: Get MIME type from document-utils
        const mimeType2 = getMimeTypeFromExtension(ext);

        // Step 3: Both should match
        expect(mimeType1).toBe(mimeType2);
      }
    });

    it('should maintain document type consistency for supported formats', () => {
      const extensions = {
        docx: 'word', doc: 'word',
        xlsx: 'cell', xls: 'cell', csv: 'cell',
        pptx: 'slide', ppt: 'slide',
      };

      for (const [ext, expectedType] of Object.entries(extensions)) {
        // Step 1: Get document type
        const docType = getDocumentType(ext);

        // Step 2: Verify consistency
        expect(docType).toBe(expectedType);
      }
    });

    it('should maintain file description consistency', () => {
      const descriptions: Record<string, string> = {
        docx: 'Word Document',
        xlsx: 'Excel Workbook',
        pptx: 'PowerPoint Presentation',
        pdf: 'PDF Document',
        csv: 'CSV File',
      };

      for (const [ext, expectedDescription] of Object.entries(descriptions)) {
        const description = getFileDescription(ext);
        expect(description).toBe(expectedDescription);
      }
    });
  });
});