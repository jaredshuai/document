/**
 * Contract Tests - Invariant testing for utility functions.
 * These tests verify that functions maintain their contracts under all conditions.
 */
import { describe, expect, it } from 'vitest';
import {
  getFileExtension,
  isSupportedExtension,
  sanitizeFileName,
  getMimeType,
  determineFilename,
  safeDecodeUri,
  isValidUrl,
  extractFileType,
} from '../url-utils';
import { encodeToBytes, decodeBytes, hasUtf8Bom, concatBytes } from '../byte-utils';
import { escapeXml, createConversionParams, createOutputFilename } from '../conversion-utils';
import { formatErrorMessage, isError, isErrorLike } from '../error-utils';
import { determineSaveFormat, hasFileExtension } from '../save-format';
import { isValidChunkSequence, isValidFile, isValidRenderOfficeData } from '../type-guards';
import { getDocumentType, DOCUMENT_TYPE_MAP } from '../document-utils';

describe('Contract Tests: SanitizeFileName Invariants', () => {
  describe('Idempotency - f(f(x)) === f(x)', () => {
    it('should be idempotent for valid filenames', () => {
      const filenames = ['document.pdf', 'report.xlsx', 'presentation.pptx', 'data.csv'];
      for (const name of filenames) {
        const once = sanitizeFileName(name);
        const twice = sanitizeFileName(once);
        expect(twice).toBe(once);
      }
    });

    it('should be idempotent for filenames with illegal characters', () => {
      const inputs = ['file<name>.txt', 'path/to/file.doc', 'quote"test".pdf'];
      for (const name of inputs) {
        const once = sanitizeFileName(name);
        const twice = sanitizeFileName(once);
        expect(twice).toBe(once);
      }
    });

    it('should be idempotent for Unicode filenames', () => {
      const inputs = ['文档.docx', 'file_тест.pdf', '😀emoji.xlsx'];
      for (const name of inputs) {
        const once = sanitizeFileName(name);
        const twice = sanitizeFileName(once);
        expect(twice).toBe(once);
      }
    });

    it('should be idempotent for 100 random applications', () => {
      const input = 'test<>:"/\\|?*file.txt';
      let result = input;
      for (let i = 0; i < 100; i++) {
        result = sanitizeFileName(result);
      }
      const expected = sanitizeFileName(input);
      expect(result).toBe(expected);
    });
  });

  describe('Input preservation - output length <= input length', () => {
    it('should never increase filename length when removing illegal chars', () => {
      const inputs = [
        'file<>name.txt',
        'path/to/document.docx',
        'test"quote"file.pdf',
        'normal_filename.xlsx',
      ];
      for (const input of inputs) {
        const result = sanitizeFileName(input);
        expect(result.length).toBeLessThanOrEqual(input.length);
      }
    });
  });

  describe('Extension preservation', () => {
    it('should preserve file extensions after sanitization', () => {
      const testCases = [
        { input: 'file<name>.txt', expectedExt: 'txt' },
        { input: 'path/to/doc.docx', expectedExt: 'docx' },
        { input: 'report"2024".xlsx', expectedExt: 'xlsx' },
      ];
      for (const { input, expectedExt } of testCases) {
        const result = sanitizeFileName(input);
        expect(result.endsWith(`.${expectedExt}`)).toBe(true);
      }
    });
  });
});

describe('Contract Tests: getFileExtension Invariants', () => {
  describe('Round-trip with extension appending', () => {
    it('should extract extension that was added', () => {
      const extensions = ['txt', 'docx', 'xlsx', 'pptx', 'pdf', 'csv'];
      for (const ext of extensions) {
        const filename = `testfile.${ext}`;
        const extracted = getFileExtension(filename);
        expect(extracted).toBe(ext);
      }
    });

    it('should preserve extension through round-trip with case normalization', () => {
      const mixedCase = ['TXT', 'DocX', 'XLSX', 'Pptx', 'PDF'];
      for (const ext of mixedCase) {
        const filename = `file.${ext}`;
        const extracted = getFileExtension(filename);
        expect(extracted).toBe(ext.toLowerCase());
      }
    });
  });

  describe('Empty input handling', () => {
    it('should return empty string for empty filename', () => {
      expect(getFileExtension('')).toBe('');
    });

    it('should return empty string for filename without extension', () => {
      expect(getFileExtension('filename')).toBe('');
    });
  });

  describe('Dot handling', () => {
    it('should handle multiple dots correctly (last wins)', () => {
      expect(getFileExtension('file.name.txt')).toBe('txt');
      expect(getFileExtension('archive.tar.gz')).toBe('gz');
      expect(getFileExtension('data.2024.01.csv')).toBe('csv');
    });

    it('should handle trailing dots', () => {
      expect(getFileExtension('file.')).toBe('');
      expect(getFileExtension('file..')).toBe('');
    });

    it('should handle leading dots', () => {
      expect(getFileExtension('.gitignore')).toBe('gitignore');
      expect(getFileExtension('.env')).toBe('env');
    });
  });
});

