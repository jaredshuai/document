/**
 * Type guard functions for validating data structures
 * These functions validate data from external sources (message codec, user input, etc.)
 */

import type { RenderOfficeData } from './events';

/**
 * Validates if an unknown value is a valid RenderOfficeData object
 * Used to validate data received from the message codec
 *
 * @param data - The unknown value to validate
 * @returns true if the data is a valid RenderOfficeData, false otherwise
 */
export function isValidRenderOfficeData(data: unknown): data is RenderOfficeData {
  if (typeof data !== 'object' || data === null) {
    return false;
  }

  const obj = data as Record<string, unknown>;

  // Check required fields
  if (typeof obj['chunkIndex'] !== 'number') {
    return false;
  }

  if (typeof obj['data'] !== 'string') {
    return false;
  }

  if (typeof obj['lastModified'] !== 'number') {
    return false;
  }

  if (typeof obj['name'] !== 'string') {
    return false;
  }

  if (typeof obj['size'] !== 'number') {
    return false;
  }

  if (typeof obj['totalChunks'] !== 'number') {
    return false;
  }

  if (typeof obj['type'] !== 'string') {
    return false;
  }

  // Validate semantic constraints - cast through unknown for type safety
  const renderData = obj as unknown as RenderOfficeData;

  // chunkIndex should be non-negative and less than totalChunks
  // Note: totalChunks <= 0 is also caught here since chunkIndex >= 0
  if (renderData.chunkIndex < 0 || renderData.chunkIndex >= renderData.totalChunks) {
    return false;
  }

  // size should be non-negative
  if (renderData.size < 0) {
    return false;
  }

  // lastModified should be non-negative (timestamp)
  if (renderData.lastModified < 0) {
    return false;
  }

  return true;
}

/**
 * Validates an array of RenderOfficeData chunks for completeness
 *
 * @param chunks - Array of chunks to validate
 * @returns true if chunks form a complete and valid set
 */
export function isValidChunkSequence(chunks: RenderOfficeData[]): boolean {
  if (!Array.isArray(chunks) || chunks.length === 0) {
    return false;
  }

  const totalChunks = chunks[0].totalChunks;
  if (chunks.length !== totalChunks) {
    return false;
  }

  // Verify all chunks have the same totalChunks value
  if (!chunks.every((chunk) => chunk.totalChunks === totalChunks)) {
    return false;
  }

  // Verify all chunks have unique indices from 0 to totalChunks-1
  const indices = new Set(chunks.map((chunk) => chunk.chunkIndex));
  if (indices.size !== totalChunks) {
    return false;
  }

  for (let i = 0; i < totalChunks; i++) {
    if (!indices.has(i)) {
      return false;
    }
  }

  return true;
}

/**
 * Options for validating file data
 */
export interface FileValidationOptions {
  maxSizeBytes?: number;
  allowedExtensions?: string[];
}

/**
 * Validates file name and size constraints
 *
 * @param fileName - The file name to validate
 * @param size - The file size in bytes
 * @param options - Validation options
 * @returns true if file is valid according to constraints
 */
export function isValidFile(
  fileName: string,
  size: number,
  options: FileValidationOptions = {},
): boolean {
  if (typeof fileName !== 'string' || fileName.length === 0) {
    return false;
  }

  if (typeof size !== 'number' || size < 0) {
    return false;
  }

  const { maxSizeBytes, allowedExtensions } = options;

  if (maxSizeBytes !== undefined && size > maxSizeBytes) {
    return false;
  }

  if (allowedExtensions !== undefined && allowedExtensions.length > 0) {
    const ext = fileName.toLowerCase().slice(fileName.lastIndexOf('.'));
    if (!allowedExtensions.includes(ext)) {
      return false;
    }
  }

  return true;
}