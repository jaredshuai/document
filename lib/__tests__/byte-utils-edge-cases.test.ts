/**
 * Additional byte utility edge case tests for comprehensive coverage.
 */
import { describe, expect, it } from 'vitest';
import {
  encodeToBytes,
  decodeBytes,
  hasUtf8Bom,
  concatBytes,
} from '../byte-utils';

// =============================================================================
// ENCODING EDGE CASES
// =============================================================================

describe('Byte Utils: Encoding Edge Cases', () => {
  describe('encodeToBytes', () => {
    it('should encode empty string', () => {
      const bytes = encodeToBytes('');
      expect(bytes).toBeInstanceOf(Uint8Array);
      expect(bytes.length).toBe(0);
    });

    it('should encode ASCII text', () => {
      const bytes = encodeToBytes('Hello, World!');
      expect(bytes.length).toBe(13);

      const decoded = decodeBytes(bytes);
      expect(decoded).toBe('Hello, World!');
    });

    it('should encode special characters', () => {
      const text = '!@#$%^&*()_+-=[]{}|;:\'",.<>?/`~';
      const bytes = encodeToBytes(text);
      const decoded = decodeBytes(bytes);
      expect(decoded).toBe(text);
    });

    it('should encode newlines and tabs', () => {
      const text = 'Line 1\nLine 2\tTabbed\r\nWindows';
      const bytes = encodeToBytes(text);
      const decoded = decodeBytes(bytes);
      expect(decoded).toBe(text);
    });

    it('should encode Unicode BMP characters', () => {
      const text = 'Hello 世界 مرحبا שלום';
      const bytes = encodeToBytes(text);
      const decoded = decodeBytes(bytes);
      expect(decoded).toBe(text);
    });

    it('should encode emoji', () => {
      const text = '📄📝📊📈🎉🌍💻';
      const bytes = encodeToBytes(text);
      const decoded = decodeBytes(bytes);
      expect(decoded).toBe(text);
    });

    it('should encode mixed content', () => {
      const text = 'ASCII, 中文, emoji 🚀, symbols ©®™';
      const bytes = encodeToBytes(text);
      const decoded = decodeBytes(bytes);
      expect(decoded).toBe(text);
    });

    it('should encode null characters', () => {
      const text = 'before\x00after';
      const bytes = encodeToBytes(text);
      const decoded = decodeBytes(bytes);
      expect(decoded).toBe('before\x00after');
    });

    it('should encode control characters', () => {
      const text = '\x01\x02\x03\x04\x05';
      const bytes = encodeToBytes(text);
      const decoded = decodeBytes(bytes);
      expect(decoded).toBe(text);
    });
  });

  describe('decodeBytes', () => {
    it('should decode empty array', () => {
      const decoded = decodeBytes(new Uint8Array(0));
      expect(decoded).toBe('');
    });

    it('should decode ASCII bytes', () => {
      const bytes = new Uint8Array([72, 101, 108, 108, 111]); // "Hello"
      expect(decodeBytes(bytes)).toBe('Hello');
    });

    it('should decode UTF-8 multibyte characters', () => {
      // "中" in UTF-8: 0xE4 0xB8 0xAD
      const bytes = new Uint8Array([0xE4, 0xB8, 0xAD]);
      expect(decodeBytes(bytes)).toBe('中');
    });

    it('should decode emoji', () => {
      // "📄" in UTF-8: 0xF0 0x9F 0x93 0x84
      const bytes = new Uint8Array([0xF0, 0x9F, 0x93, 0x84]);
      expect(decodeBytes(bytes)).toBe('📄');
    });
  });
});

// =============================================================================
// BOM HANDLING EDGE CASES
// =============================================================================

