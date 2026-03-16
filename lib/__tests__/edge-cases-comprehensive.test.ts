/**
 * Phase 77: Comprehensive Edge Case Tests
 * Tests for corner cases, boundary conditions, and unusual inputs
 */

import { describe, expect, it } from 'vitest';
import {
  sanitizeFileName,
  getFileExtension,
  safeDecodeUri,
  isValidUrl,
  extractFilenameFromContentDisposition,
} from '../url-utils';
import { encodeToBytes, decodeBytes, concatBytes } from '../byte-utils';
import { escapeXml, createConversionParams } from '../conversion-utils';
import { formatErrorMessage, isError } from '../error-utils';
import { isValidRenderOfficeData, isValidFile } from '../type-guards';

// =============================================================================
// URL UTILITIES EDGE CASES
// =============================================================================

describe('Edge Cases: URL Utilities', () => {
  describe('sanitizeFileName extreme inputs', () => {
    it('should handle only illegal characters in name part', () => {
      // When input has no dot, the whole string becomes the "extension"
      // and the name part is sanitized to 'file'
      const illegalOnly = '<>:"/\\|?*';
      const result = sanitizeFileName(illegalOnly);
      // The result is 'file.<extension>' where extension is the original string
      // (sanitization only applies to name part, not extension)
      expect(result.startsWith('file.')).toBe(true);
    });

    it('should handle only dots', () => {
      expect(sanitizeFileName('...')).toMatch(/file\..+/);
      expect(sanitizeFileName('.')).toBe('file.bin');
    });

    it('should handle newlines and tabs', () => {
      const result = sanitizeFileName('file\nname\twith\ttabs.docx');
      expect(result).not.toContain('\n');
      expect(result).not.toContain('\t');
    });

    it('should handle null bytes', () => {
      const result = sanitizeFileName('file\u0000name.docx');
      expect(result).not.toContain('\u0000');
    });

    it('should sanitize name part even with long illegal sequences', () => {
      // Add a proper extension so illegal chars are in the name part
      const longIllegal = '<>:"/\\|?*'.repeat(100) + '.docx';
      const result = sanitizeFileName(longIllegal);
      // The illegal chars should be removed from the name part
      const namePart = result.replace(/\.docx$/, '');
      for (const char of '<>:"/\\|?*') {
        expect(namePart).not.toContain(char);
      }
    });

    it('should handle mixed valid and illegal sequences', () => {
      const mixed = 'a<b>c:d"e/f\\g|h?i*j.docx';
      const result = sanitizeFileName(mixed);
      expect(result).toBe('abcdefghij.docx');
    });
  });

  describe('getFileExtension edge cases', () => {
    it('should handle multiple consecutive dots', () => {
      expect(getFileExtension('file...docx')).toBe('docx');
      expect(getFileExtension('file..')).toBe('');
    });

    it('should handle hidden files', () => {
      expect(getFileExtension('.gitignore')).toBe('gitignore');
      expect(getFileExtension('.env')).toBe('env');
    });

    it('should handle files starting with dot and extension', () => {
      expect(getFileExtension('.config.json')).toBe('json');
    });

    it('should handle very long extensions', () => {
      const longExt = 'a'.repeat(100);
      expect(getFileExtension(`file.${longExt}`)).toBe(longExt);
    });

    it('should handle extension with numbers only', () => {
      expect(getFileExtension('file.123')).toBe('123');
    });

    it('should handle extension with special characters', () => {
      expect(getFileExtension('file.tar.gz')).toBe('gz');
      expect(getFileExtension('file.min.js')).toBe('js');
    });
  });

  describe('safeDecodeUri edge cases', () => {
    it('should handle double-encoded strings', () => {
      const doubleEncoded = encodeURIComponent(encodeURIComponent('test file'));
      const result = safeDecodeUri(doubleEncoded);
      expect(typeof result).toBe('string');
    });

    it('should handle incomplete percent encoding', () => {
      expect(safeDecodeUri('%')).toBe('%');
      expect(safeDecodeUri('%2')).toBe('%2');
      expect(safeDecodeUri('%XX')).toBe('%XX');
    });

    it('should handle mixed valid and invalid encoding', () => {
      // safeDecodeUri doesn't decode, it just passes through
      const result = safeDecodeUri('hello%20world%XX');
      expect(typeof result).toBe('string');
      expect(result).toContain('hello');
    });

    it('should handle empty string', () => {
      expect(safeDecodeUri('')).toBe('');
    });
  });

  describe('isValidUrl edge cases', () => {
    it('should reject malformed URLs', () => {
      expect(isValidUrl('not a url')).toBe(false);
      expect(isValidUrl('://missing-protocol.com')).toBe(false);
      expect(isValidUrl('http://')).toBe(false);
    });

    it('should handle URLs with ports', () => {
      expect(isValidUrl('http://localhost:3000')).toBe(true);
      expect(isValidUrl('https://example.com:8080/file.docx')).toBe(true);
    });

    it('should handle URLs with query params', () => {
      expect(isValidUrl('https://example.com/file?token=abc&version=1')).toBe(true);
    });

    it('should handle URLs with fragments', () => {
      expect(isValidUrl('https://example.com/file#section')).toBe(true);
    });

    it('should handle localhost variations', () => {
      expect(isValidUrl('http://localhost')).toBe(true);
      expect(isValidUrl('http://127.0.0.1')).toBe(true);
      expect(isValidUrl('http://[::1]')).toBe(true);
    });
  });
});