describe('Contract Tests: Byte Utilities Invariants', () => {
  describe('Encode/Decode round-trip', () => {
    it('should round-trip ASCII text exactly', () => {
      const text = 'Hello, World!';
      const encoded = encodeToBytes(text);
      const decoded = decodeBytes(encoded);
      expect(decoded).toBe(text);
    });

    it('should round-trip Unicode text exactly', () => {
      const texts = ['你好世界', 'Привет мир', 'مرحبا بالعالم', '🎉🎊🎈'];
      for (const text of texts) {
        const encoded = encodeToBytes(text);
        const decoded = decodeBytes(encoded);
        expect(decoded).toBe(text);
      }
    });

    it('should round-trip empty string', () => {
      const encoded = encodeToBytes('');
      const decoded = decodeBytes(encoded);
      expect(decoded).toBe('');
    });
  });

  describe('BOM handling consistency', () => {
    it('should detect BOM that was added by encodeToBytes with BOM flag', () => {
      const text = 'test';
      const withBom = encodeToBytes(text, true);
      expect(hasUtf8Bom(withBom)).toBe(true);
    });

    it('should not detect BOM in regular encoded text', () => {
      const encoded = encodeToBytes('regular text');
      expect(hasUtf8Bom(encoded)).toBe(false);
    });

    it('should strip BOM during decodeBytes', () => {
      const text = 'test data';
      const withBom = encodeToBytes(text, true);
      const decoded = decodeBytes(withBom);
      expect(decoded).toBe(text); // BOM is stripped during decode
    });

    it('should handle text that starts with U+FEFF as BOM', () => {
      // U+FEFF in text is encoded as EF BB BF, which is the BOM bytes
      const text = '\uFEFFtest';
      const encoded = encodeToBytes(text);
      // decodeBytes strips BOM bytes, so U+FEFF is removed
      const decoded = decodeBytes(encoded);
      expect(decoded).toBe('test');
    });
  });

  describe('Concatenation invariants', () => {
    it('should preserve all bytes in concatenation', () => {
      const a = new Uint8Array([1, 2, 3]);
      const b = new Uint8Array([4, 5, 6]);
      const result = concatBytes(a, b);
      expect(result.length).toBe(a.length + b.length);
      expect(Array.from(result)).toEqual([1, 2, 3, 4, 5, 6]);
    });

    it('should handle empty array concatenation', () => {
      const empty = new Uint8Array([]);
      const data = new Uint8Array([1, 2, 3]);

      expect(concatBytes(empty, data)).toEqual(data);
      expect(concatBytes(data, empty)).toEqual(data);
      expect(concatBytes(empty, empty).length).toBe(0);
    });
  });
});

describe('Contract Tests: escapeXml Invariants', () => {
  describe('Character mapping completeness', () => {
    it('should escape all five special XML characters', () => {
      expect(escapeXml('<')).toBe('&lt;');
      expect(escapeXml('>')).toBe('&gt;');
      expect(escapeXml('&')).toBe('&amp;');
      expect(escapeXml('"')).toBe('&quot;');
      expect(escapeXml("'")).toBe('&apos;');
    });

    it('should handle string with all special characters', () => {
      const input = '<>&"\'test';
      const result = escapeXml(input);
      expect(result).toBe('&lt;&gt;&amp;&quot;&apos;test');
    });

    it('should handle empty string', () => {
      expect(escapeXml('')).toBe('');
    });

    it('should handle string with no special characters', () => {
      expect(escapeXml('plain text')).toBe('plain text');
    });
  });

  describe('Order-dependent behavior', () => {
    it('should escape ampersand first (so &amp; becomes &amp;amp;)', () => {
      // This demonstrates that escapeXml is NOT idempotent
      // because & is escaped first before other entities
      expect(escapeXml('&amp;')).toBe('&amp;amp;');
    });
  });
});

