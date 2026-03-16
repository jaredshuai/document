import { describe, it, expect } from 'vitest';
import {
  isValidRenderOfficeData,
  isValidChunkSequence,
  isValidFile,
} from '../type-guards';

describe('isValidRenderOfficeData', () => {
  it('should return true for valid RenderOfficeData', () => {
    const validData = {
      chunkIndex: 0,
      data: 'base64encodeddata',
      lastModified: 1234567890,
      name: 'test.docx',
      size: 1024,
      totalChunks: 1,
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    };

    expect(isValidRenderOfficeData(validData)).toBe(true);
  });

  it('should return true for multi-chunk data', () => {
    const validData = {
      chunkIndex: 2,
      data: 'base64encodeddata',
      lastModified: 1234567890,
      name: 'large.xlsx',
      size: 10485760,
      totalChunks: 5,
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };

    expect(isValidRenderOfficeData(validData)).toBe(true);
  });

  it('should return false for null', () => {
    expect(isValidRenderOfficeData(null)).toBe(false);
  });

  it('should return false for undefined', () => {
    expect(isValidRenderOfficeData(undefined)).toBe(false);
  });

  it('should return false for non-object types', () => {
    expect(isValidRenderOfficeData('string')).toBe(false);
    expect(isValidRenderOfficeData(123)).toBe(false);
    expect(isValidRenderOfficeData(true)).toBe(false);
    expect(isValidRenderOfficeData([])).toBe(false);
  });

  it('should return false for missing chunkIndex', () => {
    const data = {
      data: 'base64encodeddata',
      lastModified: 1234567890,
      name: 'test.docx',
      size: 1024,
      totalChunks: 1,
      type: 'application/pdf',
    };

    expect(isValidRenderOfficeData(data)).toBe(false);
  });

  it('should return false for missing data', () => {
    const data = {
      chunkIndex: 0,
      lastModified: 1234567890,
      name: 'test.docx',
      size: 1024,
      totalChunks: 1,
      type: 'application/pdf',
    };

    expect(isValidRenderOfficeData(data)).toBe(false);
  });

  it('should return false for missing name', () => {
    const data = {
      chunkIndex: 0,
      data: 'base64encodeddata',
      lastModified: 1234567890,
      size: 1024,
      totalChunks: 1,
      type: 'application/pdf',
    };

    expect(isValidRenderOfficeData(data)).toBe(false);
  });

  it('should return false for missing size', () => {
    const data = {
      chunkIndex: 0,
      data: 'base64encodeddata',
      lastModified: 1234567890,
      name: 'test.docx',
      totalChunks: 1,
      type: 'application/pdf',
    };

    expect(isValidRenderOfficeData(data)).toBe(false);
  });

  it('should return false for missing totalChunks', () => {
    const data = {
      chunkIndex: 0,
      data: 'base64encodeddata',
      lastModified: 1234567890,
      name: 'test.docx',
      size: 1024,
      type: 'application/pdf',
    };

    expect(isValidRenderOfficeData(data)).toBe(false);
  });

  it('should return false for missing type', () => {
    const data = {
      chunkIndex: 0,
      data: 'base64encodeddata',
      lastModified: 1234567890,
      name: 'test.docx',
      size: 1024,
      totalChunks: 1,
    };

    expect(isValidRenderOfficeData(data)).toBe(false);
  });

  it('should return false for missing lastModified', () => {
    const data = {
      chunkIndex: 0,
      data: 'base64encodeddata',
      name: 'test.docx',
      size: 1024,
      totalChunks: 1,
      type: 'application/pdf',
    };

    expect(isValidRenderOfficeData(data)).toBe(false);
  });

  it('should return false for wrong types', () => {
    expect(
      isValidRenderOfficeData({
        chunkIndex: '0',
        data: 'base64encodeddata',
        lastModified: 1234567890,
        name: 'test.docx',
        size: 1024,
        totalChunks: 1,
        type: 'application/pdf',
      }),
    ).toBe(false);

    expect(
      isValidRenderOfficeData({
        chunkIndex: 0,
        data: 123,
        lastModified: 1234567890,
        name: 'test.docx',
        size: 1024,
        totalChunks: 1,
        type: 'application/pdf',
      }),
    ).toBe(false);

    expect(
      isValidRenderOfficeData({
        chunkIndex: 0,
        data: 'base64encodeddata',
        lastModified: '1234567890',
        name: 'test.docx',
        size: 1024,
        totalChunks: 1,
        type: 'application/pdf',
      }),
    ).toBe(false);

    expect(
      isValidRenderOfficeData({
        chunkIndex: 0,
        data: 'base64encodeddata',
        lastModified: 1234567890,
        name: 123,
        size: 1024,
        totalChunks: 1,
        type: 'application/pdf',
      }),
    ).toBe(false);

    expect(
      isValidRenderOfficeData({
        chunkIndex: 0,
        data: 'base64encodeddata',
        lastModified: 1234567890,
        name: 'test.docx',
        size: '1024',
        totalChunks: 1,
        type: 'application/pdf',
      }),
    ).toBe(false);

    expect(
      isValidRenderOfficeData({
        chunkIndex: 0,
        data: 'base64encodeddata',
        lastModified: 1234567890,
        name: 'test.docx',
        size: 1024,
        totalChunks: '1',
        type: 'application/pdf',
      }),
    ).toBe(false);

    expect(
      isValidRenderOfficeData({
        chunkIndex: 0,
        data: 'base64encodeddata',
        lastModified: 1234567890,
        name: 'test.docx',
        size: 1024,
        totalChunks: 1,
        type: 123,
      }),
    ).toBe(false);
  });

  it('should return false for invalid chunkIndex (negative)', () => {
    const data = {
      chunkIndex: -1,
      data: 'base64encodeddata',
      lastModified: 1234567890,
      name: 'test.docx',
      size: 1024,
      totalChunks: 1,
      type: 'application/pdf',
    };

    expect(isValidRenderOfficeData(data)).toBe(false);
  });

  it('should return false for invalid chunkIndex (>= totalChunks)', () => {
    const data = {
      chunkIndex: 5,
      data: 'base64encodeddata',
      lastModified: 1234567890,
      name: 'test.docx',
      size: 1024,
      totalChunks: 5,
      type: 'application/pdf',
    };

    expect(isValidRenderOfficeData(data)).toBe(false);
  });

  it('should return false for totalChunks <= 0', () => {
    expect(
      isValidRenderOfficeData({
        chunkIndex: 0,
        data: 'base64encodeddata',
        lastModified: 1234567890,
        name: 'test.docx',
        size: 1024,
        totalChunks: 0,
        type: 'application/pdf',
      }),
    ).toBe(false);

    expect(
      isValidRenderOfficeData({
        chunkIndex: 0,
        data: 'base64encodeddata',
        lastModified: 1234567890,
        name: 'test.docx',
        size: 1024,
        totalChunks: -1,
        type: 'application/pdf',
      }),
    ).toBe(false);
  });

  it('should return false for negative size', () => {
    const data = {
      chunkIndex: 0,
      data: 'base64encodeddata',
      lastModified: 1234567890,
      name: 'test.docx',
      size: -1,
      totalChunks: 1,
      type: 'application/pdf',
    };

    expect(isValidRenderOfficeData(data)).toBe(false);
  });

  it('should return false for negative lastModified', () => {
    const data = {
      chunkIndex: 0,
      data: 'base64encodeddata',
      lastModified: -1,
      name: 'test.docx',
      size: 1024,
      totalChunks: 1,
      type: 'application/pdf',
    };

    expect(isValidRenderOfficeData(data)).toBe(false);
  });

  it('should accept zero size', () => {
    const data = {
      chunkIndex: 0,
      data: '',
      lastModified: 1234567890,
      name: 'test.docx',
      size: 0,
      totalChunks: 1,
      type: 'application/pdf',
    };

    expect(isValidRenderOfficeData(data)).toBe(true);
  });

  it('should accept zero lastModified', () => {
    const data = {
      chunkIndex: 0,
      data: 'base64encodeddata',
      lastModified: 0,
      name: 'test.docx',
      size: 1024,
      totalChunks: 1,
      type: 'application/pdf',
    };

    expect(isValidRenderOfficeData(data)).toBe(true);
  });

  it('should return false for chunkIndex equal to totalChunks', () => {
    const data = {
      chunkIndex: 3,
      data: 'base64encodeddata',
      lastModified: 1234567890,
      name: 'test.docx',
      size: 1024,
      totalChunks: 3,
      type: 'application/pdf',
    };

    // chunkIndex must be < totalChunks
    expect(isValidRenderOfficeData(data)).toBe(false);
  });

  it('should accept last chunk index (totalChunks - 1)', () => {
    const data = {
      chunkIndex: 2,
      data: 'base64encodeddata',
      lastModified: 1234567890,
      name: 'test.docx',
      size: 1024,
      totalChunks: 3,
      type: 'application/pdf',
    };

    expect(isValidRenderOfficeData(data)).toBe(true);
  });
});

