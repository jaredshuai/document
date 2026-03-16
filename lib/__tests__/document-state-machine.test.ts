/**
 * Phase 93: Document State Machine Tests
 *
 * Tests formal state machine patterns for document processing workflows,
 * including state transitions, invariants, and edge cases.
 */

import { describe, it, expect } from 'vitest';
import {
  updateRenderChunkState,
  hasMatchingRenderChunkMetadata,
  sortRenderChunks,
} from '../render-workflow';
import { isValidChunkSequence } from '../type-guards';
import { createOperationQueue } from '../operation-queue';
import type { RenderOfficeData } from '../events';

describe('Phase 93: Document State Machine Tests', () => {
  // Helper to create valid chunk data
  const createChunk = (
    index: number,
    total: number,
    overrides: Partial<RenderOfficeData> = {},
  ): RenderOfficeData => ({
    chunkIndex: index,
    data: `chunk-${index}-data`,
    lastModified: 1234567890,
    name: 'document.pdf',
    size: 1024,
    totalChunks: total,
    type: 'application/pdf',
    ...overrides,
  });

  describe('Render Chunk State Machine', () => {
    describe('State: Empty -> Waiting', () => {
      it('should transition from empty to waiting on first chunk', () => {
        const chunks: RenderOfficeData[] = [];
        const newChunk = createChunk(0, 3);

        const result = updateRenderChunkState(chunks, newChunk);

        expect(result.status).toBe('waiting');
        expect(result.receivedChunks).toBe(1);
        expect(result.expectedChunks).toBe(3);
        expect(result.chunks).toHaveLength(1);
      });

      it('should handle single-chunk document (immediately ready)', () => {
        const chunks: RenderOfficeData[] = [];
        const newChunk = createChunk(0, 1);

        const result = updateRenderChunkState(chunks, newChunk);

        expect(result.status).toBe('ready');
        expect(result.receivedChunks).toBe(1);
        expect(result.chunks).toHaveLength(1);
      });
    });

    describe('State: Waiting -> Waiting', () => {
      it('should accumulate matching chunks', () => {
        let chunks: RenderOfficeData[] = [];

        chunks = updateRenderChunkState(chunks, createChunk(0, 3)).chunks;
        expect(chunks).toHaveLength(1);

        const result = updateRenderChunkState(chunks, createChunk(1, 3));
        expect(result.status).toBe('waiting');
        expect(result.chunks).toHaveLength(2);
      });

      it('should track expected vs received chunks', () => {
        let chunks: RenderOfficeData[] = [];

        const r1 = updateRenderChunkState(chunks, createChunk(0, 5));
        expect(r1.receivedChunks).toBe(1);
        expect(r1.expectedChunks).toBe(5);

        const r2 = updateRenderChunkState(r1.chunks, createChunk(1, 5));
        expect(r2.receivedChunks).toBe(2);
        expect(r2.expectedChunks).toBe(5);

        const r3 = updateRenderChunkState(r2.chunks, createChunk(2, 5));
        expect(r3.receivedChunks).toBe(3);
        expect(r3.expectedChunks).toBe(5);
      });
    });

    describe('State: Waiting -> Ready', () => {
      it('should transition to ready when all chunks received', () => {
        let chunks: RenderOfficeData[] = [];

        chunks = updateRenderChunkState(chunks, createChunk(0, 3)).chunks;
        chunks = updateRenderChunkState(chunks, createChunk(1, 3)).chunks;
        const result = updateRenderChunkState(chunks, createChunk(2, 3));

        expect(result.status).toBe('ready');
        expect(result.chunks).toHaveLength(3);
      });

      it('should sort chunks in ready state', () => {
        let chunks: RenderOfficeData[] = [];

        // Add chunks out of order
        chunks = updateRenderChunkState(chunks, createChunk(1, 3)).chunks;
        chunks = updateRenderChunkState(chunks, createChunk(0, 3)).chunks;
        const result = updateRenderChunkState(chunks, createChunk(2, 3));

        expect(result.status).toBe('ready');
        expect(result.chunks[0].chunkIndex).toBe(0);
        expect(result.chunks[1].chunkIndex).toBe(1);
        expect(result.chunks[2].chunkIndex).toBe(2);
      });
    });

    describe('State: Waiting -> Reset (metadata mismatch)', () => {
      it('should reset on metadata mismatch for non-initial chunk', () => {
        let chunks: RenderOfficeData[] = [];

        chunks = updateRenderChunkState(chunks, createChunk(0, 3)).chunks;

        // Chunk with different metadata (different file)
        const mismatchedChunk = createChunk(1, 3, { name: 'different.pdf' });
        const result = updateRenderChunkState(chunks, mismatchedChunk);

        expect(result.status).toBe('reset');
        if (result.status === 'reset') {
          expect(result.reason).toBe('metadata-mismatch');
        }
        expect(result.chunks).toHaveLength(0);
      });

      it('should NOT reset on metadata mismatch for chunk 0 (new document)', () => {
        let chunks: RenderOfficeData[] = [];

        chunks = updateRenderChunkState(chunks, createChunk(0, 3, { name: 'doc1.pdf' })).chunks;

        // New chunk 0 for different file (restart accumulation)
        const newChunk0 = createChunk(0, 2, { name: 'doc2.pdf' });
        const result = updateRenderChunkState(chunks, newChunk0);

        // Should start fresh, not reset
        expect(result.status).toBe('waiting');
        expect(result.chunks).toHaveLength(1);
        expect(result.chunks[0].name).toBe('doc2.pdf');
      });
    });

    describe('State: Waiting -> Reset (invalid sequence)', () => {
      it('should detect invalid sequence when complete', () => {
        // Test that isValidChunkSequence correctly identifies invalid sequences
        const invalidChunks = [
          createChunk(0, 3),
          createChunk(2, 3),
          createChunk(2, 3), // Duplicate index 2
        ];

        // The validation should fail for this sequence
        expect(isValidChunkSequence(invalidChunks)).toBe(false);
      });
    });
  });

  describe('Chunk Metadata Validation', () => {
    it('should match identical metadata', () => {
      const chunk1 = createChunk(0, 3);
      const chunk2 = createChunk(1, 3);

      expect(hasMatchingRenderChunkMetadata(chunk1, chunk2)).toBe(true);
    });

    it('should detect name mismatch', () => {
      const chunk1 = createChunk(0, 3);
      const chunk2 = createChunk(1, 3, { name: 'different.pdf' });

      expect(hasMatchingRenderChunkMetadata(chunk1, chunk2)).toBe(false);
    });

    it('should detect size mismatch', () => {
      const chunk1 = createChunk(0, 3);
      const chunk2 = createChunk(1, 3, { size: 2048 });

      expect(hasMatchingRenderChunkMetadata(chunk1, chunk2)).toBe(false);
    });

    it('should detect totalChunks mismatch', () => {
      const chunk1 = createChunk(0, 3);
      const chunk2 = createChunk(1, 3, { totalChunks: 5 });

      expect(hasMatchingRenderChunkMetadata(chunk1, chunk2)).toBe(false);
    });

    it('should detect lastModified mismatch', () => {
      const chunk1 = createChunk(0, 3);
      const chunk2 = createChunk(1, 3, { lastModified: 9999999999 });

      expect(hasMatchingRenderChunkMetadata(chunk1, chunk2)).toBe(false);
    });

    it('should detect type mismatch', () => {
      const chunk1 = createChunk(0, 3);
      const chunk2 = createChunk(1, 3, { type: 'application/msword' });

      expect(hasMatchingRenderChunkMetadata(chunk1, chunk2)).toBe(false);
    });
  });

  describe('Chunk Sorting', () => {
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
      const chunks = [
        createChunk(2, 3),
        createChunk(0, 3),
        createChunk(1, 3),
      ];

      const originalOrder = chunks.map((c) => c.chunkIndex);
      sortRenderChunks(chunks);
      const afterOrder = chunks.map((c) => c.chunkIndex);

      expect(originalOrder).toEqual(afterOrder); // Unchanged
    });

    it('should handle already sorted chunks', () => {
      const chunks = [
        createChunk(0, 3),
        createChunk(1, 3),
        createChunk(2, 3),
      ];

      const sorted = sortRenderChunks(chunks);

      expect(sorted[0].chunkIndex).toBe(0);
      expect(sorted[1].chunkIndex).toBe(1);
      expect(sorted[2].chunkIndex).toBe(2);
    });
  });

  describe('Chunk Sequence Validation', () => {
    it('should validate complete sequences', () => {
      const chunks = [
        createChunk(0, 3),
        createChunk(1, 3),
        createChunk(2, 3),
      ];

      expect(isValidChunkSequence(chunks)).toBe(true);
    });

    it('should reject incomplete sequences', () => {
      const chunks = [
        createChunk(0, 3),
        createChunk(1, 3),
        // Missing chunk 2
      ];

      expect(isValidChunkSequence(chunks)).toBe(false);
    });

    it('should reject sequences with duplicates', () => {
      const chunks = [
        createChunk(0, 3),
        createChunk(0, 3), // Duplicate
        createChunk(2, 3),
      ];

      expect(isValidChunkSequence(chunks)).toBe(false);
    });

    it('should reject empty sequences', () => {
      expect(isValidChunkSequence([])).toBe(false);
    });

    it('should reject sequences with mismatched totalChunks', () => {
      const chunks = [
        createChunk(0, 3),
        createChunk(1, 3),
        createChunk(2, 5), // Different total
      ];

      expect(isValidChunkSequence(chunks)).toBe(false);
    });
  });

  describe('Operation Queue State Machine', () => {
    it('should process operations sequentially', async () => {
      const queue = createOperationQueue();
      const order: number[] = [];

      const op1 = queue(async () => {
        order.push(1);
        return 'r1';
      });

      const op2 = queue(async () => {
        order.push(2);
        return 'r2';
      });

      const op3 = queue(async () => {
        order.push(3);
        return 'r3';
      });

      await Promise.all([op1, op2, op3]);

      expect(order).toEqual([1, 2, 3]);
    });

    it('should propagate results correctly', async () => {
      const queue = createOperationQueue();

      const r1 = await queue(async () => 1);
      const r2 = await queue(async () => 2);
      const r3 = await queue(async () => 3);

      expect(r1).toBe(1);
      expect(r2).toBe(2);
      expect(r3).toBe(3);
    });

    it('should handle errors without breaking queue', async () => {
      const queue = createOperationQueue();
      const order: number[] = [];

      try {
        await queue(async () => {
          order.push(1);
          throw new Error('Failed');
        });
      } catch {
        // Expected
      }

      const r2 = await queue(async () => {
        order.push(2);
        return 'success';
      });

      expect(r2).toBe('success');
      expect(order).toEqual([1, 2]);
    });
  });

  describe('Document Loading State Machine Scenarios', () => {
    it('should handle successful single-chunk document load', () => {
      // State: Empty -> Ready (single chunk)
      const chunks: RenderOfficeData[] = [];
      const result = updateRenderChunkState(chunks, createChunk(0, 1));

      expect(result.status).toBe('ready');
      expect(result.chunks).toHaveLength(1);
    });

    it('should handle multi-chunk document load', () => {
      // State: Empty -> Waiting -> Waiting -> Ready
      let chunks: RenderOfficeData[] = [];

      const r1 = updateRenderChunkState(chunks, createChunk(0, 3));
      expect(r1.status).toBe('waiting');

      const r2 = updateRenderChunkState(r1.chunks, createChunk(1, 3));
      expect(r2.status).toBe('waiting');

      const r3 = updateRenderChunkState(r2.chunks, createChunk(2, 3));
      expect(r3.status).toBe('ready');
    });

    it('should handle document change during load', () => {
      // State: Empty -> Waiting -> Reset -> Waiting
      let chunks: RenderOfficeData[] = [];

      chunks = updateRenderChunkState(chunks, createChunk(0, 3, { name: 'doc1.pdf' })).chunks;
      chunks = updateRenderChunkState(chunks, createChunk(1, 3, { name: 'doc1.pdf' })).chunks;

      // New chunk 0 for different document
      const r = updateRenderChunkState(chunks, createChunk(0, 2, { name: 'doc2.pdf' }));

      expect(r.status).toBe('waiting');
      expect(r.chunks).toHaveLength(1);
      expect(r.chunks[0].name).toBe('doc2.pdf');
    });

    it('should handle corrupted chunk sequence', () => {
      // State: Empty -> Waiting -> Waiting -> Reset (invalid sequence)
      let chunks: RenderOfficeData[] = [];

      chunks = updateRenderChunkState(chunks, createChunk(0, 3)).chunks;
      chunks = updateRenderChunkState(chunks, createChunk(0, 3)).chunks; // Duplicate

      // Try to complete with wrong chunk
      const r = updateRenderChunkState(chunks, createChunk(2, 3));

      expect(r.status).toBe('reset');
      if (r.status === 'reset') {
        expect(r.reason).toBe('invalid-sequence');
      }
    });
  });

  describe('State Invariants', () => {
    it('should maintain chunk count invariant', () => {
      let chunks: RenderOfficeData[] = [];

      for (let i = 0; i < 5; i++) {
        const result = updateRenderChunkState(chunks, createChunk(i, 5));
        chunks = result.chunks;
        expect(result.receivedChunks).toBe(chunks.length);
      }
    });

    it('should maintain expected chunks invariant', () => {
      const totalChunks = 4;
      let chunks: RenderOfficeData[] = [];

      for (let i = 0; i < totalChunks; i++) {
        const result = updateRenderChunkState(chunks, createChunk(i, totalChunks));
        chunks = result.chunks;
        expect(result.expectedChunks).toBe(totalChunks);
      }
    });

    it('should maintain metadata consistency invariant', () => {
      const baseName = 'document.pdf';
      const baseSize = 1024;
      const baseType = 'application/pdf';
      let chunks: RenderOfficeData[] = [];

      for (let i = 0; i < 3; i++) {
        chunks = updateRenderChunkState(chunks, createChunk(i, 3)).chunks;
      }

      for (const chunk of chunks) {
        expect(chunk.name).toBe(baseName);
        expect(chunk.size).toBe(baseSize);
        expect(chunk.type).toBe(baseType);
      }
    });
  });
});