describe('Contract Tests: Error Utilities Invariants', () => {
  describe('Type guard consistency', () => {
    it('should have consistent isError and isErrorLike for Error objects', () => {
      const error = new Error('test');
      expect(isError(error)).toBe(true);
      expect(isErrorLike(error)).toBe(true);
    });

    it('should handle error-like objects correctly', () => {
      const errorLike = { message: 'error', name: 'Error' };
      expect(isError(errorLike)).toBe(false);
      expect(isErrorLike(errorLike)).toBe(true);
    });

    it('should reject non-errors', () => {
      const notError = 'string error';
      expect(isError(notError)).toBe(false);
      expect(isErrorLike(notError)).toBe(false);
    });
  });

  describe('formatErrorMessage always returns string', () => {
    it('should return string for Error objects', () => {
      expect(formatErrorMessage(new Error('test'))).toBe('test');
    });

    it('should return string for string errors', () => {
      expect(formatErrorMessage('string error')).toBe('string error');
    });

    it('should return string for null/undefined', () => {
      expect(formatErrorMessage(null)).toBe('Unknown error');
      expect(formatErrorMessage(undefined)).toBe('Unknown error');
    });

    it('should return string for objects', () => {
      expect(typeof formatErrorMessage({})).toBe('string');
    });
  });
});

describe('Contract Tests: Type Guards Invariants', () => {
  describe('isValidChunkSequence invariants', () => {
    it('should reject invalid sequence (non-array)', () => {
      expect(isValidChunkSequence(null as unknown as [])).toBe(false);
      expect(isValidChunkSequence(undefined as unknown as [])).toBe(false);
    });

    it('should reject empty array', () => {
      expect(isValidChunkSequence([])).toBe(false);
    });

    it('should accept valid chunk sequence', () => {
      const validChunks = [
        {
          chunkIndex: 0,
          data: 'data1',
          lastModified: Date.now(),
          name: 'test.docx',
          size: 100,
          totalChunks: 2,
          type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        },
        {
          chunkIndex: 1,
          data: 'data2',
          lastModified: Date.now(),
          name: 'test.docx',
          size: 100,
          totalChunks: 2,
          type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        },
      ];
      expect(isValidChunkSequence(validChunks)).toBe(true);
    });
  });

  describe('isValidFile invariants', () => {
    it('should reject null/undefined', () => {
      expect(isValidFile(null as unknown as string, 0)).toBe(false);
      expect(isValidFile(undefined as unknown as string, 0)).toBe(false);
    });

    it('should accept valid file parameters', () => {
      expect(isValidFile('test.txt', 1024)).toBe(true);
    });

    it('should reject empty filename', () => {
      expect(isValidFile('', 1024)).toBe(false);
    });

    it('should reject negative size', () => {
      expect(isValidFile('test.txt', -1)).toBe(false);
    });
  });

  describe('isValidRenderOfficeData invariants', () => {
    it('should reject null/undefined', () => {
      expect(isValidRenderOfficeData(null)).toBe(false);
      expect(isValidRenderOfficeData(undefined)).toBe(false);
    });

    it('should reject objects missing required properties', () => {
      expect(isValidRenderOfficeData({})).toBe(false);
      expect(isValidRenderOfficeData({ url: 'test' })).toBe(false);
    });

    it('should accept valid RenderOfficeData', () => {
      const validData = {
        chunkIndex: 0,
        data: 'base64encodeddata',
        lastModified: Date.now(),
        name: 'document.docx',
        size: 1024,
        totalChunks: 1,
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      };
      expect(isValidRenderOfficeData(validData)).toBe(true);
    });
  });
});

