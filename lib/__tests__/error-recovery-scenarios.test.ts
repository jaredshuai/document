/**
 * Phase 92: Error Recovery Scenario Tests
 *
 * Tests comprehensive error recovery patterns including retry logic,
 * fallback strategies, graceful degradation, and error propagation.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  formatErrorMessage,
  isErrorLike,
  isNetworkError,
  isFileError,
  createErrorContext,
  safeAsync,
  safeLogError,
} from '../error-utils';
import { createOperationQueue, isQueueTimeoutError } from '../operation-queue';

describe('Phase 92: Error Recovery Scenario Tests', () => {
  describe('Error Classification and Recovery', () => {
    it('should classify network errors for retry decisions', () => {
      const networkErrors = [
        { error: new Error('Network request failed'), expected: true },
        { error: new Error('fetch failed'), expected: true },
        { error: new Error('Connection timeout'), expected: true },
        { error: new Error('ECONNREFUSED'), expected: true },
        { error: new Error('ENOTFOUND'), expected: true },
        { error: new TypeError('fetch timeout'), expected: true },
        { error: new Error('Request aborted'), expected: true },
        { error: new Error('Connection cancelled'), expected: true },
      ];

      for (const { error, expected } of networkErrors) {
        expect(isNetworkError(error)).toBe(expected);
      }
    });

    it('should classify file errors for recovery decisions', () => {
      const fileErrors = [
        { error: new Error('File not found'), expected: true },
        { error: new Error('ENOENT'), expected: true },
        { error: new Error('Permission denied'), expected: true },
        { error: new Error('EACCES'), expected: true },
        { error: new Error('File too large'), expected: true },
        { error: new Error('No space left on device'), expected: true },
        { error: new Error('Is a directory'), expected: true },
      ];

      for (const { error, expected } of fileErrors) {
        expect(isFileError(error)).toBe(expected);
      }
    });

    it('should distinguish between error types for appropriate recovery', () => {
      const networkError = new Error('Network timeout');
      const fileError = new Error('ENOENT');
      const genericError = new Error('Unknown error');

      // Network errors should suggest retry
      expect(isNetworkError(networkError)).toBe(true);
      expect(isFileError(networkError)).toBe(false);

      // File errors should suggest fallback or user notification
      expect(isFileError(fileError)).toBe(true);
      expect(isNetworkError(fileError)).toBe(false);

      // Generic errors need generic handling
      expect(isNetworkError(genericError)).toBe(false);
      expect(isFileError(genericError)).toBe(false);
    });
  });

  describe('Error Message Formatting Recovery', () => {
    it('should extract meaningful messages from various error types', () => {
      const testCases = [
        { input: new Error('Test error'), expected: 'Test error' },
        { input: { message: 'Object error' }, expected: 'Object error' },
        { input: 'String error', expected: 'String error' },
        { input: null, expected: 'Fallback message' },
        { input: undefined, expected: 'Fallback message' },
        { input: '', expected: 'Fallback message' },
      ];

      for (const { input, expected } of testCases) {
        expect(formatErrorMessage(input, 'Fallback message')).toBe(expected);
      }
    });

    it('should provide fallback messages for unparseable errors', () => {
      const unparseableValues = [
        null,
        undefined,
        {},
        { noMessage: 'value' },
        123,
        true,
      ];

      for (const value of unparseableValues) {
        const message = formatErrorMessage(value, 'Operation failed');
        expect(typeof message).toBe('string');
        expect(message.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Safe Async Operations Recovery', () => {
    it('should handle successful operations', async () => {
      const [result, error] = await safeAsync(() => Promise.resolve('success'));

      expect(result).toBe('success');
      expect(error).toBeNull();
    });

    it('should capture and return errors for handling', async () => {
      const testError = new Error('Operation failed');
      const [result, error] = await safeAsync(() => Promise.reject(testError));

      expect(result).toBeNull();
      expect(error).toBe(testError);
    });

    it('should wrap non-Error rejections in Error objects', async () => {
      const [result, error] = await safeAsync(() => Promise.reject('string error'));

      expect(result).toBeNull();
      expect(error).toBeInstanceOf(Error);
      expect(error?.message).toBe('string error');
    });

    it('should handle async operations that throw', async () => {
      const [result, error] = await safeAsync(async () => {
        throw new TypeError('Type error in async');
      });

      expect(result).toBeNull();
      expect(error).toBeInstanceOf(TypeError);
    });
  });

  describe('Error Context Creation for Debugging', () => {
    it('should create rich error context for debugging', () => {
      const error = new Error('Conversion failed');
      const context = createErrorContext(error, {
        operation: 'document-conversion',
        context: { fileName: 'document.docx', format: 'pdf' },
      });

      expect(context.message).toBe('Conversion failed');
      expect(context.name).toBe('Error');
      expect(context.operation).toBe('document-conversion');
      expect(context.context).toEqual({ fileName: 'document.docx', format: 'pdf' });
      expect(context.timestamp).toBeDefined();
    });

    it('should handle non-Error inputs in context creation', () => {
      const context = createErrorContext('Simple string error', {
        operation: 'file-loading',
      });

      expect(context.message).toBe('Simple string error');
      expect(context.name).toBe('UnknownError');
      expect(context.operation).toBe('file-loading');
    });

    it('should capture error cause chains', () => {
      const cause = new Error('Root cause');
      const error = new Error('Wrapper error');
      const context = createErrorContext(error, { cause });

      expect(context.cause).toBe(cause);
    });
  });

  describe('Operation Queue Recovery Patterns', () => {
    it('should handle sequential operation failures gracefully', async () => {
      const queue = createOperationQueue({ timeout: 1000 });
      const results: string[] = [];

      // First operation succeeds
      await queue(async () => {
        results.push('op1');
        return 'result1';
      });

      // Second operation fails
      try {
        await queue(async () => {
          results.push('op2');
          throw new Error('Operation 2 failed');
        });
      } catch {
        // Expected
      }

      // Third operation should still run
      const result3 = await queue(async () => {
        results.push('op3');
        return 'result3';
      });

      expect(results).toEqual(['op1', 'op2', 'op3']);
      expect(result3).toBe('result3');
    });

    it('should detect queue timeout errors', () => {
      const timeoutError = new Error('Operation queue timeout');
      const otherError = new Error('Different error');

      expect(isQueueTimeoutError(timeoutError)).toBe(true);
      expect(isQueueTimeoutError(otherError)).toBe(false);
      expect(isQueueTimeoutError(null)).toBe(false);
      expect(isQueueTimeoutError({})).toBe(false);
    });

    it('should handle timeout callbacks', async () => {
      const timeoutCallback = vi.fn();
      const queue = createOperationQueue({
        timeout: 10, // Very short timeout
        onTimeout: timeoutCallback,
      });

      // Create a blocking operation
      const blockingOp = queue(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
        return 'blocked';
      });

      // Try to queue another operation (will timeout waiting for first)
      const secondOp = queue(async () => 'second');

      // Wait for both (second will hit timeout)
      await Promise.allSettled([blockingOp, secondOp]);

      // Timeout callback should have been called
      expect(timeoutCallback).toHaveBeenCalled();
    });
  });

  describe('Retry Pattern Scenarios', () => {
    it('should demonstrate exponential backoff pattern', async () => {
      const delays: number[] = [];
      const baseDelay = 100;

      const calculateDelay = (attempt: number): number => {
        return baseDelay * Math.pow(2, attempt - 1);
      };

      // Simulate calculating delays for 3 attempts
      for (let i = 1; i <= 3; i++) {
        delays.push(calculateDelay(i));
      }

      expect(delays).toEqual([100, 200, 400]);
    });

    it('should demonstrate retry with error classification', async () => {
      let attempts = 0;

      const shouldRetry = (error: unknown): boolean => {
        return isNetworkError(error); // Only retry network errors
      };

      const operation = async (): Promise<string> => {
        attempts++;
        if (attempts < 3) {
          throw new Error('Network timeout');
        }
        return 'success';
      };

      let result = '';
      const maxRetries = 5;

      for (let i = 0; i < maxRetries; i++) {
        const [res, err] = await safeAsync(operation);
        if (res) {
          result = res;
          break;
        }
        if (err && !shouldRetry(err)) {
          break;
        }
      }

      expect(result).toBe('success');
      expect(attempts).toBe(3);
    });
  });

  describe('Graceful Degradation Patterns', () => {
    it('should fall back to default values on error', async () => {
      const getDocumentType = async (fileName: string): Promise<string> => {
        const parts = fileName.split('.');
        if (parts.length < 2) throw new Error('Invalid filename');
        return parts.pop()!.toLowerCase();
      };

      const safeGetDocumentType = async (fileName: string): Promise<string> => {
        const [result, error] = await safeAsync(() => getDocumentType(fileName));
        if (result) return result;
        console.log('Falling back to default:', error?.message);
        return 'unknown';
      };

      expect(await safeGetDocumentType('document.docx')).toBe('docx');
      expect(await safeGetDocumentType('noextension')).toBe('unknown');
      expect(await safeGetDocumentType('')).toBe('unknown');
    });

    it('should provide partial results on partial failure', async () => {
      const processItems = async <T, R>(
        items: T[],
        processor: (item: T) => Promise<R>,
      ): Promise<{ results: R[]; errors: Error[] }> => {
        const results: R[] = [];
        const errors: Error[] = [];

        await Promise.all(
          items.map(async (item) => {
            const [result, error] = await safeAsync(() => processor(item));
            if (result) results.push(result);
            if (error) errors.push(error);
          }),
        );

        return { results, errors };
      };

      const items = [1, 2, 3, 4, 5];
      const processor = async (n: number) => {
        if (n % 2 === 0) throw new Error(`Even number: ${n}`);
        return n * 2;
      };

      const { results, errors } = await processItems(items, processor);

      expect(results).toEqual([2, 6, 10]); // 1*2, 3*2, 5*2
      expect(errors).toHaveLength(2); // 2 and 4 failed
    });
  });

  describe('Error Propagation Patterns', () => {
    it('should preserve error cause chain', async () => {
      const rootCause = new Error('Database connection failed');
      const intermediateError = new Error('Failed to load document');
      (intermediateError as any).cause = rootCause;

      const context = createErrorContext(intermediateError, {
        operation: 'document-load',
        cause: rootCause,
      });

      expect(context.cause).toBe(rootCause);
    });

    it('should aggregate multiple errors', async () => {
      const errors = [
        new Error('Error 1'),
        new Error('Error 2'),
        new Error('Error 3'),
      ];

      const aggregateMessage = errors
        .map((e, i) => `[${i + 1}] ${e.message}`)
        .join('; ');

      expect(aggregateMessage).toBe('[1] Error 1; [2] Error 2; [3] Error 3');
    });
  });

  describe('Safe Logging Recovery', () => {
    let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
      consoleErrorSpy.mockRestore();
    });

    it('should safely log errors without crashing', () => {
      // These should not throw
      expect(() => safeLogError(new Error('Test error'))).not.toThrow();
      expect(() => safeLogError(null)).not.toThrow();
      expect(() => safeLogError(undefined)).not.toThrow();
      expect(() => safeLogError('string error')).not.toThrow();
      expect(() => safeLogError({ custom: 'error' })).not.toThrow();
    });

    it('should include prefix in log messages', () => {
      safeLogError(new Error('Test error'), 'DocumentLoader');

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[DocumentLoader] Test error',
      );
    });

    it('should include context in log output', () => {
      safeLogError(new Error('Test error'), 'DocumentLoader', {
        fileName: 'document.docx',
        operation: 'convert',
      });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[DocumentLoader] Test error',
        { fileName: 'document.docx', operation: 'convert' },
      );
    });
  });

  describe('Error Recovery Decision Trees', () => {
    it('should determine appropriate recovery action based on error type', () => {
      const getRecoveryAction = (error: unknown): 'retry' | 'fallback' | 'abort' | 'notify' => {
        if (!isErrorLike(error)) return 'abort';

        if (isNetworkError(error)) return 'retry';
        if (isFileError(error)) {
          const message = formatErrorMessage(error).toLowerCase();
          if (message.includes('not found')) return 'fallback';
          if (message.includes('permission')) return 'notify';
          return 'abort';
        }

        return 'abort';
      };

      expect(getRecoveryAction(new Error('Network timeout'))).toBe('retry');
      expect(getRecoveryAction(new Error('File not found'))).toBe('fallback');
      expect(getRecoveryAction(new Error('Permission denied'))).toBe('notify');
      expect(getRecoveryAction(new Error('Unknown error'))).toBe('abort');
      expect(getRecoveryAction(null)).toBe('abort');
    });

    it('should determine max retries based on error type', () => {
      const getMaxRetries = (error: unknown): number => {
        if (!isErrorLike(error)) return 0;

        if (isNetworkError(error)) {
          const message = formatErrorMessage(error).toLowerCase();
          if (message.includes('timeout')) return 3;
          if (message.includes('notfound')) return 1; // DNS might resolve
          return 2;
        }

        return 0;
      };

      expect(getMaxRetries(new Error('Connection timeout'))).toBe(3);
      expect(getMaxRetries(new Error('ENOTFOUND'))).toBe(1);
      expect(getMaxRetries(new Error('Network error'))).toBe(2);
      expect(getMaxRetries(new Error('File error'))).toBe(0);
    });
  });
});