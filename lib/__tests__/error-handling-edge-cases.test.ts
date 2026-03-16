/**
 * Additional error handling edge case tests for comprehensive coverage.
 */
import { describe, expect, it } from 'vitest';
import {
  formatErrorMessage,
  isError,
  isErrorLike,
  isNetworkError,
  isFileError,
  createErrorContext,
  safeLogError,
  safeAsync,
} from '../error-utils';

// =============================================================================
// ERROR MESSAGE FORMATTING
// =============================================================================

describe('Error Handling: Message Formatting', () => {
  describe('formatErrorMessage', () => {
    it('should format Error objects', () => {
      expect(formatErrorMessage(new Error('Test error'))).toBe('Test error');
    });

    it('should format TypeError objects', () => {
      expect(formatErrorMessage(new TypeError('Type error'))).toBe('Type error');
    });

    it('should format RangeError objects', () => {
      expect(formatErrorMessage(new RangeError('Range error'))).toBe('Range error');
    });

    it('should format SyntaxError objects', () => {
      expect(formatErrorMessage(new SyntaxError('Syntax error'))).toBe('Syntax error');
    });

    it('should format ReferenceError objects', () => {
      expect(formatErrorMessage(new ReferenceError('Reference error'))).toBe('Reference error');
    });

    it('should format string errors', () => {
      expect(formatErrorMessage('String error')).toBe('String error');
    });

    it('should format objects with message property', () => {
      expect(formatErrorMessage({ message: 'Object error' })).toBe('Object error');
    });

    it('should return fallback for null', () => {
      expect(formatErrorMessage(null)).toBe('Unknown error');
    });

    it('should return fallback for undefined', () => {
      expect(formatErrorMessage(undefined)).toBe('Unknown error');
    });

    it('should return custom fallback', () => {
      expect(formatErrorMessage(null, 'Custom fallback')).toBe('Custom fallback');
    });

    it('should handle empty string', () => {
      expect(formatErrorMessage('')).toBe('Unknown error');
    });

    it('should handle error with empty message', () => {
      expect(formatErrorMessage(new Error(''))).toBe('Unknown error');
    });
  });
});

// =============================================================================
// TYPE GUARDS
// =============================================================================

describe('Error Handling: Type Guards', () => {
  describe('isError', () => {
    it('should return true for Error objects', () => {
      expect(isError(new Error('test'))).toBe(true);
      expect(isError(new TypeError('test'))).toBe(true);
      expect(isError(new RangeError('test'))).toBe(true);
    });

    it('should return false for non-Error values', () => {
      expect(isError('error')).toBe(false);
      expect(isError({ message: 'error' })).toBe(false);
      expect(isError(null)).toBe(false);
      expect(isError(undefined)).toBe(false);
      expect(isError(123)).toBe(false);
    });
  });

  describe('isErrorLike', () => {
    it('should return true for Error objects', () => {
      expect(isErrorLike(new Error('test'))).toBe(true);
      expect(isErrorLike(new TypeError('test'))).toBe(true);
    });

    it('should return true for error-like objects', () => {
      expect(isErrorLike({ message: 'error' })).toBe(true);
      expect(isErrorLike({ message: 'error', name: 'CustomError' })).toBe(true);
    });

    it('should return false for non-error-like values', () => {
      expect(isErrorLike('error')).toBe(false);
      expect(isErrorLike(null)).toBe(false);
      expect(isErrorLike({})).toBe(false);
      expect(isErrorLike({ name: 'error' })).toBe(false);
    });
  });
});

// =============================================================================
// ERROR CLASSIFICATION
// =============================================================================

