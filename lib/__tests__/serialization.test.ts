/**
 * Serialization Tests for Data Structures.
 * These tests verify that data structures serialize/deserialize correctly
 * and maintain data integrity through transformations.
 */
import { describe, expect, it } from 'vitest';
import { encodeToBytes, decodeBytes, hasUtf8Bom, concatBytes, UTF8_BOM } from '../byte-utils';
import { escapeXml, createConversionParams } from '../conversion-utils';
import { isValidRenderOfficeData } from '../type-guards';
import type { RenderOfficeData } from '../events';

// =============================================================================
// BYTE SERIALIZATION TESTS
// =============================================================================

describe('Serialization: Byte Utilities', () => {
  describe('Text Round-Trip Encoding', () => {
    it('should round-trip ASCII text', () => {
      const text = 'Hello, World!';
      const encoded = encodeToBytes(text);
      const decoded = decodeBytes(encoded);
      expect(decoded).toBe(text);
    });

    it('should round-trip UTF-8 text with BOM', () => {
      const text = 'Hello, 世界!';
      const encoded = encodeToBytes(text, true); // with BOM
      const decoded = decodeBytes(encoded);
      expect(decoded).toBe(text);
      expect(hasUtf8Bom(encoded)).toBe(true);
    });

    it('should round-trip UTF-8 text without BOM', () => {
      const text = 'Привет мир';
      const encoded = encodeToBytes(text, false); // without BOM
      const decoded = decodeBytes(encoded);
      expect(decoded).toBe(text);
      expect(hasUtf8Bom(encoded)).toBe(false);
    });

    it('should round-trip emoji', () => {
      const text = '😀🎉🚀💻';
      const encoded = encodeToBytes(text);
      const decoded = decodeBytes(encoded);
      expect(decoded).toBe(text);
    });

    it('should round-trip mixed content', () => {
      const text = 'Hello 世界! Привет 🌍';
      const encoded = encodeToBytes(text);
      const decoded = decodeBytes(encoded);
      expect(decoded).toBe(text);
    });

    it('should round-trip empty string', () => {
      const text = '';
      const encoded = encodeToBytes(text);
      const decoded = decodeBytes(encoded);
      expect(decoded).toBe(text);
    });

    it('should round-trip newlines and special chars', () => {
      const text = 'Line1\nLine2\r\nLine3\tTabbed';
      const encoded = encodeToBytes(text);
      const decoded = decodeBytes(encoded);
      expect(decoded).toBe(text);
    });
  });

  describe('BOM Handling', () => {
    it('should detect UTF-8 BOM', () => {
      const dataWithBom = concatBytes(UTF8_BOM, encodeToBytes('test'));
      expect(hasUtf8Bom(dataWithBom)).toBe(true);
    });

    it('should not detect BOM in data without BOM', () => {
      const dataWithoutBom = encodeToBytes('test');
      expect(hasUtf8Bom(dataWithoutBom)).toBe(false);
    });

    it('should correctly decode data with BOM', () => {
      const text = '测试文本';
      const dataWithBom = concatBytes(UTF8_BOM, encodeToBytes(text));
      const decoded = decodeBytes(dataWithBom);
      expect(decoded).toBe(text);
    });

    it('should correctly decode data without BOM', () => {
      const text = 'テストテキスト';
      const dataWithoutBom = encodeToBytes(text);
      const decoded = decodeBytes(dataWithoutBom);
      expect(decoded).toBe(text);
    });
  });

  describe('Byte Array Operations', () => {
    it('should concatenate byte arrays', () => {
      const a = new Uint8Array([1, 2, 3]);
      const b = new Uint8Array([4, 5, 6]);
      const result = concatBytes(a, b);
      expect([...result]).toEqual([1, 2, 3, 4, 5, 6]);
    });

    it('should concatenate empty arrays', () => {
      const a = new Uint8Array([]);
      const b = new Uint8Array([1, 2, 3]);
      const result = concatBytes(a, b);
      expect([...result]).toEqual([1, 2, 3]);
    });

    it('should concatenate multiple arrays', () => {
      const a = new Uint8Array([1]);
      const b = new Uint8Array([2]);
      const c = new Uint8Array([3]);
      const result = concatBytes(concatBytes(a, b), c);
      expect([...result]).toEqual([1, 2, 3]);
    });
  });
});

