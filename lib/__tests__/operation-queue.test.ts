import { describe, it, expect, vi } from 'vitest';
import {
  createOperationQueue,
  isQueueTimeoutError,
  DEFAULT_QUEUE_TIMEOUT,
} from '../operation-queue';

describe('operation-queue', () => {
  describe('createOperationQueue', () => {
    it('should return a function', () => {
      const queue = createOperationQueue();
      expect(typeof queue).toBe('function');
    });

    it('should return the result of the operation', async () => {
      const queue = createOperationQueue();
      const result = await queue(async () => 'test-result');
      expect(result).toBe('test-result');
    });

    it('should propagate errors from operations', async () => {
      const queue = createOperationQueue();

      let caughtError: Error | null = null;
      try {
        await queue(async () => {
          throw new Error('operation failed');
        });
      } catch (e) {
        caughtError = e as Error;
      }

      expect(caughtError).not.toBeNull();
      expect(caughtError?.message).toBe('operation failed');
    });

    it('should allow subsequent operations after an error', async () => {
      const queue = createOperationQueue();
      const executionOrder: number[] = [];

      // First operation fails
      try {
        await queue(async () => {
          executionOrder.push(1);
          throw new Error('failed');
        });
      } catch {
        // Ignore error
      }

      // Second operation should still run
      await queue(async () => {
        executionOrder.push(2);
      });

      expect(executionOrder).toEqual([1, 2]);
    });

    it('should use default timeout when not specified', () => {
      expect(DEFAULT_QUEUE_TIMEOUT).toBe(30000);
    });

    it('should handle operations that return undefined', async () => {
      const queue = createOperationQueue();
      const result = await queue(async () => {
        // No return
      });
      expect(result).toBeUndefined();
    });

    it('should handle operations that return objects', async () => {
      const queue = createOperationQueue();
      const result = await queue(async () => ({
        name: 'test',
        value: 42,
      }));
      expect(result).toEqual({ name: 'test', value: 42 });
    });

    it('should handle operations that return arrays', async () => {
      const queue = createOperationQueue();
      const result = await queue(async () => [1, 2, 3]);
      expect(result).toEqual([1, 2, 3]);
    });

    it('should handle operations that return numbers', async () => {
      const queue = createOperationQueue();
      const result = await queue(async () => 42);
      expect(result).toBe(42);
    });

    it('should handle operations that return null', async () => {
      const queue = createOperationQueue();
      const result = await queue(async () => null);
      expect(result).toBeNull();
    });

    it('should handle operations that return false', async () => {
      const queue = createOperationQueue();
      const result = await queue(async () => false);
      expect(result).toBe(false);
    });

    it('should handle operations that return 0', async () => {
      const queue = createOperationQueue();
      const result = await queue(async () => 0);
      expect(result).toBe(0);
    });

    it('should handle operations that return empty string', async () => {
      const queue = createOperationQueue();
      const result = await queue(async () => '');
      expect(result).toBe('');
    });

    it('should run multiple operations in sequence', async () => {
      const queue = createOperationQueue();
      const results: number[] = [];

      // Start all operations concurrently - they should still run sequentially
      const promises = [1, 2, 3, 4, 5].map((n) =>
        queue(async () => {
          results.push(n);
          return n;
        }),
      );

      await Promise.all(promises);

      // Operations should complete in order
      expect(results).toEqual([1, 2, 3, 4, 5]);
    });

    it('should handle very quick sequential operations', async () => {
      const queue = createOperationQueue();
      let counter = 0;

      const promises: Promise<void>[] = [];
      for (let i = 0; i < 100; i++) {
        promises.push(queue(async () => {
          counter++;
        }));
      }

      await Promise.all(promises);
      expect(counter).toBe(100);
    });

    it('should call onTimeout callback when timeout occurs', async () => {
      const onTimeout = vi.fn();
      const queue = createOperationQueue({ timeout: 50, onTimeout });

      // Create a hanging promise
      let resolveHanging: () => void;
      const hangingPromise = new Promise<void>((resolve) => {
        resolveHanging = resolve;
      });

      // First operation never resolves (but we catch its error)
      const firstOp = queue(async () => {
        await hangingPromise;
      }).catch(() => {
        // Expected to eventually reject when we clean up
      });

      // Wait a tick to ensure the first operation starts
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Second operation should timeout waiting for the first
      void queue(async () => 'timeout-recovery');

      // Wait for the timeout to occur
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(onTimeout).toHaveBeenCalled();

      // Clean up the hanging promise
      resolveHanging!();
      await firstOp;
    });
  });

  describe('isQueueTimeoutError', () => {
    it('should return true for queue timeout errors', () => {
      const error = new Error('Operation queue timeout');
      expect(isQueueTimeoutError(error)).toBe(true);
    });

    it('should return false for other errors', () => {
      const error = new Error('Some other error');
      expect(isQueueTimeoutError(error)).toBe(false);
    });

    it('should return false for non-Error values', () => {
      expect(isQueueTimeoutError('string')).toBe(false);
      expect(isQueueTimeoutError(123)).toBe(false);
      expect(isQueueTimeoutError(null)).toBe(false);
      expect(isQueueTimeoutError(undefined)).toBe(false);
      expect(isQueueTimeoutError({})).toBe(false);
    });

    it('should return false for error with similar but different message', () => {
      const error = new Error('operation queue timeout'); // lowercase
      expect(isQueueTimeoutError(error)).toBe(false);
    });

    it('should return false for error with partial message', () => {
      const error = new Error('timeout');
      expect(isQueueTimeoutError(error)).toBe(false);
    });
  });

  describe('OperationQueueOptions', () => {
    it('should accept empty options', () => {
      const queue = createOperationQueue({});
      expect(typeof queue).toBe('function');
    });

    it('should accept timeout option only', () => {
      const queue = createOperationQueue({ timeout: 5000 });
      expect(typeof queue).toBe('function');
    });

    it('should accept onTimeout option only', () => {
      const queue = createOperationQueue({ onTimeout: () => {} });
      expect(typeof queue).toBe('function');
    });

    it('should accept both options', () => {
      const queue = createOperationQueue({
        timeout: 10000,
        onTimeout: () => console.warn('timeout'),
      });
      expect(typeof queue).toBe('function');
    });
  });

  describe('edge cases', () => {
    it('should handle operation that throws synchronously', async () => {
      const queue = createOperationQueue();

      let caughtError: Error | null = null;
      try {
        await queue(async () => {
          throw new Error('sync error');
        });
      } catch (e) {
        caughtError = e as Error;
      }

      expect(caughtError).not.toBeNull();
      expect(caughtError?.message).toBe('sync error');
    });

    it('should handle operations that resolve with promises', async () => {
      const queue = createOperationQueue();
      const result = await queue(async () => {
        return Promise.resolve('nested');
      });
      expect(result).toBe('nested');
    });

    it('should handle concurrent queue operations', async () => {
      const queue1 = createOperationQueue();
      const queue2 = createOperationQueue();

      const results1: number[] = [];
      const results2: string[] = [];

      // Both queues should operate independently
      const p1 = [1, 2, 3].map((n) =>
        queue1(async () => {
          results1.push(n);
        }),
      );
      const p2 = ['a', 'b', 'c'].map((s) =>
        queue2(async () => {
          results2.push(s);
        }),
      );

      await Promise.all([...p1, ...p2]);

      expect(results1).toEqual([1, 2, 3]);
      expect(results2).toEqual(['a', 'b', 'c']);
    });
  });
});

