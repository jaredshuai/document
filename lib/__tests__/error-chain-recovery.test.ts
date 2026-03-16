/**
 * Error Chain and Recovery Tests
 * Tests for error cause chains, recovery patterns, and error composition scenarios.
 */
import { describe, expect, it } from 'vitest';
import {
  formatErrorMessage,
  isError,
  isErrorLike,
  createErrorContext,
  safeAsync,
  isNetworkError,
  isFileError,
} from '../error-utils';

describe('Error Chain Tests', () => {
  describe('Error cause chains', () => {
    it('should handle errors with cause property', () => {
      const rootCause = new Error('Network timeout');
      const intermediateError = new Error('Failed to fetch document');
      (intermediateError as Error & { cause?: Error }).cause = rootCause;

      expect(formatErrorMessage(intermediateError)).toBe('Failed to fetch document');
    });

    it('should create error context with cause', () => {
      const cause = new Error('Root cause');
      const error = new Error('Wrapper error');
      const context = createErrorContext(error, { cause });

      expect(context.cause).toBe(cause);
    });

    it('should handle nested error chains', () => {
      const level3 = new Error('DNS resolution failed');
      const level2 = new Error('Connection refused');
      (level2 as Error & { cause?: Error }).cause = level3;
      const level1 = new Error('Failed to load document');
      (level1 as Error & { cause?: Error }).cause = level2;

      const context = createErrorContext(level1);
      expect(context.message).toBe('Failed to load document');
    });

    it('should handle non-Error causes', () => {
      const error = new Error('Wrapper');
      (error as Error & { cause?: string }).cause = 'string cause';

      const context = createErrorContext(error, { cause: 'string cause' });
      expect(context.cause).toBe('string cause');
    });
  });

  describe('Error classification in chains', () => {
    it('should classify network errors in chains', () => {
      const networkError = new Error('fetch failed');
      expect(isNetworkError(networkError)).toBe(true);

      const wrappedError = new Error('Document loading failed');
      (wrappedError as Error & { cause?: Error }).cause = networkError;

      // The wrapper is not a network error, but the cause is
      expect(isNetworkError(wrappedError)).toBe(false);
    });

    it('should classify file errors in chains', () => {
      const fileError = new Error('ENOENT: file not found');
      expect(isFileError(fileError)).toBe(true);

      const wrappedError = new Error('Document processing failed');
      (wrappedError as Error & { cause?: Error }).cause = fileError;

      // The wrapper is not a file error, but the cause is
      expect(isFileError(wrappedError)).toBe(false);
    });
  });
});

