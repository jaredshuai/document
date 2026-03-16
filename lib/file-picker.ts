/**
 * File Picker Options Utilities
 *
 * Pure functions for creating file picker configuration.
 * Extracted from document-converter.ts for testability.
 */

import { getMimeType, getFileDescription } from './url-utils';

/**
 * File picker type definition for showSaveFilePicker/showOpenFilePicker
 */
export interface FilePickerType {
  description: string;
  accept: Record<string, string[]>;
}

/**
 * Options for creating file save picker options
 */
export interface FileSavePickerOptions {
  suggestedName: string;
  types: FilePickerType[];
}

/**
 * Options for creating file open picker options
 */
export interface FileOpenPickerOptions {
  types: FilePickerType[];
  multiple?: boolean;
}

/**
 * Creates a file picker type object for the File System API.
 *
 * @param extension - File extension (without leading dot)
 * @param mimeType - Optional MIME type (will be detected if not provided)
 * @returns FilePickerType object for use with showSaveFilePicker/showOpenFilePicker
 *
 * @example
 * ```ts
 * const type = createFilePickerType('docx');
 * // Returns: { description: 'Word Document', accept: { 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'] } }
 * ```
 */
export function createFilePickerType(extension: string, mimeType?: string): FilePickerType {
  const normalizedExtension = extension.toLowerCase().replace(/^\./, '');
  const detectedMimeType = mimeType || getMimeType(normalizedExtension);
  const description = getFileDescription(normalizedExtension);

  return {
    description,
    accept: {
      [detectedMimeType]: [`.${normalizedExtension}`],
    },
  };
}

/**
 * Creates options for the File System API's showSaveFilePicker.
 *
 * @param fileName - Suggested file name for the save dialog
 * @param mimeType - Optional MIME type (will be detected from extension if not provided)
 * @returns FileSavePickerOptions object
 *
 * @example
 * ```ts
 * const options = createSavePickerOptions('document.docx');
 * // Returns: { suggestedName: 'document.docx', types: [{ description: 'Word Document', accept: { ... } }] }
 * ```
 */
export function createSavePickerOptions(fileName: string, mimeType?: string): FileSavePickerOptions {
  const extension = fileName.split('.').pop()?.toLowerCase() || 'bin';

  return {
    suggestedName: fileName,
    types: [createFilePickerType(extension, mimeType)],
  };
}

/**
 * Creates options for the File System API's showOpenFilePicker.
 *
 * @param extensions - Array of supported file extensions (without leading dots)
 * @param options - Additional options
 * @param options.multiple - Whether to allow multiple file selection
 * @returns FileOpenPickerOptions object
 *
 * @example
 * ```ts
 * const options = createOpenPickerOptions(['docx', 'xlsx', 'pptx']);
 * // Returns: { types: [...], multiple: false }
 * ```
 */
export function createOpenPickerOptions(
  extensions: string[],
  options?: { multiple?: boolean },
): FileOpenPickerOptions {
  const types = extensions.map((ext) => createFilePickerType(ext));

  return {
    types,
    multiple: options?.multiple ?? false,
  };
}

/**
 * Returns the list of supported editable file extensions.
 * Used for file input accept attribute and file picker filters.
 */
export function getSupportedEditExtensions(): string[] {
  return [
    // Modern Office formats
    'docx',
    'xlsx',
    'pptx',
    // Legacy Office formats
    'doc',
    'xls',
    'ppt',
    // Other supported formats
    'csv',
    // OpenDocument formats
    'odt',
    'ods',
    'odp',
    // PDF (view only)
    'pdf',
    // Text formats
    'rtf',
    'txt',
  ];
}

/**
 * Returns the accept string for file input elements.
 * Used in document.ts for the file picker.
 *
 * @returns Comma-separated list of accepted file extensions with leading dots
 */
export function getFileInputAccept(): string {
  return getSupportedEditExtensions().map((ext) => `.${ext}`).join(',');
}