/**
 * Conversion path utilities for X2T WASM virtual file system operations.
 * These pure functions construct file paths used during document conversion.
 */

/**
 * Working directory for X2T operations
 */
export const WORKING_DIR = '/working';

/**
 * Media directory for embedded resources
 */
export const MEDIA_DIR = `${WORKING_DIR}/media`;

/**
 * Fonts directory for PDF conversion
 */
export const FONTS_DIR = `${WORKING_DIR}/fonts`;

/**
 * Themes directory for document themes
 */
export const THEMES_DIR = `${WORKING_DIR}/themes`;

/**
 * All working directories that need to be created
 */
export const WORKING_DIRS = [WORKING_DIR, MEDIA_DIR, FONTS_DIR, THEMES_DIR];

/**
 * Creates conversion paths for input and output files in the virtual file system.
 * @param fileName - The sanitized file name (without path)
 * @param targetExtension - Optional target extension for output (defaults to .bin)
 * @returns Object containing input and output paths
 */
export function createConversionPaths(
  fileName: string,
  targetExtension?: string,
): {
  inputPath: string;
  outputPath: string;
} {
  const inputPath = `${WORKING_DIR}/${fileName}`;
  const ext = targetExtension || 'bin';
  const outputPath = `${inputPath}.${ext}`;
  return { inputPath, outputPath };
}

/**
 * Creates the params.xml file path for conversion parameters.
 * @returns The path to params.xml
 */
export function getParamsPath(): string {
  return `${WORKING_DIR}/params.xml`;
}

/**
 * Creates a bin file path from an input file path.
 * @param inputPath - The input file path
 * @returns The corresponding bin file path
 */
export function getBinPath(inputPath: string): string {
  return `${inputPath}.bin`;
}

/**
 * Creates a file path in the working directory.
 * @param fileName - The file name
 * @returns The full path in the working directory
 */
export function getWorkingPath(fileName: string): string {
  return `${WORKING_DIR}/${fileName}`;
}

/**
 * Extracts the file name from a working directory path.
 * @param path - The full path in working directory
 * @returns The file name portion
 */
export function extractFileName(path: string): string {
  const prefix = `${WORKING_DIR}/`;
  if (path.startsWith(prefix)) {
    return path.slice(prefix.length);
  }
  return path.split('/').pop() || path;
}

/**
 * Creates output file name with extension.
 * @param baseName - The base file name (without extension)
 * @param extension - The target extension
 * @returns The full file name with extension
 */
export function createOutputFileName(baseName: string, extension: string): string {
  const normalizedExt = extension.toLowerCase().replace(/^\./, '');
  return `${baseName}.${normalizedExt}`;
}
