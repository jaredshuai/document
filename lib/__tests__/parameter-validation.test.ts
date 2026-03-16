/**
 * Phase 63: Parameter Validation Tests
 *
 * These tests verify that functions handle invalid, missing, and edge-case
 * parameters correctly, ensuring robust defensive programming.
 */

import { describe, it, expect } from 'vitest';
import {
  sanitizeFileName,
  getFileExtension,
  getMimeType,
  isSupportedExtension,
  isValidUrl,
  safeDecodeUri,
  determineFilename,
  extractFileType,
  getFileDescription,
  normalizeLanguage,
} from '../url-utils';
import {
  decodeBytes,
  concatBytes,
  hasUtf8Bom,
  isEmptyOrWhitespace,
} from '../byte-utils';
import {
  createConversionParams,
  escapeXml,
  createOutputFilename,
} from '../conversion-utils';
import {
  isNewDocumentSupported,
  getNewDocumentTemplate,
  requireNewDocumentTemplate,
} from '../document-template';
import {
  getDocumentType,
} from '../document-utils';
import {
  hasFileExtension,
} from '../save-format';
import {
  isValidRenderOfficeData,
  isValidChunkSequence,
} from '../type-guards';

describe('Parameter Validation - String Functions', () => {
  describe('sanitizeFileName', () => {
    it('should handle null/undefined input by returning default', () => {
      expect(sanitizeFileName(null as any)).toBe('file.bin');
      expect(sanitizeFileName(undefined as any)).toBe('file.bin');
    });

    it('should handle empty string by returning default', () => {
      expect(sanitizeFileName('')).toBe('file.bin');
      expect(sanitizeFileName('   ')).toBe('file.bin');
    });

    it('should handle non-string input by returning default', () => {
      expect(sanitizeFileName(123 as any)).toBe('file.bin');
      expect(sanitizeFileName({} as any)).toBe('file.bin');
      expect(sanitizeFileName([] as any)).toBe('file.bin');
    });

    it('should truncate very long strings', () => {
      const longString = 'a'.repeat(10000) + '.docx'; // Add extension
      const result = sanitizeFileName(longString);
      // Result should be truncated (200 chars + .docx = 205 total)
      expect(result.length).toBe(205);
      expect(result.endsWith('.docx')).toBe(true);
    });
  });

  describe('getFileExtension', () => {
    it('should handle empty string', () => {
      expect(getFileExtension('')).toBe('');
    });

    it('should handle files without extension', () => {
      expect(getFileExtension('filename')).toBe('');
      expect(getFileExtension('no-extension')).toBe('');
    });

    it('should extract extension correctly', () => {
      expect(getFileExtension('file.docx')).toBe('docx');
      expect(getFileExtension('FILE.XLSX')).toBe('xlsx');
    });
  });

  describe('getMimeType', () => {
    it('should return octet-stream for empty string', () => {
      expect(getMimeType('')).toBe('application/octet-stream');
    });

    it('should return octet-stream for unknown extensions', () => {
      expect(getMimeType('xyz')).toBe('application/octet-stream');
      expect(getMimeType('unknown')).toBe('application/octet-stream');
    });

    it('should return correct MIME for known extensions', () => {
      expect(getMimeType('docx')).toContain('wordprocessingml');
      expect(getMimeType('xlsx')).toContain('spreadsheetml');
    });
  });

  describe('isSupportedExtension', () => {
    it('should return false for empty string', () => {
      expect(isSupportedExtension('')).toBe(false);
    });

    it('should handle extensions with leading dot', () => {
      // Note: isSupportedExtension expects extension WITHOUT dot
      expect(isSupportedExtension('.docx')).toBe(false);
      expect(isSupportedExtension('docx')).toBe(true);
    });

    it('should return true for supported extensions', () => {
      expect(isSupportedExtension('docx')).toBe(true);
      expect(isSupportedExtension('xlsx')).toBe(true);
      expect(isSupportedExtension('pptx')).toBe(true);
    });
  });

  describe('isValidUrl', () => {
    it('should return false for empty string', () => {
      expect(isValidUrl('')).toBe(false);
    });

    it('should return false for malformed URLs', () => {
      expect(isValidUrl('not a url')).toBe(false);
      expect(isValidUrl('://missing-protocol')).toBe(false);
    });

    it('should return true for valid URLs', () => {
      expect(isValidUrl('https://example.com')).toBe(true);
      expect(isValidUrl('data:text/plain,Hello')).toBe(true);
    });
  });

  describe('safeDecodeUri', () => {
    it('should handle empty string', () => {
      expect(safeDecodeUri('')).toBe('');
    });

    it('should handle malformed encoding gracefully', () => {
      expect(safeDecodeUri('%')).toBe('%');
      expect(safeDecodeUri('%%')).toBe('%%');
      expect(safeDecodeUri('%ZZ')).toBe('%ZZ');
    });

    it('should decode valid encoding', () => {
      expect(safeDecodeUri('hello%20world')).toBe('hello world');
    });
  });

  describe('normalizeLanguage', () => {
    it('should return null for null/undefined input', () => {
      expect(normalizeLanguage(null)).toBe(null);
      expect(normalizeLanguage(undefined as any)).toBe(null);
    });

    it('should return null for empty string', () => {
      expect(normalizeLanguage('')).toBe(null);
    });

    it('should return null for unsupported languages', () => {
      expect(normalizeLanguage('fr')).toBe(null);
      expect(normalizeLanguage('de')).toBe(null);
    });

    it('should normalize supported languages', () => {
      expect(normalizeLanguage('en')).toBe('en');
      expect(normalizeLanguage('en-US')).toBe('en');
      expect(normalizeLanguage('zh')).toBe('zh');
      expect(normalizeLanguage('zh-CN')).toBe('zh');
    });
  });
});

