/**
 * Boundary and fuzz tests for critical utility functions.
 * These tests verify behavior at edge cases and with random inputs.
 */
import { describe, expect, it } from 'vitest';
import {
  getFileExtension,
  isSupportedExtension,
  safeDecodeUri,
  sanitizeFileName,
  getMimeType,
  determineFilename,
  isValidUrl,
} from '../url-utils';
import { encodeToBytes, decodeBytes, hasUtf8Bom, concatBytes } from '../byte-utils';
import {
  isValidChunkSequence,
  isValidFile,
  isValidRenderOfficeData,
} from '../type-guards';
import { formatErrorMessage, isErrorLike, isNetworkError, isFileError } from '../error-utils';
import { escapeXml } from '../conversion-utils';
import { getDocumentType, DOCUMENT_TYPE_MAP } from '../document-utils';
import { oAscFileType, c_oAscFileType2 } from '../file-types';
import { createConversionParams } from '../conversion-utils';
import type { RenderOfficeData } from '../events';

// Helper to generate random strings
function randomString(length: number, charset?: string): string {
  const chars = charset || 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Helper to generate random unicode strings
function randomUnicode(length: number): string {
  let result = '';
  for (let i = 0; i < length; i++) {
    const range = Math.floor(Math.random() * 5);
    let codePoint: number;
    switch (range) {
      case 0: codePoint = 32 + Math.floor(Math.random() * 95); break;
      case 1: codePoint = 0x00C0 + Math.floor(Math.random() * 100); break;
      case 2: codePoint = 0x4E00 + Math.floor(Math.random() * 1000); break;
      case 3: codePoint = 0x1F600 + Math.floor(Math.random() * 80); break;
      default: codePoint = 0x0400 + Math.floor(Math.random() * 100);
    }
    result += String.fromCodePoint(codePoint);
  }
  return result;
}

// Helper to create a valid RenderOfficeData chunk
function createValidChunk(index: number, total: number): RenderOfficeData {
  return {
    chunkIndex: index,
    totalChunks: total,
    data: 'test-data',
    name: 'test.docx',
    size: 1000,
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    lastModified: Date.now(),
  };
}

describe('Boundary Tests: getFileExtension', () => {
  it('should handle empty string', () => {
    expect(getFileExtension('')).toBe('');
  });

  it('should handle filename with no extension', () => {
    expect(getFileExtension('filename')).toBe('');
  });

  it('should handle filename with only dots', () => {
    expect(getFileExtension('...')).toBe('');
    expect(getFileExtension('..')).toBe('');
    expect(getFileExtension('.')).toBe('');
  });

  it('should handle very long extensions', () => {
    const longExt = 'a'.repeat(100);
    expect(getFileExtension(`file.${longExt}`)).toBe(longExt);
  });

  it('should handle extensions with numbers', () => {
    expect(getFileExtension('file.123')).toBe('123');
    expect(getFileExtension('file.extension123')).toBe('extension123');
  });

  it('should handle double extensions', () => {
    expect(getFileExtension('file.tar.gz')).toBe('gz');
  });
});

describe('Boundary Tests: sanitizeFileName', () => {
  it('should return file.bin for empty string', () => {
    expect(sanitizeFileName('')).toBe('file.bin');
  });

  it('should return file.bin for whitespace only', () => {
    expect(sanitizeFileName('   ')).toBe('file.bin');
  });

  it('should handle string with only illegal characters', () => {
    // The extension is preserved, illegal chars removed from name part
    const result1 = sanitizeFileName('///\\\\:::.txt');
    expect(result1).toBe('file.txt');
  });

  it('should truncate long filenames to 200 chars + extension', () => {
    const longName = 'a'.repeat(500) + '.txt';
    const result = sanitizeFileName(longName);
    expect(result.length).toBe(204); // 200 + '.' + 'txt'
    expect(result.startsWith('a'.repeat(200))).toBe(true);
    expect(result.endsWith('.txt')).toBe(true);
  });

  it('should preserve unicode characters in name', () => {
    const result = sanitizeFileName('文档测试_😀_текст.txt');
    expect(result).toContain('文档测试');
    expect(result).toContain('.txt');
  });

  it('should sanitize illegal characters while preserving extension', () => {
    // The function extracts 'txt' as extension, sanitizes name part
    const result = sanitizeFileName('a/b\\c:d*e?f"l<e>s|n.txt');
    // After removing illegal chars: abcdeflesn
    expect(result).toBe('abcdeflesn.txt');
  });

  it('should treat single word as extension when no dot present', () => {
    // No dot means entire string is treated as extension
    expect(sanitizeFileName('filename')).toBe('file.filename');
  });
});

describe('Boundary Tests: safeDecodeUri', () => {
  it('should handle empty string', () => {
    expect(safeDecodeUri('')).toBe('');
  });

  it('should handle already decoded strings', () => {
    expect(safeDecodeUri('hello world')).toBe('hello world');
  });

  it('should handle percent-encoded strings', () => {
    expect(safeDecodeUri('hello%20world')).toBe('hello world');
    expect(safeDecodeUri('%E4%B8%AD%E6%96%87')).toBe('中文');
  });

  it('should handle malformed encoding gracefully', () => {
    const result = safeDecodeUri('hello%ZZworld');
    expect(typeof result).toBe('string');
  });

  it('should handle double encoding', () => {
    const doubleEncoded = encodeURIComponent(encodeURIComponent('test'));
    const result = safeDecodeUri(doubleEncoded);
    expect(result).toBeDefined();
  });
});

describe('Boundary Tests: getMimeType', () => {
  it('should return octet-stream for empty extension', () => {
    expect(getMimeType('')).toBe('application/octet-stream');
  });

  it('should return octet-stream for unknown extensions', () => {
    expect(getMimeType('unknownextension')).toBe('application/octet-stream');
    expect(getMimeType('xyz123')).toBe('application/octet-stream');
  });

  it('should be case insensitive', () => {
    expect(getMimeType('DOCX')).toBe(getMimeType('docx'));
    expect(getMimeType('XLSX')).toBe(getMimeType('xlsx'));
    expect(getMimeType('PPTX')).toBe(getMimeType('pptx'));
  });

  it('should handle common extensions', () => {
    expect(getMimeType('docx')).toContain('wordprocessing');
    expect(getMimeType('xlsx')).toContain('spreadsheet');
    expect(getMimeType('pptx')).toContain('presentation');
    expect(getMimeType('pdf')).toBe('application/pdf');
  });
});

describe('Boundary Tests: determineFilename', () => {
  it('should return document for empty params', () => {
    expect(determineFilename({})).toBe('document');
  });

  it('should handle null contentDisposition', () => {
    expect(determineFilename({ contentDisposition: null, url: 'https://example.com/doc.pdf' })).toBe('doc.pdf');
  });

  it('should prefer fileName over Content-Disposition', () => {
    const result = determineFilename({
      fileName: 'custom.docx',
      contentDisposition: 'attachment; filename="other.xlsx"',
      url: 'https://example.com/path/different.pdf',
    });
    expect(result).toBe('custom.docx');
  });

  it('should prefer Content-Disposition over URL', () => {
    const result = determineFilename({
      contentDisposition: 'attachment; filename="custom.docx"',
      url: 'https://example.com/path/different.xlsx',
    });
    expect(result).toBe('custom.docx');
  });

  it('should handle URLs with query parameters', () => {
    const result = determineFilename({
      url: 'https://example.com/doc.pdf?token=abc&expires=123',
    });
    expect(result).toBe('doc.pdf');
  });

  it('should handle URLs with fragments', () => {
    const result = determineFilename({
      url: 'https://example.com/doc.pdf#page=1',
    });
    expect(result).toBe('doc.pdf');
  });
});

describe('Boundary Tests: isValidUrl', () => {
  it('should handle empty string', () => {
    expect(isValidUrl('')).toBe(false);
  });

  it('should handle relative URLs', () => {
    expect(isValidUrl('/path/to/file')).toBe(false);
    expect(isValidUrl('./relative')).toBe(false);
  });

  it('should handle data URLs', () => {
    expect(isValidUrl('data:text/plain,hello')).toBe(true);
    expect(isValidUrl('data:application/pdf;base64,ABC')).toBe(true);
  });

  it('should handle blob URLs', () => {
    expect(isValidUrl('blob:http://example.com/uuid')).toBe(true);
  });

  it('should handle IP addresses', () => {
    expect(isValidUrl('http://192.168.1.1/file.pdf')).toBe(true);
  });

  it('should handle localhost', () => {
    expect(isValidUrl('http://localhost:3000/file.pdf')).toBe(true);
  });
});

describe('Boundary Tests: Byte Utilities', () => {
  it('should handle empty byte arrays', () => {
    expect(hasUtf8Bom(new Uint8Array(0))).toBe(false);
    expect(decodeBytes(new Uint8Array(0))).toBe('');
    expect(concatBytes(new Uint8Array(0), new Uint8Array(0))).toEqual(new Uint8Array(0));
  });

  it('should handle single-byte arrays', () => {
    const single = new Uint8Array([0x41]);
    expect(decodeBytes(single)).toBe('A');
  });

  it('should handle large byte arrays', () => {
    const large = new Uint8Array(100000).fill(0x41);
    const decoded = decodeBytes(large);
    expect(decoded.length).toBe(100000);
    expect(decoded).toBe('A'.repeat(100000));
  });

  it('should roundtrip encode/decode', () => {
    const testStrings = [
      'Hello, World!',
      '中文测试',
      '😀🎉🚀',
      'Mixed: ASCII, 中文, Emoji 😀',
    ];
    for (const str of testStrings) {
      const encoded = encodeToBytes(str);
      const decoded = decodeBytes(encoded);
      expect(decoded).toBe(str);
    }
  });

  it('should handle BOM edge cases', () => {
    const emptyWithBom = encodeToBytes('');
    expect(hasUtf8Bom(emptyWithBom)).toBe(false);

    const bomOnly = new Uint8Array([0xEF, 0xBB, 0xBF]);
    expect(hasUtf8Bom(bomOnly)).toBe(true);
    expect(decodeBytes(bomOnly)).toBe('');
  });
});

describe('Boundary Tests: Type Guards', () => {
  it('isValidChunkSequence should handle empty array', () => {
    expect(isValidChunkSequence([])).toBe(false);
  });

  it('isValidChunkSequence should validate complete sequences', () => {
    const chunks: RenderOfficeData[] = [
      createValidChunk(0, 2),
      createValidChunk(1, 2),
    ];
    expect(isValidChunkSequence(chunks)).toBe(true);
  });

  it('isValidChunkSequence should reject incomplete sequences', () => {
    const chunks: RenderOfficeData[] = [
      createValidChunk(0, 3),
      createValidChunk(1, 3),
    ];
    expect(isValidChunkSequence(chunks)).toBe(false);
  });

  it('isValidFile should validate basic files', () => {
    expect(isValidFile('test.txt', 1000)).toBe(true);
    expect(isValidFile('test.txt', 0)).toBe(true);
  });

  it('isValidFile should reject invalid inputs', () => {
    expect(isValidFile('', 1000)).toBe(false);
    expect(isValidFile('test.txt', -1)).toBe(false);
  });

  it('isValidRenderOfficeData should validate complete objects', () => {
    const validData = createValidChunk(0, 1);
    expect(isValidRenderOfficeData(validData)).toBe(true);
  });

  it('isValidRenderOfficeData should reject incomplete objects', () => {
    expect(isValidRenderOfficeData({})).toBe(false);
    expect(isValidRenderOfficeData({ name: 'test.docx' })).toBe(false);
  });
});

describe('Boundary Tests: Error Utilities', () => {
  it('formatErrorMessage should handle various inputs', () => {
    expect(formatErrorMessage(null)).toBe('Unknown error');
    expect(formatErrorMessage(undefined)).toBe('Unknown error');
    expect(formatErrorMessage('')).toBe('Unknown error');
    expect(formatErrorMessage('Simple string')).toBe('Simple string');
    expect(formatErrorMessage(new Error('Test error'))).toBe('Test error');
    expect(formatErrorMessage({ message: 'Object error' })).toBe('Object error');
  });

  it('isErrorLike should identify error-like objects', () => {
    expect(isErrorLike(null)).toBe(false);
    expect(isErrorLike({})).toBe(false);
    expect(isErrorLike({ message: 'test' })).toBe(true);
    expect(isErrorLike(new Error())).toBe(true);
  });

  it('isNetworkError should identify network errors', () => {
    expect(isNetworkError(null)).toBe(false);
    expect(isNetworkError(new Error('Network error'))).toBe(true);
    expect(isNetworkError(new Error('fetch failed'))).toBe(true);
    expect(isNetworkError(new Error('Something else'))).toBe(false);
  });

  it('isFileError should identify file errors', () => {
    expect(isFileError(null)).toBe(false);
    expect(isFileError(new Error('File not found'))).toBe(true);
    expect(isFileError(new Error('Permission denied'))).toBe(true);
    expect(isFileError(new Error('Something else'))).toBe(false);
  });
});

describe('Boundary Tests: escapeXml', () => {
  it('should handle empty string', () => {
    expect(escapeXml('')).toBe('');
  });

  it('should handle string with no special characters', () => {
    expect(escapeXml('hello world')).toBe('hello world');
  });

  it('should escape all special characters', () => {
    expect(escapeXml('<>&"\'')).toBe('&lt;&gt;&amp;&quot;&apos;');
  });

  it('should handle mixed content', () => {
    expect(escapeXml('if (a < b && c > d) { return "ok"; }'))
      .toBe('if (a &lt; b &amp;&amp; c &gt; d) { return &quot;ok&quot;; }');
  });

  it('should preserve unicode', () => {
    expect(escapeXml('中文 < test')).toBe('中文 &lt; test');
  });
});

describe('Fuzz Tests: sanitizeFileName', () => {
  it('should never throw on random input', () => {
    for (let i = 0; i < 100; i++) {
      const input = randomUnicode(50);
      expect(() => sanitizeFileName(input)).not.toThrow();
    }
  });

  it('should always return a string', () => {
    for (let i = 0; i < 100; i++) {
      const input = randomUnicode(50);
      const result = sanitizeFileName(input);
      expect(typeof result).toBe('string');
    }
  });

  it('should never exceed 204 characters (200 + extension)', () => {
    for (let i = 0; i < 100; i++) {
      const input = randomUnicode(500) + '.txt';
      const result = sanitizeFileName(input);
      expect(result.length).toBeLessThanOrEqual(204);
    }
  });

  it('should be idempotent', () => {
    for (let i = 0; i < 50; i++) {
      const input = randomUnicode(100) + '.txt';
      const first = sanitizeFileName(input);
      const second = sanitizeFileName(first);
      expect(second).toBe(first);
    }
  });
});

describe('Fuzz Tests: getFileExtension', () => {
  it('should never throw on random input', () => {
    for (let i = 0; i < 100; i++) {
      const input = randomUnicode(50);
      expect(() => getFileExtension(input)).not.toThrow();
    }
  });

  it('should always return lowercase for valid extensions', () => {
    for (let i = 0; i < 50; i++) {
      const ext = randomString(5, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ');
      const result = getFileExtension(`file.${ext}`);
      expect(result).toBe(ext.toLowerCase());
    }
  });
});

describe('Fuzz Tests: safeDecodeUri', () => {
  it('should never throw on random input', () => {
    for (let i = 0; i < 100; i++) {
      const input = randomUnicode(50);
      expect(() => safeDecodeUri(input)).not.toThrow();
    }
  });

  it('should always return a string', () => {
    for (let i = 0; i < 100; i++) {
      const input = randomUnicode(50);
      const result = safeDecodeUri(input);
      expect(typeof result).toBe('string');
    }
  });
});

describe('Fuzz Tests: escapeXml', () => {
  it('should never throw on random input', () => {
    for (let i = 0; i < 100; i++) {
      const input = randomUnicode(100);
      expect(() => escapeXml(input)).not.toThrow();
    }
  });

  it('should always return a string', () => {
    for (let i = 0; i < 100; i++) {
      const input = randomUnicode(50);
      const result = escapeXml(input);
      expect(typeof result).toBe('string');
    }
  });
});

describe('Fuzz Tests: getMimeType', () => {
  it('should never throw on random input', () => {
    for (let i = 0; i < 100; i++) {
      const input = randomString(20);
      expect(() => getMimeType(input)).not.toThrow();
    }
  });

  it('should always return a valid MIME type string', () => {
    for (let i = 0; i < 100; i++) {
      const input = randomString(10);
      const result = getMimeType(input);
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
      expect(result).toContain('/');
    }
  });
});

describe('Fuzz Tests: getDocumentType', () => {
  it('should never throw on random input', () => {
    for (let i = 0; i < 100; i++) {
      const input = randomString(20);
      expect(() => getDocumentType(input)).not.toThrow();
    }
  });
});

describe('Boundary Tests: Document Type Map', () => {
  it('should have all expected document types', () => {
    const expectedTypes = ['word', 'cell', 'slide', 'pdf'];
    for (const ext of Object.values(DOCUMENT_TYPE_MAP)) {
      expect(expectedTypes).toContain(ext);
    }
  });

  it('should have consistent mapping with getDocumentType', () => {
    for (const [ext, type] of Object.entries(DOCUMENT_TYPE_MAP)) {
      expect(getDocumentType(ext)).toBe(type);
    }
  });
});

describe('Boundary Tests: File Type Codes', () => {
  it('should have valid code ranges', () => {
    const codes = Object.values(oAscFileType);
    for (const code of codes) {
      expect(typeof code).toBe('number');
      expect(code).toBeGreaterThanOrEqual(0);
    }
  });

  it('should have reverse mapping consistency', () => {
    for (const [name, code] of Object.entries(oAscFileType)) {
      const reverseName = c_oAscFileType2[code];
      expect(reverseName).toBe(name);
    }
  });
});

describe('Boundary Tests: createConversionParams', () => {
  it('should handle empty filename', () => {
    const result = createConversionParams('', 'xlsx', 'pdf');
    expect(result).toContain('<m_sFileFrom></m_sFileFrom>');
  });

  it('should contain correct structure', () => {
    const result = createConversionParams('test.docx', 'docx', 'pdf');
    expect(result).toContain('<?xml');
    expect(result).toContain('<TaskQueueDataConvert');
    expect(result).toContain('<m_sFileFrom>test.docx</m_sFileFrom>');
    expect(result).toContain('pdf');
  });
});

describe('Boundary Tests: isSupportedExtension', () => {
  it('should handle empty string', () => {
    expect(isSupportedExtension('')).toBe(false);
  });

  it('should be case insensitive', () => {
    expect(isSupportedExtension('DOCX')).toBe(isSupportedExtension('docx'));
    expect(isSupportedExtension('XLSX')).toBe(isSupportedExtension('xlsx'));
  });
});