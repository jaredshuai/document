/**
 * Phase 67: Documentation Example Tests
 *
 * These tests verify that the examples in JSDoc comments work correctly.
 * This ensures documentation stays up-to-date with actual behavior.
 */

import { describe, it, expect } from 'vitest';
import {
  extractFilenameFromContentDisposition,
  determineFilename,
  safeDecodeUri,
  getFileExtension,
  isSupportedExtension,
  isValidUrl,
  sanitizeFileName,
  normalizeLanguage,
} from '../url-utils';
import {
  createConversionParams,
  escapeXml,
  createOutputFilename,
} from '../conversion-utils';
import {
  getDocumentType,
  getMimeTypeFromExtension,
} from '../document-utils';
import {
  createFilePickerType,
  createSavePickerOptions,
  createOpenPickerOptions,
} from '../file-picker';
import {
  isEditableFileType,
  requiresConversion,
  getConversionTarget,
} from '../editor-config';

describe('URL Utils Documentation Examples', () => {
  describe('extractFilenameFromContentDisposition', () => {
    it('should work with example from docs', () => {
      const header = 'attachment; filename="document.docx"';
      expect(extractFilenameFromContentDisposition(header)).toBe('document.docx');
    });
  });

  describe('determineFilename', () => {
    it('should prioritize provided filename', () => {
      const result = determineFilename({
        fileName: 'my-file.docx',
        contentDisposition: 'attachment; filename="other.docx"',
        url: 'https://example.com/another.docx',
      });
      expect(result).toBe('my-file.docx');
    });

    it('should use Content-Disposition when no filename provided', () => {
      const result = determineFilename({
        contentDisposition: 'attachment; filename="from-header.xlsx"',
      });
      expect(result).toBe('from-header.xlsx');
    });

    it('should extract from URL as fallback', () => {
      const result = determineFilename({
        url: 'https://example.com/path/to/file.pptx',
      });
      expect(result).toBe('file.pptx');
    });
  });

  describe('safeDecodeUri', () => {
    it('should decode valid URI encoding', () => {
      expect(safeDecodeUri('hello%20world')).toBe('hello world');
      expect(safeDecodeUri('%E6%96%87%E6%A1%A3')).toBe('文档');
    });

    it('should return original if decoding fails', () => {
      expect(safeDecodeUri('%ZZ')).toBe('%ZZ');
    });
  });

  describe('getFileExtension', () => {
    it('should return extension without dot', () => {
      expect(getFileExtension('document.docx')).toBe('docx');
      expect(getFileExtension('spreadsheet.xlsx')).toBe('xlsx');
    });
  });

  describe('isSupportedExtension', () => {
    it('should return true for supported extensions', () => {
      expect(isSupportedExtension('docx')).toBe(true);
      expect(isSupportedExtension('xlsx')).toBe(true);
      expect(isSupportedExtension('pptx')).toBe(true);
    });

    it('should return false for unsupported extensions', () => {
      expect(isSupportedExtension('pdf')).toBe(false);
      expect(isSupportedExtension('png')).toBe(false);
    });
  });

  describe('sanitizeFileName', () => {
    it('should remove illegal characters', () => {
      const result = sanitizeFileName('file<name>.docx');
      expect(result).not.toContain('<');
      expect(result).toContain('.docx');
    });

    it('should provide default for empty input', () => {
      expect(sanitizeFileName('')).toBe('file.bin');
    });
  });

  describe('normalizeLanguage', () => {
    it('should normalize language codes', () => {
      expect(normalizeLanguage('en')).toBe('en');
      expect(normalizeLanguage('en-US')).toBe('en');
      expect(normalizeLanguage('zh')).toBe('zh');
      expect(normalizeLanguage('zh-CN')).toBe('zh');
    });

    it('should return null for unsupported languages', () => {
      expect(normalizeLanguage('fr')).toBe(null);
    });
  });
});

