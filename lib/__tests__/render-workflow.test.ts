import { describe, expect, it } from 'vitest';
import {
  hasMatchingRenderChunkMetadata,
  sortRenderChunks,
  updateRenderChunkState,
} from '../render-workflow';
import type { RenderOfficeData } from '../events';

function createChunk(
  chunkIndex: number,
  totalChunks: number,
  overrides: Partial<RenderOfficeData> = {},
): RenderOfficeData {
  return {
    chunkIndex,
    data: `chunk-${chunkIndex}`,
    lastModified: 1700000000000,
    name: 'report.docx',
    size: 4096,
    totalChunks,
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ...overrides,
  };
}

describe('render-workflow', () => {
  describe('hasMatchingRenderChunkMetadata', () => {
    it('should return true when chunks belong to the same file workflow', () => {
      expect(hasMatchingRenderChunkMetadata(createChunk(0, 2), createChunk(1, 2))).toBe(true);
    });

    it('should return false when any identifying file metadata changes', () => {
      expect(hasMatchingRenderChunkMetadata(createChunk(0, 2), createChunk(1, 2, { name: 'other.docx' }))).toBe(false);
      expect(hasMatchingRenderChunkMetadata(createChunk(0, 2), createChunk(1, 2, { size: 8192 }))).toBe(false);
      expect(hasMatchingRenderChunkMetadata(createChunk(0, 2), createChunk(1, 3))).toBe(false);
      expect(
        hasMatchingRenderChunkMetadata(
          createChunk(0, 2),
          createChunk(1, 2, { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
        ),
      ).toBe(false);
      expect(
        hasMatchingRenderChunkMetadata(createChunk(0, 2), createChunk(1, 2, { lastModified: 1700000000001 })),
      ).toBe(false);
    });
  });

  describe('sortRenderChunks', () => {
    it('should sort by chunkIndex without mutating the original array', () => {
      const original = [createChunk(2, 3), createChunk(0, 3), createChunk(1, 3)];
      const sorted = sortRenderChunks(original);

      expect(sorted.map((chunk) => chunk.chunkIndex)).toEqual([0, 1, 2]);
      expect(original.map((chunk) => chunk.chunkIndex)).toEqual([2, 0, 1]);
    });
  });

  describe('updateRenderChunkState', () => {
    it('should wait while accumulating a multi-chunk workflow', () => {
      const result = updateRenderChunkState([], createChunk(0, 3));

      expect(result).toEqual({
        status: 'waiting',
        chunks: [createChunk(0, 3)],
        expectedChunks: 3,
        receivedChunks: 1,
      });
    });

    it('should become ready immediately for a single-chunk workflow', () => {
      const result = updateRenderChunkState([], createChunk(0, 1));

      expect(result.status).toBe('ready');
      expect(result.expectedChunks).toBe(1);
      expect(result.receivedChunks).toBe(1);
      expect(result.chunks.map((chunk) => chunk.chunkIndex)).toEqual([0]);
    });

    it('should return decode-safe sorted chunks when an out-of-order workflow completes', () => {
      const result = updateRenderChunkState([createChunk(1, 2)], createChunk(0, 2));

      expect(result.status).toBe('ready');
      expect(result.chunks.map((chunk) => chunk.chunkIndex)).toEqual([0, 1]);
    });

    it('should reset when a completed workflow has duplicate chunk indices', () => {
      const result = updateRenderChunkState([createChunk(0, 2)], createChunk(0, 2));

      expect(result).toEqual({
        status: 'reset',
        chunks: [],
        expectedChunks: 2,
        receivedChunks: 0,
        reason: 'invalid-sequence',
      });
    });

    it('should restart accumulation when a new file begins with chunk zero', () => {
      const currentChunks = [createChunk(0, 2)];
      const nextChunk = createChunk(0, 2, {
        name: 'replacement.docx',
        size: 8192,
        lastModified: 1700000001111,
      });

      const result = updateRenderChunkState(currentChunks, nextChunk);

      expect(result).toEqual({
        status: 'waiting',
        chunks: [nextChunk],
        expectedChunks: 2,
        receivedChunks: 1,
      });
    });

    it('should reset when mismatched metadata arrives mid-workflow', () => {
      const result = updateRenderChunkState(
        [createChunk(0, 2)],
        createChunk(1, 2, {
          name: 'other.docx',
          lastModified: 1700000001111,
        }),
      );

      expect(result).toEqual({
        status: 'reset',
        chunks: [],
        expectedChunks: 2,
        receivedChunks: 0,
        reason: 'metadata-mismatch',
      });
    });

    it('should reset when enough chunks arrive but the sequence still has gaps', () => {
      const result = updateRenderChunkState([createChunk(0, 3), createChunk(2, 3)], createChunk(2, 3));

      expect(result).toEqual({
        status: 'reset',
        chunks: [],
        expectedChunks: 3,
        receivedChunks: 0,
        reason: 'invalid-sequence',
      });
    });
  });
});

describe('stress tests', () => {
  it('should handle 100 chunks in correct order', () => {
    let result = updateRenderChunkState([], createChunk(0, 100));

    expect(result.status).toBe('waiting');
    expect(result.receivedChunks).toBe(1);

    for (let i = 1; i < 99; i++) {
      result = updateRenderChunkState(result.chunks, createChunk(i, 100));
      expect(result.status).toBe('waiting');
      expect(result.receivedChunks).toBe(i + 1);
    }

    // Final chunk should make it ready
    result = updateRenderChunkState(result.chunks, createChunk(99, 100));
    expect(result.status).toBe('ready');
    expect(result.receivedChunks).toBe(100);
    expect(result.chunks.map((c) => c.chunkIndex)).toEqual([...Array(100).keys()]);
  });

  it('should handle out-of-order chunks arriving in reverse order', () => {
    let result = updateRenderChunkState([], createChunk(99, 100));
    expect(result.status).toBe('waiting');

    for (let i = 98; i > 0; i--) {
      result = updateRenderChunkState(result.chunks, createChunk(i, 100));
      expect(result.status).toBe('waiting');
    }

    result = updateRenderChunkState(result.chunks, createChunk(0, 100));
    expect(result.status).toBe('ready');
    expect(result.chunks.map((c) => c.chunkIndex)).toEqual([...Array(100).keys()]);
  });

  it('should handle random chunk arrival order', () => {
    const indices = [...Array(50).keys()];
    // Shuffle indices using Fisher-Yates
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }

    let result = updateRenderChunkState([], createChunk(indices[0], 50));

    for (let i = 1; i < indices.length; i++) {
      result = updateRenderChunkState(result.chunks, createChunk(indices[i], 50));
    }

    expect(result.status).toBe('ready');
    expect(result.chunks.map((c) => c.chunkIndex)).toEqual([...Array(50).keys()]);
  });

  it('should reset and recover from duplicate chunks', () => {
    // Start with chunk 0
    let result = updateRenderChunkState([], createChunk(0, 3));

    // Add chunk 1
    result = updateRenderChunkState(result.chunks, createChunk(1, 3));
    expect(result.status).toBe('waiting');
    expect(result.receivedChunks).toBe(2);

    // Add duplicate chunk 1 - now we have 3 chunks for 3 expected
    result = updateRenderChunkState(result.chunks, createChunk(1, 3));
    // Should validate and reset because of invalid sequence (duplicate chunk 1)
    expect(result.status).toBe('reset');
    if (result.status === 'reset') {
      expect(result.reason).toBe('invalid-sequence');
    }

    // Recovery: start fresh with chunk 0
    result = updateRenderChunkState([], createChunk(0, 3));
    for (let i = 1; i < 3; i++) {
      result = updateRenderChunkState(result.chunks, createChunk(i, 3));
    }
    expect(result.status).toBe('ready');
  });

  it('should handle rapid metadata changes correctly', () => {
    // Start workflow for file A
    let result = updateRenderChunkState([], createChunk(0, 3, { name: 'fileA.docx' }));
    result = updateRenderChunkState(result.chunks, createChunk(1, 3, { name: 'fileA.docx' }));

    // New file B arrives with chunk 0 (should restart)
    result = updateRenderChunkState(result.chunks, createChunk(0, 2, { name: 'fileB.docx' }));
    expect(result.status).toBe('waiting');
    expect(result.chunks[0].name).toBe('fileB.docx');

    // Complete file B
    result = updateRenderChunkState(result.chunks, createChunk(1, 2, { name: 'fileB.docx' }));
    expect(result.status).toBe('ready');
    expect(result.chunks[0].name).toBe('fileB.docx');
  });

  it('should handle many interleaved reset scenarios', () => {
    for (let iteration = 0; iteration < 10; iteration++) {
      // Start a workflow with 2 total chunks
      let result = updateRenderChunkState([], createChunk(0, 2, { name: `file${iteration}.docx` }));

      // Trigger reset with duplicate chunk 0
      result = updateRenderChunkState(result.chunks, createChunk(0, 2, { name: `file${iteration}.docx` }));
      expect(result.status).toBe('reset');

      // Start fresh
      result = updateRenderChunkState([], createChunk(0, 2, { name: `recovery${iteration}.docx` }));
      result = updateRenderChunkState(result.chunks, createChunk(1, 2, { name: `recovery${iteration}.docx` }));
      expect(result.status).toBe('ready');
    }
  });
});