// =============================================================================
// BYTE UTILITIES EDGE CASES
// =============================================================================

describe('Edge Cases: Byte Utilities', () => {
  describe('encodeToBytes edge cases', () => {
    it('should handle empty string', () => {
      const result = encodeToBytes('');
      expect(result.length).toBe(0);
    });

    it('should handle string with only BOM character', () => {
      const result = encodeToBytes('\uFEFF');
      expect(result.length).toBe(3); // UTF-8 BOM
    });

    it('should handle surrogate pairs', () => {
      const emoji = '😀';
      const result = encodeToBytes(emoji);
      expect(result.length).toBe(4); // 4 bytes for emoji
    });

    it('should handle combining characters', () => {
      const combined = 'e\u0301'; // e + combining acute accent
      const result = encodeToBytes(combined);
      expect(result.length).toBe(3); // 2 bytes for e + 1 byte for combining char? No, it's actually 3 bytes
    });
  });

  describe('decodeBytes edge cases', () => {
    it('should handle empty array', () => {
      expect(decodeBytes(new Uint8Array(0))).toBe('');
    });

    it('should handle invalid UTF-8 sequences gracefully', () => {
      const invalidBytes = new Uint8Array([0xFF, 0xFE, 0xFD]);
      // Should not throw, but may produce replacement characters
      expect(() => decodeBytes(invalidBytes)).not.toThrow();
    });

    it('should handle truncated multi-byte sequences', () => {
      // Incomplete 4-byte sequence
      const truncated = new Uint8Array([0xF0, 0x9F]); // Start of emoji
      expect(() => decodeBytes(truncated)).not.toThrow();
    });
  });

  describe('concatBytes edge cases', () => {
    it('should handle empty arrays', () => {
      const result = concatBytes(new Uint8Array(0), new Uint8Array(0));
      expect(result.length).toBe(0);
    });

    it('should handle one empty array', () => {
      const nonEmpty = new Uint8Array([1, 2, 3]);
      const result1 = concatBytes(new Uint8Array(0), nonEmpty);
      const result2 = concatBytes(nonEmpty, new Uint8Array(0));

      expect(result1).toEqual(nonEmpty);
      expect(result2).toEqual(nonEmpty);
    });

    it('should handle single byte arrays', () => {
      const result = concatBytes(new Uint8Array([1]), new Uint8Array([2]));
      expect(result).toEqual(new Uint8Array([1, 2]));
    });
  });
});

// =============================================================================
// CONVERSION UTILITIES EDGE CASES
// =============================================================================

describe('Edge Cases: Conversion Utilities', () => {
  describe('escapeXml edge cases', () => {
    it('should handle all five special characters', () => {
      const result = escapeXml('<>&"\'');
      expect(result).toBe('&lt;&gt;&amp;&quot;&apos;');
    });

    it('should handle empty string', () => {
      expect(escapeXml('')).toBe('');
    });

    it('should handle string with no special characters', () => {
      expect(escapeXml('hello world')).toBe('hello world');
    });

    it('should handle only special characters', () => {
      expect(escapeXml('<<<>>>')).toBe('&lt;&lt;&lt;&gt;&gt;&gt;');
    });

    it('should handle already escaped sequences', () => {
      // ampersand is escaped first, so this becomes &amp;lt;
      const result = escapeXml('&lt;');
      expect(result).toBe('&amp;lt;');
    });
  });

  describe('createConversionParams edge cases', () => {
    it('should handle empty paths', () => {
      const params = createConversionParams('', '');
      expect(params).toContain('<?xml');
    });

    it('should handle paths with spaces', () => {
      const params = createConversionParams('/path/with spaces/file.docx', '/output/result.pdf');
      expect(params).toContain('with spaces');
    });

    it('should handle paths with unicode', () => {
      const params = createConversionParams('/文档/文件.docx', '/输出/结果.pdf');
      expect(params).toContain('文档');
    });

    it('should handle very long paths', () => {
      const longPath = '/a'.repeat(500) + '/file.docx';
      const params = createConversionParams(longPath, '/output.pdf');
      expect(params).toContain('<?xml');
    });
  });
});