describe('Conversion Utils Documentation Examples', () => {
  describe('createConversionParams', () => {
    it('should create valid XML', () => {
      const params = createConversionParams('/input.docx', '/output.pdf');
      expect(params).toContain('<?xml');
      expect(params).toContain('<m_sFileFrom>/input.docx</m_sFileFrom>');
      expect(params).toContain('<m_sFileTo>/output.pdf</m_sFileTo>');
    });
  });

  describe('escapeXml', () => {
    it('should escape special characters', () => {
      expect(escapeXml('<')).toBe('&lt;');
      expect(escapeXml('>')).toBe('&gt;');
      expect(escapeXml('&')).toBe('&amp;');
      expect(escapeXml('"')).toBe('&quot;');
      expect(escapeXml("'")).toBe('&apos;');
    });
  });

  describe('createOutputFilename', () => {
    it('should create filename with extension', () => {
      expect(createOutputFilename('document', 'pdf')).toBe('document.pdf');
    });
  });
});

describe('Document Utils Documentation Examples', () => {
  describe('getDocumentType', () => {
    it('should return correct types', () => {
      expect(getDocumentType('docx')).toBe('word');
      expect(getDocumentType('xlsx')).toBe('cell');
      expect(getDocumentType('pptx')).toBe('slide');
      expect(getDocumentType('odt')).toBe('word');
    });

    it('should return null for unsupported types', () => {
      expect(getDocumentType('pdf')).toBeNull();
    });
  });

  describe('getMimeTypeFromExtension', () => {
    it('should return MIME types for images', () => {
      expect(getMimeTypeFromExtension('.png')).toBe('image/png');
      expect(getMimeTypeFromExtension('.jpg')).toBe('image/jpeg');
    });
  });
});

describe('File Picker Documentation Examples', () => {
  describe('createFilePickerType', () => {
    it('should create type for docx', () => {
      const type = createFilePickerType('docx');
      expect(type.description).toBe('Word Document');
      expect(type.accept).toHaveProperty('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    });
  });

  describe('createSavePickerOptions', () => {
    it('should create options with suggested name', () => {
      const options = createSavePickerOptions('document.docx');
      expect(options.suggestedName).toBe('document.docx');
      expect(options.types).toHaveLength(1);
    });
  });

  describe('createOpenPickerOptions', () => {
    it('should create options with multiple extensions', () => {
      const options = createOpenPickerOptions(['docx', 'xlsx']);
      expect(options.types).toHaveLength(2);
      expect(options.multiple).toBe(false);
    });
  });
});

describe('Editor Config Documentation Examples', () => {
  describe('isEditableFileType', () => {
    it('should return true for editable types', () => {
      expect(isEditableFileType('docx')).toBe(true);
      expect(isEditableFileType('pdf')).toBe(true); // Viewable
    });

    it('should return false for non-editable types', () => {
      expect(isEditableFileType('exe')).toBe(false);
    });
  });

  describe('requiresConversion', () => {
    it('should return false for OOXML formats', () => {
      expect(requiresConversion('docx')).toBe(false);
      expect(requiresConversion('xlsx')).toBe(false);
      expect(requiresConversion('pptx')).toBe(false);
    });

    it('should return true for legacy formats', () => {
      expect(requiresConversion('doc')).toBe(true);
      expect(requiresConversion('xls')).toBe(true);
    });
  });

  describe('getConversionTarget', () => {
    it('should return target format for conversion', () => {
      expect(getConversionTarget('doc')).toBe('docx');
      expect(getConversionTarget('xls')).toBe('xlsx');
      expect(getConversionTarget('ppt')).toBe('pptx');
    });
  });
});

describe('Integration: Example Workflows from Docs', () => {
  it('should demonstrate complete document loading workflow', () => {
    // 1. Parse URL to get document URL
    const queryString = { file: 'https://example.com/document.docx' };
    const url = queryString.file || null;
    expect(url).toBe('https://example.com/document.docx');

    // 2. Validate URL
    expect(isValidUrl(url!)).toBe(true);

    // 3. Extract filename from URL
    const filename = determineFilename({ url: url! });
    expect(filename).toBe('document.docx');

    // 4. Sanitize filename
    const sanitized = sanitizeFileName(filename);
    expect(sanitized).toBe('document.docx');

    // 5. Get file extension
    const ext = getFileExtension(sanitized);
    expect(ext).toBe('docx');

    // 6. Check if supported
    expect(isSupportedExtension(ext)).toBe(true);

    // 7. Get document type
    const docType = getDocumentType(ext);
    expect(docType).toBe('word');
  });

  it('should demonstrate file type detection workflow', () => {
    // From file extension
    const ext = getFileExtension('file.xlsx');
    const docType = getDocumentType(ext);

    expect(ext).toBe('xlsx');
    expect(docType).toBe('cell');
  });
});