describe('Error Recovery Tests', () => {
  describe('safeAsync recovery patterns', () => {
    it('should allow retry after error', async () => {
      let attempts = 0;
      const flakyOperation = () => {
        attempts++;
        if (attempts < 3) {
          return Promise.reject(new Error('Temporary failure'));
        }
        return Promise.resolve('success');
      };

      // First attempt fails
      const [result1, error1] = await safeAsync(flakyOperation);
      expect(result1).toBeNull();
      expect(error1).toBeInstanceOf(Error);

      // Second attempt fails
      const [result2, error2] = await safeAsync(flakyOperation);
      expect(result2).toBeNull();
      expect(error2).toBeInstanceOf(Error);

      // Third attempt succeeds
      const [result3, error3] = await safeAsync(flakyOperation);
      expect(result3).toBe('success');
      expect(error3).toBeNull();
    });

    it('should handle concurrent operations with independent errors', async () => {
      const operations = [
        safeAsync(() => Promise.resolve('a')),
        safeAsync(() => Promise.reject(new Error('b failed'))),
        safeAsync(() => Promise.resolve('c')),
        safeAsync(() => Promise.reject(new Error('d failed'))),
      ];

      const results = await Promise.all(operations);

      expect(results[0]).toEqual(['a', null]);
      expect(results[1]).toEqual([null, expect.any(Error)]);
      expect(results[2]).toEqual(['c', null]);
      expect(results[3]).toEqual([null, expect.any(Error)]);
    });

    it('should allow fallback value on error', async () => {
      const [result, error] = await safeAsync(() => Promise.reject(new Error('Failed')));
      const fallbackValue = result ?? 'default';

      expect(fallbackValue).toBe('default');
      expect(error).toBeInstanceOf(Error);
    });
  });

  describe('Error recovery with state preservation', () => {
    it('should preserve partial state on error', async () => {
      interface DocumentState {
        filename: string;
        content?: string;
        loaded: boolean;
        error?: string;
      }

      const initialState: DocumentState = { filename: 'document.docx', loaded: false };

      const loadContent = async (state: DocumentState): Promise<DocumentState> => {
        const [content, error] = await safeAsync(() =>
          Promise.reject(new Error('Network error'))
        );

        if (error) {
          return { ...state, error: formatErrorMessage(error) };
        }
        return { ...state, content: content ?? undefined, loaded: true };
      };

      const finalState = await loadContent(initialState);

      expect(finalState.filename).toBe('document.docx'); // Preserved
      expect(finalState.loaded).toBe(false);
      expect(finalState.error).toBe('Network error');
    });

    it('should handle multiple recovery attempts', async () => {
      interface OperationResult {
        value: number;
        attempts: number;
      }

      const attemptOperation = async (maxAttempts: number): Promise<OperationResult> => {
        let attempts = 0;

        while (attempts < maxAttempts) {
          attempts++;
          const [result, error] = await safeAsync(() => {
            if (attempts < 3) {
              return Promise.reject(new Error(`Attempt ${attempts} failed`));
            }
            return Promise.resolve({ value: 42, attempts });
          });

          if (result) {
            return result;
          }
          // Log error and continue
          expect(error).toBeInstanceOf(Error);
        }

        return { value: -1, attempts };
      };

      const result = await attemptOperation(5);
      expect(result.value).toBe(42);
      expect(result.attempts).toBe(3);
    });
  });
});

describe('Error Composition Tests', () => {
  describe('Multiple error aggregation', () => {
    it('should collect multiple errors from parallel operations', async () => {
      const operations = [
        safeAsync(() => Promise.reject(new Error('Error 1'))),
        safeAsync(() => Promise.reject(new Error('Error 2'))),
        safeAsync(() => Promise.reject(new Error('Error 3'))),
      ];

      const results = await Promise.all(operations);
      const errors = results
        .map(([, error]) => error)
        .filter((e): e is Error => e !== null);

      expect(errors).toHaveLength(3);
      expect(errors.map((e) => e.message)).toEqual(['Error 1', 'Error 2', 'Error 3']);
    });

    it('should combine partial results and errors', async () => {
      const operations = [
        safeAsync(() => Promise.resolve('result1')),
        safeAsync(() => Promise.reject(new Error('error2'))),
        safeAsync(() => Promise.resolve('result3')),
      ];

      const results = await Promise.all(operations);
      const successes = results
        .map(([result]) => result)
        .filter((r): r is string => r !== null);
      const errors = results
        .map(([, error]) => error)
        .filter((e): e is Error => e !== null);

      expect(successes).toEqual(['result1', 'result3']);
      expect(errors).toHaveLength(1);
      expect(errors[0].message).toBe('error2');
    });
  });

  describe('Error transformation', () => {
    it('should transform error types while preserving cause', () => {
      const originalError = new TypeError('fetch failed');
      const transformedError = new Error('Document loading failed');
      (transformedError as Error & { cause?: Error }).cause = originalError;

      expect(transformedError.message).toBe('Document loading failed');
      expect((transformedError as Error & { cause?: Error }).cause).toBe(originalError);
    });

    it('should transform error message with context', () => {
      const originalError = new Error('ENOENT');
      const context = createErrorContext(originalError, {
        operation: 'documentConversion',
        context: { filename: 'missing.docx' },
      });

      const transformedMessage = `[${context.operation}] ${context.message}: ${context.context?.filename}`;
      expect(transformedMessage).toBe('[documentConversion] ENOENT: missing.docx');
    });

    it('should classify transformed errors', () => {
      const errors = [
        new Error('Network timeout'),
        new Error('File not found'),
        new Error('Permission denied'),
        new Error('Connection refused'),
      ];

      const classifications = errors.map((e) => ({
        message: e.message,
        isNetwork: isNetworkError(e),
        isFile: isFileError(e),
      }));

      expect(classifications[0].isNetwork).toBe(true);
      expect(classifications[0].isFile).toBe(false);
      expect(classifications[1].isNetwork).toBe(false);
      expect(classifications[1].isFile).toBe(true);
      expect(classifications[2].isNetwork).toBe(false);
      expect(classifications[2].isFile).toBe(true);
      expect(classifications[3].isNetwork).toBe(true);
      expect(classifications[3].isFile).toBe(false);
    });
  });
});