// =============================================================================
// XML SERIALIZATION TESTS
// =============================================================================

describe('Serialization: XML Encoding', () => {
  describe('escapeXml', () => {
    it('should escape special XML characters', () => {
      expect(escapeXml('<')).toBe('&lt;');
      expect(escapeXml('>')).toBe('&gt;');
      expect(escapeXml('&')).toBe('&amp;');
      expect(escapeXml('"')).toBe('&quot;');
      expect(escapeXml("'")).toBe('&apos;');
    });

    it('should handle mixed content', () => {
      const input = '<tag attr="value">Tom & Jerry</tag>';
      const expected = '&lt;tag attr=&quot;value&quot;&gt;Tom &amp; Jerry&lt;/tag&gt;';
      expect(escapeXml(input)).toBe(expected);
    });

    it('should preserve non-special characters', () => {
      const input = 'Hello, World!';
      expect(escapeXml(input)).toBe(input);
    });

    it('should escape all occurrences', () => {
      const input = '<<&&>>""\'\'';
      expect(escapeXml(input)).toBe('&lt;&lt;&amp;&amp;&gt;&gt;&quot;&quot;&apos;&apos;');
    });

    it('should handle empty string', () => {
      expect(escapeXml('')).toBe('');
    });

    it('should handle Unicode in XML content', () => {
      const input = '<tag>中文 & 日本語</tag>';
      const expected = '&lt;tag&gt;中文 &amp; 日本語&lt;/tag&gt;';
      expect(escapeXml(input)).toBe(expected);
    });
  });

  describe('createConversionParams', () => {
    it('should generate valid XML structure', () => {
      const params = createConversionParams('/input.docx', '/output.bin', '');
      expect(params).toContain('<?xml');
      expect(params).toContain('TaskQueueDataConvert');
      expect(params).toContain('m_sFileFrom');
      expect(params).toContain('m_sFileTo');
    });

    it('should include input and output paths', () => {
      const params = createConversionParams('/path/to/input.xlsx', '/output.bin', '');
      expect(params).toContain('/path/to/input.xlsx');
      expect(params).toContain('/output.bin');
    });

    it('should include additional parameters', () => {
      const params = createConversionParams('/in', '/out', '<m_nFormatFrom>260</m_nFormatFrom>');
      expect(params).toContain('m_nFormatFrom');
      expect(params).toContain('260');
    });

    it('should include paths directly (not escaped by createConversionParams)', () => {
      // Note: createConversionParams does not escape paths internally
      // It embeds them directly in the XML template
      const params = createConversionParams('/input.docx', '/output.bin', '');
      expect(params).toContain('/input.docx');
      expect(params).toContain('/output.bin');
    });

    it('should handle empty additional params', () => {
      const params = createConversionParams('/in', '/out', '');
      expect(params).toContain('m_sFileFrom');
      expect(params).toContain('m_sFileTo');
    });
  });
});

// =============================================================================
// RENDER OFFICE DATA SERIALIZATION
// =============================================================================

