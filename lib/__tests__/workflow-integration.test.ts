/**
 * Additional workflow integration tests for document processing pipelines.
 */
import { describe, expect, it } from 'vitest';
import {
  sanitizeFileName,
  getFileExtension,
  getMimeType,
  isSupportedExtension,
  isValidUrl,
  safeDecodeUri,
} from '../url-utils';
import { getDocumentType, DOCUMENT_TYPE_MAP } from '../document-utils';
import { requiresConversion, getConversionTarget, isEditableFileType } from '../editor-config';
import { isNewDocumentSupported, getNewDocumentTemplate } from '../document-template';
import { determineSaveFormat, getSaveFormatOverride, hasFileExtension } from '../save-format';
import { oAscFileType } from '../file-types';

// =============================================================================
// DOCUMENT LOADING WORKFLOW INTEGRATION
// =============================================================================

describe('Workflow: Document Loading Integration', () => {
  describe('URL to document type pipeline', () => {
    it('should process valid document URLs', () => {
      const urls = [
        'https://example.com/document.docx',
        'https://example.com/spreadsheet.xlsx',
        'https://example.com/presentation.pptx',
        'https://example.com/data.csv',
        'https://example.com/report.pdf',
      ];

      for (const url of urls) {
        expect(isValidUrl(url)).toBe(true);

        const filename = url.split('/').pop()!;
        const ext = getFileExtension(filename);
        const docType = getDocumentType(ext);

        expect(ext).toBeDefined();
        expect(docType).toBeDefined();
      }
    });

    it('should handle encoded URLs', () => {
      const encodedUrl = 'https://example.com/docs/%E6%96%87%E6%A1%A3.docx';
      expect(isValidUrl(encodedUrl)).toBe(true);

      const decodedUrl = safeDecodeUri(encodedUrl);
      expect(decodedUrl).toContain('文档');
    });
  });

  describe('Extension to editor workflow', () => {
    it('should map extensions to editor types', () => {
      const mappings = [
        { ext: 'docx', editor: 'word', conversion: false },
        { ext: 'xlsx', editor: 'cell', conversion: false },
        { ext: 'pptx', editor: 'slide', conversion: false },
        { ext: 'doc', editor: 'word', conversion: true },
        { ext: 'xls', editor: 'cell', conversion: true },
        { ext: 'ppt', editor: 'slide', conversion: true },
        { ext: 'odt', editor: 'word', conversion: true },
        { ext: 'ods', editor: 'cell', conversion: true },
        { ext: 'odp', editor: 'slide', conversion: true },
      ];

      for (const { ext, editor, conversion } of mappings) {
        expect(getDocumentType(ext)).toBe(editor);
        expect(requiresConversion(ext)).toBe(conversion);

        if (conversion) {
          expect(getConversionTarget(ext)).toBeDefined();
        }
      }
    });
  });

  describe('Format support validation', () => {
    it('should validate supported formats consistently', () => {
      // These formats are supported for editing (not including PDF which is view-only)
      const supportedFormats = ['docx', 'xlsx', 'pptx', 'doc', 'xls', 'ppt', 'odt', 'ods', 'odp', 'rtf', 'txt', 'csv'];

      for (const ext of supportedFormats) {
        expect(isSupportedExtension(ext)).toBe(true);
        expect(isEditableFileType(ext)).toBe(true);
      }

      // PDF is editable as view-only
      expect(isEditableFileType('pdf')).toBe(true);
    });
  });
});

// =============================================================================
// NEW DOCUMENT CREATION WORKFLOW INTEGRATION
// =============================================================================

describe('Workflow: New Document Creation Integration', () => {
  describe('Template availability workflow', () => {
    it('should have templates for supported formats', () => {
      const supportedFormats = ['docx', 'xlsx', 'pptx'];

      for (const ext of supportedFormats) {
        expect(isNewDocumentSupported(ext)).toBe(true);
        expect(getNewDocumentTemplate(ext)).toBeDefined();
      }
    });

    it('should not have templates for unsupported formats', () => {
      const unsupportedFormats = ['doc', 'xls', 'ppt', 'pdf', 'csv'];

      for (const ext of unsupportedFormats) {
        expect(isNewDocumentSupported(ext)).toBe(false);
        expect(getNewDocumentTemplate(ext)).toBeUndefined();
      }
    });
  });

  describe('New document to save workflow', () => {
    it('should create saveable documents', () => {
      const formats = [
        { ext: 'docx', saveCode: oAscFileType.DOCX },
        { ext: 'xlsx', saveCode: oAscFileType.XLSX },
        { ext: 'pptx', saveCode: oAscFileType.PPTX },
      ];

      for (const { ext, saveCode } of formats) {
        const saveFormat = determineSaveFormat(saveCode, `document.${ext}`);
        expect(saveFormat?.toLowerCase()).toBe(ext);

        const mimeType = getMimeType(ext);
        expect(mimeType).toBeDefined();
      }
    });
  });
});

