/**
 * Error handling utility functions.
 * These pure functions provide safe, testable error handling patterns.
 * @module lib/error-utils
 */

/**
 * Options for error context creation.
 */
export interface ErrorContextOptions {
  /** The operation or component where the error occurred */
  operation?: string;
  /** Additional context data */
  context?: Record<string, unknown>;
  /** Original error that caused this error */
  cause?: unknown;
}

/**
 * Structured error context for logging and debugging.
 */
export interface ErrorContext {
  /** Error message */
  message: string;
  /** Error name/type */
  name: string;
  /** Stack trace if available */
  stack?: string;
  /** Operation where error occurred */
  operation?: string;
  /** Additional context data */
  context?: Record<string, unknown>;
  /** Timestamp when error was captured */
  timestamp: string;
  /** Original cause of the error */
  cause?: unknown;
}

/**
 * Safely extracts an error message from an unknown value.
 * Handles Error objects, strings, objects with message property, and unknown values.
 *
 * @param error - The error value to extract message from
 * @param fallback - Fallback message if error cannot be extracted (default: 'Unknown error')
 * @returns A string error message
 *
 * @example
 * formatErrorMessage(new Error('File not found')) // 'File not found'
 * formatErrorMessage('Something went wrong') // 'Something went wrong'
 * formatErrorMessage(null) // 'Unknown error'
 * formatErrorMessage({ message: 'Custom error' }) // 'Custom error'
 */
export function formatErrorMessage(error: unknown, fallback = 'Unknown error'): string {
  if (error === null || error === undefined) {
    return fallback;
  }

  if (typeof error === 'string') {
    return error || fallback;
  }

  if (error instanceof Error) {
    return error.message || fallback;
  }

  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = (error as { message: unknown }).message;
    if (typeof message === 'string') {
      return message || fallback;
    }
  }

  // Try to stringify the value as a last resort
  try {
    const stringified = String(error);
    if (stringified && stringified !== '[object Object]') {
      return stringified;
    }
  } catch {
    // Ignore stringify errors
  }

  return fallback;
}

/**
 * Type guard to check if a value is an Error object.
 *
 * @param error - The value to check
 * @returns True if the value is an Error object
 *
 * @example
 * isError(new Error('test')) // true
 * isError('error') // false
 * isError({ message: 'test' }) // false
 */
export function isError(error: unknown): error is Error {
  return error instanceof Error;
}

/**
 * Type guard to check if a value is an Error-like object with a message property.
 * Less strict than isError(), catches objects that look like errors.
 *
 * @param error - The value to check
 * @returns True if the value has a string message property
 *
 * @example
 * isErrorLike(new Error('test')) // true
 * isErrorLike({ message: 'test' }) // true
 * isErrorLike('error') // false
 */
export function isErrorLike(error: unknown): error is { message: string } {
  if (error === null || error === undefined) {
    return false;
  }
  if (error instanceof Error) {
    return true;
  }
  if (typeof error === 'object') {
    return 'message' in error && typeof (error as Record<string, unknown>).message === 'string';
  }
  return false;
}

/**
 * Creates a structured error context object for logging and debugging.
 * Captures timestamp, stack trace, and additional context.
 *
 * @param error - The error to create context for
 * @param options - Additional options for context creation
 * @returns A structured error context object
 *
 * @example
 * const context = createErrorContext(new Error('Failed'), {
 *   operation: 'documentConversion',
 *   context: { fileName: 'test.docx' }
 * });
 * // { message: 'Failed', name: 'Error', timestamp: '...', ... }
 */
export function createErrorContext(error: unknown, options: ErrorContextOptions = {}): ErrorContext {
  const { operation, context, cause } = options;
  const timestamp = new Date().toISOString();

  if (error instanceof Error) {
    return {
      message: error.message,
      name: error.name,
      stack: error.stack,
      operation,
      context,
      timestamp,
      cause,
    };
  }

  return {
    message: formatErrorMessage(error),
    name: 'UnknownError',
    operation,
    context,
    timestamp,
    cause,
  };
}

/**
 * Safely logs an error to console with optional context.
 * Prevents crashes from logging errors themselves.
 *
 * @param error - The error to log
 * @param prefix - Optional prefix for the log message
 * @param context - Optional additional context to log
 *
 * @example
 * safeLogError(new Error('Failed'), 'Document loading');
 * // [Document loading] Error: Failed
 */
export function safeLogError(error: unknown, prefix?: string, context?: Record<string, unknown>): void {
  try {
    const message = formatErrorMessage(error);
    const logMessage = prefix ? `[${prefix}] ${message}` : message;

    if (context) {
      console.error(logMessage, context);
    } else {
      console.error(logMessage);
    }
  } catch {
    // If logging fails, silently ignore
  }
}

/**
 * Wraps an async function with error handling.
 * Returns a tuple of [result, error] for safe error handling.
 *
 * @param fn - The async function to wrap
 * @returns A tuple of [result, error] where error is null on success
 *
 * @example
 * const [result, error] = await safeAsync(() => fetchData());
 * if (error) {
 *   console.error('Failed:', formatErrorMessage(error));
 * }
 */
export async function safeAsync<T>(fn: () => Promise<T>): Promise<[T | null, Error | null]> {
  try {
    const result = await fn();
    return [result, null];
  } catch (error) {
    if (error instanceof Error) {
      return [null, error];
    }
    return [null, new Error(formatErrorMessage(error))];
  }
}

/**
 * Checks if an error indicates a network-related failure.
 *
 * @param error - The error to check
 * @returns True if the error appears to be network-related
 *
 * @example
 * isNetworkError(new TypeError('fetch failed')) // true
 * isNetworkError(new Error('Network error')) // true
 */
export function isNetworkError(error: unknown): boolean {
  if (!isErrorLike(error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  const networkIndicators = [
    'network',
    'fetch',
    'timeout',
    'connection',
    'econnrefused',
    'enotfound',
    'etimedout',
    'abort',
    'cancel',
  ];

  return networkIndicators.some((indicator) => message.includes(indicator));
}

/**
 * Checks if an error indicates a file-related failure.
 *
 * @param error - The error to check
 * @returns True if the error appears to be file-related
 *
 * @example
 * isFileError(new Error('File not found')) // true
 * isFileError(new Error('Permission denied')) // true
 */
export function isFileError(error: unknown): boolean {
  if (!isErrorLike(error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  const fileIndicators = [
    'file not found',
    'enoent',
    'permission denied',
    'eacces',
    'is a directory',
    'eisdir',
    'not a directory',
    'enotdir',
    'file too large',
    'efbig',
    'no space left',
    'enospc',
  ];

  return fileIndicators.some((indicator) => message.includes(indicator));
}
