/**
 * Phase 75: Deep Integration Tests
 * Tests for cross-boundary integration, async flows, and complex scenarios
 */

import { describe, expect, it } from 'vitest';
import { sanitizeFileName, getFileExtension, determineFilename } from '../url-utils';
import { encodeToBytes, decodeBytes, concatBytes, hasUtf8Bom } from '../byte-utils';
import { escapeXml, createConversionParams } from '../conversion-utils';
import { isValidRenderOfficeData, isValidChunkSequence, isValidFile } from '../type-guards';
import { formatErrorMessage, createErrorContext } from '../error-utils';
import { getDocumentType, DOCUMENT_TYPE_MAP } from '../document-utils';
import { getNewDocumentTemplate, isNewDocumentSupported } from '../document-template';
import { determineSaveFormat, hasFileExtension } from '../save-format';
import { createEditorConfig, isEditableFileType, requiresConversion } from '../editor-config';
import { createOperationQueue } from '../operation-queue';
import { updateRenderChunkState } from '../render-workflow';
import type { RenderOfficeData } from '../events';

// =============================================================================
// DOCUMENT LOADING INTEGRATION TESTS
// =============================================================================

describe('Integration: Document Loading Flow', () => {
  describe('URL to document type resolution', () => {
    it('should resolve document type from URL path', () => {
      const urls = [
        { url: 'https://example.com/documents/report.docx', expected: 'word' },
        { url: 'https://example.com/data/sales.xlsx', expected: 'cell' },
        { url: 'https://example.com/slides/presentation.pptx', expected: 'slide' },
      ];

      for (const { url, expected } of urls) {
        const filename = sanitizeFileName(url.split('/').pop() || '');
        const ext = getFileExtension(filename);
        const docType = getDocumentType(ext);

        expect(docType).toBe(expected);
      }
    });

    it('should handle PDF as view-only format', () => {
      const url = 'https://example.com/files/document.pdf';
      const filename = sanitizeFileName(url.split('/').pop() || '');
      const ext = getFileExtension(filename);
      const docType = getDocumentType(ext);

      // PDF has no document type for editing
      expect(docType).toBeNull();
      // But it's still an editable file type (view-only)
      expect(isEditableFileType(ext)).toBe(true);
    });

    it('should handle Content-Disposition header flow', () => {
      const headers = [
        'attachment; filename="document.docx"',
        'inline; filename="report.xlsx"',
        'attachment; filename*=UTF-8\'\'%E4%B8%AD%E6%96%87.docx',
      ];

      for (const header of headers) {
        const filename = determineFilename({ contentDisposition: header, url: 'https://example.com/file' });
        const ext = getFileExtension(filename);

        expect(filename).toBeTruthy();
        expect(ext).toBeTruthy();
      }
    });
  });

  describe('File validation pipeline', () => {
    it('should validate file through complete pipeline', () => {
      const testCases = [
        { filename: 'document.docx', size: 1024, maxSize: 10000, expected: true, hasDocType: true },
        { filename: 'report.xlsx', size: 5000, maxSize: 10000, expected: true, hasDocType: true },
        { filename: 'large.pptx', size: 20000, maxSize: 10000, expected: false, hasDocType: true },
        { filename: 'invalid.exe', size: 100, maxSize: 10000, expected: true, hasDocType: false },
      ];

      for (const { filename, size, maxSize, expected, hasDocType } of testCases) {
        const sanitized = sanitizeFileName(filename);
        const ext = getFileExtension(sanitized);
        const isValid = isValidFile(sanitized, size, { maxSizeBytes: maxSize });
        const docType = getDocumentType(ext);

        expect(isValid).toBe(expected);
        if (hasDocType) {
          expect(docType).toBeTruthy();
        }
      }
    });
  });
});

// =============================================================================
// CONVERSION INTEGRATION TESTS
// =============================================================================

describe('Integration: Conversion Flow', () => {
  describe('Legacy format conversion', () => {
    it('should determine conversion path for legacy formats', () => {
      const legacyFormats = [
        { ext: 'doc', target: 'docx' },
        { ext: 'xls', target: 'xlsx' },
        { ext: 'ppt', target: 'pptx' },
      ];

      for (const { ext, target } of legacyFormats) {
        const requires = requiresConversion(ext);
        const template = getNewDocumentTemplate(target);

        expect(requires).toBe(true);
        expect(template).toBeTruthy();
      }
    });

    it('should generate conversion params correctly', () => {
      const conversions = [
        { input: 'legacy.doc', output: 'modern.docx' },
        { input: 'data.xls', output: 'data.xlsx' },
        { input: 'slides.ppt', output: 'slides.pptx' },
      ];

      for (const { input, output } of conversions) {
        const params = createConversionParams(`/input/${input}`, `/output/${output}`);

        expect(params).toContain('<?xml');
        expect(params).toContain(input);
        expect(params).toContain(output);
      }
    });
  });

  describe('CSV special handling', () => {
    it('should handle CSV with BOM', () => {
      const csvWithBom = concatBytes(
        new Uint8Array([0xEF, 0xBB, 0xBF]), // UTF-8 BOM
        encodeToBytes('column1,column2\nvalue1,value2')
      );

      expect(hasUtf8Bom(csvWithBom)).toBe(true);

      const decoded = decodeBytes(csvWithBom);
      expect(decoded).toBe('column1,column2\nvalue1,value2');
    });

    it('should handle CSV save format override', () => {
      const csvFilenames = ['data.csv', 'export.CSV', 'report.Csv'];

      for (const filename of csvFilenames) {
        const hasCsv = hasFileExtension(filename, 'csv');
        const saveFormat = determineSaveFormat(256, filename);

        expect(hasCsv).toBe(true);
        expect(saveFormat).toBe('CSV');
      }
    });
  });
});