describe('Parameter Validation - File Functions', () => {
  describe('determineFilename', () => {
    it('should return default for all missing parameters', () => {
      expect(determineFilename({})).toBe('document');
    });

    it('should return default for null parameters', () => {
      expect(determineFilename({
        fileName: null,
        contentDisposition: null,
        url: null,
      } as any)).toBe('document');
    });

    it('should prioritize fileName over other sources', () => {
      expect(determineFilename({
        fileName: 'my-file.docx',
        contentDisposition: 'attachment; filename="other.docx"',
        url: 'https://example.com/another.docx',
      })).toBe('my-file.docx');
    });
  });

  describe('extractFileType', () => {
    it('should return empty string for missing parameters', () => {
      expect(extractFileType()).toBe('');
      expect(extractFileType(undefined, undefined)).toBe('');
    });

    it('should prefer MIME type over filename', () => {
      expect(extractFileType('application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'file.xlsx')).toBe('docx');
    });

    it('should fall back to filename when MIME unknown', () => {
      expect(extractFileType('application/unknown', 'file.docx')).toBe('docx');
    });
  });

  describe('getFileDescription', () => {
    it('should return default for empty string', () => {
      expect(getFileDescription('')).toBe('Document');
    });

    it('should return default for unknown extensions', () => {
      expect(getFileDescription('xyz')).toBe('Document');
    });

    it('should return correct description for known extensions', () => {
      expect(getFileDescription('docx')).toBe('Word Document');
      expect(getFileDescription('xlsx')).toBe('Excel Workbook');
    });
  });
});

describe('Parameter Validation - Byte Functions', () => {
  describe('decodeBytes', () => {
    it('should handle empty array', () => {
      expect(decodeBytes(new Uint8Array([]))).toBe('');
    });
  });

  describe('concatBytes', () => {
    it('should handle no arguments', () => {
      expect(concatBytes()).toBeInstanceOf(Uint8Array);
      expect(concatBytes().length).toBe(0);
    });

    it('should handle empty arrays', () => {
      const empty = new Uint8Array([]);
      expect(concatBytes(empty, empty).length).toBe(0);
    });

    it('should concatenate correctly', () => {
      const a = new Uint8Array([1, 2]);
      const b = new Uint8Array([3, 4]);
      const result = concatBytes(a, b);
      expect(Array.from(result)).toEqual([1, 2, 3, 4]);
    });
  });

  describe('hasUtf8Bom', () => {
    it('should return false for short arrays', () => {
      expect(hasUtf8Bom(new Uint8Array([]))).toBe(false);
      expect(hasUtf8Bom(new Uint8Array([1]))).toBe(false);
      expect(hasUtf8Bom(new Uint8Array([1, 2]))).toBe(false);
    });

    it('should detect BOM correctly', () => {
      expect(hasUtf8Bom(new Uint8Array([0xEF, 0xBB, 0xBF]))).toBe(true);
      expect(hasUtf8Bom(new Uint8Array([0xEF, 0xBB, 0xBF, 0x41]))).toBe(true);
    });
  });

  describe('isEmptyOrWhitespace', () => {
    it('should return true for empty array', () => {
      expect(isEmptyOrWhitespace(new Uint8Array([]))).toBe(true);
    });

    it('should return true for whitespace only', () => {
      expect(isEmptyOrWhitespace(new Uint8Array([32, 9, 10, 13]))).toBe(true);
    });
  });
});

describe('Parameter Validation - Conversion Functions', () => {
  describe('createConversionParams', () => {
    it('should handle empty strings', () => {
      expect(() => createConversionParams('', '')).not.toThrow();
      const params = createConversionParams('', '');
      expect(params).toContain('<m_sFileFrom></m_sFileFrom>');
      expect(params).toContain('<m_sFileTo></m_sFileTo>');
    });

    it('should handle special characters in paths', () => {
      const params = createConversionParams('/path/with spaces/file.docx', '/output/file.pdf');
      expect(params).toContain('/path/with spaces/file.docx');
    });
  });

  describe('escapeXml', () => {
    it('should handle empty string', () => {
      expect(escapeXml('')).toBe('');
    });

    it('should escape special characters', () => {
      expect(escapeXml('<')).toBe('&lt;');
      expect(escapeXml('>')).toBe('&gt;');
      expect(escapeXml('&')).toBe('&amp;');
      expect(escapeXml('"')).toBe('&quot;');
    });
  });

  describe('createOutputFilename', () => {
    it('should create filename with base and extension', () => {
      expect(createOutputFilename('document', 'docx')).toBe('document.docx');
    });
  });
});

describe('Parameter Validation - Document Template Functions', () => {
  describe('isNewDocumentSupported', () => {
    it('should return false for null/undefined input', () => {
      expect(isNewDocumentSupported(null as any)).toBe(false);
      expect(isNewDocumentSupported(undefined as any)).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(isNewDocumentSupported('')).toBe(false);
    });

    it('should handle extension with/without dot', () => {
      expect(isNewDocumentSupported('docx')).toBe(true);
      expect(isNewDocumentSupported('.docx')).toBe(true);
    });
  });

  describe('getNewDocumentTemplate', () => {
    it('should return undefined for empty string', () => {
      expect(getNewDocumentTemplate('')).toBeUndefined();
    });

    it('should return undefined for unsupported types', () => {
      expect(getNewDocumentTemplate('pdf')).toBeUndefined();
      expect(getNewDocumentTemplate('xyz')).toBeUndefined();
    });

    it('should return template for supported types', () => {
      expect(typeof getNewDocumentTemplate('docx')).toBe('string');
    });
  });

  describe('requireNewDocumentTemplate', () => {
    it('should throw for empty string', () => {
      expect(() => requireNewDocumentTemplate('')).toThrow();
    });

    it('should throw for unsupported types', () => {
      expect(() => requireNewDocumentTemplate('pdf')).toThrow();
      expect(() => requireNewDocumentTemplate('xyz')).toThrow();
    });

    it('should return template for supported types', () => {
      expect(typeof requireNewDocumentTemplate('docx')).toBe('string');
    });
  });
});

describe('Parameter Validation - Document Type Functions', () => {
  describe('getDocumentType', () => {
    it('should return null for empty string', () => {
      expect(getDocumentType('')).toBeNull();
    });

    it('should return null for unknown extensions', () => {
      expect(getDocumentType('xyz')).toBeNull();
      expect(getDocumentType('unknown')).toBeNull();
    });

    it('should return correct type for known extensions', () => {
      expect(getDocumentType('docx')).toBe('word');
      expect(getDocumentType('xlsx')).toBe('cell');
      expect(getDocumentType('pptx')).toBe('slide');
    });
  });
});

describe('Parameter Validation - Save Format Functions', () => {
  describe('hasFileExtension', () => {
    it('should return false for empty filename', () => {
      expect(hasFileExtension('', 'docx')).toBe(false);
    });

    it('should detect extension correctly', () => {
      expect(hasFileExtension('file.docx', 'docx')).toBe(true);
      expect(hasFileExtension('file.xlsx', 'docx')).toBe(false);
    });
  });
});

describe('Parameter Validation - Type Guards', () => {
  describe('isValidRenderOfficeData', () => {
    it('should return false for null/undefined input', () => {
      expect(isValidRenderOfficeData(null as any)).toBe(false);
      expect(isValidRenderOfficeData(undefined as any)).toBe(false);
    });

    it('should return false for incomplete objects', () => {
      expect(isValidRenderOfficeData({})).toBe(false);
      expect(isValidRenderOfficeData({ name: 'test' })).toBe(false);
    });

    it('should return true for valid data', () => {
      expect(isValidRenderOfficeData({
        chunkIndex: 0,
        data: 'test',
        lastModified: Date.now(),
        name: 'test.docx',
        size: 100,
        totalChunks: 1,
        type: 'docx',
      })).toBe(true);
    });
  });

  describe('isValidChunkSequence', () => {
    it('should return false for empty array', () => {
      expect(isValidChunkSequence([])).toBe(false);
    });

    it('should validate complete sequence', () => {
      const chunks = [
        { chunkIndex: 0, data: 'a', lastModified: 1, name: 't.docx', size: 1, totalChunks: 2, type: 'docx' },
        { chunkIndex: 1, data: 'b', lastModified: 1, name: 't.docx', size: 1, totalChunks: 2, type: 'docx' },
      ];
      expect(isValidChunkSequence(chunks)).toBe(true);
    });
  });
});

describe('Parameter Validation - Edge Cases', () => {
  it('should handle very long filenames', () => {
    const longName = 'a'.repeat(10000) + '.docx';
    const result = sanitizeFileName(longName);
    expect(result.length).toBeLessThan(longName.length);
  });

  it('should handle unicode in filename', () => {
    expect(() => sanitizeFileName('file🎉.docx')).not.toThrow();
    expect(() => sanitizeFileName('文件.docx')).not.toThrow();
  });

  it('should handle control characters', () => {
    const withControl = 'file\x00\x01\x02.docx';
    const result = sanitizeFileName(withControl);
    expect(result).not.toContain('\x00');
    expect(result).not.toContain('\x01');
  });

  it('should handle whitespace-only input', () => {
    expect(sanitizeFileName('   ')).toBe('file.bin');
    expect(getFileExtension('   ')).toBe('');
  });
});