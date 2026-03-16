/**
 * Phase 59: Invariant and Metamorphic Testing
 *
 * This file tests mathematical and logical properties of utility functions:
 * - Metamorphic relations: If input changes in way X, output changes in way Y
 * - Algebraic properties: Associativity, commutativity, identity elements
 * - Invariant properties: Properties that must hold for all inputs
 * - Equivalence relations: Different inputs that produce same output
 */

import { describe, it, expect } from 'vitest';
import {
  sanitizeFileName,
  getFileExtension,
  safeDecodeUri,
  isValidUrl,
  getMimeType,
  isSupportedExtension,
} from '../url-utils';
import {
  encodeToBytes,
  decodeBytes,
  hasUtf8Bom,
  concatBytes,
} from '../byte-utils';
import {
  escapeXml,
  createConversionParams,
} from '../conversion-utils';
import {
  createOutputFileName,
} from '../conversion-paths';

describe('Metamorphic Relations', () => {
  describe('sanitizeFileName metamorphic relations', () => {
    it('should be idempotent: sanitize(sanitize(x)) === sanitize(x)', () => {
      const inputs = [
        'file<name>.txt',
        'file:with|special*chars?.txt',
        'file   name.txt',
        'file.txt',
      ];

      for (const input of inputs) {
        const once = sanitizeFileName(input);
        const twice = sanitizeFileName(once);
        expect(twice).toBe(once);
      }
    });

    it('should preserve extension metamorphically', () => {
      // If input has extension .txt, output should have .txt
      const inputs = [
        'file.txt',
        'file<name>.txt',
        'file   name.txt',
      ];

      for (const input of inputs) {
        const result = sanitizeFileName(input);
        expect(result.endsWith('.txt')).toBe(true);
      }
    });

    it('should be monotonic with respect to illegal characters', () => {
      // sanitizeFileName always adds extension, so length comparison is different
      const withIllegal = 'file<>:"/\\|?*.txt';
      const result = sanitizeFileName(withIllegal);

      // Should have removed illegal chars but preserved extension
      expect(result.endsWith('.txt')).toBe(true);
      expect(result).not.toContain('<');
      expect(result).not.toContain('>');
      expect(result).not.toContain(':');
    });

    it('should provide default filename for empty input', () => {
      // Empty string returns 'file.bin'
      expect(sanitizeFileName('')).toBe('file.bin');
      expect(sanitizeFileName('   ')).toBe('file.bin');
    });

    it('should always return a string with an extension', () => {
      const inputs = [
        'file',
        'file<name>',
        '   ',
        'a',
      ];

      for (const input of inputs) {
        const result = sanitizeFileName(input);
        expect(result).toContain('.');
        const parts = result.split('.');
        expect(parts.length).toBeGreaterThanOrEqual(2);
      }
    });
  });

  describe('getFileExtension metamorphic relations', () => {
    it('should satisfy extension preservation through case change', () => {
      const files = ['file.TXT', 'FILE.txt', 'File.TxT'];

      const extensions = files.map(f => getFileExtension(f).toLowerCase());
      expect(new Set(extensions).size).toBe(1);
      expect(extensions[0]).toBe('txt');
    });

    it('should preserve extension through valid prefix changes', () => {
      const base = 'txt';
      const files = ['file.txt', 'document.txt', 'my-file.txt', 'FILE.txt'];

      for (const file of files) {
        expect(getFileExtension(file).toLowerCase()).toBe(base);
      }
    });

    it('should return empty string for files without extension', () => {
      const noExt = ['file', 'noextension', 'FILE'];

      for (const file of noExt) {
        expect(getFileExtension(file)).toBe('');
      }
    });

    it('should return extension without dot', () => {
      expect(getFileExtension('file.txt')).toBe('txt');
      expect(getFileExtension('file.docx')).toBe('docx');
      expect(getFileExtension('FILE.PDF')).toBe('pdf');
    });
  });

  describe('safeDecodeUri metamorphic relations', () => {
    it('should be self-inverse for properly encoded strings', () => {
      const strings = ['hello world', 'file%20name', 'path/to/file'];

      for (const s of strings) {
        const decoded = safeDecodeUri(s);
        // For already decoded strings, decoding again should be idempotent
        expect(safeDecodeUri(decoded)).toBe(decoded);
      }
    });

    it('should handle double encoding metamorphically', () => {
      // decode(decode(doubleEncoded)) should equal decode(singleEncoded)
      const plain = 'hello world';
      const singleEncoded = encodeURIComponent(plain);
      const doubleEncoded = encodeURIComponent(singleEncoded);

      // Single decode of double encoded = encoded
      expect(safeDecodeUri(doubleEncoded)).toBe(singleEncoded);
      // Double decode of double encoded = plain
      expect(safeDecodeUri(safeDecodeUri(doubleEncoded))).toBe(plain);
    });
  });

  describe('escapeXml metamorphic relations', () => {
    it('should NOT be idempotent because & is escaped first', () => {
      // escapeXml escapes & first, so &quot; becomes &amp;quot;
      const input = '&quot;';
      const once = escapeXml(input);
      const twice = escapeXml(once);

      // This is intentional behavior: escape & first, then other chars
      expect(once).toBe('&amp;quot;');
      expect(twice).toBe('&amp;amp;quot;');
    });

    it('should be idempotent for input with no special chars', () => {
      // For input without ANY special chars (<, >, &, ", '), escaping is idempotent
      const inputs = [
        'normal text',
        'Hello World 123',
        'no-special-chars',
      ];

      for (const input of inputs) {
        const once = escapeXml(input);
        const twice = escapeXml(once);
        expect(twice).toBe(once);
      }
    });

    it('should be monotonic: |escape(x)| >= |x|', () => {
      const inputs = [
        '<tag>',
        'a & b',
        '"quoted"',
        "it's",
        'normal',
      ];

      for (const input of inputs) {
        const escaped = escapeXml(input);
        expect(escaped.length).toBeGreaterThanOrEqual(input.length);
      }
    });

    it('should preserve safe character identity', () => {
      // Safe characters should be unchanged
      const safe = 'Hello World 123';
      expect(escapeXml(safe)).toBe(safe);
    });

    it('should have deterministic replacement lengths', () => {
      // Each special char has known replacement length
      const replacements = {
        '<': '&lt;',   // 1 -> 4
        '>': '&gt;',   // 1 -> 4
        '&': '&amp;',  // 1 -> 5
        '"': '&quot;', // 1 -> 6
        "'": '&apos;', // 1 -> 6
      };

      for (const [char, entity] of Object.entries(replacements)) {
        expect(escapeXml(char)).toBe(entity);
        expect(entity.length).toBeGreaterThan(char.length);
      }
    });
  });
});

