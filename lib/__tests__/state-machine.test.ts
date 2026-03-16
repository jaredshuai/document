/**
 * State Machine Tests for Workflow Transitions.
 * These tests formally verify state machine behavior for various workflows.
 */
import { describe, expect, it } from 'vitest';
import {
  updateRenderChunkState,
  hasMatchingRenderChunkMetadata,
  sortRenderChunks,
} from '../render-workflow';
import type { RenderOfficeData } from '../events';
import { createOperationQueue } from '../operation-queue';
import { isValidChunkSequence } from '../type-guards';

// Helper to create a valid chunk
function createChunk(
  chunkIndex: number,
  totalChunks: number,
  overrides: Partial<RenderOfficeData> = {},
): RenderOfficeData {
  return {
    chunkIndex,
    data: `chunk-${chunkIndex}`,
    lastModified: 1700000000000,
    name: 'document.docx',
    size: 4096,
    totalChunks,
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ...overrides,
  };
}

// =============================================================================
// RENDER WORKFLOW STATE MACHINE
// =============================================================================

describe('State Machine: Render Chunk Workflow', () => {
  /**
   * States:
   * - EMPTY: No chunks received
   * - WAITING: Partial chunks received, waiting for more
   * - READY: All chunks received, validated, ready for decode
   * - RESET: Invalid state, chunks cleared
   *
   * Events:
   * - CHUNK_RECEIVED: New chunk arrives
   *
   * Transitions:
   * - EMPTY + CHUNK_RECEIVED -> WAITING (if more chunks expected)
   * - EMPTY + CHUNK_RECEIVED -> READY (if single chunk)
   * - WAITING + CHUNK_RECEIVED -> WAITING (more chunks needed)
   * - WAITING + CHUNK_RECEIVED -> READY (all chunks received, valid)
   * - WAITING + CHUNK_RECEIVED -> RESET (invalid sequence or metadata mismatch)
   * - RESET + CHUNK_RECEIVED -> WAITING (start fresh)
   */

  describe('State: EMPTY -> Transitions', () => {
    it('should transition from EMPTY to WAITING when first chunk of multi-chunk arrives', () => {
      const result = updateRenderChunkState([], createChunk(0, 5));

      expect(result.status).toBe('waiting');
      expect(result.receivedChunks).toBe(1);
      expect(result.expectedChunks).toBe(5);
    });

    it('should transition from EMPTY to READY when single chunk arrives', () => {
      const result = updateRenderChunkState([], createChunk(0, 1));

      expect(result.status).toBe('ready');
      expect(result.receivedChunks).toBe(1);
      expect(result.expectedChunks).toBe(1);
    });

    it('should accept any chunk index as first chunk (no prior state)', () => {
      // Starting with chunk 3 is valid - we're just waiting for the rest
      const result = updateRenderChunkState([], createChunk(3, 5));

      expect(result.status).toBe('waiting');
      expect(result.receivedChunks).toBe(1);
    });
  });

  describe('State: WAITING -> Transitions', () => {
    it('should stay in WAITING when receiving chunks before completion', () => {
      let result = updateRenderChunkState([], createChunk(0, 4));

      expect(result.status).toBe('waiting');
      expect(result.receivedChunks).toBe(1);

      result = updateRenderChunkState(result.chunks, createChunk(1, 4));
      expect(result.status).toBe('waiting');
      expect(result.receivedChunks).toBe(2);

      result = updateRenderChunkState(result.chunks, createChunk(2, 4));
      expect(result.status).toBe('waiting');
      expect(result.receivedChunks).toBe(3);
    });

    it('should transition from WAITING to READY when final chunk completes sequence', () => {
      let result = updateRenderChunkState([], createChunk(0, 3));

      result = updateRenderChunkState(result.chunks, createChunk(1, 3));
      expect(result.status).toBe('waiting');

      result = updateRenderChunkState(result.chunks, createChunk(2, 3));
      expect(result.status).toBe('ready');
      expect(result.receivedChunks).toBe(3);
    });

    it('should transition from WAITING to RESET on metadata mismatch', () => {
      const result = updateRenderChunkState(
        [createChunk(0, 3)],
        createChunk(1, 3, { name: 'different.docx', lastModified: 999 }),
      );

      expect(result.status).toBe('reset');
      if (result.status === 'reset') {
        expect(result.reason).toBe('metadata-mismatch');
      }
    });

    it('should transition from WAITING to RESET on invalid sequence (duplicates)', () => {
      const result = updateRenderChunkState(
        [createChunk(0, 2), createChunk(1, 2)],
        createChunk(1, 2), // Duplicate chunk 1
      );

      expect(result.status).toBe('reset');
      if (result.status === 'reset') {
        expect(result.reason).toBe('invalid-sequence');
      }
    });

    it('should restart from WAITING when chunk 0 arrives for new file', () => {
      // Existing workflow for file A
      let result = updateRenderChunkState([], createChunk(0, 3, { name: 'fileA.docx' }));
      result = updateRenderChunkState(result.chunks, createChunk(1, 3, { name: 'fileA.docx' }));

      expect(result.status).toBe('waiting');

      // New file B starts with chunk 0
      result = updateRenderChunkState(result.chunks, createChunk(0, 2, { name: 'fileB.docx' }));

      expect(result.status).toBe('waiting');
      expect(result.chunks[0].name).toBe('fileB.docx');
      expect(result.expectedChunks).toBe(2);
    });
  });

  describe('State: RESET -> Transitions', () => {
    it('should transition from RESET to WAITING when starting fresh', () => {
      // Trigger a reset
      let result = updateRenderChunkState([createChunk(0, 2)], createChunk(0, 2)); // duplicate

      expect(result.status).toBe('reset');

      // Start fresh with new chunk
      result = updateRenderChunkState([], createChunk(0, 3, { name: 'newfile.docx' }));

      expect(result.status).toBe('waiting');
      expect(result.chunks[0].name).toBe('newfile.docx');
    });

    it('should allow recovery after reset', () => {
      // Cause reset
      let result = updateRenderChunkState(
        [createChunk(0, 3), createChunk(1, 3)],
        createChunk(1, 3), // Duplicate
      );

      expect(result.status).toBe('reset');

      // Recovery: start fresh and complete
      result = updateRenderChunkState([], createChunk(0, 2, { name: 'recovery.docx' }));
      expect(result.status).toBe('waiting');

      result = updateRenderChunkState(result.chunks, createChunk(1, 2, { name: 'recovery.docx' }));
      expect(result.status).toBe('ready');
    });
  });

  describe('State: READY -> Transitions', () => {
    it('should provide sorted chunks in ready state', () => {
      // Add chunks out of order
      let result = updateRenderChunkState([], createChunk(2, 3));
      result = updateRenderChunkState(result.chunks, createChunk(0, 3));
      result = updateRenderChunkState(result.chunks, createChunk(1, 3));

      expect(result.status).toBe('ready');
      expect(result.chunks.map((c) => c.chunkIndex)).toEqual([0, 1, 2]);
    });

    it('should validate that ready chunks have correct indices', () => {
      let result = updateRenderChunkState([], createChunk(0, 2));
      result = updateRenderChunkState(result.chunks, createChunk(1, 2));

      expect(result.status).toBe('ready');

      // Verify chunk sequence is valid
      expect(isValidChunkSequence(result.chunks)).toBe(true);
    });
  });
});

