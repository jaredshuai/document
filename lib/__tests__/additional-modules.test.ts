/**
 * Phase 71: Additional Module Tests
 *
 * Additional tests for modules that need more coverage.
 */

import { describe, it, expect } from 'vitest';
import {
  hasMatchingRenderChunkMetadata,
  sortRenderChunks,
  updateRenderChunkState,
} from '../render-workflow';
import {
  createOperationQueue,
  isQueueTimeoutError,
  DEFAULT_QUEUE_TIMEOUT,
} from '../operation-queue';
import type { RenderOfficeData } from '../events';

describe('Render Workflow Tests', () => {
  const createMockChunk = (
    chunkIndex: number,
    totalChunks: number,
    name: string = 'test.docx',
    size: number = 1000,
    lastModified: number = 1234567890,
    type: string = 'docx',
  ): RenderOfficeData => ({
    chunkIndex,
    data: `chunk${chunkIndex}`,
    lastModified,
    name,
    size,
    totalChunks,
    type,
  });

  describe('hasMatchingRenderChunkMetadata', () => {
    it('should return true for matching metadata', () => {
      const chunk1 = createMockChunk(0, 2);
      const chunk2 = createMockChunk(1, 2);
      expect(hasMatchingRenderChunkMetadata(chunk1, chunk2)).toBe(true);
    });

    it('should return false for different lastModified', () => {
      const chunk1 = createMockChunk(0, 2);
      const chunk2 = createMockChunk(1, 2, 'test.docx', 1000, 9999999);
      expect(hasMatchingRenderChunkMetadata(chunk1, chunk2)).toBe(false);
    });

    it('should return false for different name', () => {
      const chunk1 = createMockChunk(0, 2);
      const chunk2 = createMockChunk(1, 2, 'other.docx');
      expect(hasMatchingRenderChunkMetadata(chunk1, chunk2)).toBe(false);
    });

    it('should return false for different size', () => {
      const chunk1 = createMockChunk(0, 2);
      const chunk2 = createMockChunk(1, 2, 'test.docx', 2000);
      expect(hasMatchingRenderChunkMetadata(chunk1, chunk2)).toBe(false);
    });

    it('should return false for different totalChunks', () => {
      const chunk1 = createMockChunk(0, 2);
      const chunk2 = createMockChunk(1, 3);
      expect(hasMatchingRenderChunkMetadata(chunk1, chunk2)).toBe(false);
    });

    it('should return false for different type', () => {
      const chunk1 = createMockChunk(0, 2);
      const chunk2 = createMockChunk(1, 2, 'test.docx', 1000, 1234567890, 'xlsx');
      expect(hasMatchingRenderChunkMetadata(chunk1, chunk2)).toBe(false);
    });
  });

  describe('sortRenderChunks', () => {
    it('should sort chunks by chunkIndex', () => {
      const chunks = [
        createMockChunk(2, 3),
        createMockChunk(0, 3),
        createMockChunk(1, 3),
      ];

      const sorted = sortRenderChunks(chunks);
      expect(sorted[0].chunkIndex).toBe(0);
      expect(sorted[1].chunkIndex).toBe(1);
      expect(sorted[2].chunkIndex).toBe(2);
    });

    it('should not mutate original array', () => {
      const chunks = [createMockChunk(2, 3), createMockChunk(0, 3)];
      const original = [...chunks];
      sortRenderChunks(chunks);
      expect(chunks).toEqual(original);
    });
  });

  describe('updateRenderChunkState', () => {
    it('should start with waiting status', () => {
      const chunk = createMockChunk(0, 2);
      const result = updateRenderChunkState([], chunk);

      expect(result.status).toBe('waiting');
      expect(result.receivedChunks).toBe(1);
      expect(result.expectedChunks).toBe(2);
    });

    it('should accumulate matching chunks', () => {
      const chunk0 = createMockChunk(0, 2);
      const chunk1 = createMockChunk(1, 2);

      const result0 = updateRenderChunkState([], chunk0);
      expect(result0.status).toBe('waiting');

      const result1 = updateRenderChunkState(result0.chunks, chunk1);
      expect(result1.status).toBe('ready');
      expect(result1.receivedChunks).toBe(2);
    });

    it('should reset on metadata mismatch', () => {
      const chunk0 = createMockChunk(0, 2);
      const chunk1 = createMockChunk(1, 2, 'different.docx');

      const result0 = updateRenderChunkState([], chunk0);
      const result1 = updateRenderChunkState(result0.chunks, chunk1);

      expect(result1.status).toBe('reset');
      if (result1.status === 'reset') {
        expect(result1.reason).toBe('metadata-mismatch');
      }
    });

    it('should restart on new chunk 0', () => {
      const chunk0_v1 = createMockChunk(0, 2);
      const chunk0_v2 = createMockChunk(0, 3, 'new.docx');

      const result0 = updateRenderChunkState([], chunk0_v1);
      const result1 = updateRenderChunkState(result0.chunks, chunk0_v2);

      expect(result1.status).toBe('waiting');
      expect(result1.expectedChunks).toBe(3);
    });
  });
});

describe('Operation Queue Tests', () => {
  describe('DEFAULT_QUEUE_TIMEOUT', () => {
    it('should be defined', () => {
      expect(DEFAULT_QUEUE_TIMEOUT).toBeDefined();
      expect(DEFAULT_QUEUE_TIMEOUT).toBe(30000);
    });
  });

  describe('createOperationQueue', () => {
    it('should create a queue function', () => {
      const queue = createOperationQueue();
      expect(typeof queue).toBe('function');
    });

    it('should execute operations', async () => {
      const queue = createOperationQueue();
      const result = await queue(() => Promise.resolve('test'));
      expect(result).toBe('test');
    });

    it('should execute operations sequentially', async () => {
      const queue = createOperationQueue();
      const order: number[] = [];

      const op1 = queue(async () => {
        order.push(1);
        await new Promise((r) => setTimeout(r, 10));
        return 1;
      });

      const op2 = queue(async () => {
        order.push(2);
        return 2;
      });

      await Promise.all([op1, op2]);
      expect(order).toEqual([1, 2]);
    });
  });

  describe('isQueueTimeoutError', () => {
    it('should return true for queue timeout error', () => {
      const error = new Error('Operation queue timeout');
      expect(isQueueTimeoutError(error)).toBe(true);
    });

    it('should return false for other errors', () => {
      const error = new Error('Other error');
      expect(isQueueTimeoutError(error)).toBe(false);
    });

    it('should return false for non-Error values', () => {
      expect(isQueueTimeoutError('error')).toBe(false);
      expect(isQueueTimeoutError(null)).toBe(false);
      expect(isQueueTimeoutError(undefined)).toBe(false);
    });
  });
});