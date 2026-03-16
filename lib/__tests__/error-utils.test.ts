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

describe('formatErrorMessage', () => {
  describe('Error objects', () => {
    it('should extract message from Error', () => {
      expect(formatErrorMessage(new Error('Test error'))).toBe('Test error');
    });

    it('should extract message from TypeError', () => {
      expect(formatErrorMessage(new TypeError('Type error'))).toBe('Type error');
    });

    it('should extract message from RangeError', () => {
      expect(formatErrorMessage(new RangeError('Range error'))).toBe('Range error');
    });

    it('should extract message from SyntaxError', () => {
      expect(formatErrorMessage(new SyntaxError('Syntax error'))).toBe('Syntax error');
    });

    it('should use fallback for Error with empty message', () => {
      expect(formatErrorMessage(new Error(''))).toBe('Unknown error');
    });

    it('should use custom fallback for Error with empty message', () => {
      expect(formatErrorMessage(new Error(''), 'Custom fallback')).toBe('Custom fallback');
    });
  });

  describe('string values', () => {
    it('should return string as-is', () => {
      expect(formatErrorMessage('String error')).toBe('String error');
    });

    it('should use fallback for empty string', () => {
      expect(formatErrorMessage('')).toBe('Unknown error');
    });

    it('should use custom fallback for empty string', () => {
      expect(formatErrorMessage('', 'Custom fallback')).toBe('Custom fallback');
    });
  });

  describe('null and undefined', () => {
    it('should use fallback for null', () => {
      expect(formatErrorMessage(null)).toBe('Unknown error');
    });

    it('should use fallback for undefined', () => {
      expect(formatErrorMessage(undefined)).toBe('Unknown error');
    });

    it('should use custom fallback for null', () => {
      expect(formatErrorMessage(null, 'Custom fallback')).toBe('Custom fallback');
    });
  });

  describe('object with message', () => {
    it('should extract message from object with message property', () => {
      expect(formatErrorMessage({ message: 'Object error' })).toBe('Object error');
    });

    it('should use fallback for object with empty message', () => {
      expect(formatErrorMessage({ message: '' })).toBe('Unknown error');
    });

    it('should use fallback for object with non-string message', () => {
      expect(formatErrorMessage({ message: 123 })).toBe('Unknown error');
    });

    it('should use fallback for object without message', () => {
      expect(formatErrorMessage({ code: 'ERR001' })).toBe('Unknown error');
    });
  });

  describe('other values', () => {
    it('should convert number to string', () => {
      expect(formatErrorMessage(404)).toBe('404');
    });

    it('should convert boolean to string', () => {
      expect(formatErrorMessage(true)).toBe('true');
    });

    it('should use fallback for plain object', () => {
      expect(formatErrorMessage({})).toBe('Unknown error');
    });

    it('should convert array to string', () => {
      // String([1, 2, 3]) returns "1,2,3"
      expect(formatErrorMessage([1, 2, 3])).toBe('1,2,3');
    });

    it('should convert Date to string', () => {
      const date = new Date('2024-01-01');
      expect(formatErrorMessage(date)).toBe(date.toString());
    });
  });
});

describe('isError', () => {
  it('should return true for Error', () => {
    expect(isError(new Error('test'))).toBe(true);
  });

  it('should return true for TypeError', () => {
    expect(isError(new TypeError('test'))).toBe(true);
  });

  it('should return true for RangeError', () => {
    expect(isError(new RangeError('test'))).toBe(true);
  });

  it('should return false for string', () => {
    expect(isError('error')).toBe(false);
  });

  it('should return false for object with message', () => {
    expect(isError({ message: 'test' })).toBe(false);
  });

  it('should return false for null', () => {
    expect(isError(null)).toBe(false);
  });

  it('should return false for undefined', () => {
    expect(isError(undefined)).toBe(false);
  });

  it('should return false for number', () => {
    expect(isError(123)).toBe(false);
  });
});

describe('isErrorLike', () => {
  it('should return true for Error', () => {
    expect(isErrorLike(new Error('test'))).toBe(true);
  });

  it('should return true for TypeError', () => {
    expect(isErrorLike(new TypeError('test'))).toBe(true);
  });

  it('should return true for object with message', () => {
    expect(isErrorLike({ message: 'test' })).toBe(true);
  });

  it('should return true for object with message and code', () => {
    expect(isErrorLike({ message: 'test', code: 'ERR001' })).toBe(true);
  });

  it('should return false for string', () => {
    expect(isErrorLike('error')).toBe(false);
  });

  it('should return false for object without message', () => {
    expect(isErrorLike({ code: 'ERR001' })).toBe(false);
  });

  it('should return false for object with non-string message', () => {
    expect(isErrorLike({ message: 123 })).toBe(false);
  });

  it('should return false for null', () => {
    expect(isErrorLike(null)).toBe(false);
  });

  it('should return false for undefined', () => {
    expect(isErrorLike(undefined)).toBe(false);
  });
});