// =============================================================================
// CHUNK PROCESSING INTEGRATION TESTS
// =============================================================================

describe('Integration: Chunk Processing Flow', () => {
  const createChunk = (
    index: number,
    total: number,
    data: string,
    name: string = 'test.docx'
  ): RenderOfficeData => ({
    chunkIndex: index,
    totalChunks: total,
    data,
    name,
    size: 1000,
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    lastModified: Date.now(),
  });

  describe('Multi-chunk document assembly', () => {
    it('should process complete chunk sequence', () => {
      const totalChunks = 5;
      const chunks: RenderOfficeData[] = [];

      for (let i = 0; i < totalChunks; i++) {
        chunks.push(createChunk(i, totalChunks, `chunk-${i}-data`));
      }

      // Validate each chunk
      for (const chunk of chunks) {
        expect(isValidRenderOfficeData(chunk)).toBe(true);
      }

      // Validate sequence
      expect(isValidChunkSequence(chunks)).toBe(true);
    });

    it('should process chunks out of order', () => {
      const totalChunks = 3;
      const orderedChunks = [
        createChunk(2, totalChunks, 'chunk-2'),
        createChunk(0, totalChunks, 'chunk-0'),
        createChunk(1, totalChunks, 'chunk-1'),
      ];

      // Simulate chunk accumulation
      let state = updateRenderChunkState([], orderedChunks[0]);

      for (let i = 1; i < orderedChunks.length; i++) {
        state = updateRenderChunkState(state.chunks, orderedChunks[i]);
      }

      expect(state.status).toBe('ready');
      expect(state.chunks.length).toBe(totalChunks);
    });

    it('should handle chunk reset on mismatch', () => {
      const chunk1 = createChunk(0, 2, 'data1', 'file1.docx');
      const chunk2 = createChunk(1, 2, 'data2', 'file2.docx'); // Different file

      const state1 = updateRenderChunkState([], chunk1);
      const state2 = updateRenderChunkState(state1.chunks, chunk2);

      expect(state2.status).toBe('reset');
    });
  });
});

// =============================================================================
// ERROR HANDLING INTEGRATION TESTS
// =============================================================================

describe('Integration: Error Handling Flow', () => {
  describe('Error classification and formatting', () => {
    it('should classify and format network errors', () => {
      const errors = [
        new Error('NetworkError: fetch failed'),
        new Error('TypeError: Failed to fetch'),
        new Error('Connection timeout'),
      ];

      for (const error of errors) {
        const context = createErrorContext(error);
        const message = formatErrorMessage(error);

        expect(message).toBeTruthy();
        expect(context.name).toBe('Error');
        expect(context.message).toBeTruthy();
      }
    });

    it('should classify and format file errors', () => {
      const errors = [
        new Error('ENOENT: file not found'),
        new Error('Permission denied'),
        new Error('File too large'),
      ];

      for (const error of errors) {
        const context = createErrorContext(error);
        const message = formatErrorMessage(error);

        expect(message).toBeTruthy();
        expect(context.message).toBeTruthy();
      }
    });
  });

  describe('Error context preservation', () => {
    it('should preserve error context through handling pipeline', () => {
      const originalError = new Error('Test error');
      (originalError as Error & { code?: string }).code = 'TEST_CODE';

      const context = createErrorContext(originalError, {
        operation: 'test-operation',
        context: { filename: 'test.docx' },
      });

      expect(context.message).toBe('Test error');
      expect(context.operation).toBe('test-operation');
      expect(context.context).toEqual({ filename: 'test.docx' });
    });
  });
});

// =============================================================================
// EDITOR CONFIGURATION INTEGRATION TESTS
// =============================================================================

