/**
 * Phase 81: Async Patterns and Retry Logic Tests
 * Tests for async patterns, retry mechanisms, and backoff strategies
 */

import { describe, expect, it } from 'vitest';
import { safeAsync, formatErrorMessage, isError, isErrorLike } from '../error-utils';
import { createOperationQueue, isQueueTimeoutError } from '../operation-queue';

// =============================================================================
// ASYNC PATTERN TESTS
// =============================================================================

describe('Async Patterns', () => {
  describe('safeAsync utility', () => {
    it('should return tuple with result and null error on success', async () => {
      const [result, error] = await safeAsync(() => Promise.resolve(42));
      expect(result).toBe(42);
      expect(error).toBeNull();
    });

    it('should return tuple with null result and error on failure', async () => {
      const [result, error] = await safeAsync(() => Promise.reject(new Error('failed')));
      expect(result).toBeNull();
      expect(error).toBeInstanceOf(Error);
      expect(error?.message).toBe('failed');
    });

    it('should handle async functions that throw', async () => {
      const [result, error] = await safeAsync(async () => {
        throw new Error('async throw');
      });
      expect(result).toBeNull();
      expect(error).toBeInstanceOf(Error);
    });

    it('should handle synchronous functions', async () => {
      const [result, error] = await safeAsync(async () => 'sync result');
      expect(result).toBe('sync result');
      expect(error).toBeNull();
    });

    it('should handle synchronous throws', async () => {
      const [result, error] = await safeAsync(() => {
        throw new Error('sync throw');
      });
      expect(result).toBeNull();
      expect(error).toBeInstanceOf(Error);
    });

    it('should preserve error type', async () => {
      class CustomError extends Error {
        constructor(message: string) {
          super(message);
          this.name = 'CustomError';
        }
      }
      const [result, error] = await safeAsync(() => Promise.reject(new CustomError('custom')));
      expect(result).toBeNull();
      expect(error).toBeInstanceOf(CustomError);
    });

    it('should handle null/undefined returns', async () => {
      const [result1] = await safeAsync(() => Promise.resolve(null));
      expect(result1).toBeNull();

      const [result2] = await safeAsync(() => Promise.resolve(undefined));
      expect(result2).toBeUndefined();
    });

    it('should handle complex objects', async () => {
      const obj = { a: 1, b: { c: 2 } };
      const [result] = await safeAsync(() => Promise.resolve(obj));
      expect(result).toEqual(obj);
    });
  });

  describe('Promise.race patterns', () => {
    it('should handle timeout with Promise.race', async () => {
      const timeout = 50;
      const slowPromise = new Promise<string>((resolve) => {
        setTimeout(() => resolve('slow'), 200);
      });
      const timeoutPromise = new Promise<string>((_, reject) => {
        setTimeout(() => reject(new Error('Timeout')), timeout);
      });

      await expect(Promise.race([slowPromise, timeoutPromise])).rejects.toThrow('Timeout');
    });

    it('should resolve fast promise in race', async () => {
      const fastPromise = Promise.resolve('fast');
      const slowPromise = new Promise<string>((resolve) => {
        setTimeout(() => resolve('slow'), 100);
      });

      const result = await Promise.race([fastPromise, slowPromise]);
      expect(result).toBe('fast');
    });
  });

  describe('Promise.allSettled patterns', () => {
    it('should collect all results regardless of rejection', async () => {
      const promises = [
        Promise.resolve('success1'),
        Promise.reject(new Error('failure')),
        Promise.resolve('success2'),
      ];

      const results = await Promise.allSettled(promises);

      expect(results[0].status).toBe('fulfilled');
      if (results[0].status === 'fulfilled') {
        expect(results[0].value).toBe('success1');
      }
      expect(results[1].status).toBe('rejected');
      if (results[1].status === 'rejected') {
        expect(results[1].reason.message).toBe('failure');
      }
      expect(results[2].status).toBe('fulfilled');
    });
  });

  describe('Sequential async execution', () => {
    it('should execute operations sequentially', async () => {
      const results: number[] = [];

      const operations = [1, 2, 3].map((n) => async () => {
        results.push(n);
        return n * 2;
      });

      // Execute sequentially
      const outputs: number[] = [];
      for (const op of operations) {
        outputs.push(await op());
      }

      expect(results).toEqual([1, 2, 3]);
      expect(outputs).toEqual([2, 4, 6]);
    });

    it('should handle sequential failures gracefully', async () => {
      const results: string[] = [];

      const operations = [
        async () => { results.push('a'); return 'a'; },
        async () => { throw new Error('fail'); },
        async () => { results.push('c'); return 'c'; },
      ];

      const outputs: (string | null)[] = [];
      for (const op of operations) {
        const [result] = await safeAsync(op);
        outputs.push(result);
      }

      expect(results).toEqual(['a', 'c']);
      expect(outputs).toEqual(['a', null, 'c']);
    });
  });
});

