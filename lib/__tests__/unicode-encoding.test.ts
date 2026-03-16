/**
 * Phase 69: Unicode and Encoding Tests
 *
 * Tests for unicode handling, encoding edge cases, and internationalization.
 */

import { describe, it, expect } from 'vitest';
import {
  encodeToBytes,
  decodeBytes,
  hasUtf8Bom,
  stripUtf8Bom,
  addUtf8Bom,
  concatBytes,
} from '../byte-utils';
import {
  sanitizeFileName,
  getFileExtension,
  safeDecodeUri,
} from '../url-utils';
import {
  escapeXml,
} from '../conversion-utils';

describe('Unicode String Handling', () => {
  describe('Chinese characters', () => {
    it('should encode/decode Chinese text', () => {
      const chinese = '你好世界，这是一个测试文件';
      const bytes = encodeToBytes(chinese);
      const decoded = decodeBytes(bytes);
      expect(decoded).toBe(chinese);
    });

    it('should sanitize Chinese filenames', () => {
      const filename = '文档报告2024.docx';
      const sanitized = sanitizeFileName(filename);
      expect(sanitized).toContain('文档');
      expect(sanitized).toContain('.docx');
    });

    it('should get extension from Chinese filename', () => {
      expect(getFileExtension('文档.docx')).toBe('docx');
      expect(getFileExtension('表格.xlsx')).toBe('xlsx');
    });
  });

  describe('Japanese characters', () => {
    it('should encode/decode Japanese text', () => {
      const japanese = 'こんにちは世界、テストファイルです';
      const bytes = encodeToBytes(japanese);
      const decoded = decodeBytes(bytes);
      expect(decoded).toBe(japanese);
    });

    it('should sanitize Japanese filenames', () => {
      const filename = 'レポート2024.xlsx';
      const sanitized = sanitizeFileName(filename);
      expect(sanitized).toContain('レポート');
      expect(sanitized).toContain('.xlsx');
    });
  });

  describe('Korean characters', () => {
    it('should encode/decode Korean text', () => {
      const korean = '안녕하세요 세계';
      const bytes = encodeToBytes(korean);
      const decoded = decodeBytes(bytes);
      expect(decoded).toBe(korean);
    });

    it('should sanitize Korean filenames', () => {
      const filename = '문서2024.pptx';
      const sanitized = sanitizeFileName(filename);
      expect(sanitized).toContain('문서');
      expect(sanitized).toContain('.pptx');
    });
  });

  describe('Arabic characters', () => {
    it('should encode/decode Arabic text', () => {
      const arabic = 'مرحبا بالعالم';
      const bytes = encodeToBytes(arabic);
      const decoded = decodeBytes(bytes);
      expect(decoded).toBe(arabic);
    });

    it('should handle RTL text in filenames', () => {
      const filename = 'مستخدم.docx';
      const sanitized = sanitizeFileName(filename);
      expect(sanitized).toContain('.docx');
    });
  });

  describe('Hebrew characters', () => {
    it('should encode/decode Hebrew text', () => {
      const hebrew = 'שלום עולם';
      const bytes = encodeToBytes(hebrew);
      const decoded = decodeBytes(bytes);
      expect(decoded).toBe(hebrew);
    });
  });

  describe('Emoji handling', () => {
    it('should encode/decode emoji', () => {
      const emoji = 'Hello 🎉 World 🌍 Test 📄';
      const bytes = encodeToBytes(emoji);
      const decoded = decodeBytes(bytes);
      expect(decoded).toBe(emoji);
    });

    it('should handle emoji in filenames', () => {
      const filename = 'file🎉.docx';
      const sanitized = sanitizeFileName(filename);
      expect(sanitized).toContain('.docx');
    });

    it('should handle various emoji types', () => {
      const emojis = ['😀', '👋', '📄', '📊', '📈', '🎯', '✅', '❌'];
      for (const emoji of emojis) {
        const bytes = encodeToBytes(emoji);
        const decoded = decodeBytes(bytes);
        expect(decoded).toBe(emoji);
      }
    });

    it('should handle multi-codepoint emoji', () => {
      // Family emoji: 👨‍👩‍👧‍👦
      const family = '👨‍👩‍👧‍👦';
      const bytes = encodeToBytes(family);
      const decoded = decodeBytes(bytes);
      expect(decoded).toBe(family);
    });
  });

  describe('Special Unicode characters', () => {
    it('should handle zero-width characters', () => {
      const withZeroWidth = 'file\u200Bname.docx'; // Zero-width space
      const sanitized = sanitizeFileName(withZeroWidth);
      expect(sanitized).toBeDefined();
    });

    it('should handle non-breaking spaces', () => {
      const withNbsp = 'file\u00A0name.docx'; // Non-breaking space
      const sanitized = sanitizeFileName(withNbsp);
      expect(sanitized).toBeDefined();
    });

    it('should handle mathematical symbols', () => {
      const math = '∑∏∫∂√∞.docx';
      const sanitized = sanitizeFileName(math);
      expect(sanitized).toContain('.docx');
    });

    it('should handle currency symbols', () => {
      const currency = 'file$€¥£.docx';
      const sanitized = sanitizeFileName(currency);
      expect(sanitized).toContain('.docx');
    });
  });
});