describe('Async Error Handling Tests', () => {
  describe('Timeout handling', () => {
    it('should handle timeout as error', async () => {
      const timeoutPromise = (ms: number): Promise<string> => {
        return new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Timeout')), ms);
        });
      };

      const [result, error] = await safeAsync(() =>
        Promise.race([
          timeoutPromise(10),
          new Promise<string>((resolve) => setTimeout(() => resolve('completed'), 100)),
        ])
      );

      expect(result).toBeNull();
      expect(error).toBeInstanceOf(Error);
      expect(error?.message).toBe('Timeout');
    });

    it('should complete before timeout', async () => {
      const [result, error] = await safeAsync(() =>
        Promise.race([
          new Promise<string>((resolve) => setTimeout(() => resolve('fast'), 10)),
          new Promise<string>((_, reject) => setTimeout(() => reject(new Error('Timeout')), 100)),
        ])
      );

      expect(result).toBe('fast');
      expect(error).toBeNull();
    });
  });

  describe('Promise.all vs Promise.allSettled behavior', () => {
    it('Promise.all should reject on first error', async () => {
      const promises = [
        Promise.resolve('a'),
        Promise.reject(new Error('b failed')),
        Promise.resolve('c'),
      ];

      const [result, error] = await safeAsync(() => Promise.all(promises));

      expect(result).toBeNull();
      expect(error).toBeInstanceOf(Error);
      expect(error?.message).toBe('b failed');
    });

    it('Promise.allSettled should return all results', async () => {
      const promises = [
        Promise.resolve('a'),
        Promise.reject(new Error('b failed')),
        Promise.resolve('c'),
      ];

      const results = await Promise.allSettled(promises);

      expect(results[0]).toEqual({ status: 'fulfilled', value: 'a' });
      expect(results[1]).toEqual({ status: 'rejected', reason: expect.any(Error) });
      expect(results[2]).toEqual({ status: 'fulfilled', value: 'c' });
    });
  });

  describe('Sequential vs parallel error handling', () => {
    it('should stop on first error in sequence', async () => {
      const operations = [
        () => Promise.resolve('step1'),
        () => Promise.reject(new Error('step2 failed')),
        () => Promise.resolve('step3'),
      ];

      const results: string[] = [];
      let failed = false;

      for (const op of operations) {
        if (failed) break;
        const [result, error] = await safeAsync(op);
        if (error) {
          failed = true;
        } else if (result) {
          results.push(result);
        }
      }

      expect(results).toEqual(['step1']);
      expect(failed).toBe(true);
    });

    it('should continue on error when configured', async () => {
      const operations = [
        () => Promise.resolve('step1'),
        () => Promise.reject(new Error('step2 failed')),
        () => Promise.resolve('step3'),
      ];

      const results: (string | null)[] = [];
      const errors: Error[] = [];

      for (const op of operations) {
        const [result, error] = await safeAsync(op);
        results.push(result);
        if (error) errors.push(error);
      }

      expect(results).toEqual(['step1', null, 'step3']);
      expect(errors).toHaveLength(1);
      expect(errors[0].message).toBe('step2 failed');
    });
  });
});