describe('Contract Tests: Document Type Resolution Invariants', () => {
  describe('getDocumentType and DOCUMENT_TYPE_MAP consistency', () => {
    it('should return same value as DOCUMENT_TYPE_MAP lookup for supported extensions', () => {
      const supportedExtensions = ['docx', 'xlsx', 'pptx', 'doc', 'xls', 'ppt', 'odt', 'ods', 'odp'];
      for (const ext of supportedExtensions) {
        const fromFunction = getDocumentType(ext);
        const fromMap = DOCUMENT_TYPE_MAP[ext];
        expect(fromFunction).toBe(fromMap);
      }
    });

    it('should return null for unknown extensions (DOCUMENT_TYPE_MAP returns undefined)', () => {
      const unknowns = ['xyz', 'abc', 'unknown', 'pdf'];
      for (const ext of unknowns) {
        expect(getDocumentType(ext)).toBeNull();
        expect(DOCUMENT_TYPE_MAP[ext]).toBeUndefined();
      }
    });
  });

  describe('isSupportedExtension and DOCUMENT_TYPE_MAP consistency', () => {
    it('should match DOCUMENT_TYPE_MAP key presence', () => {
      for (const ext of Object.keys(DOCUMENT_TYPE_MAP)) {
        expect(isSupportedExtension(ext)).toBe(true);
      }
    });

    it('should reject extensions not in DOCUMENT_TYPE_MAP', () => {
      const unsupported = ['exe', 'dll', 'bin', 'xyz'];
      for (const ext of unsupported) {
        expect(isSupportedExtension(ext)).toBe(false);
        expect(DOCUMENT_TYPE_MAP[ext]).toBeUndefined();
      }
    });
  });
});

describe('Contract Tests: MIME Type Invariants', () => {
  describe('getMimeType consistency', () => {
    it('should always return a string for string input', () => {
      const inputs = ['docx', '', 'unknown', 'PDF'] as string[];
      for (const input of inputs) {
        const result = getMimeType(input);
        expect(typeof result).toBe('string');
      }
    });

    it('should return MIME type with forward slash', () => {
      const extensions = ['docx', 'xlsx', 'pptx', 'pdf', 'txt'];
      for (const ext of extensions) {
        const mime = getMimeType(ext);
        expect(mime).toContain('/');
      }
    });

    it('should be case-insensitive', () => {
      const cases = ['docx', 'DOCX', 'Docx', 'DoCx'];
      const mime = getMimeType('docx');
      for (const c of cases) {
        expect(getMimeType(c)).toBe(mime);
      }
    });
  });

  describe('extractFileType consistency', () => {
    it('should return lowercase extension for valid MIME types', () => {
      const mimeTypes = [
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/pdf',
      ];
      for (const mime of mimeTypes) {
        const ext = extractFileType(mime);
        expect(ext).toBe(ext.toLowerCase());
      }
    });

    it('should return empty string for unknown MIME types', () => {
      expect(extractFileType('application/unknown')).toBe('');
      expect(extractFileType('invalid-mime')).toBe('');
    });
  });
});

describe('Contract Tests: Save Format Invariants', () => {
  describe('hasFileExtension consistency', () => {
    it('should be case-insensitive', () => {
      expect(hasFileExtension('file.DOCX', 'docx')).toBe(true);
      expect(hasFileExtension('file.Docx', 'DOCX')).toBe(true);
      expect(hasFileExtension('FILE.DOCX', 'docx')).toBe(true);
    });

    it('should match getFileExtension result', () => {
      const filenames = ['document.docx', 'report.xlsx', 'data.csv'];
      for (const filename of filenames) {
        const ext = getFileExtension(filename);
        expect(hasFileExtension(filename, ext)).toBe(true);
      }
    });
  });

  describe('determineSaveFormat invariants', () => {
    it('should always return a string for valid format codes', () => {
      const codes = [oAscFileType.DOCX, oAscFileType.XLSX, oAscFileType.PPTX];
      for (const code of codes) {
        const result = determineSaveFormat(code, 'document.docx');
        expect(typeof result).toBe('string');
      }
    });

    it('should return uppercase extension format', () => {
      expect(determineSaveFormat(oAscFileType.DOCX, 'document.docx')).toBe('DOCX');
      expect(determineSaveFormat(oAscFileType.XLSX, 'report.xlsx')).toBe('XLSX');
    });
  });
});

import { oAscFileType } from '../file-types';

describe('Contract Tests: URL Utilities Invariants', () => {
  describe('safeDecodeUri never throws', () => {
    it('should return string for any input without throwing', () => {
      const inputs = [
        'normal string',
        '%E4%B8%AD%E6%96%87', // valid encoded
        '%invalid%', // invalid encoding
        '%', // incomplete encoding
        '%%', // double percent
        '', // empty
      ];
      for (const input of inputs) {
        expect(() => safeDecodeUri(input)).not.toThrow();
        expect(typeof safeDecodeUri(input)).toBe('string');
      }
    });
  });

  describe('isValidUrl consistency', () => {
    it('should return boolean for any input', () => {
      const inputs = [
        'https://example.com',
        'invalid',
        '',
        null,
        undefined,
        123,
      ] as unknown[];
      for (const input of inputs) {
        const result = isValidUrl(input as string);
        expect(typeof result).toBe('boolean');
      }
    });

    it('should accept http and https URLs', () => {
      expect(isValidUrl('http://example.com')).toBe(true);
      expect(isValidUrl('https://example.com')).toBe(true);
    });

    it('should reject non-URL strings', () => {
      expect(isValidUrl('not a url')).toBe(false);
      expect(isValidUrl('')).toBe(false);
    });
  });
});

