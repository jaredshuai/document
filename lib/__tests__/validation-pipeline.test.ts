/**
 * Additional validation pipeline tests for comprehensive coverage.
 */
import { describe, expect, it } from 'vitest';
import {
  isValidRenderOfficeData,
  isValidChunkSequence,
  isValidFile,
} from '../type-guards';
import {
  updateRenderChunkState,
  hasMatchingRenderChunkMetadata,
  sortRenderChunks,
} from '../render-workflow';
import type { RenderOfficeData } from '../events';

// =============================================================================
// RENDER OFFICE DATA VALIDATION PIPELINE
// =============================================================================

describe('Validation: RenderOfficeData Pipeline', () => {
  const createValidData = (overrides: Partial<RenderOfficeData> = {}): RenderOfficeData => ({
    chunkIndex: 0,
    totalChunks: 1,
    data: 'base64-data',
    name: 'document.docx',
    size: 1000,
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    lastModified: Date.now(),
    ...overrides,
  });

  describe('Type validation', () => {
    it('should accept valid RenderOfficeData', () => {
      const data = createValidData();
      expect(isValidRenderOfficeData(data)).toBe(true);
    });

    it('should reject null', () => {
      expect(isValidRenderOfficeData(null)).toBe(false);
    });

    it('should reject undefined', () => {
      expect(isValidRenderOfficeData(undefined)).toBe(false);
    });

    it('should reject primitives', () => {
      expect(isValidRenderOfficeData('string')).toBe(false);
      expect(isValidRenderOfficeData(123)).toBe(false);
      expect(isValidRenderOfficeData(true)).toBe(false);
    });

    it('should reject arrays', () => {
      expect(isValidRenderOfficeData([])).toBe(false);
    });
  });

  describe('Field validation', () => {
    it('should reject missing chunkIndex', () => {
      const { chunkIndex: _, ...data } = createValidData();
      expect(isValidRenderOfficeData(data)).toBe(false);
    });

    it('should reject missing totalChunks', () => {
      const { totalChunks: _, ...data } = createValidData();
      expect(isValidRenderOfficeData(data)).toBe(false);
    });

    it('should reject missing data', () => {
      const { data: _, ...rest } = createValidData();
      expect(isValidRenderOfficeData(rest)).toBe(false);
    });

    it('should reject missing name', () => {
      const { name: _, ...data } = createValidData();
      expect(isValidRenderOfficeData(data)).toBe(false);
    });

    it('should reject missing size', () => {
      const { size: _, ...data } = createValidData();
      expect(isValidRenderOfficeData(data)).toBe(false);
    });

    it('should reject missing type', () => {
      const { type: _, ...data } = createValidData();
      expect(isValidRenderOfficeData(data)).toBe(false);
    });

    it('should reject missing lastModified', () => {
      const { lastModified: _, ...data } = createValidData();
      expect(isValidRenderOfficeData(data)).toBe(false);
    });
  });

  describe('Type constraints', () => {
    it('should reject non-number chunkIndex', () => {
      expect(isValidRenderOfficeData(createValidData({ chunkIndex: '0' as unknown as number }))).toBe(false);
      expect(isValidRenderOfficeData(createValidData({ chunkIndex: null as unknown as number }))).toBe(false);
    });

    it('should reject non-number totalChunks', () => {
      expect(isValidRenderOfficeData(createValidData({ totalChunks: '1' as unknown as number }))).toBe(false);
    });

    it('should reject non-string data', () => {
      expect(isValidRenderOfficeData(createValidData({ data: 123 as unknown as string }))).toBe(false);
    });

    it('should reject non-string name', () => {
      expect(isValidRenderOfficeData(createValidData({ name: 123 as unknown as string }))).toBe(false);
    });

    it('should reject non-number size', () => {
      expect(isValidRenderOfficeData(createValidData({ size: '1000' as unknown as number }))).toBe(false);
    });

    it('should reject non-string type', () => {
      expect(isValidRenderOfficeData(createValidData({ type: 123 as unknown as string }))).toBe(false);
    });

    it('should reject non-number lastModified', () => {
      expect(isValidRenderOfficeData(createValidData({ lastModified: 'now' as unknown as number }))).toBe(false);
    });
  });

  describe('Semantic constraints', () => {
    it('should reject negative chunkIndex', () => {
      expect(isValidRenderOfficeData(createValidData({ chunkIndex: -1 }))).toBe(false);
    });

    it('should reject chunkIndex >= totalChunks', () => {
      expect(isValidRenderOfficeData(createValidData({ chunkIndex: 5, totalChunks: 3 }))).toBe(false);
    });

    it('should reject negative size', () => {
      expect(isValidRenderOfficeData(createValidData({ size: -1 }))).toBe(false);
    });

    it('should reject negative lastModified', () => {
      expect(isValidRenderOfficeData(createValidData({ lastModified: -1 }))).toBe(false);
    });

    it('should accept zero size', () => {
      expect(isValidRenderOfficeData(createValidData({ size: 0 }))).toBe(true);
    });

    it('should accept zero lastModified', () => {
      expect(isValidRenderOfficeData(createValidData({ lastModified: 0 }))).toBe(true);
    });
  });

  describe('Edge cases', () => {
    it('should handle empty data string', () => {
      expect(isValidRenderOfficeData(createValidData({ data: '' }))).toBe(true);
    });

    it('should handle empty name string', () => {
      expect(isValidRenderOfficeData(createValidData({ name: '' }))).toBe(true);
    });

    it('should handle empty type string', () => {
      expect(isValidRenderOfficeData(createValidData({ type: '' }))).toBe(true);
    });

    it('should handle large chunkIndex values', () => {
      expect(isValidRenderOfficeData(createValidData({ chunkIndex: 999, totalChunks: 1000 }))).toBe(true);
    });

    it('should handle large size values', () => {
      expect(isValidRenderOfficeData(createValidData({ size: Number.MAX_SAFE_INTEGER }))).toBe(true);
    });
  });
});