describe('Integration: Editor Configuration Flow', () => {
  describe('Editor type determination', () => {
    it('should determine correct editor type from document type', () => {
      const docTypes = [
        { type: 'word', editable: true },
        { type: 'cell', editable: true },
        { type: 'slide', editable: true },
      ];

      for (const { type, editable } of docTypes) {
        const extensions = Object.entries(DOCUMENT_TYPE_MAP)
          .filter(([, dt]) => dt === type)
          .map(([ext]) => ext);

        for (const ext of extensions) {
          const isEditable = isEditableFileType(ext);
          expect(isEditable).toBe(editable);
        }
      }
    });

    it('should create valid editor config', () => {
      const configs = [
        { filename: 'document.docx', fileType: 'docx', lang: 'en' },
        { filename: 'data.xlsx', fileType: 'xlsx', lang: 'en' },
        { filename: 'slides.pptx', fileType: 'pptx', lang: 'en' },
      ];

      const eventHandlers = {
        onAppReady: () => {},
        onDocumentReady: () => {},
        onSave: () => {},
        writeFile: () => {},
      };

      for (const { filename, fileType, lang } of configs) {
        const config = createEditorConfig({
          fileName: filename,
          fileType: fileType,
          lang: lang,
          events: eventHandlers,
        });

        expect(config.document.title).toBe(filename);
        expect(config.document.fileType).toBe(fileType);
        expect(config.editorConfig.lang).toBe(lang);
      }
    });
  });

  describe('Save format determination', () => {
    it('should determine save format for various formats', () => {
      const formatCodes = [
        { code: 65, expected: 'DOCX' },  // c_oAscFileType.DOCX
        { code: 257, expected: 'XLSX' }, // c_oAscFileType.XLSX
        { code: 129, expected: 'PPTX' }, // c_oAscFileType.PPTX
      ];

      for (const { code, expected } of formatCodes) {
        const format = determineSaveFormat(code);
        expect(format).toBe(expected);
      }
    });
  });
});

// =============================================================================
// BYTE OPERATIONS INTEGRATION TESTS
// =============================================================================

describe('Integration: Byte Operations Flow', () => {
  describe('Encoding/decoding round-trips', () => {
    it('should handle complex document content round-trip', () => {
      const contents = [
        'Hello World',
        'Unicode: 中文 日本語 한국어',
        'XML: <document><title>Test</title></document>',
        'Mixed: Hello 世界 🎉',
      ];

      for (const content of contents) {
        const encoded = encodeToBytes(content);
        const decoded = decodeBytes(encoded);

        expect(decoded).toBe(content);
      }
    });

    it('should handle BOM in document content', () => {
      const content = 'Document content with special chars: <>&"\'';

      // Encode with BOM
      const withBom = concatBytes(
        new Uint8Array([0xEF, 0xBB, 0xBF]),
        encodeToBytes(content)
      );

      expect(hasUtf8Bom(withBom)).toBe(true);

      // Decode should strip BOM
      const decoded = decodeBytes(withBom);
      expect(decoded).toBe(content);
    });
  });

  describe('XML parameter generation', () => {
    it('should generate valid XML for conversion', () => {
      const params = createConversionParams('/input/document.docx', '/output/document.pdf');

      expect(params).toContain('<?xml');
      expect(params).toContain('<m_sFileFrom>');
      expect(params).toContain('<m_sFileTo>');
      expect(() => escapeXml(params)).not.toThrow();
    });

    it('should handle special characters in paths', () => {
      const specialPaths = [
        { input: '/path/with spaces/doc.docx', output: '/output/result.pdf' },
        { input: '/unicode/中文/document.docx', output: '/output/结果.pdf' },
      ];

      for (const { input, output } of specialPaths) {
        const params = createConversionParams(input, output);

        expect(params).toContain(escapeXml(input));
        expect(params).toContain(escapeXml(output));
      }
    });
  });
});

// =============================================================================
// OPERATION QUEUE INTEGRATION TESTS
// =============================================================================

describe('Integration: Operation Queue Flow', () => {
  describe('Sequential operation processing', () => {
    it('should process document operations in order', async () => {
      const queue = createOperationQueue();
      const results: string[] = [];

      await queue(async () => {
        results.push('operation-1');
      });

      await queue(async () => {
        results.push('operation-2');
      });

      await queue(async () => {
        results.push('operation-3');
      });

      expect(results).toEqual(['operation-1', 'operation-2', 'operation-3']);
    });

    it('should handle async operations with results', async () => {
      const queue = createOperationQueue();

      const result1 = await queue(async () => 'result-1');
      const result2 = await queue(async () => 'result-2');

      expect(result1).toBe('result-1');
      expect(result2).toBe('result-2');
    });
  });
});

// =============================================================================
// NEW DOCUMENT CREATION INTEGRATION TESTS
// =============================================================================

describe('Integration: New Document Creation Flow', () => {
  describe('Template retrieval', () => {
    it('should retrieve correct template for document types', () => {
      const types = [
        { ext: 'docx', type: 'word' },
        { ext: 'xlsx', type: 'cell' },
        { ext: 'pptx', type: 'slide' },
      ];

      for (const { ext, type } of types) {
        const isSupported = isNewDocumentSupported(ext);
        const template = getNewDocumentTemplate(ext);
        const docType = getDocumentType(ext);

        expect(isSupported).toBe(true);
        expect(template).toBeTruthy();
        expect(docType).toBe(type);
      }
    });
  });
});