describe('Serialization: RenderOfficeData', () => {
  function createValidRenderData(overrides: Partial<RenderOfficeData> = {}): RenderOfficeData {
    return {
      chunkIndex: 0,
      data: 'base64encodeddata',
      lastModified: Date.now(),
      name: 'document.docx',
      size: 4096,
      totalChunks: 1,
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ...overrides,
    };
  }

  describe('JSON Serialization Round-Trip', () => {
    it('should round-trip through JSON.stringify/parse', () => {
      const original = createValidRenderData();
      const json = JSON.stringify(original);
      const parsed = JSON.parse(json);

      expect(isValidRenderOfficeData(parsed)).toBe(true);
      expect(parsed.chunkIndex).toBe(original.chunkIndex);
      expect(parsed.name).toBe(original.name);
      expect(parsed.size).toBe(original.size);
      expect(parsed.totalChunks).toBe(original.totalChunks);
    });

    it('should round-trip multi-chunk data', () => {
      const original = createValidRenderData({
        chunkIndex: 5,
        totalChunks: 10,
        name: 'large-file.xlsx',
        size: 1024000,
      });
      const json = JSON.stringify(original);
      const parsed = JSON.parse(json);

      expect(isValidRenderOfficeData(parsed)).toBe(true);
      expect(parsed.chunkIndex).toBe(5);
      expect(parsed.totalChunks).toBe(10);
    });

    it('should handle Unicode filenames in serialization', () => {
      const original = createValidRenderData({
        name: '文档测试.docx',
      });
      const json = JSON.stringify(original);
      const parsed = JSON.parse(json);

      expect(parsed.name).toBe('文档测试.docx');
      expect(isValidRenderOfficeData(parsed)).toBe(true);
    });

    it('should handle empty data field', () => {
      const original = createValidRenderData({
        data: '',
      });
      const json = JSON.stringify(original);
      const parsed = JSON.parse(json);

      expect(parsed.data).toBe('');
      expect(isValidRenderOfficeData(parsed)).toBe(true);
    });
  });

  describe('Validation After Deserialization', () => {
    it('should validate required fields', () => {
      const invalidData = {
        name: 'test.docx',
        // Missing other required fields
      };
      expect(isValidRenderOfficeData(invalidData)).toBe(false);
    });

    it('should validate numeric fields are numbers', () => {
      const invalidData = {
        chunkIndex: '0', // String instead of number
        data: 'test',
        lastModified: Date.now(),
        name: 'test.docx',
        size: 4096,
        totalChunks: 1,
        type: 'application/octet-stream',
      };
      expect(isValidRenderOfficeData(invalidData)).toBe(false);
    });

    it('should validate chunkIndex constraints', () => {
      const invalidData = createValidRenderData({
        chunkIndex: 5,
        totalChunks: 3, // chunkIndex >= totalChunks
      });
      expect(isValidRenderOfficeData(invalidData)).toBe(false);
    });

    it('should validate negative values', () => {
      const invalidSize = createValidRenderData({
        size: -1,
      });
      expect(isValidRenderOfficeData(invalidSize)).toBe(false);

      const invalidLastModified = createValidRenderData({
        lastModified: -1,
      });
      expect(isValidRenderOfficeData(invalidLastModified)).toBe(false);

      const invalidChunkIndex = createValidRenderData({
        chunkIndex: -1,
      });
      expect(isValidRenderOfficeData(invalidChunkIndex)).toBe(false);
    });
  });
});

// =============================================================================
// MIME TYPE AND EXTENSION SERIALIZATION
// =============================================================================

import { getMimeType, extractFileType, getFileExtension } from '../url-utils';
import { DOCUMENT_TYPE_MAP, getDocumentType } from '../document-utils';

describe('Serialization: MIME Types and Extensions', () => {
  describe('Extension <-> MIME Type Round-Trip', () => {
    it('should round-trip common document extensions that have MIME mapping', () => {
      // Extensions that have bidirectional MIME mapping
      const extensions = ['docx', 'xlsx', 'pptx', 'doc', 'xls', 'ppt', 'odt', 'ods', 'odp'];

      for (const ext of extensions) {
        const mime = getMimeType(ext);
        expect(mime).not.toBe('application/octet-stream');

        const extractedExt = extractFileType(mime);
        expect(extractedExt).toBe(ext);
      }
    });

    it('should handle PDF extension (has MIME but no reverse mapping)', () => {
      const mime = getMimeType('pdf');
      expect(mime).toBe('application/pdf');

      // PDF is not in MIME_TO_EXTENSION reverse map
      const extractedExt = extractFileType('application/pdf');
      expect(extractedExt).toBe(''); // Not in reverse map
    });

    it('should handle unknown MIME types gracefully', () => {
      const result = extractFileType('application/unknown-format');
      expect(result).toBe(''); // Unknown MIME returns empty
    });

    it('should handle unknown extensions gracefully', () => {
      const mime = getMimeType('unknown-extension');
      expect(mime).toBe('application/octet-stream');
    });
  });

  describe('Extension Case Handling', () => {
    it('should handle uppercase extensions', () => {
      expect(getFileExtension('FILE.DOCX')).toBe('docx');
      expect(getMimeType('DOCX')).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    });

    it('should handle mixed case extensions', () => {
      expect(getFileExtension('File.Docx')).toBe('docx');
    });
  });

  describe('Document Type Mapping Serialization', () => {
    it('should have consistent DOCUMENT_TYPE_MAP entries', () => {
      const extensions = Object.keys(DOCUMENT_TYPE_MAP);

      for (const ext of extensions) {
        // Each extension should map to a valid document type
        const docType = getDocumentType(ext);
        expect(docType).not.toBeNull();
      }
    });

    it('should serialize DOCUMENT_TYPE_MAP to JSON', () => {
      const json = JSON.stringify(DOCUMENT_TYPE_MAP);
      const parsed = JSON.parse(json);

      expect(parsed['docx']).toBe('word');
      expect(parsed['xlsx']).toBe('cell');
      expect(parsed['pptx']).toBe('slide');
    });
  });
});