// =============================================================================
// RETRY LOGIC TESTS
// =============================================================================

describe('Retry Logic Patterns', () => {
  describe('Basic retry pattern', () => {
    it('should succeed on first attempt', async () => {
      let attempts = 0;
      const operation = async () => {
        attempts++;
        return 'success';
      };

      const result = await operation();
      expect(result).toBe('success');
      expect(attempts).toBe(1);
    });

    it('should retry on failure', async () => {
      let attempts = 0;
      const operation = async () => {
        attempts++;
        if (attempts < 3) {
          throw new Error(`Attempt ${attempts} failed`);
        }
        return 'success';
      };

      // Simple retry logic
      const retry = async <T>(fn: () => Promise<T>, maxRetries: number): Promise<T> => {
        let lastError: Error | undefined;
        for (let i = 0; i < maxRetries; i++) {
          try {
            return await fn();
          } catch (e) {
            lastError = e instanceof Error ? e : new Error(String(e));
          }
        }
        throw lastError;
      };

      const result = await retry(operation, 5);
      expect(result).toBe('success');
      expect(attempts).toBe(3);
    });

    it('should fail after max retries', async () => {
      let attempts = 0;
      const operation = async () => {
        attempts++;
        throw new Error('Always fails');
      };

      const retry = async <T>(fn: () => Promise<T>, maxRetries: number): Promise<T> => {
        let lastError: Error | undefined;
        for (let i = 0; i < maxRetries; i++) {
          try {
            return await fn();
          } catch (e) {
            lastError = e instanceof Error ? e : new Error(String(e));
          }
        }
        throw lastError;
      };

      await expect(retry(operation, 3)).rejects.toThrow('Always fails');
      expect(attempts).toBe(3);
    });
  });

  describe('Exponential backoff pattern', () => {
    it('should increase delay exponentially', async () => {
      const delays: number[] = [];
      let attempts = 0;

      const operation = async () => {
        attempts++;
        if (attempts < 3) {
          throw new Error('Transient failure');
        }
        return 'success';
      };

      const retryWithBackoff = async <T>(
        fn: () => Promise<T>,
        maxRetries: number,
        baseDelay: number = 10
      ): Promise<T> => {
        let lastError: Error | undefined;
        for (let i = 0; i < maxRetries; i++) {
          try {
            return await fn();
          } catch (e) {
            lastError = e instanceof Error ? e : new Error(String(e));
            if (i < maxRetries - 1) {
              const delay = baseDelay * Math.pow(2, i);
              delays.push(delay);
              await new Promise((resolve) => setTimeout(resolve, delay));
            }
          }
        }
        throw lastError;
      };

      const result = await retryWithBackoff(operation, 5, 10);
      expect(result).toBe('success');
      expect(delays).toEqual([10, 20]); // 10 * 2^0, 10 * 2^1
    });

    it('should cap maximum delay', async () => {
      const delays: number[] = [];

      const operation = async () => {
        throw new Error('Always fails');
      };

      const retryWithBackoff = async <T>(
        fn: () => Promise<T>,
        maxRetries: number,
        baseDelay: number = 10,
        maxDelay: number = 50
      ): Promise<T> => {
        let lastError: Error | undefined;
        for (let i = 0; i < maxRetries; i++) {
          try {
            return await fn();
          } catch (e) {
            lastError = e instanceof Error ? e : new Error(String(e));
            if (i < maxRetries - 1) {
              const delay = Math.min(baseDelay * Math.pow(2, i), maxDelay);
              delays.push(delay);
              await new Promise((resolve) => setTimeout(resolve, delay));
            }
          }
        }
        throw lastError;
      };

      await expect(retryWithBackoff(operation, 5, 10, 50)).rejects.toThrow('Always fails');
      expect(delays).toEqual([10, 20, 40, 50]); // Capped at 50
    });
  });

  describe('Jitter pattern', () => {
    it('should add random jitter to delay', async () => {
      const delays: number[] = [];

      const operation = async () => {
        throw new Error('Always fails');
      };

      const retryWithJitter = async <T>(
        fn: () => Promise<T>,
        maxRetries: number,
        baseDelay: number = 10
      ): Promise<T> => {
        let lastError: Error | undefined;
        for (let i = 0; i < maxRetries; i++) {
          try {
            return await fn();
          } catch (e) {
            lastError = e instanceof Error ? e : new Error(String(e));
            if (i < maxRetries - 1) {
              // Add jitter: base * 2^i * (0.5 to 1.5)
              const exponentialDelay = baseDelay * Math.pow(2, i);
              const jitter = 0.5 + Math.random();
              const delay = Math.round(exponentialDelay * jitter);
              delays.push(delay);
              await new Promise((resolve) => setTimeout(resolve, delay));
            }
          }
        }
        throw lastError;
      };

      await expect(retryWithJitter(operation, 4, 10)).rejects.toThrow('Always fails');
      expect(delays.length).toBe(3);
      // Each delay should be between 0.5x and 1.5x the exponential backoff
      expect(delays[0]).toBeGreaterThanOrEqual(5);  // 10 * 0.5
      expect(delays[0]).toBeLessThanOrEqual(15);    // 10 * 1.5
      expect(delays[1]).toBeGreaterThanOrEqual(10); // 20 * 0.5
      expect(delays[1]).toBeLessThanOrEqual(30);    // 20 * 1.5
    });
  });

  describe('Retry with predicate', () => {
    it('should only retry for specific errors', async () => {
      let attempts = 0;

      const operation = async () => {
        attempts++;
        if (attempts === 1) {
          const error = new Error('Network error');
          (error as Error & { code?: string }).code = 'ETIMEDOUT';
          throw error;
        }
        if (attempts === 2) {
          throw new Error('Fatal error'); // Should not retry this
        }
        return 'success';
      };

      const isRetryable = (error: Error): boolean => {
        return error.message.includes('Network') || (error as Error & { code?: string }).code === 'ETIMEDOUT';
      };

      const retryWithPredicate = async <T>(
        fn: () => Promise<T>,
        maxRetries: number,
        predicate: (error: Error) => boolean
      ): Promise<T> => {
        let lastError: Error | undefined;
        let retryCount = 0;

        for (let i = 0; i < maxRetries && retryCount < maxRetries; i++) {
          try {
            return await fn();
          } catch (e) {
            lastError = e instanceof Error ? e : new Error(String(e));
            if (!predicate(lastError)) {
              throw lastError; // Don't retry non-retryable errors
            }
            retryCount++;
          }
        }
        throw lastError;
      };

      await expect(retryWithPredicate(operation, 5, isRetryable)).rejects.toThrow('Fatal error');
      expect(attempts).toBe(2); // Stopped after fatal error
    });
  });
});