describe('Byte Utils: BOM Handling', () => {
  describe('hasUtf8Bom', () => {
    it('should detect UTF-8 BOM', () => {
      const withBom = new Uint8Array([0xEF, 0xBB, 0xBF, 0x48, 0x65, 0x6C, 0x6C, 0x6F]);
      expect(hasUtf8Bom(withBom)).toBe(true);
    });

    it('should not detect BOM when absent', () => {
      const withoutBom = new Uint8Array([0x48, 0x65, 0x6C, 0x6C, 0x6F]); // "Hello"
      expect(hasUtf8Bom(withoutBom)).toBe(false);
    });

    it('should not detect BOM in empty array', () => {
      expect(hasUtf8Bom(new Uint8Array(0))).toBe(false);
    });

    it('should not detect BOM in short array', () => {
      expect(hasUtf8Bom(new Uint8Array([0xEF]))).toBe(false);
      expect(hasUtf8Bom(new Uint8Array([0xEF, 0xBB]))).toBe(false);
    });

    it('should not detect partial BOM at wrong position', () => {
      const wrongBom = new Uint8Array([0x00, 0xEF, 0xBB, 0xBF]);
      expect(hasUtf8Bom(wrongBom)).toBe(false);
    });

    it('should handle BOM-only content', () => {
      const bomOnly = new Uint8Array([0xEF, 0xBB, 0xBF]);
      expect(hasUtf8Bom(bomOnly)).toBe(true);
    });

    it('should not detect other BOM types', () => {
      // UTF-16 BE BOM: 0xFE 0xFF
      const utf16Be = new Uint8Array([0xFE, 0xFF, 0x00, 0x48]);
      expect(hasUtf8Bom(utf16Be)).toBe(false);

      // UTF-16 LE BOM: 0xFF 0xFE
      const utf16Le = new Uint8Array([0xFF, 0xFE, 0x48, 0x00]);
      expect(hasUtf8Bom(utf16Le)).toBe(false);
    });
  });

  describe('BOM handling in decodeBytes', () => {
    it('should skip UTF-8 BOM when decoding', () => {
      const withBom = new Uint8Array([0xEF, 0xBB, 0xBF, 0x48, 0x65, 0x6C, 0x6C, 0x6F]);
      const decoded = decodeBytes(withBom);
      expect(decoded).toBe('Hello');
      expect(decoded).not.toContain('\uFEFF'); // BOM character
    });

    it('should decode content after BOM', () => {
      const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
      const content = encodeToBytes('中文内容');
      const withBom = concatBytes(bom, content);

      expect(hasUtf8Bom(withBom)).toBe(true);
      expect(decodeBytes(withBom)).toBe('中文内容');
    });
  });
});

// =============================================================================
// CONCATENATION EDGE CASES
// =============================================================================

describe('Byte Utils: Concatenation Edge Cases', () => {
  describe('concatBytes', () => {
    it('should concatenate empty arrays', () => {
      const result = concatBytes(new Uint8Array(0), new Uint8Array(0));
      expect(result.length).toBe(0);
    });

    it('should concatenate with empty first array', () => {
      const bytes = new Uint8Array([1, 2, 3]);
      const result = concatBytes(new Uint8Array(0), bytes);
      expect(result).toEqual(bytes);
    });

    it('should concatenate with empty second array', () => {
      const bytes = new Uint8Array([1, 2, 3]);
      const result = concatBytes(bytes, new Uint8Array(0));
      expect(result).toEqual(bytes);
    });

    it('should concatenate two arrays', () => {
      const a = new Uint8Array([1, 2, 3]);
      const b = new Uint8Array([4, 5, 6]);
      const result = concatBytes(a, b);
      expect(result).toEqual(new Uint8Array([1, 2, 3, 4, 5, 6]));
    });

    it('should not modify original arrays', () => {
      const a = new Uint8Array([1, 2, 3]);
      const b = new Uint8Array([4, 5, 6]);
      const aCopy = new Uint8Array(a);
      const bCopy = new Uint8Array(b);

      concatBytes(a, b);

      expect(a).toEqual(aCopy);
      expect(b).toEqual(bCopy);
    });

    it('should handle large arrays', () => {
      const a = new Uint8Array(1000).fill(1);
      const b = new Uint8Array(1000).fill(2);
      const result = concatBytes(a, b);

      expect(result.length).toBe(2000);
      expect(result[0]).toBe(1);
      expect(result[999]).toBe(1);
      expect(result[1000]).toBe(2);
      expect(result[1999]).toBe(2);
    });

    it('should handle multiple concatenations', () => {
      const a = encodeToBytes('Hello ');
      const b = encodeToBytes('World');
      const c = encodeToBytes('!');

      const result = concatBytes(concatBytes(a, b), c);
      expect(decodeBytes(result)).toBe('Hello World!');
    });
  });
});