describe('isValidChunkSequence', () => {
  const createChunk = (index: number, total: number) => ({
    chunkIndex: index,
    data: `data${index}`,
    lastModified: 1234567890,
    name: 'test.docx',
    size: 1024,
    totalChunks: total,
    type: 'application/pdf',
  });

  it('should return true for valid single chunk', () => {
    const chunks = [createChunk(0, 1)];
    expect(isValidChunkSequence(chunks)).toBe(true);
  });

  it('should return true for valid multi-chunk sequence', () => {
    const chunks = [createChunk(0, 3), createChunk(1, 3), createChunk(2, 3)];
    expect(isValidChunkSequence(chunks)).toBe(true);
  });

  it('should return true for chunks in any order', () => {
    const chunks = [createChunk(2, 3), createChunk(0, 3), createChunk(1, 3)];
    expect(isValidChunkSequence(chunks)).toBe(true);
  });

  it('should return false for empty array', () => {
    expect(isValidChunkSequence([])).toBe(false);
  });

  it('should return false for missing chunks', () => {
    const chunks = [createChunk(0, 3), createChunk(2, 3)];
    expect(isValidChunkSequence(chunks)).toBe(false);
  });

  it('should return false for duplicate chunk indices', () => {
    const chunks = [createChunk(0, 3), createChunk(0, 3), createChunk(2, 3)];
    expect(isValidChunkSequence(chunks)).toBe(false);
  });

  it('should return false for inconsistent totalChunks', () => {
    const chunks = [
      createChunk(0, 3),
      { ...createChunk(1, 3), totalChunks: 4 },
      createChunk(2, 3),
    ];
    expect(isValidChunkSequence(chunks)).toBe(false);
  });

  it('should return false for wrong number of chunks', () => {
    const chunks = [createChunk(0, 3), createChunk(1, 3)];
    expect(isValidChunkSequence(chunks)).toBe(false);
  });

  it('should return false for non-array input', () => {
    expect(isValidChunkSequence(null as any)).toBe(false);
    expect(isValidChunkSequence(undefined as any)).toBe(false);
    expect(isValidChunkSequence({} as any)).toBe(false);
  });

  it('should return false for indices outside expected range', () => {
    // Create chunks where indices.size === totalChunks but indices are wrong
    // e.g., indices [0, 1, 5] instead of [0, 1, 2] for totalChunks = 3
    const chunks = [
      { ...createChunk(0, 3), chunkIndex: 0 },
      { ...createChunk(1, 3), chunkIndex: 1 },
      { ...createChunk(2, 3), chunkIndex: 5 }, // Wrong index, outside range
    ];
    expect(isValidChunkSequence(chunks)).toBe(false);
  });

  it('should return false for non-sequential indices', () => {
    // Indices [1, 2, 3] for totalChunks = 3 (missing 0)
    const chunks = [
      { ...createChunk(0, 3), chunkIndex: 1 },
      { ...createChunk(1, 3), chunkIndex: 2 },
      { ...createChunk(2, 3), chunkIndex: 3 }, // Out of valid range
    ];
    expect(isValidChunkSequence(chunks)).toBe(false);
  });
});