describe('Error Handling: Classification', () => {
  describe('isNetworkError', () => {
    it('should classify network errors correctly', () => {
      expect(isNetworkError(new Error('Network error'))).toBe(true);
      expect(isNetworkError(new Error('fetch failed'))).toBe(true);
      expect(isNetworkError(new Error('Connection timeout'))).toBe(true);
      expect(isNetworkError(new Error('ECONNREFUSED'))).toBe(true);
      expect(isNetworkError(new Error('ENOTFOUND'))).toBe(true);
      expect(isNetworkError(new Error('ETIMEDOUT'))).toBe(true);
      expect(isNetworkError(new TypeError('fetch failed'))).toBe(true);
    });

    it('should reject non-network errors', () => {
      expect(isNetworkError(new Error('File not found'))).toBe(false);
      expect(isNetworkError(new Error('Permission denied'))).toBe(false);
      expect(isNetworkError(new Error('Invalid argument'))).toBe(false);
    });

    it('should handle non-error values', () => {
      expect(isNetworkError('Network error')).toBe(false);
      expect(isNetworkError(null)).toBe(false);
      expect(isNetworkError(undefined)).toBe(false);
    });

    it('should be case insensitive', () => {
      expect(isNetworkError(new Error('NETWORK ERROR'))).toBe(true);
      expect(isNetworkError(new Error('FETCH FAILED'))).toBe(true);
      expect(isNetworkError(new Error('Connection Timeout'))).toBe(true);
    });
  });

  describe('isFileError', () => {
    it('should classify file errors correctly', () => {
      expect(isFileError(new Error('File not found'))).toBe(true);
      expect(isFileError(new Error('ENOENT'))).toBe(true);
      expect(isFileError(new Error('Permission denied'))).toBe(true);
      expect(isFileError(new Error('EACCES'))).toBe(true);
      expect(isFileError(new Error('Is a directory'))).toBe(true);
      expect(isFileError(new Error('EISDIR'))).toBe(true);
      expect(isFileError(new Error('Not a directory'))).toBe(true);
      expect(isFileError(new Error('ENOTDIR'))).toBe(true);
      expect(isFileError(new Error('File too large'))).toBe(true);
      expect(isFileError(new Error('EFBIG'))).toBe(true);
      expect(isFileError(new Error('No space left'))).toBe(true);
      expect(isFileError(new Error('ENOSPC'))).toBe(true);
    });

    it('should reject non-file errors', () => {
      expect(isFileError(new Error('Network error'))).toBe(false);
      expect(isFileError(new Error('Timeout'))).toBe(false);
      expect(isFileError(new Error('Invalid argument'))).toBe(false);
    });

    it('should handle non-error values', () => {
      expect(isFileError('File not found')).toBe(false);
      expect(isFileError(null)).toBe(false);
      expect(isFileError(undefined)).toBe(false);
    });

    it('should be case insensitive', () => {
      expect(isFileError(new Error('FILE NOT FOUND'))).toBe(true);
      expect(isFileError(new Error('Permission Denied'))).toBe(true);
    });
  });
});

// =============================================================================
// ERROR CONTEXT
// =============================================================================

describe('Error Handling: Context', () => {
  describe('createErrorContext', () => {
    it('should create context from Error object', () => {
      const error = new Error('Test error');
      const context = createErrorContext(error);

      expect(context.message).toBe('Test error');
      expect(context.name).toBe('Error');
      expect(context.timestamp).toBeDefined();
    });

    it('should include operation', () => {
      const error = new Error('Test error');
      const context = createErrorContext(error, { operation: 'testOperation' });

      expect(context.operation).toBe('testOperation');
    });

    it('should include custom context', () => {
      const error = new Error('Test error');
      const context = createErrorContext(error, {
        context: { fileName: 'test.docx', size: 1000 }
      });

      expect(context.context).toEqual({ fileName: 'test.docx', size: 1000 });
    });

    it('should include cause', () => {
      const cause = new Error('Root cause');
      const error = new Error('Test error');
      const context = createErrorContext(error, { cause });

      expect(context.cause).toBe(cause);
    });

    it('should handle non-Error values', () => {
      const context = createErrorContext('String error');

      expect(context.message).toBe('String error');
      expect(context.name).toBe('UnknownError');
    });

    it('should handle null', () => {
      const context = createErrorContext(null);

      expect(context.message).toBe('Unknown error');
      expect(context.name).toBe('UnknownError');
    });

    it('should include stack trace when available', () => {
      const error = new Error('Test error');
      const context = createErrorContext(error);

      expect(context.stack).toBeDefined();
    });
  });
});

// =============================================================================
// SAFE LOGGING
// =============================================================================

