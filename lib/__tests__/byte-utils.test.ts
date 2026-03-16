import { describe, expect, it } from 'vitest';
import {
  UTF8_BOM,
  hasUtf8Bom,
  addUtf8Bom,
  stripUtf8Bom,
  decodeBytes,
  encodeToBytes,
  isEmptyOrWhitespace,
  concatBytes,
} from '../byte-utils';

describe('byte-utils', () => {
  describe('UTF8_BOM constant', () => {
    it('should have correct BOM bytes', () => {
      expect(UTF8_BOM).toBeInstanceOf(Uint8Array);
      expect(UTF8_BOM.length).toBe(3);
      expect(UTF8_BOM[0]).toBe(0xef);
      expect(UTF8_BOM[1]).toBe(0xbb);
      expect(UTF8_BOM[2]).toBe(0xbf);
    });
  });

  describe('hasUtf8Bom', () => {
    it('should return true for data with UTF-8 BOM', () => {
      const data = new Uint8Array([0xef, 0xbb, 0xbf, 0x48, 0x65, 0x6c, 0x6c, 0x6f]); // "Hello" with BOM
      expect(hasUtf8Bom(data)).toBe(true);
    });

    it('should return false for data without UTF-8 BOM', () => {
      const data = new Uint8Array([0x48, 0x65, 0x6c, 0x6c, 0x6f]); // "Hello"
      expect(hasUtf8Bom(data)).toBe(false);
    });

    it('should return false for empty array', () => {
      const data = new Uint8Array(0);
      expect(hasUtf8Bom(data)).toBe(false);
    });

    it('should return false for array shorter than 3 bytes', () => {
      expect(hasUtf8Bom(new Uint8Array([0xef]))).toBe(false);
      expect(hasUtf8Bom(new Uint8Array([0xef, 0xbb]))).toBe(false);
    });

    it('should return false for partial BOM matches', () => {
      expect(hasUtf8Bom(new Uint8Array([0xef, 0xbb, 0x00]))).toBe(false);
      expect(hasUtf8Bom(new Uint8Array([0xef, 0x00, 0xbf]))).toBe(false);
      expect(hasUtf8Bom(new Uint8Array([0x00, 0xbb, 0xbf]))).toBe(false);
    });

    it('should return true for BOM only', () => {
      expect(hasUtf8Bom(new Uint8Array([0xef, 0xbb, 0xbf]))).toBe(true);
    });
  });

  describe('addUtf8Bom', () => {
    it('should add BOM to data without BOM', () => {
      const data = new Uint8Array([0x48, 0x65, 0x6c, 0x6c, 0x6f]); // "Hello"
      const result = addUtf8Bom(data);

      expect(result.length).toBe(8); // 3 + 5
      expect(hasUtf8Bom(result)).toBe(true);
      expect(result.slice(3)).toEqual(data);
    });

    it('should return unchanged if BOM already present', () => {
      const data = new Uint8Array([0xef, 0xbb, 0xbf, 0x48, 0x65, 0x6c, 0x6c, 0x6f]);
      const result = addUtf8Bom(data);

      expect(result).toEqual(data);
    });

    it('should add BOM to empty array', () => {
      const data = new Uint8Array(0);
      const result = addUtf8Bom(data);

      expect(result.length).toBe(3);
      expect(hasUtf8Bom(result)).toBe(true);
    });
  });

  describe('stripUtf8Bom', () => {
    it('should strip BOM from data with BOM', () => {
      const data = new Uint8Array([0xef, 0xbb, 0xbf, 0x48, 0x65, 0x6c, 0x6c, 0x6f]); // "Hello" with BOM
      const result = stripUtf8Bom(data);

      expect(result.length).toBe(5);
      expect(hasUtf8Bom(result)).toBe(false);
      expect(result).toEqual(new Uint8Array([0x48, 0x65, 0x6c, 0x6c, 0x6f]));
    });

    it('should return unchanged if no BOM present', () => {
      const data = new Uint8Array([0x48, 0x65, 0x6c, 0x6c, 0x6f]); // "Hello"
      const result = stripUtf8Bom(data);

      expect(result).toEqual(data);
    });

    it('should return empty array for BOM only', () => {
      const data = new Uint8Array([0xef, 0xbb, 0xbf]);
      const result = stripUtf8Bom(data);

      expect(result.length).toBe(0);
    });

    it('should return unchanged for empty array', () => {
      const data = new Uint8Array(0);
      const result = stripUtf8Bom(data);

      expect(result.length).toBe(0);
    });

    it('should return unchanged for short arrays', () => {
      const data = new Uint8Array([0x48, 0x65]);
      const result = stripUtf8Bom(data);

      expect(result).toEqual(data);
    });
  });

  describe('decodeBytes', () => {
    it('should decode UTF-8 bytes to string', () => {
      const data = new TextEncoder().encode('Hello, World!');
      expect(decodeBytes(data)).toBe('Hello, World!');
    });

    it('should decode UTF-8 bytes with BOM', () => {
      const text = 'Hello, World!';
      const encoded = new TextEncoder().encode(text);
      const dataWithBom = addUtf8Bom(encoded);
      expect(decodeBytes(dataWithBom)).toBe(text);
    });

    it('should decode Chinese characters', () => {
      const text = '你好世界';
      const data = new TextEncoder().encode(text);
      expect(decodeBytes(data)).toBe(text);
    });

    it('should decode Chinese characters with BOM', () => {
      const text = '你好世界';
      const dataWithBom = addUtf8Bom(new TextEncoder().encode(text));
      expect(decodeBytes(dataWithBom)).toBe(text);
    });

    it('should decode emoji characters', () => {
      const text = 'Hello 👋 World 🌍';
      const data = new TextEncoder().encode(text);
      expect(decodeBytes(data)).toBe(text);
    });

    it('should handle empty data', () => {
      const data = new Uint8Array(0);
      expect(decodeBytes(data)).toBe('');
    });

    it('should handle BOM only', () => {
      const data = new Uint8Array([0xef, 0xbb, 0xbf]);
      expect(decodeBytes(data)).toBe('');
    });

    it('should handle malformed UTF-8 gracefully', () => {
      // Malformed UTF-8 sequence - TextDecoder replaces with replacement character
      const data = new Uint8Array([0xff, 0xfe, 0xfd]);
      // Should not throw and returns replacement characters
      const result = decodeBytes(data);
      expect(typeof result).toBe('string');
      expect(result.length).toBe(3); // Each byte becomes a replacement character
    });
  });

  describe('encodeToBytes', () => {
    it('should encode string to UTF-8 bytes', () => {
      const text = 'Hello, World!';
      const result = encodeToBytes(text);

      expect(result).toBeInstanceOf(Uint8Array);
      expect(new TextDecoder().decode(result)).toBe(text);
    });

    it('should encode with BOM when requested', () => {
      const text = 'Hello, World!';
      const result = encodeToBytes(text, true);

      expect(hasUtf8Bom(result)).toBe(true);
      expect(decodeBytes(result)).toBe(text);
    });

    it('should encode without BOM by default', () => {
      const text = 'Hello, World!';
      const result = encodeToBytes(text);

      expect(hasUtf8Bom(result)).toBe(false);
    });

    it('should encode Chinese characters', () => {
      const text = '你好世界';
      const result = encodeToBytes(text);

      expect(new TextDecoder().decode(result)).toBe(text);
    });

    it('should encode emoji characters', () => {
      const text = 'Hello 👋 World 🌍';
      const result = encodeToBytes(text);

      expect(new TextDecoder().decode(result)).toBe(text);
    });

    it('should encode empty string', () => {
      const result = encodeToBytes('');

      expect(result.length).toBe(0);
    });

    it('should encode empty string with BOM', () => {
      const result = encodeToBytes('', true);

      expect(result.length).toBe(3);
      expect(hasUtf8Bom(result)).toBe(true);
    });
  });

  describe('isEmptyOrWhitespace', () => {
    it('should return true for empty array', () => {
      expect(isEmptyOrWhitespace(new Uint8Array(0))).toBe(true);
    });

    it('should return true for BOM only', () => {
      expect(isEmptyOrWhitespace(new Uint8Array([0xef, 0xbb, 0xbf]))).toBe(true);
    });

    it('should return true for whitespace only', () => {
      const spaces = new TextEncoder().encode('   ');
      expect(isEmptyOrWhitespace(spaces)).toBe(true);
    });

    it('should return true for tabs and newlines only', () => {
      const whitespace = new TextEncoder().encode('\t\n\r  ');
      expect(isEmptyOrWhitespace(whitespace)).toBe(true);
    });

    it('should return true for BOM + whitespace', () => {
      const bomWhitespace = addUtf8Bom(new TextEncoder().encode('   '));
      expect(isEmptyOrWhitespace(bomWhitespace)).toBe(true);
    });

    it('should return false for data with content', () => {
      const data = new TextEncoder().encode('Hello');
      expect(isEmptyOrWhitespace(data)).toBe(false);
    });

    it('should return false for whitespace + content', () => {
      const data = new TextEncoder().encode('  Hello  ');
      expect(isEmptyOrWhitespace(data)).toBe(false);
    });

    it('should return false for BOM + content', () => {
      const data = addUtf8Bom(new TextEncoder().encode('Hello'));
      expect(isEmptyOrWhitespace(data)).toBe(false);
    });
  });

  describe('concatBytes', () => {
    it('should concatenate multiple arrays', () => {
      const a = new Uint8Array([1, 2, 3]);
      const b = new Uint8Array([4, 5, 6]);
      const c = new Uint8Array([7, 8, 9]);

      const result = concatBytes(a, b, c);

      expect(result).toEqual(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9]));
    });

    it('should handle single array', () => {
      const a = new Uint8Array([1, 2, 3]);
      const result = concatBytes(a);

      expect(result).toEqual(a);
    });

    it('should handle empty arrays', () => {
      const a = new Uint8Array([1, 2, 3]);
      const empty = new Uint8Array(0);

      const result = concatBytes(empty, a, empty);

      expect(result).toEqual(a);
    });

    it('should return empty array for no arguments', () => {
      const result = concatBytes();

      expect(result.length).toBe(0);
    });

    it('should handle all empty arrays', () => {
      const result = concatBytes(new Uint8Array(0), new Uint8Array(0));

      expect(result.length).toBe(0);
    });

    it('should concatenate BOM with data', () => {
      const data = new TextEncoder().encode('Hello');
      const result = concatBytes(UTF8_BOM, data);

      expect(hasUtf8Bom(result)).toBe(true);
      expect(decodeBytes(result)).toBe('Hello');
    });

    it('should preserve data integrity after concatenation', () => {
      const part1 = new TextEncoder().encode('Hello, ');
      const part2 = new TextEncoder().encode('World!');

      const result = concatBytes(part1, part2);
      expect(decodeBytes(result)).toBe('Hello, World!');
    });
  });

  describe('round-trip operations', () => {
    it('should round-trip: encode -> decode', () => {
      const text = 'Hello, 世界! 👋';
      const encoded = encodeToBytes(text);
      const decoded = decodeBytes(encoded);

      expect(decoded).toBe(text);
    });

    it('should round-trip: encode with BOM -> decode', () => {
      const text = 'Hello, 世界! 👋';
      const encoded = encodeToBytes(text, true);
      const decoded = decodeBytes(encoded);

      expect(decoded).toBe(text);
    });

    it('should round-trip: add BOM -> strip BOM', () => {
      const data = new TextEncoder().encode('Hello');
      const withBom = addUtf8Bom(data);
      const withoutBom = stripUtf8Bom(withBom);

      expect(withoutBom).toEqual(data);
    });

    it('should be idempotent: add BOM twice', () => {
      const data = new TextEncoder().encode('Hello');
      const once = addUtf8Bom(data);
      const twice = addUtf8Bom(once);

      expect(twice).toEqual(once);
    });

    it('should be idempotent: strip BOM twice', () => {
      const data = new TextEncoder().encode('Hello');
      const once = stripUtf8Bom(data);
      const twice = stripUtf8Bom(once);

      expect(twice).toEqual(data);
    });
  });
});