describe('stress tests', () => {
  it('should handle 500 concurrent operations', async () => {
    const queue = createOperationQueue();
    let counter = 0;

    const promises: Promise<void>[] = [];
    for (let i = 0; i < 500; i++) {
      promises.push(queue(async () => {
        counter++;
      }));
    }

    await Promise.all(promises);
    expect(counter).toBe(500);
  });

  it('should maintain order with 1000 operations', async () => {
    const queue = createOperationQueue();
    const results: number[] = [];

    const promises: Promise<void>[] = [];
    for (let i = 0; i < 1000; i++) {
      promises.push(queue(async () => {
        results.push(i);
      }));
    }

    await Promise.all(promises);

    // Results should be in order despite concurrent calls
    for (let i = 0; i < 1000; i++) {
      expect(results[i]).toBe(i);
    }
  });

  it('should handle rapid fire operations with varying delays', async () => {
    const queue = createOperationQueue();
    const results: string[] = [];

    const promises = [
      queue(async () => {
        await new Promise((r) => setTimeout(r, 10));
        results.push('a');
      }),
      queue(async () => {
        results.push('b');
      }),
      queue(async () => {
        await new Promise((r) => setTimeout(r, 5));
        results.push('c');
      }),
      queue(async () => {
        results.push('d');
      }),
    ];

    await Promise.all(promises);

    // Despite delays, order should be maintained
    expect(results).toEqual(['a', 'b', 'c', 'd']);
  });

  it('should handle operations that return complex nested objects', async () => {
    const queue = createOperationQueue();

    const result = await queue(async () => ({
      level1: {
        level2: {
          level3: {
            array: [1, 2, 3],
            map: new Map([['key', 'value']]),
            set: new Set([1, 2, 3]),
          },
        },
      },
    }));

    expect(result.level1.level2.level3.array).toEqual([1, 2, 3]);
    expect(result.level1.level2.level3.map.get('key')).toBe('value');
    expect(result.level1.level2.level3.set.has(2)).toBe(true);
  });

  it('should handle interleaved operations from multiple queues', async () => {
    const queue1 = createOperationQueue();
    const queue2 = createOperationQueue();
    const results: string[] = [];

    // Queue 1 operations
    const p1 = queue1(async () => {
      results.push('q1-1');
    });
    const p2 = queue1(async () => {
      results.push('q1-2');
    });

    // Queue 2 operations
    const p3 = queue2(async () => {
      results.push('q2-1');
    });
    const p4 = queue2(async () => {
      results.push('q2-2');
    });

    await Promise.all([p1, p2, p3, p4]);

    // Each queue should maintain order internally
    const q1Results = results.filter((r) => r.startsWith('q1'));
    const q2Results = results.filter((r) => r.startsWith('q2'));

    expect(q1Results).toEqual(['q1-1', 'q1-2']);
    expect(q2Results).toEqual(['q2-1', 'q2-2']);
  });
});
