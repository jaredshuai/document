import { getMime } from 'ranuts/utils';
import type { DocumentType } from './document-types';

/**
 * Get base path based on deployment environment.
 * - GitHub Pages: uses /document/ path
 * - Docker/Other: uses root path /
 *
 * @returns The base path for the current deployment environment
 * @example
 * ```ts
 * // On GitHub Pages
 * getBasePath(); // Returns '/document/'
 *
 * // On Docker or other deployments
 * getBasePath(); // Returns '/'
 * ```
 */
export const getBasePath = (): string => {
  if (typeof window === 'undefined') {
    return '/';
  }

  const pathname = window.location.pathname;
  // Check if we're in GitHub Pages (path starts with /document/ or contains /document/)
  if (pathname.startsWith('/document/') || pathname === '/document') {
    return '/document/';
  }
  // Docker or other deployments use root path
  return '/';
};

export const BASE_PATH = getBasePath();

/**
 * Get document type from file extension.
 * Returns the OnlyOffice editor type for all currently supported document formats.
 *
 * @param fileType - The file extension (without dot), case-insensitive
 * @returns The document type ('word', 'cell', 'slide') or null if unsupported
 * @example
 * ```ts
 * getDocumentType('docx'); // Returns 'word'
 * getDocumentType('odt'); // Returns 'word'
 * getDocumentType('xlsx'); // Returns 'cell'
 * getDocumentType('odp'); // Returns 'slide'
 * getDocumentType('pdf'); // Returns null
 * ```
 */
export function getDocumentType(fileType: string): DocumentType | null {
  return DOCUMENT_TYPE_MAP[fileType.toLowerCase()] ?? null;
}

/**
 * Get MIME type from file extension (using ranuts getMime utility).
 * Falls back to 'image/png' for unknown extensions.
 *
 * @param extension - File extension (with or without leading dot), case-insensitive
 * @returns The MIME type string
 * @example
 * ```ts
 * getMimeTypeFromExtension('.png'); // Returns 'image/png'
 * getMimeTypeFromExtension('jpg'); // Returns 'image/jpeg'
 * getMimeTypeFromExtension('.unknown'); // Returns 'image/png' (fallback)
 * ```
 */
export function getMimeTypeFromExtension(extension: string): string {
  // Use ranuts getMime for common image types, fallback to image/png
  const mime = getMime(extension?.toLowerCase() || '');
  return mime || 'image/png';
}

/**
 * Document type mapping from file extension to OnlyOffice editor type.
 * This is a comprehensive mapping that includes more formats than getDocumentType().
 *
 * @see getDocumentType - For the function that uses a subset of these mappings
 */
export const DOCUMENT_TYPE_MAP: Record<string, DocumentType> = {
  docx: 'word',
  doc: 'word',
  odt: 'word',
  rtf: 'word',
  txt: 'word',
  xlsx: 'cell',
  xls: 'cell',
  ods: 'cell',
  csv: 'cell',
  pptx: 'slide',
  ppt: 'slide',
  odp: 'slide',
};
