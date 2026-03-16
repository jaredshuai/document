import { c_oAscFileType2 } from './file-types';

/**
 * Determines if the original file should force a specific format on save.
 * This handles the case where files like CSV are converted internally to XLSX
 * for editing but should be saved back to their original format.
 *
 * @param originalFileName - The original file name
 * @returns The format that should be used for saving, or null if no override needed
 */
export function getSaveFormatOverride(
  originalFileName: string | undefined,
): string | null {
  if (!originalFileName) {
    return null;
  }

  const lowerFileName = originalFileName.toLowerCase();

  // CSV files are converted to XLSX internally for editing,
  // but should be saved back as CSV
  if (lowerFileName.endsWith('.csv')) {
    return 'CSV';
  }

  return null;
}

/**
 * Determines the target save format for a document.
 *
 * @param outputFormatCode - The OnlyOffice output format code from the editor
 * @param originalFileName - Optional original file name for format override logic
 * @returns The file extension to use for saving (e.g., 'DOCX', 'XLSX', 'CSV')
 */
export function determineSaveFormat(
  outputFormatCode: number,
  originalFileName?: string,
): string {
  // Get the default format from the editor's output format code
  const defaultFormat = c_oAscFileType2[outputFormatCode];

  // Check if we need to override the format based on original file
  const override = getSaveFormatOverride(originalFileName);

  return override ?? defaultFormat;
}

/**
 * Checks if a filename has a specific extension (case-insensitive).
 *
 * @param fileName - The file name to check
 * @param extension - The extension to check for (with or without leading dot)
 * @returns True if the file has the specified extension
 */
export function hasFileExtension(fileName: string, extension: string): boolean {
  const normalizedExtension = extension.startsWith('.') ? extension.toLowerCase() : `.${extension.toLowerCase()}`;
  return fileName.toLowerCase().endsWith(normalizedExtension);
}