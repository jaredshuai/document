/**
 * Phase 74: Extended Fuzz Testing
 * More extensive random input testing, mutation-based fuzzing, and boundary fuzzing
 */

import { describe, expect, it } from 'vitest';
import {
  getFileExtension,
  safeDecodeUri,
  sanitizeFileName,
  getMimeType,
  isValidUrl,
  extractFilenameFromContentDisposition,
} from '../url-utils';
import { encodeToBytes, decodeBytes } from '../byte-utils';
import { escapeXml } from '../conversion-utils';

// =============================================================================
// FUZZ HELPERS
// =============================================================================

// Generate random ASCII string
function randomAscii(length: number): string {
  let result = '';
  for (let i = 0; i < length; i++) {
    result += String.fromCharCode(32 + Math.floor(Math.random() * 95));
  }
  return result;
}

// Generate random unicode string (including emoji, CJK, etc.)
function randomUnicode(length: number): string {
  let result = '';
  for (let i = 0; i < length; i++) {
    const ranges = [
      [0x0020, 0x007F], // Basic Latin
      [0x00A0, 0x00FF], // Latin-1 Supplement
      [0x0100, 0x017F], // Latin Extended-A
      [0x4E00, 0x4FFF], // CJK
      [0x3040, 0x309F], // Hiragana
      [0x1F600, 0x1F64F], // Emoticons
    ];
    const [start, end] = ranges[Math.floor(Math.random() * ranges.length)];
    result += String.fromCodePoint(start + Math.floor(Math.random() * (end - start)));
  }
  return result;
}

// Generate random filename with extension
function randomFilename(): string {
  const extensions = ['docx', 'xlsx', 'pptx', 'pdf', 'txt', 'csv', 'doc', 'xls', 'ppt', 'odt', ''];
  const name = randomAscii(5 + Math.floor(Math.random() * 20));
  const ext = extensions[Math.floor(Math.random() * extensions.length)];
  return ext ? `${name}.${ext}` : name;
}

// =============================================================================
// RANDOM INPUT FUZZ TESTS
// =============================================================================

describe('Fuzz: Random Input Tests', () => {
  describe('sanitizeFileName random inputs', () => {
    it('should never crash with random ASCII strings', () => {
      for (let i = 0; i < 1000; i++) {
        const input = randomAscii(1 + Math.floor(Math.random() * 100));
        expect(() => sanitizeFileName(input)).not.toThrow();
      }
    });

    it('should never crash with random Unicode strings', () => {
      for (let i = 0; i < 1000; i++) {
        const input = randomUnicode(1 + Math.floor(Math.random() * 50));
        expect(() => sanitizeFileName(input)).not.toThrow();
      }
    });

    it('should always return a non-empty string for non-empty input', () => {
      for (let i = 0; i < 500; i++) {
        const input = randomAscii(10);
        const result = sanitizeFileName(input);
        expect(result.length).toBeGreaterThan(0);
      }
    });

    it('should remove all illegal characters from name part', () => {
      const illegalChars = '<>:"/\\|?*';
      for (let i = 0; i < 500; i++) {
        // Include a known extension so illegal chars are in the name part
        const validName = 'validname';
        const illegalChar = illegalChars[Math.floor(Math.random() * illegalChars.length)];
        const input = `${validName}${illegalChar}${validName}.docx`;
        const result = sanitizeFileName(input);
        // Check the name part (before the extension)
        const namePart = result.replace(/\.docx$/, '');
        for (const char of illegalChars) {
          expect(namePart).not.toContain(char);
        }
      }
    });
  });

  describe('getFileExtension random inputs', () => {
    it('should never crash with random strings', () => {
      for (let i = 0; i < 1000; i++) {
        const input = randomAscii(1 + Math.floor(Math.random() * 100));
        expect(() => getFileExtension(input)).not.toThrow();
      }
    });

    it('should always return a string', () => {
      for (let i = 0; i < 500; i++) {
        const input = randomFilename();
        const result = getFileExtension(input);
        expect(typeof result).toBe('string');
      }
    });

    it('should extract correct extension for known formats', () => {
      const extensions = ['docx', 'xlsx', 'pptx', 'pdf', 'txt'];
      for (const ext of extensions) {
        for (let i = 0; i < 100; i++) {
          const name = randomAscii(10);
          const filename = `${name}.${ext}`;
          expect(getFileExtension(filename)).toBe(ext);
        }
      }
    });
  });

  describe('safeDecodeUri random inputs', () => {
    it('should never crash with random strings', () => {
      for (let i = 0; i < 1000; i++) {
        const input = randomAscii(1 + Math.floor(Math.random() * 100));
        expect(() => safeDecodeUri(input)).not.toThrow();
      }
    });

    it('should always return a string', () => {
      for (let i = 0; i < 500; i++) {
        const input = randomAscii(50);
        const result = safeDecodeUri(input);
        expect(typeof result).toBe('string');
      }
    });

    it('should handle partially encoded strings', () => {
      for (let i = 0; i < 200; i++) {
        const input = 'test%20' + randomAscii(10) + '%XX' + randomAscii(5);
        expect(() => safeDecodeUri(input)).not.toThrow();
      }
    });
  });

  describe('getMimeType random inputs', () => {
    it('should never crash with random extensions', () => {
      for (let i = 0; i < 1000; i++) {
        const ext = randomAscii(3 + Math.floor(Math.random() * 10));
        expect(() => getMimeType(ext)).not.toThrow();
      }
    });

    it('should always return a string', () => {
      for (let i = 0; i < 500; i++) {
        const ext = randomAscii(5);
        const result = getMimeType(ext);
        expect(typeof result).toBe('string');
      }
    });
  });
});