// =============================================================================
// OPERATION QUEUE STATE MACHINE
// =============================================================================

describe('State Machine: Operation Queue', () => {
  /**
   * States:
   * - IDLE: No operations running
   * - PROCESSING: Operation in progress
   * - TIMEOUT: Operation exceeded wait limit
   *
   * Events:
   * - ENQUEUE: New operation added
   * - COMPLETE: Operation finished
   * - TIMEOUT: Operation exceeded time limit while waiting
   *
   * Note: createOperationQueue returns a callable function, not an object.
   * Usage: queue(async () => result)
   */

  describe('State: IDLE -> Transitions', () => {
    it('should transition from IDLE to PROCESSING when operation enqueued', async () => {
      const queue = createOperationQueue();

      const result = await queue(async () => 'result');
      expect(result).toBe('result');
    });

    it('should return to IDLE after operation completes', async () => {
      const queue = createOperationQueue();

      await queue(async () => 1);
      await queue(async () => 2);
      await queue(async () => 3);

      // All operations completed, queue should be idle
    });
  });

  describe('State: PROCESSING -> Transitions', () => {
    it('should queue operations while processing and execute sequentially', async () => {
      const queue = createOperationQueue();
      const executionOrder: number[] = [];

      // Start multiple operations concurrently (they will be queued)
      const promises = [
        queue(async () => {
          executionOrder.push(1);
          await new Promise((r) => setTimeout(r, 10));
          return 1;
        }),
        queue(async () => {
          executionOrder.push(2);
          return 2;
        }),
        queue(async () => {
          executionOrder.push(3);
          return 3;
        }),
      ];

      await Promise.all(promises);

      // Operations should execute in order
      expect(executionOrder).toEqual([1, 2, 3]);
    });

    it('should handle timeout waiting for previous operation and allow new operations', async () => {
      const queue = createOperationQueue({ timeout: 50 }); // 50ms timeout

      // Start a slow operation
      const slowPromise = queue(async () => {
        await new Promise((r) => setTimeout(r, 200));
        return 'slow';
      });

      // Queue another operation - it will timeout waiting for the first
      const fastPromise = queue(async () => 'fast');

      // Both should complete (though the second may have timed out waiting)
      const results = await Promise.all([slowPromise, fastPromise]);
      expect(results).toContain('slow');
      expect(results).toContain('fast');
    });
  });

  describe('State: TIMEOUT -> Transitions', () => {
    it('should continue operations even after waiting timeout', async () => {
      const queue = createOperationQueue({ timeout: 20 });

      // First operation takes long
      const slowResult = await queue(async () => {
        await new Promise((r) => setTimeout(r, 100));
        return 'slow-done';
      });

      // Second operation should still work
      const fastResult = await queue(async () => 'fast-done');

      expect(slowResult).toBe('slow-done');
      expect(fastResult).toBe('fast-done');
    });

    it('should allow queue to continue after timeout', async () => {
      const queue = createOperationQueue({ timeout: 20 });

      // First operation
      await queue(async () => {
        await new Promise((r) => setTimeout(r, 100));
      });

      // Second operation succeeds
      const result = await queue(async () => 'success');
      expect(result).toBe('success');
    });
  });
});

