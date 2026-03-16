/**
 * URL and filename parsing utilities for document loading.
 * These are pure functions that can be easily tested.
 */

/**
 * Supported language codes
 */
export type SupportedLanguage = 'zh' | 'en';

/**
 * Normalize a language code to a supported language
 * Supports: 'zh', 'zh-CN', 'zh_TW', 'en', 'en-US', etc.
 * @param lang - The language code to normalize
 * @returns The normalized language code or null if unsupported
 */
export function normalizeLanguage(lang: string | null): SupportedLanguage | null {
  if (!lang) return null;
  const normalized = lang.toLowerCase().split(/[-_]/)[0];
  if (normalized === 'zh') return 'zh';
  if (normalized === 'en') return 'en';
  return null;
}

/**
 * Extract filename from Content-Disposition header
 * @param contentDisposition - The Content-Disposition header value
 * @returns The extracted filename or null if not found
 */
export function extractFilenameFromContentDisposition(contentDisposition: string | null): string | null {
  if (!contentDisposition) {
    return null;
  }

  const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
  if (filenameMatch && filenameMatch[1]) {
    return filenameMatch[1].replace(/['"]/g, '');
  }

  return null;
}

/**
 * Extract filename from URL pathname
 * @param url - The URL string
 * @returns The extracted filename or 'document' as fallback
 */
export function extractFilenameFromUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    // URL.pathname doesn't include query params, so no need to strip them
    return pathname.split('/').pop() || 'document';
  } catch {
    return 'document';
  }
}

/**
 * Determine the final filename from multiple sources
 * Priority: provided fileName > Content-Disposition > URL pathname
 * @param params - Object containing fileName, contentDisposition, and url
 * @returns The determined filename
 */
export function determineFilename(params: {
  fileName?: string;
  contentDisposition?: string | null;
  url?: string;
}): string {
  // Priority 1: Use provided filename
  if (params.fileName) {
    return params.fileName;
  }

  // Priority 2: Extract from Content-Disposition header
  if (params.contentDisposition) {
    const extracted = extractFilenameFromContentDisposition(params.contentDisposition);
    if (extracted) {
      return extracted;
    }
  }

  // Priority 3: Extract from URL
  if (params.url) {
    return extractFilenameFromUrl(params.url);
  }

  return 'document';
}

/**
 * Extract document URL from query parameters
 * Priority: file > src (for backward compatibility)
 * @param params - Object containing file and src query parameters
 * @returns The document URL or null if neither parameter exists
 */
export function extractDocumentUrl(params: { file?: string; src?: string }): string | null {
  return params.file || params.src || null;
}

/**
 * Safely decode a URI component, returning original if decoding fails
 * @param uri - The URI string to decode
 * @returns The decoded URI or original if decoding fails
 */
export function safeDecodeUri(uri: string): string {
  try {
    return decodeURIComponent(uri);
  } catch {
    return uri;
  }
}

/**
 * Get file extension from filename
 * @param filename - The filename
 * @returns The file extension (without dot) or empty string
 */
export function getFileExtension(filename: string): string {
  const parts = filename.split('.');
  if (parts.length < 2) {
    return '';
  }
  return parts.pop()?.toLowerCase() || '';
}

/**
 * Check if a file extension is supported
 * @param extension - The file extension (without dot)
 * @returns True if the extension is supported
 */
export function isSupportedExtension(extension: string): boolean {
  const supportedExtensions = [
    'docx', 'doc', 'odt', 'rtf', 'txt',
    'xlsx', 'xls', 'ods', 'csv',
    'pptx', 'ppt', 'odp',
  ];
  return supportedExtensions.includes(extension.toLowerCase());
}

/**
 * Validate a URL string
 * @param url - The URL string to validate
 * @returns True if the URL is valid
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Map of common MIME types to file extensions
 */
const MIME_TO_EXTENSION: Record<string, string> = {
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/msword': 'doc',
  'application/vnd.oasis.opendocument.text': 'odt',
  'application/rtf': 'rtf',
  'text/plain': 'txt',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'application/vnd.ms-excel': 'xls',
  'application/vnd.oasis.opendocument.spreadsheet': 'ods',
  'text/csv': 'csv',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
  'application/vnd.ms-powerpoint': 'ppt',
  'application/vnd.oasis.opendocument.presentation': 'odp',
};