// =============================================================================
// MUTATION-BASED FUZZ TESTS
// =============================================================================

describe('Fuzz: Mutation-Based Tests', () => {
  describe('String mutation tests', () => {
    const baseStrings = [
      'document.docx',
      'report_final_v2.xlsx',
      'presentation (copy).pptx',
      'data-export-2024-01.csv',
    ];

    it('should handle string insertions', () => {
      for (const base of baseStrings) {
        for (let i = 0; i < 100; i++) {
          const pos = Math.floor(Math.random() * base.length);
          const char = randomAscii(1);
          const mutated = base.slice(0, pos) + char + base.slice(pos);

          expect(() => sanitizeFileName(mutated)).not.toThrow();
          expect(() => getFileExtension(mutated)).not.toThrow();
        }
      }
    });

    it('should handle string deletions', () => {
      for (const base of baseStrings) {
        for (let i = 0; i < 100; i++) {
          const pos = Math.floor(Math.random() * base.length);
          const mutated = base.slice(0, pos) + base.slice(pos + 1);

          expect(() => sanitizeFileName(mutated)).not.toThrow();
          expect(() => getFileExtension(mutated)).not.toThrow();
        }
      }
    });

    it('should handle string substitutions', () => {
      for (const base of baseStrings) {
        for (let i = 0; i < 100; i++) {
          const pos = Math.floor(Math.random() * base.length);
          const char = randomAscii(1);
          const mutated = base.slice(0, pos) + char + base.slice(pos + 1);

          expect(() => sanitizeFileName(mutated)).not.toThrow();
          expect(() => getFileExtension(mutated)).not.toThrow();
        }
      }
    });

    it('should handle character swapping', () => {
      for (const base of baseStrings) {
        for (let i = 0; i < 100; i++) {
          const pos1 = Math.floor(Math.random() * base.length);
          const pos2 = Math.floor(Math.random() * base.length);
          const chars = base.split('');
          [chars[pos1], chars[pos2]] = [chars[pos2], chars[pos1]];
          const mutated = chars.join('');

          expect(() => sanitizeFileName(mutated)).not.toThrow();
          expect(() => getFileExtension(mutated)).not.toThrow();
        }
      }
    });
  });

  describe('Byte mutation tests', () => {
    it('should handle byte array mutations', () => {
      const baseData = encodeToBytes('Hello, World!');

      for (let i = 0; i < 100; i++) {
        // Create mutated copy
        const mutated = new Uint8Array(baseData);
        const pos = Math.floor(Math.random() * mutated.length);
        mutated[pos] = Math.floor(Math.random() * 256);

        expect(() => decodeBytes(mutated)).not.toThrow();
      }
    });

    it('should handle byte array truncation', () => {
      const baseData = encodeToBytes('This is a test string for byte operations');

      for (let i = 0; i < 100; i++) {
        const len = 1 + Math.floor(Math.random() * baseData.length);
        const truncated = baseData.slice(0, len);

        expect(() => decodeBytes(truncated)).not.toThrow();
      }
    });
  });
});

// =============================================================================
// BOUNDARY FUZZ TESTS
// =============================================================================

describe('Fuzz: Boundary Tests', () => {
  describe('Length boundaries', () => {
    it('should handle very long filenames', () => {
      const lengths = [100, 500, 1000, 5000];
      for (const len of lengths) {
        const longName = 'a'.repeat(len) + '.docx';
        expect(() => sanitizeFileName(longName)).not.toThrow();
        expect(() => getFileExtension(longName)).not.toThrow();
      }
    });

    it('should handle very long extensions', () => {
      for (let i = 0; i < 100; i++) {
        const extLen = 1 + Math.floor(Math.random() * 100);
        const ext = randomAscii(extLen);
        const filename = `file.${ext}`;

        expect(() => getFileExtension(filename)).not.toThrow();
        expect(() => getMimeType(ext)).not.toThrow();
      }
    });

    it('should handle minimal input', () => {
      expect(() => sanitizeFileName('a')).not.toThrow();
      expect(() => getFileExtension('a')).not.toThrow();
      expect(() => safeDecodeUri('a')).not.toThrow();
    });
  });

  describe('Character boundaries', () => {
    it('should handle all printable ASCII characters', () => {
      for (let code = 32; code < 127; code++) {
        const char = String.fromCharCode(code);
        expect(() => sanitizeFileName(char)).not.toThrow();
      }
    });

    it('should handle control characters', () => {
      for (let code = 0; code < 32; code++) {
        const char = String.fromCharCode(code);
        expect(() => sanitizeFileName(char)).not.toThrow();
      }
    });

    it('should handle null character', () => {
      const withNull = 'file\u0000name.docx';
      expect(() => sanitizeFileName(withNull)).not.toThrow();
    });
  });
});