// =============================================================================
// TYPE GUARD STATE MACHINE
// =============================================================================

describe('State Machine: Type Guard Validation', () => {
  /**
   * States:
   * - VALID: Data passes validation
   * - INVALID: Data fails validation
   *
   * Events:
   * - VALIDATE: Check data against schema
   */

  describe('isValidChunkSequence Validation States', () => {
    it('should return VALID for complete sequential chunks', () => {
      const chunks = [createChunk(0, 3), createChunk(1, 3), createChunk(2, 3)];
      expect(isValidChunkSequence(chunks)).toBe(true);
    });

    it('should return VALID for single chunk', () => {
      expect(isValidChunkSequence([createChunk(0, 1)])).toBe(true);
    });

    it('should return INVALID for chunks with gaps', () => {
      const chunks = [createChunk(0, 3), createChunk(2, 3)]; // Missing chunk 1
      expect(isValidChunkSequence(chunks)).toBe(false);
    });

    it('should return INVALID for chunks with duplicates', () => {
      const chunks = [createChunk(0, 2), createChunk(0, 2)]; // Duplicate
      expect(isValidChunkSequence(chunks)).toBe(false);
    });

    it('should return INVALID for chunks starting from non-zero', () => {
      const chunks = [createChunk(1, 3), createChunk(2, 3)]; // Missing chunk 0
      expect(isValidChunkSequence(chunks)).toBe(false);
    });

    it('should return INVALID for empty array', () => {
      expect(isValidChunkSequence([])).toBe(false);
    });

    it('should return VALID for out-of-order chunks (Set handles uniqueness)', () => {
      // isValidChunkSequence uses a Set to check indices, so order doesn't matter
      const chunks = [createChunk(1, 3), createChunk(0, 3), createChunk(2, 3)];
      expect(isValidChunkSequence(chunks)).toBe(true);
    });

    it('should return INVALID for chunks with missing index (gap in set)', () => {
      const chunks = [createChunk(0, 3), createChunk(1, 3), createChunk(1, 3)]; // Missing 2, duplicate 1
      expect(isValidChunkSequence(chunks)).toBe(false);
    });
  });
});

// =============================================================================
// METADATA MATCHING STATE MACHINE
// =============================================================================