describe('createErrorContext', () => {
  it('should create context from Error', () => {
    const error = new Error('Test error');
    const context = createErrorContext(error);

    expect(context.message).toBe('Test error');
    expect(context.name).toBe('Error');
    expect(context.stack).toBeDefined();
    expect(context.timestamp).toBeDefined();
  });

  it('should create context with operation', () => {
    const error = new Error('Test error');
    const context = createErrorContext(error, { operation: 'documentConversion' });

    expect(context.operation).toBe('documentConversion');
  });

  it('should create context with additional context data', () => {
    const error = new Error('Test error');
    const context = createErrorContext(error, {
      context: { fileName: 'test.docx', fileSize: 1024 },
    });

    expect(context.context).toEqual({ fileName: 'test.docx', fileSize: 1024 });
  });

  it('should create context with cause', () => {
    const cause = new Error('Root cause');
    const error = new Error('Test error');
    const context = createErrorContext(error, { cause });

    expect(context.cause).toBe(cause);
  });

  it('should create context from string error', () => {
    const context = createErrorContext('String error');

    expect(context.message).toBe('String error');
    expect(context.name).toBe('UnknownError');
    expect(context.stack).toBeUndefined();
  });

  it('should create context from null', () => {
    const context = createErrorContext(null);

    expect(context.message).toBe('Unknown error');
    expect(context.name).toBe('UnknownError');
  });

  it('should create context from object with message', () => {
    const context = createErrorContext({ message: 'Object error' });

    expect(context.message).toBe('Object error');
    expect(context.name).toBe('UnknownError');
  });

  it('should include valid ISO timestamp', () => {
    const context = createErrorContext(new Error('test'));
    const timestamp = new Date(context.timestamp);

    expect(timestamp.toISOString()).toBe(context.timestamp);
  });
});

describe('safeLogError', () => {
  it('should log error message to console', () => {
    const originalError = console.error;
    const logs: string[] = [];
    console.error = (msg: string) => logs.push(msg);

    safeLogError(new Error('Test error'));

    console.error = originalError;
    expect(logs).toContain('Test error');
  });

  it('should log error with prefix', () => {
    const originalError = console.error;
    const logs: string[] = [];
    console.error = (msg: string) => logs.push(msg);

    safeLogError(new Error('Test error'), 'Document loading');

    console.error = originalError;
    expect(logs).toContain('[Document loading] Test error');
  });

  it('should log error with context', () => {
    const originalError = console.error;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const logs: any[] = [];
    console.error = (msg: string, ctx: unknown) => logs.push({ msg, ctx });

    safeLogError(new Error('Test error'), 'Document loading', { fileName: 'test.docx' });

    console.error = originalError;
    expect(logs[0].msg).toBe('[Document loading] Test error');
    expect(logs[0].ctx).toEqual({ fileName: 'test.docx' });
  });

  it('should handle non-Error values', () => {
    const originalError = console.error;
    const logs: string[] = [];
    console.error = (msg: string) => logs.push(msg);

    safeLogError('String error');

    console.error = originalError;
    expect(logs).toContain('String error');
  });

  it('should handle null error', () => {
    const originalError = console.error;
    const logs: string[] = [];
    console.error = (msg: string) => logs.push(msg);

    safeLogError(null);

    console.error = originalError;
    expect(logs).toContain('Unknown error');
  });
});

describe('safeAsync', () => {
  it('should return result on success', async () => {
    const [result, error] = await safeAsync(() => Promise.resolve('success'));

    expect(result).toBe('success');
    expect(error).toBeNull();
  });

  it('should return error on failure', async () => {
    const [result, error] = await safeAsync(() => Promise.reject(new Error('fail')));

    expect(result).toBeNull();
    expect(error).toBeInstanceOf(Error);
    expect(error?.message).toBe('fail');
  });

  it('should wrap non-Error rejection in Error', async () => {
    const [result, error] = await safeAsync(() => Promise.reject('string error'));

    expect(result).toBeNull();
    expect(error).toBeInstanceOf(Error);
    expect(error?.message).toBe('string error');
  });

  it('should wrap null rejection in Error', async () => {
    const [result, error] = await safeAsync(() => Promise.reject(null));

    expect(result).toBeNull();
    expect(error).toBeInstanceOf(Error);
    expect(error?.message).toBe('Unknown error');
  });

  it('should handle object result', async () => {
    const [result, error] = await safeAsync(() => Promise.resolve({ name: 'test' }));

    expect(result).toEqual({ name: 'test' });
    expect(error).toBeNull();
  });

  it('should handle null result', async () => {
    const [result, error] = await safeAsync(() => Promise.resolve(null));

    expect(result).toBeNull();
    expect(error).toBeNull();
  });
});