// =============================================================================
// CHUNK SEQUENCE VALIDATION PIPELINE
// =============================================================================

describe('Validation: Chunk Sequence Pipeline', () => {
  const createChunk = (index: number, total: number): RenderOfficeData => ({
    chunkIndex: index,
    totalChunks: total,
    data: `chunk-${index}`,
    name: 'document.docx',
    size: 1000,
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    lastModified: 1234567890000,
  });

  describe('Empty and invalid input', () => {
    it('should reject empty array', () => {
      expect(isValidChunkSequence([])).toBe(false);
    });

    it('should reject null', () => {
      expect(isValidChunkSequence(null as unknown as RenderOfficeData[])).toBe(false);
    });

    it('should reject undefined', () => {
      expect(isValidChunkSequence(undefined as unknown as RenderOfficeData[])).toBe(false);
    });
  });

  describe('Single chunk validation', () => {
    it('should accept valid single chunk', () => {
      expect(isValidChunkSequence([createChunk(0, 1)])).toBe(true);
    });

    it('should reject single chunk with wrong totalChunks', () => {
      const chunk = createChunk(0, 2);
      expect(isValidChunkSequence([chunk])).toBe(false);
    });
  });

  describe('Multi-chunk validation', () => {
    it('should accept complete valid sequence', () => {
      const chunks = [createChunk(0, 3), createChunk(1, 3), createChunk(2, 3)];
      expect(isValidChunkSequence(chunks)).toBe(true);
    });

    it('should reject incomplete sequence', () => {
      const chunks = [createChunk(0, 3), createChunk(1, 3)];
      expect(isValidChunkSequence(chunks)).toBe(false);
    });

    it('should reject sequence with missing index', () => {
      const chunks = [createChunk(0, 3), createChunk(2, 3)]; // Missing index 1
      expect(isValidChunkSequence(chunks)).toBe(false);
    });

    it('should reject sequence with duplicate index', () => {
      const chunks = [createChunk(0, 2), createChunk(0, 2)]; // Duplicate index 0
      expect(isValidChunkSequence(chunks)).toBe(false);
    });

    it('should reject sequence with inconsistent totalChunks', () => {
      const chunks = [
        createChunk(0, 3),
        { ...createChunk(1, 2) }, // Different totalChunks
        createChunk(2, 3),
      ];
      expect(isValidChunkSequence(chunks)).toBe(false);
    });
  });

  describe('Chunk order independence', () => {
    it('should accept chunks in any order', () => {
      const chunks = [createChunk(2, 3), createChunk(0, 3), createChunk(1, 3)];
      expect(isValidChunkSequence(chunks)).toBe(true);
    });
  });
});