/**
 * Extract file type from file MIME type or filename.
 * Prefers MIME type extension, falls back to filename extension.
 * @param mimeType - The MIME type of the file (optional)
 * @param fileName - The filename to extract extension from (optional)
 * @returns The file extension (without dot) or empty string if not found
 */
export function extractFileType(mimeType?: string, fileName?: string): string {
  // Try to get extension from MIME type first
  if (mimeType) {
    const ext = MIME_TO_EXTENSION[mimeType.toLowerCase()];
    if (ext) return ext;
  }

  // Fall back to filename extension
  if (fileName) {
    const ext = getFileExtension(fileName);
    if (ext) return ext;
  }

  return '';
}

/**
 * Sanitize a filename by removing illegal and unsafe characters.
 * Preserves the file extension and limits the filename length.
 * @param input - The filename to sanitize
 * @returns The sanitized filename or 'file.bin' if input is invalid
 */
export function sanitizeFileName(input: string): string {
  if (typeof input !== 'string' || !input.trim()) {
    return 'file.bin';
  }

  const parts = input.split('.');
  const ext = parts.pop() || 'bin';
  const name = parts.join('.');

  // Characters that are illegal on Windows/Unix
  const illegalChars = /[/?<>\\:*|"]/g;
  // Control characters (0x00-0x1F, 0x80-0x9F)
  // eslint-disable-next-line no-control-regex
  const controlChars = /[\x00-\x1f\x80-\x9f]/g;
  // Reserved patterns like "." or ".."
  const reservedPattern = /^\.+$/;
  // Characters that may cause issues in URLs and shells
  const unsafeChars = /[&'%!"{}[\]]/g;

  let sanitized = name
    .replace(illegalChars, '')
    .replace(controlChars, '')
    .replace(reservedPattern, '')
    .replace(unsafeChars, '');

  sanitized = sanitized.trim() || 'file';
  // Limit filename length to 200 characters + extension
  return `${sanitized.slice(0, 200)}.${ext}`;
}

/**
 * Map of file extensions to human-readable descriptions
 */
const FILE_DESCRIPTIONS: Record<string, string> = {
  docx: 'Word Document',
  doc: 'Word 97-2003 Document',
  odt: 'OpenDocument Text',
  pdf: 'PDF Document',
  xlsx: 'Excel Workbook',
  xls: 'Excel 97-2003 Workbook',
  ods: 'OpenDocument Spreadsheet',
  pptx: 'PowerPoint Presentation',
  ppt: 'PowerPoint 97-2003 Presentation',
  odp: 'OpenDocument Presentation',
  txt: 'Text Document',
  rtf: 'Rich Text Format',
  csv: 'CSV File',
};

/**
 * Get a human-readable description for a file extension
 * @param extension - The file extension (without dot)
 * @returns The description or 'Document' if unknown
 */
export function getFileDescription(extension: string): string {
  return FILE_DESCRIPTIONS[extension.toLowerCase()] || 'Document';
}

/**
 * Map of file extensions to MIME types
 */
const EXTENSION_TO_MIME: Record<string, string> = {
  // Document types
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  doc: 'application/msword',
  odt: 'application/vnd.oasis.opendocument.text',
  rtf: 'application/rtf',
  txt: 'text/plain',
  pdf: 'application/pdf',

  // Spreadsheet types
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  xls: 'application/vnd.ms-excel',
  ods: 'application/vnd.oasis.opendocument.spreadsheet',
  csv: 'text/csv',

  // Presentation types
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  ppt: 'application/vnd.ms-powerpoint',
  odp: 'application/vnd.oasis.opendocument.presentation',

  // Image types
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  bmp: 'image/bmp',
  webp: 'image/webp',
  svg: 'image/svg+xml',
};

/**
 * Get MIME type from file extension
 * @param extension - The file extension (without dot)
 * @returns The MIME type or 'application/octet-stream' if unknown
 */
export function getMimeType(extension: string): string {
  return EXTENSION_TO_MIME[extension.toLowerCase()] || 'application/octet-stream';
}