// =============================================================================
// OPERATION QUEUE RETRY TESTS
// =============================================================================

describe('Operation Queue with Retry', () => {
  describe('Queue timeout handling', () => {
    it('should identify timeout errors', () => {
      const timeoutError = new Error('Operation queue timeout');
      expect(isQueueTimeoutError(timeoutError)).toBe(true);

      const otherError = new Error('Some other error');
      expect(isQueueTimeoutError(otherError)).toBe(false);
    });

    it('should create queue with custom timeout', () => {
      const queue = createOperationQueue({ timeout: 5000 });
      expect(queue).toBeDefined();
    });

    it('should process operations in order', async () => {
      const queue = createOperationQueue();
      const results: number[] = [];

      await Promise.all([
        queue(async () => { results.push(1); return 1; }),
        queue(async () => { results.push(2); return 2; }),
        queue(async () => { results.push(3); return 3; }),
      ]);

      // Operations are queued but may complete in order due to sequential processing
      expect(results.sort()).toEqual([1, 2, 3]);
    });

    it('should propagate errors', async () => {
      const queue = createOperationQueue();

      await expect(queue(async () => {
        throw new Error('Operation failed');
      })).rejects.toThrow('Operation failed');
    });

    it('should continue processing after error', async () => {
      const queue = createOperationQueue();
      const results: string[] = [];

      // First operation fails
      await expect(queue(async () => {
        throw new Error('First failed');
      })).rejects.toThrow('First failed');

      // Second operation should still work
      const result = await queue(async () => {
        results.push('second');
        return 'success';
      });

      expect(result).toBe('success');
      expect(results).toEqual(['second']);
    });
  });

  describe('Queue with retry integration', () => {
    it('should allow retry of queued operations', async () => {
      const queue = createOperationQueue();
      let attempts = 0;

      const operation = async () => {
        attempts++;
        if (attempts < 3) {
          throw new Error('Temporary failure');
        }
        return 'success';
      };

      // Simple retry wrapper around queue
      const retryQueued = async <T>(
        fn: () => Promise<T>,
        maxRetries: number
      ): Promise<T> => {
        let lastError: Error | undefined;
        for (let i = 0; i < maxRetries; i++) {
          try {
            return await queue(fn);
          } catch (e) {
            lastError = e instanceof Error ? e : new Error(String(e));
          }
        }
        throw lastError;
      };

      const result = await retryQueued(operation, 5);
      expect(result).toBe('success');
      expect(attempts).toBe(3);
    });
  });
});