// =============================================================================
// DOCUMENT CONVERSION WORKFLOW INTEGRATION
// =============================================================================

describe('Workflow: Document Conversion Integration', () => {
  describe('Conversion decision workflow', () => {
    it('should identify conversion requirements', () => {
      const directEditFormats = ['docx', 'xlsx', 'pptx', 'pdf'];
      const conversionFormats = ['doc', 'xls', 'ppt', 'odt', 'ods', 'odp', 'rtf', 'txt', 'csv'];

      for (const ext of directEditFormats) {
        expect(requiresConversion(ext)).toBe(false);
      }

      for (const ext of conversionFormats) {
        expect(requiresConversion(ext)).toBe(true);
        expect(getConversionTarget(ext)).toBeDefined();
      }
    });
  });

  describe('Conversion target workflow', () => {
    it('should target correct OOXML formats', () => {
      const conversions = [
        { source: 'doc', target: 'docx' },
        { source: 'xls', target: 'xlsx' },
        { source: 'ppt', target: 'pptx' },
        { source: 'odt', target: 'docx' },
        { source: 'ods', target: 'xlsx' },
        { source: 'odp', target: 'pptx' },
        { source: 'rtf', target: 'docx' },
        { source: 'txt', target: 'docx' },
        { source: 'csv', target: 'xlsx' },
      ];

      for (const { source, target } of conversions) {
        expect(getConversionTarget(source)).toBe(target);
      }
    });
  });
});

// =============================================================================
// SAVE WORKFLOW INTEGRATION
// =============================================================================

describe('Workflow: Save Document Integration', () => {
  describe('Save format determination', () => {
    it('should determine correct save formats', () => {
      const formats = [
        { code: oAscFileType.DOCX, filename: 'doc.docx', expected: 'docx' },
        { code: oAscFileType.XLSX, filename: 'sheet.xlsx', expected: 'xlsx' },
        { code: oAscFileType.PPTX, filename: 'pres.pptx', expected: 'pptx' },
        { code: oAscFileType.PDF, filename: 'report.pdf', expected: 'pdf' },
      ];

      for (const { code, filename, expected } of formats) {
        const saveFormat = determineSaveFormat(code, filename);
        expect(saveFormat?.toLowerCase()).toBe(expected);
      }
    });

    it('should apply CSV override correctly', () => {
      const override = getSaveFormatOverride('data.csv');
      expect(override?.toLowerCase()).toBe('csv');

      const saveFormat = determineSaveFormat(oAscFileType.XLSX, 'data.csv');
      expect(saveFormat?.toLowerCase()).toBe('csv');
    });
  });

  describe('Extension detection for save', () => {
    it('should detect extensions correctly', () => {
      const files = [
        { filename: 'document.docx', ext: 'docx' },
        { filename: 'spreadsheet.XLSX', ext: 'xlsx' },
        { filename: 'presentation.pptx', ext: 'pptx' },
        { filename: 'data.csv', ext: 'csv' },
      ];

      for (const { filename, ext } of files) {
        expect(hasFileExtension(filename, ext)).toBe(true);
      }
    });
  });
});

// =============================================================================
// MIME TYPE WORKFLOW INTEGRATION
// =============================================================================