describe('Error Context Preservation Tests', () => {
  describe('Context integrity', () => {
    it('should preserve context through error chain', () => {
      const error = new Error('Processing failed');
      const context1 = createErrorContext(error, {
        operation: 'parseDocument',
        context: { filename: 'document.docx', size: 1024 },
      });

      // Simulate wrapping in higher-level operation
      const wrapperError = new Error(context1.message);
      const context2 = createErrorContext(wrapperError, {
        operation: 'loadDocument',
        context: { url: 'https://example.com/document.docx' },
        cause: context1,
      });

      expect(context2.operation).toBe('loadDocument');
      expect(context2.context).toEqual({ url: 'https://example.com/document.docx' });
      expect(context2.cause).toBe(context1);
    });

    it('should handle circular reference protection', () => {
      const error = new Error('Test error');
      const context: Record<string, unknown> = { key: 'value' };
      context.self = context; // Circular reference

      // createErrorContext should handle circular references
      expect(() => createErrorContext(error, { context })).not.toThrow();
    });

    it('should preserve timestamp accuracy', () => {
      const before = Date.now();
      const context = createErrorContext(new Error('test'));
      const after = Date.now();

      const contextTime = new Date(context.timestamp).getTime();
      expect(contextTime).toBeGreaterThanOrEqual(before);
      expect(contextTime).toBeLessThanOrEqual(after);
    });
  });

  describe('Error reconstruction', () => {
    it('should reconstruct error from context', () => {
      const originalError = new Error('Original error');
      originalError.name = 'CustomError';
      const context = createErrorContext(originalError);

      const reconstructedError = new Error(context.message);
      reconstructedError.name = context.name;

      expect(reconstructedError.message).toBe('Original error');
      expect(reconstructedError.name).toBe('CustomError');
    });

    it('should serialize context for logging', () => {
      const error = new Error('Test error');
      const context = createErrorContext(error, {
        operation: 'documentConversion',
        context: { inputFormat: 'doc', outputFormat: 'pdf' },
      });

      // Should be JSON serializable (excluding Error cause)
      const serialized = JSON.stringify({
        ...context,
        cause: context.cause ? formatErrorMessage(context.cause) : undefined,
      });

      expect(() => JSON.parse(serialized)).not.toThrow();
      const parsed = JSON.parse(serialized);
      expect(parsed.message).toBe('Test error');
      expect(parsed.operation).toBe('documentConversion');
    });
  });
});

describe('Error Type Guard Consistency', () => {
  describe('isError vs isErrorLike consistency', () => {
    it('should have consistent behavior for Error instances', () => {
      const errors = [
        new Error('error'),
        new TypeError('type error'),
        new RangeError('range error'),
        new SyntaxError('syntax error'),
        new ReferenceError('reference error'),
      ];

      for (const error of errors) {
        expect(isError(error)).toBe(true);
        expect(isErrorLike(error)).toBe(true);
      }
    });

    it('should handle Error-like objects correctly', () => {
      const errorLike = [
        { message: 'error' },
        { message: 'error', name: 'Error' },
        { message: 'error', stack: 'at line 1' },
      ];

      for (const obj of errorLike) {
        expect(isError(obj)).toBe(false);
        expect(isErrorLike(obj)).toBe(true);
      }
    });

    it('should reject non-error values consistently', () => {
      const nonErrors = [
        null,
        undefined,
        'string',
        123,
        { code: 'ERR001' },
        { message: 123 }, // non-string message
      ];

      for (const value of nonErrors) {
        expect(isError(value)).toBe(false);
        // isErrorLike should also be false for most of these
        if (value === null || value === undefined || typeof value !== 'object') {
          expect(isErrorLike(value)).toBe(false);
        } else if ('message' in value && typeof value.message !== 'string') {
          expect(isErrorLike(value)).toBe(false);
        }
      }
    });
  });
});