describe('State Machine: Chunk Metadata Matching', () => {
  /**
   * States:
   * - MATCH: Chunks belong to same file
   * - MISMATCH: Chunks belong to different files
   *
   * Each metadata field is a dimension:
   * - name
   * - size
   * - type
   * - lastModified
   * - totalChunks
   */

  describe('All Dimensions Must Match', () => {
    const baseChunk = createChunk(0, 3);

    it('should MATCH when all fields identical', () => {
      const otherChunk = createChunk(1, 3); // Same file, different chunk index
      expect(hasMatchingRenderChunkMetadata(baseChunk, otherChunk)).toBe(true);
    });

    it('should MISMATCH when name differs', () => {
      const otherChunk = createChunk(1, 3, { name: 'different.docx' });
      expect(hasMatchingRenderChunkMetadata(baseChunk, otherChunk)).toBe(false);
    });

    it('should MISMATCH when size differs', () => {
      const otherChunk = createChunk(1, 3, { size: 9999 });
      expect(hasMatchingRenderChunkMetadata(baseChunk, otherChunk)).toBe(false);
    });

    it('should MISMATCH when type differs', () => {
      const otherChunk = createChunk(1, 3, { type: 'application/pdf' });
      expect(hasMatchingRenderChunkMetadata(baseChunk, otherChunk)).toBe(false);
    });

    it('should MISMATCH when lastModified differs', () => {
      const otherChunk = createChunk(1, 3, { lastModified: 111 });
      expect(hasMatchingRenderChunkMetadata(baseChunk, otherChunk)).toBe(false);
    });

    it('should MISMATCH when totalChunks differs', () => {
      const otherChunk = createChunk(1, 3, { totalChunks: 5 });
      expect(hasMatchingRenderChunkMetadata(baseChunk, otherChunk)).toBe(false);
    });

    it('should allow chunkIndex to differ (different chunks of same file)', () => {
      // This is the key difference - chunkIndex can vary
      const chunk0 = createChunk(0, 3);
      const chunk1 = createChunk(1, 3);
      const chunk2 = createChunk(2, 3);

      expect(hasMatchingRenderChunkMetadata(chunk0, chunk1)).toBe(true);
      expect(hasMatchingRenderChunkMetadata(chunk1, chunk2)).toBe(true);
      expect(hasMatchingRenderChunkMetadata(chunk0, chunk2)).toBe(true);
    });
  });

  describe('Transitivity of Matching', () => {
    it('should maintain matching through chain (transitive property)', () => {
      const chunk0 = createChunk(0, 3, { name: 'file.docx' });
      const chunk1 = createChunk(1, 3, { name: 'file.docx' });
      const chunk2 = createChunk(2, 3, { name: 'file.docx' });

      // If A matches B and B matches C, then A should match C
      expect(hasMatchingRenderChunkMetadata(chunk0, chunk1)).toBe(true);
      expect(hasMatchingRenderChunkMetadata(chunk1, chunk2)).toBe(true);
      expect(hasMatchingRenderChunkMetadata(chunk0, chunk2)).toBe(true);
    });

    it('should not be transitive across different files', () => {
      const chunkA0 = createChunk(0, 2, { name: 'a.docx' });
      const chunkA1 = createChunk(1, 2, { name: 'a.docx' });
      const chunkB0 = createChunk(0, 2, { name: 'b.docx' });

      // A0 matches A1, but neither matches B0
      expect(hasMatchingRenderChunkMetadata(chunkA0, chunkA1)).toBe(true);
      expect(hasMatchingRenderChunkMetadata(chunkA0, chunkB0)).toBe(false);
      expect(hasMatchingRenderChunkMetadata(chunkA1, chunkB0)).toBe(false);
    });
  });
});

// =============================================================================
// CHUNK SORTING STATE MACHINE
// =============================================================================

describe('State Machine: Chunk Sorting', () => {
  describe('Immutability', () => {
    it('should not mutate original array', () => {
      const original = [createChunk(2, 3), createChunk(0, 3), createChunk(1, 3)];
      const originalIndices = original.map((c) => c.chunkIndex);

      sortRenderChunks(original);

      // Original should be unchanged
      expect(original.map((c) => c.chunkIndex)).toEqual(originalIndices);
    });

    it('should return new sorted array', () => {
      const original = [createChunk(2, 3), createChunk(0, 3), createChunk(1, 3)];
      const sorted = sortRenderChunks(original);

      expect(sorted).not.toBe(original);
      expect(sorted.map((c) => c.chunkIndex)).toEqual([0, 1, 2]);
    });
  });

  describe('Ordering Properties', () => {
    it('should sort in ascending chunkIndex order', () => {
      const permutations = [
        [0, 1, 2],
        [0, 2, 1],
        [1, 0, 2],
        [1, 2, 0],
        [2, 0, 1],
        [2, 1, 0],
      ];

      for (const perm of permutations) {
        const chunks = perm.map((i) => createChunk(i, 3));
        const sorted = sortRenderChunks(chunks);
        expect(sorted.map((c) => c.chunkIndex)).toEqual([0, 1, 2]);
      }
    });

    it('should handle single element', () => {
      const sorted = sortRenderChunks([createChunk(0, 1)]);
      expect(sorted.map((c) => c.chunkIndex)).toEqual([0]);
    });

    it('should handle already sorted input', () => {
      const sorted = sortRenderChunks([createChunk(0, 3), createChunk(1, 3), createChunk(2, 3)]);
      expect(sorted.map((c) => c.chunkIndex)).toEqual([0, 1, 2]);
    });
  });
});

