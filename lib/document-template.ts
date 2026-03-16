import { g_sEmpty_bin } from './empty_bin';

/**
 * Returns the set of file extensions (with leading dot) that support new document creation.
 */
export function getSupportedNewDocumentExtensions(): string[] {
  return Object.keys(g_sEmpty_bin);
}

/**
 * Checks whether a file extension supports new document creation.
 * @param fileType - File extension (with or without leading dot, e.g., "docx" or ".docx")
 * @returns true if a template exists for creating new documents of this type
 */
export function isNewDocumentSupported(fileType: string): boolean {
  if (!fileType) return false;
  const normalizedType = fileType.startsWith('.') ? fileType : `.${fileType}`;
  return normalizedType in g_sEmpty_bin;
}

/**
 * Returns the empty document template for a given file type.
 * @param fileType - File extension (with or without leading dot, e.g., "docx" or ".docx")
 * @returns The template string for new documents, or undefined if not supported
 */
export function getNewDocumentTemplate(fileType: string): string | undefined {
  if (!fileType) return undefined;
  const normalizedType = fileType.startsWith('.') ? fileType : `.${fileType}`;
  return g_sEmpty_bin[normalizedType];
}

/**
 * Validates and returns the empty document template for a given file type.
 * Throws an error if the file type is not supported for new document creation.
 * @param fileType - File extension (with or without leading dot)
 * @returns The template string for new documents
 * @throws Error if file type is not supported
 */
export function requireNewDocumentTemplate(fileType: string): string {
  const template = getNewDocumentTemplate(fileType);
  if (!template) {
    throw new Error(`Unsupported file type for new document: ${fileType}`);
  }
  return template;
}