// =============================================================================
// STRUCTURE-AWARE FUZZ TESTS
// =============================================================================

describe('Fuzz: Structure-Aware Tests', () => {
  describe('URL structure fuzzing', () => {
    it('should handle malformed URLs', () => {
      const malformedUrls = [
        'http://[invalid',
        'https://' + randomAscii(100),
        'ftp://' + randomUnicode(50),
        'http://' + ':'.repeat(50),
        'file:///' + '?'.repeat(50),
      ];

      for (const url of malformedUrls) {
        expect(() => isValidUrl(url)).not.toThrow();
        expect(() => safeDecodeUri(url)).not.toThrow();
      }
    });

    it('should handle URLs with special characters', () => {
      for (let i = 0; i < 100; i++) {
        const url = `https://example.com/${randomUnicode(20)}/${randomFilename()}`;
        expect(() => isValidUrl(url)).not.toThrow();
        expect(() => safeDecodeUri(url)).not.toThrow();
      }
    });
  });

  describe('Content-Disposition structure fuzzing', () => {
    it('should handle malformed headers', () => {
      const malformedHeaders = [
        'attachment; filename=' + randomAscii(100),
        'inline; filename="' + randomUnicode(50) + '"',
        'attachment; name=' + ':'.repeat(50),
        randomAscii(200),
      ];

      for (const header of malformedHeaders) {
        expect(() => extractFilenameFromContentDisposition(header)).not.toThrow();
      }
    });
  });
});

// =============================================================================
// PROPERTY-BASED FUZZ TESTS
// =============================================================================

describe('Fuzz: Property-Based Tests', () => {
  describe('Idempotency properties', () => {
    it('should be idempotent for sanitizeFileName', () => {
      for (let i = 0; i < 500; i++) {
        const input = randomAscii(20);
        const first = sanitizeFileName(input);
        const second = sanitizeFileName(first);
        expect(second).toBe(first);
      }
    });

    it('should be idempotent for escapeXml', () => {
      // Only for strings without special chars after first escape
      for (let i = 0; i < 500; i++) {
        const input = randomAscii(20).replace(/[<>&"']/g, '');
        const first = escapeXml(input);
        const second = escapeXml(first);
        expect(second).toBe(first);
      }
    });
  });

  describe('Round-trip properties', () => {
    it('should round-trip encode/decode for ASCII', () => {
      for (let i = 0; i < 500; i++) {
        const input = randomAscii(50);
        const encoded = encodeToBytes(input);
        const decoded = decodeBytes(encoded);
        expect(decoded).toBe(input);
      }
    });

    it('should round-trip encode/decode for Unicode', () => {
      for (let i = 0; i < 500; i++) {
        const input = randomUnicode(20);
        const encoded = encodeToBytes(input);
        const decoded = decodeBytes(encoded);
        expect(decoded).toBe(input);
      }
    });
  });

  describe('Invariance properties', () => {
    it('should preserve extension after sanitization', () => {
      for (let i = 0; i < 500; i++) {
        const name = randomAscii(10);
        const ext = 'docx';
        const input = `${name}.${ext}`;
        const sanitized = sanitizeFileName(input);
        const extractedExt = getFileExtension(sanitized);
        expect(extractedExt).toBe(ext);
      }
    });

    it('should never produce illegal characters in name part of result', () => {
      const illegalChars = '<>:"/\\|?*';
      for (let i = 0; i < 1000; i++) {
        // Include valid characters and a proper extension so name is sanitized
        const input = 'valid_' + randomUnicode(10) + '_chars.docx';
        const result = sanitizeFileName(input);
        // Extract name part (before the extension)
        const namePart = result.replace(/\.docx$/, '');
        for (const char of illegalChars) {
          expect(namePart).not.toContain(char);
        }
      }
    });
  });
});

// =============================================================================
// STRESS FUZZ TESTS
// =============================================================================

describe('Fuzz: Stress Tests', () => {
  it('should handle many rapid random operations', () => {
    for (let i = 0; i < 10000; i++) {
      const input = randomAscii(10 + Math.floor(Math.random() * 20));

      // Chain multiple operations
      const sanitized = sanitizeFileName(input);
      const ext = getFileExtension(sanitized);
      const mime = getMimeType(ext);

      expect(typeof sanitized).toBe('string');
      expect(typeof ext).toBe('string');
      expect(typeof mime).toBe('string');
    }
  });

  it('should handle alternating encode/decode', () => {
    let current = 'Initial test string';

    for (let i = 0; i < 1000; i++) {
      const encoded = encodeToBytes(current);
      current = decodeBytes(encoded);
    }

    expect(current).toBe('Initial test string');
  });
});