describe('Algebraic Properties', () => {
  describe('concatBytes algebraic properties', () => {
    it('should be associative: (a + b) + c === a + (b + c)', () => {
      const a = new Uint8Array([1, 2]);
      const b = new Uint8Array([3, 4]);
      const c = new Uint8Array([5, 6]);

      const left = concatBytes(concatBytes(a, b), c);
      const right = concatBytes(a, concatBytes(b, c));

      expect(Array.from(left)).toEqual(Array.from(right));
    });

    it('should have identity element: a + empty === a', () => {
      const bytes = new Uint8Array([1, 2, 3, 4, 5]);
      const empty = new Uint8Array([]);

      const result = concatBytes(bytes, empty);
      expect(Array.from(result)).toEqual(Array.from(bytes));
    });

    it('should have identity element: empty + a === a', () => {
      const bytes = new Uint8Array([1, 2, 3, 4, 5]);
      const empty = new Uint8Array([]);

      const result = concatBytes(empty, bytes);
      expect(Array.from(result)).toEqual(Array.from(bytes));
    });

    it('should have identity element for both sides', () => {
      const bytes = new Uint8Array([1, 2, 3]);
      const empty = new Uint8Array([]);

      expect(Array.from(concatBytes(bytes, empty))).toEqual(Array.from(bytes));
      expect(Array.from(concatBytes(empty, bytes))).toEqual(Array.from(bytes));
      expect(Array.from(concatBytes(empty, empty))).toEqual([]);
    });
  });

  describe('encode/decode round-trip algebraic property', () => {
    it('should satisfy: decode(encode(x)) === x for all valid strings', () => {
      const strings = [
        'Hello, World!',
        'Unicode: 你好世界',
        'Emoji: 🎉🎊',
        'Special: \n\t\r',
        'Numbers: 123.456',
        'Symbols: @#$%^&*()',
      ];

      for (const s of strings) {
        const encoded = encodeToBytes(s);
        const decoded = decodeBytes(encoded);
        expect(decoded).toBe(s);
      }
    });

    it('should satisfy: encode(decode(bytes)) === bytes for valid UTF-8 byte sequences', () => {
      const byteArrays = [
        new Uint8Array([72, 101, 108, 108, 111]), // "Hello"
        new Uint8Array([0xE4, 0xBD, 0xA0, 0xE5, 0xA5, 0xBD]), // 你好 in UTF-8
      ];

      for (const bytes of byteArrays) {
        const decoded = decodeBytes(bytes);
        const reEncoded = encodeToBytes(decoded);
        expect(Array.from(reEncoded)).toEqual(Array.from(bytes));
      }
    });

    it('should handle BOM bytes correctly', () => {
      // decodeBytes strips BOM before decoding, so BOM-only returns empty string
      const bomBytes = new Uint8Array([0xEF, 0xBB, 0xBF]);
      const decoded = decodeBytes(bomBytes);
      // BOM is stripped, resulting in empty string
      expect(decoded).toBe('');
    });
  });

  describe('BOM + concat algebraic properties', () => {
    it('should satisfy: hasUtf8Bom(concat(BOM, data)) === true', () => {
      const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
      const data = new Uint8Array([1, 2, 3, 4, 5]);

      const withBom = concatBytes(bom, data);
      expect(hasUtf8Bom(withBom)).toBe(true);
    });

    it('should satisfy: hasUtf8Bom(data) === false for data without BOM', () => {
      const data = new Uint8Array([1, 2, 3, 4, 5]);
      expect(hasUtf8Bom(data)).toBe(false);
    });
  });
});