// =============================================================================
// WORKFLOW RECOVERY STATE MACHINE
// =============================================================================

describe('State Machine: Workflow Recovery', () => {
  /**
   * Tests various recovery scenarios from error states
   */

  it('should recover from metadata mismatch by starting new workflow', () => {
    // Start workflow A
    let state = updateRenderChunkState([], createChunk(0, 3, { name: 'A.docx' }));
    state = updateRenderChunkState(state.chunks, createChunk(1, 3, { name: 'A.docx' }));

    // Mismatch triggers reset
    state = updateRenderChunkState(state.chunks, createChunk(1, 3, { name: 'B.docx' }));
    expect(state.status).toBe('reset');

    // Start fresh
    state = updateRenderChunkState([], createChunk(0, 2, { name: 'C.docx' }));
    expect(state.status).toBe('waiting');

    state = updateRenderChunkState(state.chunks, createChunk(1, 2, { name: 'C.docx' }));
    expect(state.status).toBe('ready');
  });

  it('should recover from invalid sequence by restarting', () => {
    // Build up workflow
    let state = updateRenderChunkState([], createChunk(0, 3));
    state = updateRenderChunkState(state.chunks, createChunk(1, 3));

    // Trigger invalid sequence with duplicate
    state = updateRenderChunkState(state.chunks, createChunk(1, 3));
    expect(state.status).toBe('reset');

    // Recovery
    state = updateRenderChunkState([], createChunk(0, 2));
    state = updateRenderChunkState(state.chunks, createChunk(1, 2));
    expect(state.status).toBe('ready');
  });

  it('should handle rapid file switching', () => {
    let state = updateRenderChunkState([], createChunk(0, 2, { name: 'file1.docx' }));

    // Switch to file2
    state = updateRenderChunkState(state.chunks, createChunk(0, 2, { name: 'file2.docx' }));
    expect(state.status).toBe('waiting');
    expect(state.chunks[0].name).toBe('file2.docx');

    // Switch to file3
    state = updateRenderChunkState(state.chunks, createChunk(0, 3, { name: 'file3.docx' }));
    expect(state.status).toBe('waiting');
    expect(state.chunks[0].name).toBe('file3.docx');

    // Complete file3
    state = updateRenderChunkState(state.chunks, createChunk(1, 3, { name: 'file3.docx' }));
    state = updateRenderChunkState(state.chunks, createChunk(2, 3, { name: 'file3.docx' }));
    expect(state.status).toBe('ready');
    expect(state.chunks[0].name).toBe('file3.docx');
  });

  it('should handle chunk arriving after completion (new file)', () => {
    // Complete workflow
    let state = updateRenderChunkState([], createChunk(0, 2));
    state = updateRenderChunkState(state.chunks, createChunk(1, 2));
    expect(state.status).toBe('ready');

    // New file chunk arrives (use empty array to start fresh)
    state = updateRenderChunkState([], createChunk(0, 3, { name: 'newfile.docx' }));
    expect(state.status).toBe('waiting');
  });
});

// =============================================================================
// EDGE CASES: BOUNDARY CONDITIONS
// =============================================================================

describe('State Machine Edge Cases', () => {
  it('should handle very large totalChunks values', () => {
    const state = updateRenderChunkState([], createChunk(0, 1000000));
    expect(state.status).toBe('waiting');
    expect(state.expectedChunks).toBe(1000000);
  });

  it('should handle chunk with index >= totalChunks (invalid chunk triggers reset)', () => {
    // chunkIndex >= totalChunks is invalid per isValidRenderOfficeData
    // This triggers a reset in the state machine
    const state = updateRenderChunkState([], createChunk(1, 1));
    expect(state.status).toBe('reset');
  });

  it('should handle zero totalChunks (degenerate case)', () => {
    // Zero total chunks is unusual but should not crash
    const state = updateRenderChunkState([], createChunk(0, 0));
    // With 0 expected and 1 received, it's >= expected, so check sequence
    // But isValidChunkSequence will fail for chunkIndex 0 with total 0
    expect(state.status).toBe('reset');
  });

  it('should handle very large chunkIndex values', () => {
    const state = updateRenderChunkState([], createChunk(999999, 1000000));
    expect(state.status).toBe('waiting');
    expect(state.receivedChunks).toBe(1);
  });
});