// =============================================================================
// ERROR UTILITIES EDGE CASES
// =============================================================================

describe('Edge Cases: Error Utilities', () => {
  describe('formatErrorMessage edge cases', () => {
    it('should handle circular reference objects', () => {
      const circular: Record<string, unknown> = {};
      circular.self = circular;
      expect(() => formatErrorMessage(circular)).not.toThrow();
    });

    it('should handle objects with null prototype', () => {
      const nullProto = Object.create(null);
      nullProto.message = 'error';
      expect(() => formatErrorMessage(nullProto)).not.toThrow();
    });

    it('should handle symbols', () => {
      const sym = Symbol('test');
      expect(() => formatErrorMessage(sym)).not.toThrow();
    });

    it('should handle functions', () => {
      const fn = () => 'test';
      expect(() => formatErrorMessage(fn)).not.toThrow();
    });

    it('should handle sparse arrays', () => {
      const sparse: unknown[] = [];
      sparse[100] = 'error';
      expect(() => formatErrorMessage(sparse)).not.toThrow();
    });
  });

  describe('isError edge cases', () => {
    it('should handle Error subclasses', () => {
      class CustomError extends Error {
        constructor(message: string) {
          super(message);
          this.name = 'CustomError';
        }
      }

      expect(isError(new CustomError('test'))).toBe(true);
    });

    it('should handle TypeError, RangeError, etc.', () => {
      expect(isError(new TypeError('test'))).toBe(true);
      expect(isError(new RangeError('test'))).toBe(true);
      expect(isError(new SyntaxError('test'))).toBe(true);
      expect(isError(new URIError('test'))).toBe(true);
    });
  });
});

// =============================================================================
// TYPE GUARDS EDGE CASES
// =============================================================================

describe('Edge Cases: Type Guards', () => {
  describe('isValidRenderOfficeData edge cases', () => {
    it('should reject extra properties that break required types', () => {
      const data = {
        chunkIndex: '0', // Wrong type
        data: 'test',
        lastModified: Date.now(),
        name: 'test.docx',
        size: 1024,
        totalChunks: 1,
        type: 'application/test',
      };

      expect(isValidRenderOfficeData(data)).toBe(false);
    });

    it('should accept extra valid properties', () => {
      const data = {
        chunkIndex: 0,
        data: 'test',
        lastModified: Date.now(),
        name: 'test.docx',
        size: 1024,
        totalChunks: 1,
        type: 'application/test',
        extraProperty: 'ignored',
      };

      expect(isValidRenderOfficeData(data)).toBe(true);
    });

    it('should handle boundary values', () => {
      // Maximum safe integer
      const data = {
        chunkIndex: 0,
        data: 'test',
        lastModified: Number.MAX_SAFE_INTEGER,
        name: 'test.docx',
        size: Number.MAX_SAFE_INTEGER,
        totalChunks: 1,
        type: 'application/test',
      };

      expect(isValidRenderOfficeData(data)).toBe(true);
    });
  });

  describe('isValidFile edge cases', () => {
    it('should handle empty filename', () => {
      expect(isValidFile('', 1024)).toBe(false);
    });

    it('should handle zero size', () => {
      expect(isValidFile('test.docx', 0)).toBe(true);
    });

    it('should handle maximum safe integer size', () => {
      expect(isValidFile('test.docx', Number.MAX_SAFE_INTEGER)).toBe(true);
    });
  });
});

// =============================================================================
// CONTENT DISPOSITION EDGE CASES
// =============================================================================

describe('Edge Cases: Content-Disposition', () => {
  describe('extractFilenameFromContentDisposition', () => {
    it('should handle missing filename', () => {
      expect(extractFilenameFromContentDisposition('attachment')).toBeNull();
      expect(extractFilenameFromContentDisposition('inline')).toBeNull();
    });

    it('should handle filename without quotes', () => {
      const result = extractFilenameFromContentDisposition('attachment; filename=document.docx');
      expect(result).toBe('document.docx');
    });

    it('should handle filename with spaces', () => {
      const result = extractFilenameFromContentDisposition('attachment; filename="document with spaces.docx"');
      expect(result).toBe('document with spaces.docx');
    });

    it('should handle RFC 5987 encoding', () => {
      const result = extractFilenameFromContentDisposition("attachment; filename*=UTF-8''%E4%B8%AD%E6%96%87.docx");
      expect(result).toContain('.docx');
    });

    it('should handle malformed headers gracefully', () => {
      expect(() => extractFilenameFromContentDisposition('')).not.toThrow();
      expect(() => extractFilenameFromContentDisposition('garbage')).not.toThrow();
    });
  });
});