// =============================================================================
// CHUNK DATA SERIALIZATION SIMULATION
// =============================================================================

describe('Serialization: Chunk Data Pipeline', () => {
  function simulateChunkSerialization(
    data: string,
    chunkIndex: number,
    totalChunks: number,
    fileName: string,
  ): RenderOfficeData {
    // Simulate how chunks would be created
    // Note: btoa only handles ASCII, for Unicode we'd use TextEncoder + base64
    const encodedData = data.match(/^[\x00-\x7F]*$/) ? btoa(data) : Buffer.from(data).toString('base64');
    return {
      chunkIndex,
      data: encodedData, // Base64 encode
      lastModified: Date.now(),
      name: fileName,
      size: data.length,
      totalChunks,
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    };
  }

  function simulateChunkDeserialization(chunk: RenderOfficeData): string {
    // Simulate how chunks would be decoded
    // Use Buffer for base64 decoding (works in Node.js)
    return Buffer.from(chunk.data, 'base64').toString('utf-8');
  }

  describe('Multi-Chunk Simulation', () => {
    it('should serialize and deserialize chunks correctly', () => {
      const originalData = 'This is test document content for chunking.';

      const chunk = simulateChunkSerialization(originalData, 0, 1, 'test.docx');
      const decoded = simulateChunkDeserialization(chunk);

      expect(decoded).toBe(originalData);
      expect(isValidRenderOfficeData(chunk)).toBe(true);
    });

    it('should maintain chunk metadata integrity', () => {
      const chunk = simulateChunkSerialization('data', 2, 5, 'document.xlsx');

      expect(chunk.chunkIndex).toBe(2);
      expect(chunk.totalChunks).toBe(5);
      expect(chunk.name).toBe('document.xlsx');
    });

    it('should handle Unicode content in chunks', () => {
      const unicodeData = '文档内容: 你好世界 🌍';

      const chunk = simulateChunkSerialization(unicodeData, 0, 1, 'unicode.docx');

      // Verify the chunk is valid
      expect(isValidRenderOfficeData(chunk)).toBe(true);

      // Decode and verify
      const decoded = simulateChunkDeserialization(chunk);
      expect(decoded).toBe(unicodeData);
    });
  });

  describe('Chunk Assembly Simulation', () => {
    it('should simulate chunk reassembly', () => {
      const parts = ['Part1', 'Part2', 'Part3'];
      const chunks: RenderOfficeData[] = [];

      // Create chunks
      for (let i = 0; i < parts.length; i++) {
        chunks.push(
          simulateChunkSerialization(parts[i], i, parts.length, 'multi.docx'),
        );
      }

      // Verify all chunks are valid
      for (const chunk of chunks) {
        expect(isValidRenderOfficeData(chunk)).toBe(true);
      }

      // Simulate reassembly
      const reassembled = chunks
        .sort((a, b) => a.chunkIndex - b.chunkIndex)
        .map((c) => simulateChunkDeserialization(c))
        .join('');

      expect(reassembled).toBe('Part1Part2Part3');
    });
  });
});