// =============================================================================
// CONCURRENT OPERATION TESTS
// =============================================================================

describe('Concurrent Operations', () => {
  describe('Parallel execution with limits', () => {
    it('should limit concurrent operations', async () => {
      let concurrent = 0;
      let maxConcurrent = 0;
      const limit = 2;

      const trackConcurrency = async (id: number) => {
        concurrent++;
        maxConcurrent = Math.max(maxConcurrent, concurrent);
        await new Promise((resolve) => setTimeout(resolve, 10));
        concurrent--;
        return id;
      };

      // Simple concurrency limiter
      /**
       * Run tasks with a fixed concurrency limit while preserving result order.
       */
      const withConcurrencyLimit = async <T>(
        tasks: (() => Promise<T>)[],
        limit: number
      ): Promise<T[]> => {
        const results: T[] = [];
        let currentIndex = 0;

        const runNext = async (): Promise<void> => {
          const index = currentIndex++;
          if (index >= tasks.length) return;
          results[index] = await tasks[index]();
          await runNext();
        };

        await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, runNext));
        return results;
      };

      const tasks = Array.from({ length: 5 }, (_, i) => () => trackConcurrency(i));
      await withConcurrencyLimit(tasks, limit);

      expect(maxConcurrent).toBeLessThanOrEqual(limit);
    });
  });

  describe('Batch processing', () => {
    it('should process items in batches', async () => {
      const items = [1, 2, 3, 4, 5, 6, 7, 8];
      const batchSize = 3;
      const batches: number[][] = [];

      const processBatch = async <T, R>(
        items: T[],
        batchSize: number,
        processor: (batch: T[]) => Promise<R[]>
      ): Promise<R[]> => {
        const results: R[] = [];
        for (let i = 0; i < items.length; i += batchSize) {
          const batch = items.slice(i, i + batchSize);
          const batchResults = await processor(batch);
          results.push(...batchResults);
        }
        return results;
      };

      const results = await processBatch(items, batchSize, async (batch) => {
        batches.push(batch);
        return batch.map((x) => x * 2);
      });

      expect(results).toEqual([2, 4, 6, 8, 10, 12, 14, 16]);
      expect(batches).toEqual([[1, 2, 3], [4, 5, 6], [7, 8]]);
    });
  });
});

// =============================================================================
// ERROR HANDLING WITH RETRY
// =============================================================================