// =============================================================================
// FILE VALIDATION PIPELINE
// =============================================================================

describe('Validation: File Pipeline', () => {
  describe('Basic validation', () => {
    it('should accept valid file', () => {
      expect(isValidFile('document.docx', 1000)).toBe(true);
    });

    it('should reject empty filename', () => {
      expect(isValidFile('', 1000)).toBe(false);
    });

    it('should reject negative size', () => {
      expect(isValidFile('document.docx', -1)).toBe(false);
    });
  });

  describe('Type validation', () => {
    it('should reject non-string filename', () => {
      expect(isValidFile(123 as unknown as string, 1000)).toBe(false);
      expect(isValidFile(null as unknown as string, 1000)).toBe(false);
      expect(isValidFile(undefined as unknown as string, 1000)).toBe(false);
    });

    it('should reject non-number size', () => {
      expect(isValidFile('document.docx', '1000' as unknown as number)).toBe(false);
      expect(isValidFile('document.docx', null as unknown as number)).toBe(false);
    });
  });

  describe('Size constraints', () => {
    it('should accept zero size', () => {
      expect(isValidFile('document.docx', 0)).toBe(true);
    });

    it('should accept large size', () => {
      expect(isValidFile('document.docx', Number.MAX_SAFE_INTEGER)).toBe(true);
    });

    it('should respect max size option', () => {
      expect(isValidFile('document.docx', 1000, { maxSizeBytes: 500 })).toBe(false);
      expect(isValidFile('document.docx', 500, { maxSizeBytes: 500 })).toBe(true);
      expect(isValidFile('document.docx', 100, { maxSizeBytes: 500 })).toBe(true);
    });
  });

  describe('Extension constraints', () => {
    it('should respect allowed extensions option', () => {
      expect(isValidFile('document.docx', 1000, { allowedExtensions: ['.docx'] })).toBe(true);
      expect(isValidFile('document.xlsx', 1000, { allowedExtensions: ['.docx'] })).toBe(false);
      expect(isValidFile('document.pdf', 1000, { allowedExtensions: ['.docx', '.xlsx'] })).toBe(false);
    });

    it('should handle empty allowed extensions', () => {
      expect(isValidFile('document.docx', 1000, { allowedExtensions: [] })).toBe(true);
    });

    it('should work without options', () => {
      expect(isValidFile('document.docx', 1000)).toBe(true);
      expect(isValidFile('document.xlsx', 1000)).toBe(true);
    });
  });
});

// =============================================================================
// RENDER WORKFLOW STATE TRANSITIONS
// =============================================================================