// =============================================================================
// ROUND-TRIP EDGE CASES
// =============================================================================

describe('Byte Utils: Round-Trip Edge Cases', () => {
  it('should round-trip empty string', () => {
    const bytes = encodeToBytes('');
    expect(decodeBytes(bytes)).toBe('');
  });

  it('should round-trip whitespace', () => {
    const text = '   \t\t\n\n   ';
    expect(decodeBytes(encodeToBytes(text))).toBe(text);
  });

  it('should round-trip long text', () => {
    const text = 'A'.repeat(10000);
    expect(decodeBytes(encodeToBytes(text))).toBe(text);
  });

  it('should round-trip mixed content', () => {
    const text = `
      Multi-line text
      with 中文 characters
      and emoji 🎉🎊🎁
      and special chars: ©®™§¶
    `;
    expect(decodeBytes(encodeToBytes(text))).toBe(text);
  });

  it('should round-trip JSON-like content', () => {
    const text = '{"name":"测试","values":[1,2,3],"emoji":"🚀"}';
    expect(decodeBytes(encodeToBytes(text))).toBe(text);
  });

  it('should round-trip XML-like content', () => {
    const text = '<?xml version="1.0"?><root><item>中文</item></root>';
    expect(decodeBytes(encodeToBytes(text))).toBe(text);
  });

  it('should round-trip CSV content', () => {
    const text = 'name,value,描述\n"test",123,"测试数据"\n"中文",456,"数据"';
    expect(decodeBytes(encodeToBytes(text))).toBe(text);
  });

  it('should round-trip all ASCII printable characters', () => {
    const text = Array.from({ length: 95 }, (_, i) => String.fromCharCode(32 + i)).join('');
    expect(decodeBytes(encodeToBytes(text))).toBe(text);
  });
});

// =============================================================================
// PERFORMANCE EDGE CASES
// =============================================================================

describe('Byte Utils: Performance Edge Cases', () => {
  it('should handle large text encoding', () => {
    const text = 'x'.repeat(1000000); // 1MB
    const start = Date.now();
    const bytes = encodeToBytes(text);
    const duration = Date.now() - start;

    expect(bytes.length).toBe(1000000);
    expect(duration).toBeLessThan(1000);
  });

  it('should handle large text decoding', () => {
    const bytes = new Uint8Array(1000000).fill(65); // 1MB of 'A'
    const start = Date.now();
    const decoded = decodeBytes(bytes);
    const duration = Date.now() - start;

    expect(decoded.length).toBe(1000000);
    expect(duration).toBeLessThan(1000);
  });

  it('should handle many small concatenations', () => {
    const start = Date.now();
    let result: Uint8Array = new Uint8Array(0);

    for (let i = 0; i < 100; i++) {
      result = concatBytes(result, encodeToBytes(`chunk${i}`));
    }

    const duration = Date.now() - start;
    expect(result.length).toBeGreaterThan(0);
    expect(duration).toBeLessThan(100);
  });

  it('should handle rapid BOM checks', () => {
    const withBom = new Uint8Array([0xEF, 0xBB, 0xBF, 65, 66, 67]);
    const withoutBom = new Uint8Array([65, 66, 67]);

    const start = Date.now();
    for (let i = 0; i < 10000; i++) {
      hasUtf8Bom(i % 2 === 0 ? withBom : withoutBom);
    }
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(100);
  });
});