describe('Export completeness', () => {
  it('should export all expected byte utility functions', () => {
    // Verify all exported functions exist and are correct types
    expect(UTF8_BOM).toBeInstanceOf(Uint8Array);
    expect(typeof hasUtf8Bom).toBe('function');
    expect(typeof addUtf8Bom).toBe('function');
    expect(typeof stripUtf8Bom).toBe('function');
    expect(typeof decodeBytes).toBe('function');
    expect(typeof encodeToBytes).toBe('function');
    expect(typeof isEmptyOrWhitespace).toBe('function');
    expect(typeof concatBytes).toBe('function');
  });
});

describe('stress tests', () => {
  it('should handle large text encoding (1MB)', () => {
    const text = 'Hello, 世界! '.repeat(100000); // ~1.3MB
    const encoded = encodeToBytes(text);
    const decoded = decodeBytes(encoded);

    expect(decoded).toBe(text);
    expect(encoded.length).toBeGreaterThan(1000000);
  });

  it('should handle large binary concatenation', () => {
    const part1 = new Uint8Array(500000).fill(0x41); // 500KB of 'A'
    const part2 = new Uint8Array(500000).fill(0x42); // 500KB of 'B'

    const result = concatBytes(part1, part2);

    expect(result.length).toBe(1000000);
    expect(result[0]).toBe(0x41);
    expect(result[499999]).toBe(0x41);
    expect(result[500000]).toBe(0x42);
    expect(result[999999]).toBe(0x42);
  });

  it('should handle all valid UTF-8 code points', () => {
    // Test various Unicode ranges
    const testStrings = [
      '\u0000\u0001\u0002', // Control characters
      '\u007F', // DEL character
      '\u0080\u07FF', // 2-byte UTF-8
      '\u0800\uFFFF', // 3-byte UTF-8
      '\uD800\uDC00', // Surrogate pair (emoji: 😀)
      '\uD83D\uDE00', // 😀 emoji
      '🇺🇸', // Flag emoji (multi-codepoint)
    ];

    for (const text of testStrings) {
      const encoded = encodeToBytes(text);
      const decoded = decodeBytes(encoded);
      expect(decoded).toBe(text);
    }
  });

  it('should handle repeated BOM operations efficiently', () => {
    const data = new TextEncoder().encode('Test data');

    const startTime = Date.now();
    for (let i = 0; i < 10000; i++) {
      const withBom = addUtf8Bom(data);
      hasUtf8Bom(withBom);
      stripUtf8Bom(withBom);
    }
    const endTime = Date.now();

    // Should complete in reasonable time (< 1 second)
    expect(endTime - startTime).toBeLessThan(1000);
  });

  it('should handle mixed content (binary + text)', () => {
    // Create mixed content: text + binary data + text
    const text1 = 'Start: ';
    const binary = new Uint8Array([0x00, 0x01, 0x02, 0xFF, 0xFE, 0xFD]);
    const text2 = ' :End';

    const encoded1 = encodeToBytes(text1);
    const encoded2 = encodeToBytes(text2);
    const combined = concatBytes(concatBytes(encoded1, binary), encoded2);

    // First part should be text
    const startDecoded = decodeBytes(encoded1);
    expect(startDecoded).toBe(text1);

    // Verify binary section is preserved
    expect(combined.slice(encoded1.length, encoded1.length + binary.length)).toEqual(binary);
  });

  it('should handle rapidly alternating operations', () => {
    let data = encodeToBytes('initial');

    for (let i = 0; i < 100; i++) {
      if (i % 2 === 0) {
        data = addUtf8Bom(stripUtf8Bom(data));
      } else {
        data = encodeToBytes(`iteration ${i}`);
      }
    }

    // Should not throw or corrupt
    expect(() => decodeBytes(data)).not.toThrow();
  });
});