describe('isNetworkError', () => {
  it('should return true for TypeError with fetch failed', () => {
    expect(isNetworkError(new TypeError('fetch failed'))).toBe(true);
  });

  it('should return true for Error with "network" in message', () => {
    expect(isNetworkError(new Error('Network error'))).toBe(true);
  });

  it('should return true for Error with "timeout" in message', () => {
    expect(isNetworkError(new Error('Connection timeout'))).toBe(true);
  });

  it('should return true for Error with "connection" in message', () => {
    expect(isNetworkError(new Error('Connection refused'))).toBe(true);
  });

  it('should return true for Error with "ECONNREFUSED"', () => {
    expect(isNetworkError(new Error('ECONNREFUSED'))).toBe(true);
  });

  it('should return true for Error with "ENOTFOUND"', () => {
    expect(isNetworkError(new Error('ENOTFOUND'))).toBe(true);
  });

  it('should return true for Error with "ETIMEDOUT"', () => {
    expect(isNetworkError(new Error('ETIMEDOUT'))).toBe(true);
  });

  it('should return true for Error with "abort"', () => {
    expect(isNetworkError(new Error('Request aborted'))).toBe(true);
  });

  it('should return true for Error with "cancel"', () => {
    expect(isNetworkError(new Error('Request cancelled'))).toBe(true);
  });

  it('should be case insensitive', () => {
    expect(isNetworkError(new Error('NETWORK ERROR'))).toBe(true);
  });

  it('should return false for non-network Error', () => {
    expect(isNetworkError(new Error('File not found'))).toBe(false);
  });

  it('should return false for non-Error', () => {
    expect(isNetworkError('network error')).toBe(false);
  });

  it('should return false for null', () => {
    expect(isNetworkError(null)).toBe(false);
  });

  it('should return true for object with network message', () => {
    expect(isNetworkError({ message: 'Network timeout' })).toBe(true);
  });
});

describe('isFileError', () => {
  it('should return true for Error with "file not found"', () => {
    expect(isFileError(new Error('file not found'))).toBe(true);
  });

  it('should return true for Error with "ENOENT"', () => {
    expect(isFileError(new Error('ENOENT'))).toBe(true);
  });

  it('should return true for Error with "permission denied"', () => {
    expect(isFileError(new Error('permission denied'))).toBe(true);
  });

  it('should return true for Error with "EACCES"', () => {
    expect(isFileError(new Error('EACCES'))).toBe(true);
  });

  it('should return true for Error with "is a directory"', () => {
    expect(isFileError(new Error('is a directory'))).toBe(true);
  });

  it('should return true for Error with "EISDIR"', () => {
    expect(isFileError(new Error('EISDIR'))).toBe(true);
  });

  it('should return true for Error with "not a directory"', () => {
    expect(isFileError(new Error('not a directory'))).toBe(true);
  });

  it('should return true for Error with "ENOTDIR"', () => {
    expect(isFileError(new Error('ENOTDIR'))).toBe(true);
  });

  it('should return true for Error with "file too large"', () => {
    expect(isFileError(new Error('file too large'))).toBe(true);
  });

  it('should return true for Error with "EFBIG"', () => {
    expect(isFileError(new Error('EFBIG'))).toBe(true);
  });

  it('should return true for Error with "no space left"', () => {
    expect(isFileError(new Error('no space left on device'))).toBe(true);
  });

  it('should return true for Error with "ENOSPC"', () => {
    expect(isFileError(new Error('ENOSPC'))).toBe(true);
  });

  it('should be case insensitive', () => {
    expect(isFileError(new Error('FILE NOT FOUND'))).toBe(true);
  });

  it('should return false for non-file Error', () => {
    expect(isFileError(new Error('Network timeout'))).toBe(false);
  });

  it('should return false for non-Error', () => {
    expect(isFileError('file not found')).toBe(false);
  });

  it('should return false for null', () => {
    expect(isFileError(null)).toBe(false);
  });

  it('should return true for object with file error message', () => {
    expect(isFileError({ message: 'ENOENT' })).toBe(true);
  });
});