describe('Error Message Formatting Edge Cases', () => {
  describe('Complex error objects', () => {
    it('should handle errors with custom properties', () => {
      const error = new Error('Custom error') as Error & { code: number; details: string };
      error.code = 404;
      error.details = 'Not found';

      expect(formatErrorMessage(error)).toBe('Custom error');
    });

    it('should handle errors with getter properties', () => {
      const error = {
        get message() {
          return 'Dynamic message';
        },
      };

      expect(formatErrorMessage(error)).toBe('Dynamic message');
    });

    it('should handle Symbol properties', () => {
      const sym = Symbol('test');
      const error = { message: 'Error with symbol' };
      (error as Record<symbol, unknown>)[sym] = 'symbol value';

      expect(formatErrorMessage(error)).toBe('Error with symbol');
    });
  });

  describe('Fallback handling', () => {
    it('should use provided fallback', () => {
      expect(formatErrorMessage(null, 'Custom fallback')).toBe('Custom fallback');
      expect(formatErrorMessage(undefined, 'Custom fallback')).toBe('Custom fallback');
      expect(formatErrorMessage({}, 'Custom fallback')).toBe('Custom fallback');
    });

    it('should use default fallback when none provided', () => {
      expect(formatErrorMessage(null)).toBe('Unknown error');
      expect(formatErrorMessage(undefined)).toBe('Unknown error');
      expect(formatErrorMessage({})).toBe('Unknown error');
    });

    it('should handle empty fallback', () => {
      expect(formatErrorMessage(null, '')).toBe('');
      expect(formatErrorMessage({ message: '' }, 'fallback')).toBe('fallback');
    });
  });
});

describe('Real-world Error Scenarios', () => {
  describe('Document loading error scenarios', () => {
    it('should handle network error during document fetch', async () => {
      const fetchDocument = async (url: string) => {
        const [response, error] = await safeAsync(() => {
          if (!url.startsWith('http')) {
            return Promise.reject(new TypeError('fetch failed'));
          }
          return Promise.resolve({ ok: true, data: 'content' });
        });

        if (error) {
          return {
            success: false,
            error: formatErrorMessage(error),
            isRetryable: isNetworkError(error),
          };
        }

        return { success: true, data: response?.data };
      };

      const result = await fetchDocument('invalid-url');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.isRetryable).toBe(true);
      }
    });

    it('should handle file error during document save', async () => {
      const saveDocument = async (filename: string, _content: string) => {
        const [, error] = await safeAsync(() => {
          if (!filename) {
            return Promise.reject(new Error('ENOENT: file not found'));
          }
          return Promise.resolve();
        });

        if (error) {
          return {
            success: false,
            error: formatErrorMessage(error),
            isFileError: isFileError(error),
          };
        }

        return { success: true };
      };

      const result = await saveDocument('', 'content');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.isFileError).toBe(true);
      }
    });

    it('should handle conversion error with context', () => {
      const handleConversionError = (error: unknown, inputPath: string, outputPath: string) => {
        const context = createErrorContext(error, {
          operation: 'documentConversion',
          context: { inputPath, outputPath },
        });

        return {
          message: context.message,
          operation: context.operation,
          inputFormat: inputPath.split('.').pop(),
          outputFormat: outputPath.split('.').pop(),
          timestamp: context.timestamp,
        };
      };

      const result = handleConversionError(
        new Error('Conversion failed'),
        '/input/document.doc',
        '/output/document.pdf'
      );

      expect(result.message).toBe('Conversion failed');
      expect(result.operation).toBe('documentConversion');
      expect(result.inputFormat).toBe('doc');
      expect(result.outputFormat).toBe('pdf');
    });
  });

  describe('Error recovery workflow', () => {
    it('should implement retry with exponential backoff pattern', async () => {
      const backoffDelays: number[] = [];
      let attempts = 0;

      const retryWithBackoff = async <T>(
        fn: () => Promise<T>,
        maxAttempts: number,
        baseDelay: number
      ): Promise<[T | null, Error | null]> => {
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
          const [result, error] = await safeAsync(fn);

          if (result !== null) {
            return [result, null];
          }

          if (error && attempt < maxAttempts - 1) {
            const delay = baseDelay * Math.pow(2, attempt);
            backoffDelays.push(delay);
            await new Promise((resolve) => setTimeout(resolve, delay));
          } else if (error) {
            return [null, error];
          }
        }
        return [null, new Error('Max attempts reached')];
      };

      const [result] = await retryWithBackoff(
        () => {
          attempts++;
          if (attempts < 3) {
            return Promise.reject(new Error('Temporary failure'));
          }
          return Promise.resolve('success');
        },
        5,
        10 // Small base delay for testing
      );

      expect(result).toBe('success');
      // Exponential backoff: 10, 20
      expect(backoffDelays).toEqual([10, 20]);
    });
  });
});