describe('Error Handling: Safe Logging', () => {
  describe('safeLogError', () => {
    it('should handle Error objects without throwing', () => {
      expect(() => safeLogError(new Error('Test'))).not.toThrow();
    });

    it('should handle non-Error values without throwing', () => {
      expect(() => safeLogError('String error')).not.toThrow();
      expect(() => safeLogError(null)).not.toThrow();
      expect(() => safeLogError(undefined)).not.toThrow();
      expect(() => safeLogError({})).not.toThrow();
    });

    it('should handle prefix option', () => {
      expect(() => safeLogError(new Error('Test'), 'PREFIX')).not.toThrow();
    });

    it('should handle undefined prefix', () => {
      expect(() => safeLogError(new Error('Test'), undefined)).not.toThrow();
    });
  });
});

// =============================================================================
// SAFE ASYNC
// =============================================================================

describe('Error Handling: Safe Async', () => {
  describe('safeAsync', () => {
    it('should return result on success', async () => {
      const [result, error] = await safeAsync(async () => 'success');

      expect(result).toBe('success');
      expect(error).toBeNull();
    });

    it('should return error on failure', async () => {
      const [result, error] = await safeAsync(async () => {
        throw new Error('async error');
      });

      expect(result).toBeNull();
      expect(error).toBeInstanceOf(Error);
      expect(error?.message).toBe('async error');
    });

    it('should handle various error types', async () => {
      const [, error1] = await safeAsync(async () => {
        throw new TypeError('type error');
      });
      expect(error1).toBeInstanceOf(TypeError);

      const [, error2] = await safeAsync(async () => {
        throw new RangeError('range error');
      });
      expect(error2).toBeInstanceOf(RangeError);
    });

    it('should wrap non-Error throws', async () => {
      const [result, error] = await safeAsync(async () => {
        throw 'string error';
      });

      expect(result).toBeNull();
      expect(error).toBeInstanceOf(Error);
      expect(error?.message).toBe('string error');
    });

    it('should handle null throws', async () => {
      const [result, error] = await safeAsync(async () => {
        throw null;
      });

      expect(result).toBeNull();
      expect(error).toBeInstanceOf(Error);
    });

    it('should handle complex return types', async () => {
      const [result, error] = await safeAsync(async () => ({
        name: 'test',
        value: 123,
        nested: { a: 1, b: 2 }
      }));

      expect(result).toEqual({
        name: 'test',
        value: 123,
        nested: { a: 1, b: 2 }
      });
      expect(error).toBeNull();
    });

    it('should handle async operations', async () => {
      const [result, error] = await safeAsync(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return 'delayed';
      });

      expect(result).toBe('delayed');
      expect(error).toBeNull();
    });
  });
});

// =============================================================================
// EDGE CASES
// =============================================================================

describe('Error Handling: Edge Cases', () => {
  it('should handle deeply nested error causes', () => {
    const cause1 = new Error('Level 1');
    const cause2 = new Error('Level 2', { cause: cause1 });
    const cause3 = new Error('Level 3', { cause: cause2 });

    const formatted = formatErrorMessage(cause3);
    expect(formatted).toBe('Level 3');
  });

  it('should handle errors with numeric message', () => {
    const obj = { message: 12345 };
    const formatted = formatErrorMessage(obj);
    expect(formatted).toBe('Unknown error');
  });

  it('should handle errors with circular reference', () => {
    const obj: { message: string; self?: unknown } = { message: 'circular' };
    obj.self = obj;

    const formatted = formatErrorMessage(obj);
    expect(formatted).toBe('circular');
  });

  it('should handle errors with special characters in message', () => {
    const error = new Error('Error with "quotes" and \'apostrophes\'');
    expect(formatErrorMessage(error)).toBe('Error with "quotes" and \'apostrophes\'');
  });

  it('should handle errors with newlines in message', () => {
    const error = new Error('Error\nwith\nnewlines');
    expect(formatErrorMessage(error)).toBe('Error\nwith\nnewlines');
  });

  it('should handle errors with unicode in message', () => {
    const error = new Error('错误: 文档加载失败 🚨');
    expect(formatErrorMessage(error)).toBe('错误: 文档加载失败 🚨');
  });
});
