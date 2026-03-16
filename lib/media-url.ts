/**
 * Media URL utilities for handling image/file data in the editor.
 * Pure functions for validation and URL key creation.
 */

import { getMimeTypeFromExtension } from './document-utils';
import { getFileExtension } from './url-utils';

/**
 * Result of validating write file data.
 */
export interface WriteFileValidationResult {
  isValid: true;
  fileExtension: string;
  mimeType: string;
}

export interface WriteFileValidationError {
  isValid: false;
  error: string;
}

export type WriteFileValidation = WriteFileValidationResult | WriteFileValidationError;

/**
 * Validates image data and file name for write file operations.
 *
 * @param imageData - The image data to validate (should be Uint8Array)
 * @param fileName - The file name to validate
 * @returns Validation result with extension and MIME type if valid, error if invalid
 *
 * @example
 * ```typescript
 * const result = validateWriteFileData(new Uint8Array([1, 2, 3]), 'image.png');
 * if (result.isValid) {
 *   console.log(result.mimeType); // 'image/png'
 * }
 * ```
 */
export function validateWriteFileData(imageData: unknown, fileName: unknown): WriteFileValidation {
  // Validate image data
  if (!imageData || !(imageData instanceof Uint8Array)) {
    return {
      isValid: false,
      error: 'Invalid image data: expected Uint8Array',
    };
  }

  // Validate file name
  if (!fileName || typeof fileName !== 'string') {
    return {
      isValid: false,
      error: 'Invalid file name',
    };
  }

  // Extract extension and MIME type
  const fileExtension = getFileExtension(fileName) || 'png';
  const mimeType = getMimeTypeFromExtension(fileExtension);

  return {
    isValid: true,
    fileExtension,
    mimeType,
  };
}

/**
 * Creates a media URL key for the editor's media mapping.
 *
 * @param fileName - The file name to create the key for
 * @returns The media URL key in the format 'media/${fileName}'
 *
 * @example
 * ```typescript
 * createMediaUrlKey('image.png'); // 'media/image.png'
 * ```
 */
export function createMediaUrlKey(fileName: string): string {
  return `media/${fileName}`;
}

/**
 * Validates that a value is a valid Uint8Array.
 *
 * @param value - The value to check
 * @returns True if the value is a non-empty Uint8Array
 *
 * @example
 * ```typescript
 * isValidUint8Array(new Uint8Array([1, 2, 3])); // true
 * isValidUint8Array(null); // false
 * isValidUint8Array(new Uint8Array([])); // false
 * ```
 */
export function isValidUint8Array(value: unknown): value is Uint8Array {
  return value instanceof Uint8Array && value.length > 0;
}

/**
 * Validates that a value is a valid file name string.
 *
 * @param value - The value to check
 * @returns True if the value is a non-empty string
 *
 * @example
 * ```typescript
 * isValidFileName('image.png'); // true
 * isValidFileName(''); // false
 * isValidFileName(null); // false
 * ```
 */
export function isValidFileName(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}