describe('Workflow: MIME Type Integration', () => {
  describe('Extension to MIME type pipeline', () => {
    it('should map extensions to MIME types', () => {
      const mappings = [
        { ext: 'docx', mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
        { ext: 'xlsx', mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
        { ext: 'pptx', mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' },
        { ext: 'pdf', mime: 'application/pdf' },
        { ext: 'csv', mime: 'text/csv' },
        { ext: 'txt', mime: 'text/plain' },
      ];

      for (const { ext, mime } of mappings) {
        expect(getMimeType(ext)).toBe(mime);
      }
    });
  });

  describe('MIME type consistency', () => {
    it('should have MIME types for all supported formats', () => {
      for (const ext of Object.keys(DOCUMENT_TYPE_MAP)) {
        const mime = getMimeType(ext);
        expect(mime).toBeDefined();
        expect(mime).not.toBe('application/octet-stream');
      }
    });
  });
});

// =============================================================================
// FILENAME PROCESSING WORKFLOW INTEGRATION
// =============================================================================

describe('Workflow: Filename Processing Integration', () => {
  describe('Sanitization pipeline', () => {
    it('should sanitize filenames while preserving extensions', () => {
      const filenames = [
        { input: 'document.docx', expected: 'document.docx' },
        { input: 'file<>:"name.docx', expected: 'filename.docx' },
        { input: '测试文档.xlsx', expected: '测试文档.xlsx' },
        { input: 'report.pdf', expected: 'report.pdf' },
      ];

      for (const { input, expected } of filenames) {
        const sanitized = sanitizeFileName(input);
        expect(sanitized).toBe(expected);
      }
    });

    it('should preserve extension after sanitization', () => {
      const inputs = [
        'file<>name.docx',
        'test<>file.xlsx',
        'data<>file.csv',
      ];

      for (const input of inputs) {
        const sanitized = sanitizeFileName(input);
        const ext = getFileExtension(sanitized);
        const originalExt = getFileExtension(input);

        expect(ext).toBe(originalExt);
      }
    });
  });

  describe('Extension extraction pipeline', () => {
    it('should extract extensions consistently', () => {
      const cases = [
        { filename: 'document.docx', ext: 'docx' },
        { filename: 'DOCUMENT.DOCX', ext: 'docx' },
        { filename: 'multi.part.name.xlsx', ext: 'xlsx' },
        { filename: 'noextension', ext: '' },
        { filename: '.hidden', ext: 'hidden' },
      ];

      for (const { filename, ext } of cases) {
        expect(getFileExtension(filename)).toBe(ext);
      }
    });
  });
});

// =============================================================================
// CROSS-FORMAT WORKFLOW INTEGRATION
// =============================================================================

describe('Workflow: Cross-Format Integration', () => {
  describe('Format family consistency', () => {
    it('should have consistent mappings within document family', () => {
      const docFormats = ['docx', 'doc', 'odt', 'rtf', 'txt'];

      for (const ext of docFormats) {
        expect(getDocumentType(ext)).toBe('word');
      }
    });

    it('should have consistent mappings within spreadsheet family', () => {
      const sheetFormats = ['xlsx', 'xls', 'ods', 'csv'];

      for (const ext of sheetFormats) {
        expect(getDocumentType(ext)).toBe('cell');
      }
    });

    it('should have consistent mappings within presentation family', () => {
      const presFormats = ['pptx', 'ppt', 'odp'];

      for (const ext of presFormats) {
        expect(getDocumentType(ext)).toBe('slide');
      }
    });
  });

  describe('Conversion target consistency', () => {
    it('should convert legacy formats to correct OOXML targets', () => {
      // Documents
      expect(getConversionTarget('doc')).toBe('docx');
      expect(getConversionTarget('odt')).toBe('docx');
      expect(getConversionTarget('rtf')).toBe('docx');
      expect(getConversionTarget('txt')).toBe('docx');

      // Spreadsheets
      expect(getConversionTarget('xls')).toBe('xlsx');
      expect(getConversionTarget('ods')).toBe('xlsx');
      expect(getConversionTarget('csv')).toBe('xlsx');

      // Presentations
      expect(getConversionTarget('ppt')).toBe('pptx');
      expect(getConversionTarget('odp')).toBe('pptx');
    });
  });
});

// =============================================================================
// URL PROCESSING WORKFLOW INTEGRATION
// =============================================================================

describe('Workflow: URL Processing Integration', () => {
  describe('URL validation pipeline', () => {
    it('should validate various URL types', () => {
      const validUrls = [
        'https://example.com/document.docx',
        'http://localhost:3000/file.xlsx',
        'ftp://ftp.example.com/pub/file.pptx',
        'file:///home/user/document.pdf',
      ];

      for (const url of validUrls) {
        expect(isValidUrl(url)).toBe(true);
      }
    });

    it('should reject invalid URLs', () => {
      const invalidUrls = [
        'not-a-url',
        '://missing-protocol.com',
        'http://',
      ];

      for (const url of invalidUrls) {
        expect(isValidUrl(url)).toBe(false);
      }
    });
  });

  describe('URL decoding pipeline', () => {
    it('should handle encoded URLs', () => {
      const cases = [
        { encoded: 'test%20file.docx', decoded: 'test file.docx' },
        { encoded: '%E4%B8%AD%E6%96%87.docx', decoded: '中文.docx' },
      ];

      for (const { encoded, decoded } of cases) {
        expect(safeDecodeUri(encoded)).toBe(decoded);
      }
    });

    it('should handle malformed encoding gracefully', () => {
      const malformed = '%ZZ';
      const result = safeDecodeUri(malformed);
      expect(typeof result).toBe('string');
    });
  });
});