describe('Contract Tests: determineFilename Invariants', () => {
  describe('Always returns string (never null)', () => {
    it('should return string when filename can be determined from contentDisposition', () => {
      const result = determineFilename({
        url: 'https://example.com/document.docx',
        contentDisposition: 'attachment; filename="test.docx"',
      });
      expect(typeof result).toBe('string');
    });

    it('should return string even with no inputs', () => {
      const result = determineFilename({});
      expect(result).toBe('document');
    });

    it('should prefer fileName over contentDisposition', () => {
      const result = determineFilename({
        fileName: 'provided.txt',
        contentDisposition: 'attachment; filename="content.docx"',
        url: 'https://example.com/url.pdf',
      });
      expect(result).toBe('provided.txt');
    });

    it('should prefer contentDisposition over url', () => {
      const result = determineFilename({
        contentDisposition: 'attachment; filename="content.docx"',
        url: 'https://example.com/url.pdf',
      });
      expect(result).toBe('content.docx');
    });

    it('should extract from url when no fileName or contentDisposition', () => {
      const result = determineFilename({
        url: 'https://example.com/document.pdf',
      });
      expect(result).toBe('document.pdf');
    });
  });
});

describe('Contract Tests: Output Filename Generation', () => {
  describe('createOutputFilename invariants', () => {
    it('should always include the extension', () => {
      const result = createOutputFilename('document', 'pdf');
      expect(result.endsWith('.pdf')).toBe(true);
    });

    it('should preserve base name', () => {
      const result = createOutputFilename('mydocument', 'docx');
      expect(result.startsWith('mydocument')).toBe(true);
    });

    it('should handle empty base name', () => {
      const result = createOutputFilename('', 'txt');
      expect(result).toBe('.txt');
    });
  });
});

describe('Contract Tests: Conversion Params Generation', () => {
  describe('createConversionParams output format', () => {
    it('should always produce valid XML', () => {
      const params = createConversionParams('/input.docx', '/output.pdf');
      expect(params).toContain('<?xml');
      expect(params).toContain('</TaskQueueDataConvert>');
      expect(params).toMatch(/<m_sFileFrom[^>]*>/);
    });

    it('should include both input and output paths', () => {
      const params = createConversionParams('/input.docx', '/output.pdf');
      expect(params).toContain('/input.docx');
      expect(params).toContain('/output.pdf');
    });

    it('should handle special characters in paths (no escaping required)', () => {
      // The XML is generated via template - paths are embedded as-is
      const params = createConversionParams('/path/to/file.docx', '/output.pdf');
      expect(params).toContain('/path/to/file.docx');
    });
  });
});

describe('Contract Tests: Matrix Combinations', () => {
  describe('Extension + MIME + Type Matrix', () => {
    const extensionMatrix = [
      { ext: 'docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', docType: 'word' },
      { ext: 'xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', docType: 'cell' },
      { ext: 'pptx', mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', docType: 'slide' },
    ];

    for (const { ext, mimeType, docType } of extensionMatrix) {
      it(`should have consistent mapping for ${ext}`, () => {
        expect(getMimeType(ext)).toBe(mimeType);
        expect(extractFileType(mimeType)).toBe(ext);
        expect(getDocumentType(ext)).toBe(docType);
        expect(isSupportedExtension(ext)).toBe(true);
      });
    }

    // PDF is a special case - it has a MIME type but:
    // 1. extractFileType doesn't reverse it (PDF isn't an editable Office format)
    // 2. getDocumentType returns null (PDF is view-only, not editable)
    // 3. isSupportedExtension returns false
    it('should handle pdf correctly (view-only format)', () => {
      expect(getMimeType('pdf')).toBe('application/pdf');
      expect(getDocumentType('pdf')).toBeNull(); // PDF is not in DOCUMENT_TYPE_MAP
      expect(isSupportedExtension('pdf')).toBe(false); // Not an editable format
    });
  });
});