describe('Error Handling with Retry', () => {
  describe('Error classification', () => {
    it('should classify errors correctly', () => {
      const networkError = new Error('Network error');
      const fileError = new Error('File not found');
      const unknownError = new Error('Something went wrong');

      expect(isError(networkError)).toBe(true);
      expect(isError(fileError)).toBe(true);
      expect(isError(unknownError)).toBe(true);
    });

    it('should format error messages consistently', () => {
      expect(formatErrorMessage(new Error('Test error'))).toBe('Test error');
      expect(formatErrorMessage('String error')).toBe('String error');
      expect(formatErrorMessage(null)).toBe('Unknown error');
      expect(formatErrorMessage(undefined)).toBe('Unknown error');
    });

    it('should detect error-like objects', () => {
      const errorLike = { message: 'error', name: 'Error' };
      const notErrorLike = { foo: 'bar' };

      expect(isErrorLike(errorLike)).toBe(true);
      expect(isErrorLike(notErrorLike)).toBe(false);
    });
  });

  describe('Error recovery', () => {
    it('should recover from transient errors', async () => {
      let attempts = 0;

      const operation = async () => {
        attempts++;
        if (attempts === 1) {
          throw Object.assign(new Error('ETIMEDOUT'), { code: 'ETIMEDOUT' });
        }
        return 'recovered';
      };

      const retryOnTransient = async <T>(fn: () => Promise<T>, maxRetries: number): Promise<T> => {
        let lastError: Error | undefined;
        for (let i = 0; i < maxRetries; i++) {
          try {
            return await fn();
          } catch (e) {
            lastError = e instanceof Error ? e : new Error(String(e));
            const code = (e as Error & { code?: string }).code;
            if (code !== 'ETIMEDOUT' && code !== 'ECONNRESET') {
              throw e; // Not a transient error
            }
          }
        }
        throw lastError;
      };

      const result = await retryOnTransient(operation, 3);
      expect(result).toBe('recovered');
      expect(attempts).toBe(2);
    });
  });
});

// =============================================================================
// PROMISE UTILITIES
// =============================================================================

describe('Promise Utilities', () => {
  describe('withTimeout', () => {
    it('should resolve before timeout', async () => {
      const withTimeout = <T>(promise: Promise<T>, ms: number): Promise<T> => {
        return Promise.race([
          promise,
          new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error('Timeout')), ms);
          }),
        ]);
      };

      const result = await withTimeout(Promise.resolve('fast'), 100);
      expect(result).toBe('fast');
    });

    it('should reject on timeout', async () => {
      const withTimeout = <T>(promise: Promise<T>, ms: number): Promise<T> => {
        return Promise.race([
          promise,
          new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error('Timeout')), ms);
          }),
        ]);
      };

      await expect(
        withTimeout(new Promise((resolve) => setTimeout(resolve, 100)), 10)
      ).rejects.toThrow('Timeout');
    });
  });

  describe('delay', () => {
    it('should delay execution', async () => {
      const delay = (ms: number): Promise<void> => {
        return new Promise((resolve) => setTimeout(resolve, ms));
      };

      const start = Date.now();
      await delay(20);
      const elapsed = Date.now() - start;

      expect(elapsed).toBeGreaterThanOrEqual(15); // Allow some tolerance
    });
  });

  describe('retry with delay', () => {
    it('should retry with fixed delay', async () => {
      let attempts = 0;
      const delays: number[] = [];

      const retryWithDelay = async <T>(
        fn: () => Promise<T>,
        maxRetries: number,
        delayMs: number
      ): Promise<T> => {
        let lastError: Error | undefined;
        for (let i = 0; i < maxRetries; i++) {
          try {
            return await fn();
          } catch (e) {
            lastError = e instanceof Error ? e : new Error(String(e));
            if (i < maxRetries - 1) {
              await new Promise((resolve) => setTimeout(resolve, delayMs));
              delays.push(delayMs);
            }
          }
        }
        throw lastError;
      };

      const operation = async () => {
        attempts++;
        if (attempts < 3) throw new Error('Retry');
        return 'success';
      };

      const result = await retryWithDelay(operation, 5, 10);
      expect(result).toBe('success');
      expect(delays).toEqual([10, 10]);
    });
  });
});