// =============================================================================
// ERROR SERIALIZATION
// =============================================================================

import { formatErrorMessage, isErrorLike, createErrorContext } from '../error-utils';

describe('Serialization: Error Objects', () => {
  describe('Error Message Formatting', () => {
    it('should format Error objects', () => {
      const error = new Error('Test error message');
      const formatted = formatErrorMessage(error);
      expect(formatted).toBe('Test error message');
    });

    it('should format error-like objects', () => {
      const errorLike = { message: 'Error from object' };
      const formatted = formatErrorMessage(errorLike);
      expect(formatted).toBe('Error from object');
    });

    it('should format strings', () => {
      expect(formatErrorMessage('String error')).toBe('String error');
    });
  });

  describe('Error Context Serialization', () => {
    it('should create serializable error context', () => {
      const error = new Error('Test error');
      const context = createErrorContext(error, {
        operation: 'testOperation',
        context: {
          fileName: 'test.docx',
          fileSize: 1024,
        },
      });

      // Should be JSON serializable
      const json = JSON.stringify(context);
      const parsed = JSON.parse(json);

      expect(parsed.message).toBe('Test error');
      expect(parsed.operation).toBe('testOperation');
      expect(parsed.context.fileName).toBe('test.docx');
      expect(parsed.timestamp).toBeDefined();
    });
  });

  describe('isErrorLike Detection', () => {
    it('should detect Error instances', () => {
      expect(isErrorLike(new Error('test'))).toBe(true);
      expect(isErrorLike(new TypeError('test'))).toBe(true);
      expect(isErrorLike(new RangeError('test'))).toBe(true);
    });

    it('should detect error-like objects', () => {
      expect(isErrorLike({ message: 'error' })).toBe(true);
      expect(isErrorLike({ message: 'error', stack: 'stack trace' })).toBe(true);
    });

    it('should reject non-error objects', () => {
      expect(isErrorLike('string')).toBe(false);
      expect(isErrorLike(123)).toBe(false);
      expect(isErrorLike(null)).toBe(false);
      expect(isErrorLike(undefined)).toBe(false);
      expect(isErrorLike({})).toBe(false);
    });
  });
});

// =============================================================================
// CONFIG SERIALIZATION
// =============================================================================

import {
  DEFAULT_EDITOR_PERMISSIONS,
  DEFAULT_EDITOR_CUSTOMIZATION,
  createEditorConfig,
} from '../editor-config';

describe('Serialization: Editor Configuration', () => {
  describe('Default Config Serialization', () => {
    it('should serialize DEFAULT_EDITOR_PERMISSIONS', () => {
      const json = JSON.stringify(DEFAULT_EDITOR_PERMISSIONS);
      const parsed = JSON.parse(json);

      expect(parsed.edit).toBeDefined();
      expect(parsed.chat).toBeDefined();
      expect(parsed.protect).toBeDefined();
    });

    it('should serialize DEFAULT_EDITOR_CUSTOMIZATION', () => {
      const json = JSON.stringify(DEFAULT_EDITOR_CUSTOMIZATION);
      const parsed = JSON.parse(json);

      expect(parsed.help).toBeDefined();
      expect(parsed.about).toBeDefined();
      expect(parsed.hideRightMenu).toBeDefined();
    });
  });

  describe('createEditorConfig Serialization', () => {
    it('should create serializable config', () => {
      const config = createEditorConfig({
        fileName: 'test.docx',
        fileType: 'docx',
        lang: 'en',
        events: {
          onAppReady: () => {},
          onDocumentReady: () => {},
          onSave: () => {},
          writeFile: () => {},
        },
      });

      // The config can be JSON serialized (events will become null/undefined)
      const json = JSON.stringify(config);
      const parsed = JSON.parse(json);

      expect(parsed.document.title).toBe('test.docx');
      expect(parsed.document.fileType).toBe('docx');
      expect(parsed.editorConfig.lang).toBe('en');
    });
  });
});