describe('isValidFile', () => {
  it('should return true for valid file without constraints', () => {
    expect(isValidFile('document.docx', 1024)).toBe(true);
  });

  it('should return true for valid file with matching extension', () => {
    expect(
      isValidFile('document.docx', 1024, {
        allowedExtensions: ['.docx', '.xlsx', '.pptx'],
      }),
    ).toBe(true);
  });

  it('should return true for valid file under size limit', () => {
    expect(isValidFile('document.docx', 1024, { maxSizeBytes: 2048 })).toBe(true);
  });

  it('should return false for empty filename', () => {
    expect(isValidFile('', 1024)).toBe(false);
  });

  it('should return false for non-string filename', () => {
    expect(isValidFile(123 as any, 1024)).toBe(false);
    expect(isValidFile(null as any, 1024)).toBe(false);
    expect(isValidFile(undefined as any, 1024)).toBe(false);
  });

  it('should return false for negative size', () => {
    expect(isValidFile('document.docx', -1)).toBe(false);
  });

  it('should return false for non-number size', () => {
    expect(isValidFile('document.docx', '1024' as any)).toBe(false);
    expect(isValidFile('document.docx', null as any)).toBe(false);
  });

  it('should return false for file exceeding size limit', () => {
    expect(isValidFile('document.docx', 2048, { maxSizeBytes: 1024 })).toBe(false);
  });

  it('should return false for file with wrong extension', () => {
    expect(
      isValidFile('document.pdf', 1024, {
        allowedExtensions: ['.docx', '.xlsx', '.pptx'],
      }),
    ).toBe(false);
  });

  it('should be case-insensitive for extension check', () => {
    expect(
      isValidFile('document.DOCX', 1024, {
        allowedExtensions: ['.docx', '.xlsx', '.pptx'],
      }),
    ).toBe(true);
  });

  it('should accept zero size file', () => {
    expect(isValidFile('document.docx', 0)).toBe(true);
  });

  it('should accept file with no extension when no extension constraint', () => {
    expect(isValidFile('README', 1024)).toBe(true);
  });

  it('should reject file with no extension when extension constraint exists', () => {
    expect(
      isValidFile('README', 1024, {
        allowedExtensions: ['.docx', '.xlsx', '.pptx'],
      }),
    ).toBe(false);
  });

  it('should accept file equal to max size', () => {
    expect(isValidFile('document.docx', 1024, { maxSizeBytes: 1024 })).toBe(true);
  });

  it('should handle files with multiple dots', () => {
    expect(
      isValidFile('my.document.final.docx', 1024, {
        allowedExtensions: ['.docx'],
      }),
    ).toBe(true);
  });

  it('should handle empty allowedExtensions array (allow all)', () => {
    expect(
      isValidFile('document.pdf', 1024, {
        allowedExtensions: [],
      }),
    ).toBe(true);
  });

  it('should handle both constraints together', () => {
    expect(
      isValidFile('document.docx', 1024, {
        maxSizeBytes: 2048,
        allowedExtensions: ['.docx', '.xlsx'],
      }),
    ).toBe(true);

    expect(
      isValidFile('document.docx', 4096, {
        maxSizeBytes: 2048,
        allowedExtensions: ['.docx', '.xlsx'],
      }),
    ).toBe(false);

    expect(
      isValidFile('document.pdf', 1024, {
        maxSizeBytes: 2048,
        allowedExtensions: ['.docx', '.xlsx'],
      }),
    ).toBe(false);
  });
});