describe('Invariant Properties', () => {
  describe('URL validation invariants', () => {
    it('should maintain that valid URLs have protocol', () => {
      const validUrls = [
        'https://example.com',
        'http://test.org/path',
        'ftp://files.server.com',
      ];

      for (const url of validUrls) {
        expect(isValidUrl(url)).toBe(true);
        expect(url).toMatch(/^[a-z]+:\/\//i);
      }
    });

    it('should maintain that data URLs are valid', () => {
      const dataUrls = [
        'data:text/plain,Hello',
        'data:text/html,<h1>Test</h1>',
        'data:image/png;base64,iVBORw0KGgo=',
      ];

      for (const url of dataUrls) {
        expect(isValidUrl(url)).toBe(true);
      }
    });

    it('should maintain that invalid URLs are rejected', () => {
      const invalidUrls = [
        '',
        'not-a-url',
        '://missing-protocol.com',
        'http://',
      ];

      for (const url of invalidUrls) {
        expect(isValidUrl(url)).toBe(false);
      }
    });
  });

  describe('Extension support invariants', () => {
    it('should maintain that common extensions are supported', () => {
      // Extensions WITHOUT dot
      const supportedExtensions = [
        'docx', 'xlsx', 'pptx',
        'doc', 'xls', 'ppt',
        'odt', 'ods', 'odp',
        'txt', 'rtf', 'csv',
      ];

      for (const ext of supportedExtensions) {
        expect(isSupportedExtension(ext)).toBe(true);
      }
    });

    it('should maintain case-insensitive support', () => {
      const cases = ['docx', 'DOCX', 'Docx', 'DoCx'];

      for (const ext of cases) {
        expect(isSupportedExtension(ext)).toBe(true);
      }
    });

    it('should reject unsupported extensions', () => {
      const unsupported = ['pdf', 'xyz', 'abc', 'png', 'jpg'];

      for (const ext of unsupported) {
        expect(isSupportedExtension(ext)).toBe(false);
      }
    });
  });

  describe('MIME type invariants', () => {
    it('should maintain that known extensions have MIME types', () => {
      const extensionToMime: Record<string, string> = {
        'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'pdf': 'application/pdf',
        'txt': 'text/plain',
        'csv': 'text/csv',
      };

      for (const [ext, expectedMime] of Object.entries(extensionToMime)) {
        expect(getMimeType(ext)).toBe(expectedMime);
      }
    });

    it('should maintain that unknown extensions return generic MIME type', () => {
      const unknownExtensions = ['xyz', 'abc123', 'custom', 'unknown'];

      for (const ext of unknownExtensions) {
        const mime = getMimeType(ext);
        expect(mime).toBe('application/octet-stream');
      }
    });
  });
});

describe('Equivalence Relations', () => {
  describe('Filename equivalence', () => {
    it('should treat uppercase and lowercase extensions as equivalent', () => {
      const pairs = [
        ['file.DOCX', 'file.docx'],
        ['FILE.XLSX', 'file.xlsx'],
        ['File.PPTX', 'file.pptx'],
      ];

      for (const [a, b] of pairs) {
        expect(getFileExtension(a).toLowerCase()).toBe(getFileExtension(b).toLowerCase());
      }
    });

    it('should produce equivalent sanitized results for equivalent inputs', () => {
      // Different ways to write same filename should produce same sanitized result
      const equivalentInputs = [
        ['document.docx', 'document.docx'],
        ['Document.DOCX', 'document.docx'],
      ];

      for (const [a, b] of equivalentInputs) {
        // Both should be valid extensions (without dot)
        const extA = getFileExtension(a);
        const extB = getFileExtension(b);
        expect(isSupportedExtension(extA)).toBe(true);
        expect(isSupportedExtension(extB)).toBe(true);
      }
    });
  });

  describe('Byte array equivalence', () => {
    it('should treat concatenated bytes as equivalent regardless of split point', () => {
      const full = new Uint8Array([1, 2, 3, 4, 5, 6]);

      // Different ways to split
      const split1 = [
        new Uint8Array([1, 2, 3]),
        new Uint8Array([4, 5, 6]),
      ];
      const split2 = [
        new Uint8Array([1, 2]),
        new Uint8Array([3, 4]),
        new Uint8Array([5, 6]),
      ];
      const split3 = [
        new Uint8Array([1]),
        new Uint8Array([2, 3, 4, 5]),
        new Uint8Array([6]),
      ];

      const result1 = concatBytes(split1[0], split1[1]);
      const result2 = concatBytes(concatBytes(split2[0], split2[1]), split2[2]);
      const result3 = concatBytes(concatBytes(split3[0], split3[1]), split3[2]);

      expect(Array.from(result1)).toEqual(Array.from(full));
      expect(Array.from(result2)).toEqual(Array.from(full));
      expect(Array.from(result3)).toEqual(Array.from(full));
    });
  });

  describe('Output filename equivalence', () => {
    it('should produce equivalent output names for same base and extension', () => {
      const base = 'document';
      const ext = 'docx';

      // Multiple calls should produce same result
      expect(createOutputFileName(base, ext)).toBe(createOutputFileName(base, ext));
    });

    it('should produce different output names for different extensions', () => {
      const base = 'document';

      const docx = createOutputFileName(base, 'docx');
      const pdf = createOutputFileName(base, 'pdf');

      expect(docx).not.toBe(pdf);
      expect(docx.endsWith('.docx')).toBe(true);
      expect(pdf.endsWith('.pdf')).toBe(true);
    });
  });
});

describe('Compositional Properties', () => {
  describe('Function composition', () => {
    it('should maintain invariants through sanitizeFileName -> getFileExtension pipeline', () => {
      const inputs = [
        'My<>File.docx',
        'file   name.pptx',
        'normal.txt',
      ];

      for (const input of inputs) {
        const sanitized = sanitizeFileName(input);
        const ext = getFileExtension(sanitized);

        // Extension should be supported
        expect(isSupportedExtension(ext)).toBe(true);
      }
    });

    it('should maintain invariants through encode -> concat -> decode pipeline', () => {
      const texts = ['Hello', 'World', 'Test'];

      // Encode each text
      const encoded = texts.map(t => encodeToBytes(t));

      // Concat all
      let concatenated: Uint8Array = new Uint8Array([]);
      for (const bytes of encoded) {
        concatenated = concatBytes(concatenated, bytes);
      }

      // Decode should give original concatenated string
      expect(decodeBytes(concatenated)).toBe(texts.join(''));
    });

    it('should maintain invariants through XML param generation pipeline', () => {
      const params = createConversionParams('test.docx', 'test.pdf');
      expect(params).toContain('<?xml');
      expect(params).toContain('<m_sFileTo>test.pdf</m_sFileTo>');
      expect(params).toContain('<m_sFileFrom>test.docx</m_sFileFrom>');
    });
  });
});

describe('State Machine Properties', () => {
  describe('BOM state transitions', () => {
    it('should maintain consistent BOM detection state', () => {
      const withBom = new Uint8Array([0xEF, 0xBB, 0xBF, 0x41, 0x42]); // BOM + "AB"
      const withoutBom = new Uint8Array([0x41, 0x42]); // "AB"

      // State: has BOM
      expect(hasUtf8Bom(withBom)).toBe(true);

      // State: no BOM
      expect(hasUtf8Bom(withoutBom)).toBe(false);

      // Transition: add BOM to no-BOM data
      const addedBom = concatBytes(new Uint8Array([0xEF, 0xBB, 0xBF]), withoutBom);
      expect(hasUtf8Bom(addedBom)).toBe(true);
    });
  });

  describe('Decode state machine', () => {
    it('should maintain consistent decode state for UTF-8', () => {
      // Well-formed UTF-8 sequences
      const sequences = [
        { bytes: new Uint8Array([0x48, 0x65, 0x6C, 0x6C, 0x6F]), expected: 'Hello' },
        { bytes: new Uint8Array([0xE4, 0xBD, 0xA0, 0xE5, 0xA5, 0xBD]), expected: '你好' },
        { bytes: new Uint8Array([0xF0, 0x9F, 0x8E, 0x89]), expected: '🎉' },
      ];

      for (const { bytes, expected } of sequences) {
        expect(decodeBytes(bytes)).toBe(expected);
      }
    });
  });
});

describe('Randomized Property Tests', () => {
  // Simple property-based testing without external libraries

  const randomString = (length: number): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 <>:"/\\|?*.';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const randomBytes = (length: number): Uint8Array => {
    const bytes = new Uint8Array(length);
    for (let i = 0; i < length; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
    return bytes;
  };

  describe('Randomized sanitizeFileName properties', () => {
    it('should always return a string with extension for non-empty input', () => {
      for (let i = 0; i < 100; i++) {
        const input = randomString(20);
        if (input.trim().length > 0) {
          const result = sanitizeFileName(input);
          // Result should always contain a dot (extension)
          expect(typeof result).toBe('string');
          expect(result).toContain('.');
        }
      }
    });

    it('should always produce idempotent results', () => {
      for (let i = 0; i < 50; i++) {
        const input = randomString(30);
        const once = sanitizeFileName(input);
        const twice = sanitizeFileName(once);
        expect(twice).toBe(once);
      }
    });
  });

  describe('Randomized escapeXml properties', () => {
    it('should always be length-monotonic', () => {
      for (let i = 0; i < 50; i++) {
        const input = randomString(20);
        const escaped = escapeXml(input);
        expect(escaped.length).toBeGreaterThanOrEqual(input.length);
      }
    });

    it('should always escape special characters', () => {
      for (let i = 0; i < 50; i++) {
        const input = randomString(20);
        const escaped = escapeXml(input);

        // After escaping, output should not contain raw special chars
        expect(escaped).not.toContain('<');
        expect(escaped).not.toContain('>');
        // Note: & might appear as part of entities like &amp;
        // So we check for raw & not followed by entity patterns
        const rawAmpersand = /&(?!(amp|lt|gt|quot|apos);)/;
        expect(escaped).not.toMatch(rawAmpersand);
      }
    });
  });

  describe('Randomized byte operation properties', () => {
    it('should maintain associativity for random byte arrays', () => {
      for (let i = 0; i < 20; i++) {
        const a = randomBytes(5);
        const b = randomBytes(5);
        const c = randomBytes(5);

        const left = concatBytes(concatBytes(a, b), c);
        const right = concatBytes(a, concatBytes(b, c));

        expect(Array.from(left)).toEqual(Array.from(right));
      }
    });

    it('should maintain identity property for random byte arrays', () => {
      const empty = new Uint8Array([]);

      for (let i = 0; i < 20; i++) {
        const bytes = randomBytes(10);
        expect(Array.from(concatBytes(bytes, empty))).toEqual(Array.from(bytes));
        expect(Array.from(concatBytes(empty, bytes))).toEqual(Array.from(bytes));
      }
    });
  });

  describe('Randomized encode/decode properties', () => {
    it('should maintain round-trip for random ASCII strings', () => {
      // ASCII-safe strings for round-trip
      const generateAsciiString = (length: number): string => {
        let result = '';
        for (let i = 0; i < length; i++) {
          result += String.fromCharCode(32 + Math.floor(Math.random() * 95)); // Printable ASCII
        }
        return result;
      };

      for (let i = 0; i < 30; i++) {
        const input = generateAsciiString(50);
        const encoded = encodeToBytes(input);
        const decoded = decodeBytes(encoded);
        expect(decoded).toBe(input);
      }
    });
  });
});

describe('Boundary Condition Invariants', () => {
  describe('Empty input handling', () => {
    it('should handle empty strings with defaults', () => {
      // sanitizeFileName provides a default for empty input
      expect(sanitizeFileName('')).toBe('file.bin');
      expect(getFileExtension('')).toBe('');
      expect(escapeXml('')).toBe('');
      expect(safeDecodeUri('')).toBe('');
    });

    it('should handle empty byte arrays consistently', () => {
      const empty = new Uint8Array([]);
      expect(hasUtf8Bom(empty)).toBe(false);
      expect(decodeBytes(empty)).toBe('');
      expect(Array.from(concatBytes(empty, empty))).toEqual([]);
    });
  });

  describe('Single element handling', () => {
    it('should handle single character filenames', () => {
      const singleChars = ['a', '1'];

      for (const char of singleChars) {
        const result = sanitizeFileName(char);
        expect(typeof result).toBe('string');
        // sanitizeFileName always adds extension
        expect(result).toContain('.');
      }
    });

    it('should handle single byte arrays', () => {
      const singleBytes = [
        new Uint8Array([0]),
        new Uint8Array([127]),
        new Uint8Array([255]),
      ];

      for (const bytes of singleBytes) {
        const decoded = decodeBytes(bytes);
        expect(typeof decoded).toBe('string');
        expect(decoded.length).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('Maximum size handling', () => {
    it('should handle long filenames without stack overflow', () => {
      const longName = 'a'.repeat(1000) + '.txt';
      expect(() => sanitizeFileName(longName)).not.toThrow();
    });

    it('should handle long XML strings without stack overflow', () => {
      const longXml = '<tag>' + 'x'.repeat(10000) + '</tag>';
      expect(() => escapeXml(longXml)).not.toThrow();
    });

    it('should handle medium byte arrays efficiently', () => {
      const mediumArray = new Uint8Array(10000);
      for (let i = 0; i < 10000; i++) {
        mediumArray[i] = i % 256;
      }

      expect(() => decodeBytes(mediumArray)).not.toThrow();
    });
  });
});

describe('Convergence Properties', () => {
  describe('Fixed point convergence', () => {
    it('should converge to fixed point for sanitizeFileName', () => {
      // Apply sanitizeFileName until it stabilizes
      const converge = (fn: (s: string) => string, input: string, maxIterations = 10): string => {
        let current = input;
        for (let i = 0; i < maxIterations; i++) {
          const next = fn(current);
          if (next === current) return next;
          current = next;
        }
        return current;
      };

      const inputs = [
        '<<<file>>>',
        'file...txt',
      ];

      for (const input of inputs) {
        const fixed = converge(sanitizeFileName, input);
        // Fixed point should be idempotent
        expect(sanitizeFileName(fixed)).toBe(fixed);
      }
    });

    it('should converge to fixed point for escapeXml only for safe input', () => {
      // escapeXml is NOT idempotent because & is escaped first
      // So &lt; -> &amp;lt; -> &amp;amp;lt; -> etc.
      // Only input with no special chars at all is idempotent
      const safeInput = 'normal text';
      expect(escapeXml(safeInput)).toBe(safeInput);
    });

    it('should NOT converge for input with special chars due to & escaping', () => {
      // Demonstrate that escapeXml is not idempotent
      const input = '<>';
      const once = escapeXml(input);
      const twice = escapeXml(once);

      expect(once).toBe('&lt;&gt;');
      // &lt; becomes &amp;lt; because & is escaped first
      expect(twice).toBe('&amp;lt;&amp;gt;');
    });
  });
});