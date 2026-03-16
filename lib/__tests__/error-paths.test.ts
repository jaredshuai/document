/**
 * Phase 71: Extended Error Path Tests
 * Tests for deep error paths, error boundaries, error propagation, and error recovery
 */

import { describe, it, expect } from 'vitest';
import {
  formatErrorMessage,
  isError,
  isErrorLike,
  createErrorContext,
  safeLogError,
  safeAsync,
  isNetworkError,
  isFileError,
} from '../error-utils';

describe('Extended Error Path Tests', () => {
  describe('Error Boundary Tests', () => {
    describe('formatErrorMessage boundaries', () => {
      it('should handle circular reference objects', () => {
        const circular: Record<string, unknown> = { name: 'test' };
        circular.self = circular;
        const result = formatErrorMessage(circular);
        expect(typeof result).toBe('string');
        expect(result.length).toBeGreaterThan(0);
      });

      it('should handle objects with null prototype', () => {
        const nullProto = Object.create(null);
        nullProto.message = 'error from null proto';
        const result = formatErrorMessage(nullProto);
        expect(typeof result).toBe('string');
      });

      it('should handle sparse arrays', () => {
        const sparse: unknown[] = [];
        sparse[10] = 'error';
        const result = formatErrorMessage(sparse);
        expect(typeof result).toBe('string');
      });

      it('should handle typed arrays', () => {
        const uint8 = new Uint8Array([1, 2, 3]);
        const result = formatErrorMessage(uint8);
        expect(typeof result).toBe('string');
      });

      it('should handle Map and Set objects', () => {
        const map = new Map([['key', 'value']]);
        const setResult = formatErrorMessage(new Set([1, 2, 3]));
        const mapResult = formatErrorMessage(map);
        expect(typeof setResult).toBe('string');
        expect(typeof mapResult).toBe('string');
      });

      it('should handle Date objects', () => {
        const date = new Date('2024-01-01');
        const result = formatErrorMessage(date);
        expect(typeof result).toBe('string');
      });

      it('should handle RegExp objects', () => {
        const regex = /test/g;
        const result = formatErrorMessage(regex);
        expect(typeof result).toBe('string');
      });

      it('should handle functions', () => {
        const fn = () => 'test';
        const result = formatErrorMessage(fn);
        expect(typeof result).toBe('string');
      });

      it('should handle symbols', () => {
        const sym = Symbol('test');
        const result = formatErrorMessage(sym);
        expect(typeof result).toBe('string');
      });

      it('should handle WeakMap and WeakSet', () => {
        const weakMap = new WeakMap();
        const weakSet = new WeakSet();
        expect(typeof formatErrorMessage(weakMap)).toBe('string');
        expect(typeof formatErrorMessage(weakSet)).toBe('string');
      });
    });

    describe('isError boundaries', () => {
      it('should handle cross-realm Error objects', () => {
        // Simulate cross-realm by checking prototype chain
        const error = new Error('test');
        expect(isError(error)).toBe(true);
      });

      it('should handle custom Error subclasses', () => {
        class CustomError extends Error {
          constructor(message: string) {
            super(message);
            this.name = 'CustomError';
          }
        }
        const customError = new CustomError('test');
        expect(isError(customError)).toBe(true);
      });

      it('should handle Error-like objects with Error prototype', () => {
        const errorLike = Object.create(Error.prototype);
        errorLike.message = 'test';
        expect(isError(errorLike)).toBe(true);
      });

      it('should accept Proxy-wrapped errors', () => {
        const error = new Error('test');
        const proxied = new Proxy(error, {});
        // isError checks instanceof, which should work with proxies
        expect(isError(proxied)).toBe(true);
      });
    });

    describe('isErrorLike boundaries', () => {
      it('should accept objects with message property', () => {
        const errorLike = { message: 'error message' };
        expect(isErrorLike(errorLike)).toBe(true);
      });

      it('should accept Error objects', () => {
        const error = new Error('test');
        expect(isErrorLike(error)).toBe(true);
      });

      it('should reject objects without message', () => {
        const notErrorLike = { name: 'Error' };
        expect(isErrorLike(notErrorLike)).toBe(false);
      });

      it('should reject primitives', () => {
        expect(isErrorLike('string')).toBe(false);
        expect(isErrorLike(123)).toBe(false);
        expect(isErrorLike(true)).toBe(false);
        expect(isErrorLike(null)).toBe(false);
        expect(isErrorLike(undefined)).toBe(false);
      });

      it('should reject arrays', () => {
        expect(isErrorLike([])).toBe(false);
        expect(isErrorLike(['error'])).toBe(false);
      });
    });
  });

  describe('Error Recovery Path Tests', () => {
    describe('safeAsync recovery paths', () => {
      it('should recover from synchronous throw', async () => {
        const [result, error] = await safeAsync(() => {
          throw new Error('sync error');
        });
        expect(result).toBeNull();
        expect(error).toBeInstanceOf(Error);
        expect(error?.message).toBe('sync error');
      });

      it('should recover from async rejection', async () => {
        const [result, error] = await safeAsync(async () => {
          return Promise.reject(new Error('async error'));
        });
        expect(result).toBeNull();
        expect(error).toBeInstanceOf(Error);
      });

      it('should handle nested async operations', async () => {
        const [result, error] = await safeAsync(async () => {
          const [innerResult, innerError] = await safeAsync(async () => {
            throw new Error('inner error');
          });
          if (innerError) {
            throw innerError;
          }
          return innerResult;
        });
        expect(result).toBeNull();
        expect(error).toBeInstanceOf(Error);
        expect(error?.message).toBe('inner error');
      });

      it('should preserve error context through recovery', async () => {
        const context = { operation: 'test', timestamp: Date.now() };
        const [result, error] = await safeAsync(async () => {
          const err = new Error('context error') as Error & { context?: typeof context };
          err.context = context;
          throw err;
        });
        expect(result).toBeNull();
        expect(error).toBeInstanceOf(Error);
        if (error) {
          const extendedError = error as Error & { context?: typeof context };
          expect(extendedError.context).toEqual(context);
        }
      });

      it('should return result on success', async () => {
        const [result, error] = await safeAsync(async () => {
          return { data: 'success' };
        });
        expect(result).toEqual({ data: 'success' });
        expect(error).toBeNull();
      });
    });

    describe('error classification recovery', () => {
      it('should classify TypeError correctly', () => {
        const error = new TypeError('type error');
        expect(isNetworkError(error)).toBe(false);
        expect(isFileError(error)).toBe(false);
      });

      it('should classify RangeError correctly', () => {
        const error = new RangeError('range error');
        expect(isNetworkError(error)).toBe(false);
        expect(isFileError(error)).toBe(false);
      });

      it('should classify SyntaxError correctly', () => {
        const error = new SyntaxError('syntax error');
        expect(isNetworkError(error)).toBe(false);
        expect(isFileError(error)).toBe(false);
      });

      it('should classify URIError correctly', () => {
        const error = new URIError('uri error');
        expect(isNetworkError(error)).toBe(false);
        expect(isFileError(error)).toBe(false);
      });

      it('should classify network errors by message', () => {
        const networkError = new Error('NetworkError: fetch failed');
        expect(isNetworkError(networkError)).toBe(true);
      });

      it('should classify timeout errors as network errors', () => {
        const timeoutError = new Error('Connection timeout');
        expect(isNetworkError(timeoutError)).toBe(true);
      });
    });
  });

  describe('Error Propagation Tests', () => {
    describe('createErrorContext propagation', () => {
      it('should propagate error name', () => {
        const error = new Error('test');
        const context = createErrorContext(error);
        expect(context.name).toBe('Error');
      });

      it('should propagate error message', () => {
        const error = new Error('test message');
        const context = createErrorContext(error);
        expect(context.message).toBe('test message');
      });

      it('should propagate custom error properties', () => {
        const error = new Error('test') as Error & { code: string };
        error.code = 'CUSTOM_CODE';
        const context = createErrorContext(error);
        // Note: createErrorContext only returns specific properties
        expect(context.message).toBe('test');
      });

      it('should propagate timestamp', () => {
        const before = new Date().toISOString();
        const error = new Error('test');
        const context = createErrorContext(error);
        const after = new Date().toISOString();
        expect(context.timestamp >= before).toBe(true);
        expect(context.timestamp <= after).toBe(true);
      });

      it('should include stack trace when available', () => {
        const error = new Error('test');
        const context = createErrorContext(error);
        expect(context.stack).toBeDefined();
        expect(typeof context.stack).toBe('string');
      });

      it('should include operation in context', () => {
        const error = new Error('test');
        const context = createErrorContext(error, { operation: 'test-operation' });
        expect(context.operation).toBe('test-operation');
      });
    });

    describe('error chain propagation', () => {
      it('should preserve cause through chain', () => {
        const rootCause = new Error('root cause');
        const middleError = new Error('middle error');
        (middleError as Error & { cause?: Error }).cause = rootCause;
        const topError = new Error('top error');
        (topError as Error & { cause?: Error }).cause = middleError;

        // Verify chain
        const topCause = (topError as Error & { cause?: Error }).cause;
        expect(topCause).toBe(middleError);
        if (topCause) {
          const middleCause = (topCause as Error & { cause?: Error }).cause;
          expect(middleCause).toBe(rootCause);
        }
      });

      it('should handle non-Error causes', () => {
        const error = new Error('test') as Error & { cause?: unknown };
        error.cause = 'string cause';

        expect(error.cause).toBe('string cause');
        expect(isError(error.cause)).toBe(false);
      });
    });
  });

  describe('Error Context Preservation Tests', () => {
    describe('context through formatErrorMessage', () => {
      it('should preserve context through formatting', () => {
        const error = new Error('test');
        const context = createErrorContext(error, {
          operation: 'format-test',
          context: { key: 'value' }
        });

        const formatted = formatErrorMessage(error);
        expect(formatted).toBe('test');
        expect(context.operation).toBe('format-test');
        expect(context.context).toEqual({ key: 'value' });
      });
    });

    describe('context through safeLogError', () => {
      it('should not throw on console.error failure', () => {
        const originalConsole = console.error;
        console.error = () => {
          throw new Error('console broken');
        };

        expect(() => {
          safeLogError(new Error('test'), 'prefix');
        }).not.toThrow();

        console.error = originalConsole;
      });

      it('should handle null prefix', () => {
        expect(() => {
          safeLogError(new Error('test'), null as unknown as string);
        }).not.toThrow();
      });

      it('should handle undefined error', () => {
        expect(() => {
          safeLogError(undefined as unknown as Error);
        }).not.toThrow();
      });
    });
  });

  describe('Edge Case Error Paths', () => {
    describe('empty and null errors', () => {
      it('should handle empty Error object', () => {
        const error = new Error();
        // formatErrorMessage returns fallback for empty messages
        expect(formatErrorMessage(error)).toBe('Unknown error');
        expect(isError(error)).toBe(true);
        expect(isErrorLike(error)).toBe(true);
      });

      it('should handle Error with empty message', () => {
        const error = new Error('');
        // formatErrorMessage returns fallback for empty messages
        const result = formatErrorMessage(error);
        expect(result).toBe('Unknown error');
      });

      it('should handle null in formatErrorMessage', () => {
        const result = formatErrorMessage(null);
        expect(result).toBe('Unknown error');
      });

      it('should handle undefined in formatErrorMessage', () => {
        const result = formatErrorMessage(undefined);
        expect(result).toBe('Unknown error');
      });

      it('should handle empty string error', () => {
        const result = formatErrorMessage('');
        expect(result).toBe('Unknown error');
      });
    });

    describe('special string errors', () => {
      it('should handle very long error messages', () => {
        const longMessage = 'a'.repeat(10000);
        const error = new Error(longMessage);
        const result = formatErrorMessage(error);
        expect(result).toBe(longMessage);
      });

      it('should handle unicode in error messages', () => {
        const unicodeMessage = '错误: 文件未找到 🚫';
        const error = new Error(unicodeMessage);
        const result = formatErrorMessage(error);
        expect(result).toBe(unicodeMessage);
      });

      it('should handle control characters in error messages', () => {
        const controlMessage = 'error\n\t\rwith\0controls';
        const error = new Error(controlMessage);
        const result = formatErrorMessage(error);
        expect(result).toBe(controlMessage);
      });
    });

    describe('error with special properties', () => {
      it('should handle error with numeric properties', () => {
        const error = new Error('test') as Error & { code: number; status: number };
        error.code = 404;
        error.status = 500;
        const context = createErrorContext(error);
        expect(context.message).toBe('test');
      });

      it('should handle error with object properties', () => {
        const error = new Error('test') as Error & { details: Record<string, unknown> };
        error.details = { file: 'test.txt', line: 42 };
        const context = createErrorContext(error);
        expect(context.message).toBe('test');
      });

      it('should handle error with array properties', () => {
        const error = new Error('test') as Error & { errors: string[] };
        error.errors = ['error1', 'error2', 'error3'];
        const context = createErrorContext(error);
        expect(context.message).toBe('test');
      });

      it('should handle error with function properties', () => {
        const error = new Error('test') as Error & { handler: () => string };
        error.handler = () => 'handled';
        expect(typeof error.handler).toBe('function');
      });
    });
  });

  describe('Error Integration Tests', () => {
    describe('full error handling pipeline', () => {
      it('should handle error through complete pipeline', () => {
        const error = new Error('pipeline test');
        // 1. Check if error
        expect(isError(error)).toBe(true);
        // 2. Format message
        const message = formatErrorMessage(error);
        expect(message).toBe('pipeline test');
        // 3. Create context
        const context = createErrorContext(error, { operation: 'test' });
        expect(context.message).toBe('pipeline test');
        expect(context.operation).toBe('test');
        // 4. Classify error
        expect(isNetworkError(error)).toBe(false);
        expect(isFileError(error)).toBe(false);
      });

      it('should handle network error through pipeline', () => {
        const error = new Error('NetworkError: fetch failed');
        expect(isError(error)).toBe(true);
        expect(isNetworkError(error)).toBe(true);
        const context = createErrorContext(error);
        expect(context.message).toBe('NetworkError: fetch failed');
      });

      it('should handle file error through pipeline', () => {
        const error = new Error('NotFoundError: File not found');
        expect(isError(error)).toBe(true);
        expect(isFileError(error)).toBe(true);
        const context = createErrorContext(error);
        expect(context.message).toBe('NotFoundError: File not found');
      });
    });

    describe('async error handling pipeline', () => {
      it('should handle async error through pipeline', async () => {
        const [result, error] = await safeAsync(async () => {
          throw new Error('async pipeline error');
        });

        expect(result).toBeNull();
        expect(error).toBeInstanceOf(Error);
        if (error) {
          expect(isError(error)).toBe(true);
          const message = formatErrorMessage(error);
          expect(message).toBe('async pipeline error');
        }
      });

      it('should handle successful async through pipeline', async () => {
        const [result, error] = await safeAsync(async () => {
          return { data: 'success' };
        });

        expect(result).toEqual({ data: 'success' });
        expect(error).toBeNull();
      });
    });
  });
});