describe('Validation: Render Workflow State Transitions', () => {
  const createChunk = (
    index: number,
    total: number,
    name: string = 'document.docx',
    lastModified: number = 1234567890000,
  ): RenderOfficeData => ({
    chunkIndex: index,
    totalChunks: total,
    data: `chunk-${index}`,
    name,
    size: 1000,
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    lastModified,
  });

  describe('Initial state', () => {
    it('should start with waiting status', () => {
      const state = updateRenderChunkState([], createChunk(0, 3));
      expect(state.status).toBe('waiting');
      expect(state.receivedChunks).toBe(1);
      expect(state.expectedChunks).toBe(3);
    });
  });

  describe('Accumulation transitions', () => {
    it('should accumulate matching chunks', () => {
      let state = updateRenderChunkState([], createChunk(0, 3));
      expect(state.status).toBe('waiting');

      state = updateRenderChunkState(state.chunks, createChunk(1, 3));
      expect(state.status).toBe('waiting');
      expect(state.receivedChunks).toBe(2);

      state = updateRenderChunkState(state.chunks, createChunk(2, 3));
      expect(state.status).toBe('ready');
      expect(state.receivedChunks).toBe(3);
    });
  });

  describe('Reset transitions', () => {
    it('should reset on metadata mismatch', () => {
      let state = updateRenderChunkState([], createChunk(0, 2, 'doc1.docx'));
      expect(state.status).toBe('waiting');

      state = updateRenderChunkState(state.chunks, createChunk(1, 2, 'doc2.docx'));
      expect(state.status).toBe('reset');
      if (state.status === 'reset') {
        expect(state.reason).toBe('metadata-mismatch');
      }
    });

    it('should reset on invalid sequence', () => {
      // Create a state with all chunks but wrong indices
      const chunks = [
        createChunk(0, 2),
        createChunk(1, 2, 'document.docx', 999999), // Different lastModified
      ];

      // The second chunk won't match because of different lastModified
      let state = updateRenderChunkState([], chunks[0]);
      state = updateRenderChunkState(state.chunks, chunks[1]);

      expect(state.status).toBe('reset');
    });
  });

  describe('Restart transitions', () => {
    it('should restart on new chunk 0', () => {
      let state = updateRenderChunkState([], createChunk(0, 2, 'old.docx'));
      expect(state.status).toBe('waiting');
      expect(state.chunks[0].name).toBe('old.docx');

      state = updateRenderChunkState(state.chunks, createChunk(0, 3, 'new.docx'));
      expect(state.status).toBe('waiting');
      expect(state.chunks.length).toBe(1);
      expect(state.chunks[0].name).toBe('new.docx');
      expect(state.expectedChunks).toBe(3);
    });
  });

  describe('Metadata matching', () => {
    it('should match all metadata fields', () => {
      const chunk1 = createChunk(0, 2);
      const chunk2 = createChunk(1, 2);

      expect(hasMatchingRenderChunkMetadata(chunk1, chunk2)).toBe(true);
    });

    it('should detect name mismatch', () => {
      const chunk1 = createChunk(0, 2, 'doc1.docx');
      const chunk2 = createChunk(1, 2, 'doc2.docx');

      expect(hasMatchingRenderChunkMetadata(chunk1, chunk2)).toBe(false);
    });

    it('should detect lastModified mismatch', () => {
      const chunk1 = createChunk(0, 2, 'doc.docx', 1000);
      const chunk2 = createChunk(1, 2, 'doc.docx', 2000);

      expect(hasMatchingRenderChunkMetadata(chunk1, chunk2)).toBe(false);
    });

    it('should detect size mismatch', () => {
      const chunk1 = createChunk(0, 2);
      const chunk2 = { ...createChunk(1, 2), size: 2000 };

      expect(hasMatchingRenderChunkMetadata(chunk1, chunk2)).toBe(false);
    });

    it('should detect type mismatch', () => {
      const chunk1 = createChunk(0, 2);
      const chunk2 = { ...createChunk(1, 2), type: 'application/pdf' };

      expect(hasMatchingRenderChunkMetadata(chunk1, chunk2)).toBe(false);
    });

    it('should detect totalChunks mismatch', () => {
      const chunk1 = createChunk(0, 2);
      const chunk2 = { ...createChunk(1, 3) };

      expect(hasMatchingRenderChunkMetadata(chunk1, chunk2)).toBe(false);
    });
  });

  describe('Sorting', () => {
    it('should sort chunks by index', () => {
      const chunks = [
        createChunk(2, 3),
        createChunk(0, 3),
        createChunk(1, 3),
      ];

      const sorted = sortRenderChunks(chunks);
      expect(sorted[0].chunkIndex).toBe(0);
      expect(sorted[1].chunkIndex).toBe(1);
      expect(sorted[2].chunkIndex).toBe(2);
    });

    it('should not mutate original array', () => {
      const chunks = [createChunk(2, 3), createChunk(0, 3), createChunk(1, 3)];
      const original = [...chunks];

      sortRenderChunks(chunks);

      expect(chunks).toEqual(original);
    });
  });
});