describe('UTF-8 BOM Handling', () => {
  it('should detect UTF-8 BOM', () => {
    const withBom = new Uint8Array([0xEF, 0xBB, 0xBF, 0x48, 0x65, 0x6C, 0x6C, 0x6F]);
    expect(hasUtf8Bom(withBom)).toBe(true);
  });

  it('should not detect BOM in data without BOM', () => {
    const withoutBom = new Uint8Array([0x48, 0x65, 0x6C, 0x6C, 0x6F]); // "Hello"
    expect(hasUtf8Bom(withoutBom)).toBe(false);
  });

  it('should strip BOM correctly', () => {
    const withBom = new Uint8Array([0xEF, 0xBB, 0xBF, 0x48, 0x65, 0x6C, 0x6C, 0x6F]);
    const stripped = stripUtf8Bom(withBom);
    expect(stripped.length).toBe(5);
    expect(stripped[0]).toBe(0x48); // 'H'
  });

  it('should add BOM correctly', () => {
    const data = new Uint8Array([0x48, 0x65, 0x6C, 0x6C, 0x6F]);
    const withBom = addUtf8Bom(data);
    expect(withBom.length).toBe(8);
    expect(hasUtf8Bom(withBom)).toBe(true);
  });

  it('should not add duplicate BOM', () => {
    const withBom = new Uint8Array([0xEF, 0xBB, 0xBF, 0x48, 0x65]);
    const result = addUtf8Bom(withBom);
    expect(result).toBe(withBom); // Should return same reference
  });

  it('should decode BOM content correctly', () => {
    const withBom = new Uint8Array([0xEF, 0xBB, 0xBF, 0x48, 0x65, 0x6C, 0x6C, 0x6F]);
    const decoded = decodeBytes(withBom);
    expect(decoded).toBe('Hello'); // BOM stripped
  });
});

describe('URI Encoding Edge Cases', () => {
  it('should decode URL-encoded unicode', () => {
    expect(safeDecodeUri('%E4%BD%A0%E5%A5%BD')).toBe('你好');
    expect(safeDecodeUri('%F0%9F%8E%89')).toBe('🎉');
  });

  it('should handle double-encoded URIs', () => {
    const single = '你好';
    const encoded = encodeURIComponent(single);
    const doubleEncoded = encodeURIComponent(encoded);

    expect(safeDecodeUri(doubleEncoded)).toBe(encoded);
    expect(safeDecodeUri(safeDecodeUri(doubleEncoded))).toBe(single);
  });

  it('should handle malformed URI encoding', () => {
    expect(safeDecodeUri('%E0%A4%A')).toBe('%E0%A4%A'); // Invalid UTF-8
    expect(safeDecodeUri('%')).toBe('%');
  });
});

describe('XML Encoding with Unicode', () => {
  it('should preserve unicode in XML escaping', () => {
    const input = 'Hello 世界 <test>';
    const escaped = escapeXml(input);
    expect(escaped).toContain('Hello 世界');
    expect(escaped).toContain('&lt;test&gt;');
  });

  it('should handle emoji in XML content', () => {
    const input = 'Report 📊 Data';
    const escaped = escapeXml(input);
    expect(escaped).toBe('Report 📊 Data'); // No special chars to escape
  });

  it('should handle mixed unicode and special chars', () => {
    const input = '中文<>&测试';
    const escaped = escapeXml(input);
    expect(escaped).toContain('中文');
    expect(escaped).toContain('测试');
    expect(escaped).toContain('&lt;');
    expect(escaped).toContain('&gt;');
    expect(escaped).toContain('&amp;');
  });
});

describe('Byte Concatenation with Unicode', () => {
  it('should concatenate unicode byte arrays', () => {
    const hello = encodeToBytes('Hello ');
    const world = encodeToBytes('世界');

    const combined = concatBytes(hello, world);
    const decoded = decodeBytes(combined);

    expect(decoded).toBe('Hello 世界');
  });

  it('should handle multiple unicode segments', () => {
    const parts = ['Hello', ' ', '世界', '!', '🎉'];
    let combined: Uint8Array = new Uint8Array([]);

    for (const part of parts) {
      combined = concatBytes(combined, encodeToBytes(part));
    }

    expect(decodeBytes(combined)).toBe('Hello 世界!🎉');
  });
});

describe('Encoding Stress Tests', () => {
  it('should handle large unicode strings', () => {
    const large = '你好世界'.repeat(1000);
    const bytes = encodeToBytes(large);
    const decoded = decodeBytes(bytes);
    expect(decoded).toBe(large);
  });

  it('should handle mixed language content', () => {
    const mixed = 'Hello 世界 🌍 مرحبا Привет';
    const bytes = encodeToBytes(mixed);
    const decoded = decodeBytes(bytes);
    expect(decoded).toBe(mixed);
  });

  it('should handle all ASCII characters', () => {
    let ascii = '';
    for (let i = 32; i < 127; i++) {
      ascii += String.fromCharCode(i);
    }
    const bytes = encodeToBytes(ascii);
    const decoded = decodeBytes(bytes);
    expect(decoded).toBe(ascii);
  });

  it('should handle newline variations', () => {
    const newlines = ['\n', '\r\n', '\r', '\u2028', '\u2029'];
    for (const nl of newlines) {
      const bytes = encodeToBytes(nl);
      const decoded = decodeBytes(bytes);
      expect(decoded).toBe(nl);
    }
  });
});