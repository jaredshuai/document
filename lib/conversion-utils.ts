/**
 * Conversion utilities for x2t document conversion
 * These are pure functions that can be tested independently of browser dependencies
 */

/**
 * Creates the XML parameters file for x2t conversion
 * @param fromPath - Input file path in the virtual filesystem
 * @param toPath - Output file path in the virtual filesystem
 * @param additionalParams - Optional additional XML parameters
 * @returns XML string for the conversion parameters
 */
export function createConversionParams(fromPath: string, toPath: string, additionalParams = ''): string {
  return `<?xml version="1.0" encoding="utf-8"?>
<TaskQueueDataConvert xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">
  <m_sFileFrom>${fromPath}</m_sFileFrom>
  <m_sThemeDir>/working/themes</m_sThemeDir>
  <m_sFileTo>${toPath}</m_sFileTo>
  <m_bIsNoBase64>false</m_bIsNoBase64>
  ${additionalParams}
</TaskQueueDataConvert>`;
}

/**
 * Escapes XML special characters in a string
 * @param str - The string to escape
 * @returns The escaped string safe for XML content
 */
export function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Creates a filename with sanitized base name and target extension
 * @param sanitizedBase - The sanitized base filename (without extension)
 * @param targetExt - The target file extension (without dot)
 * @returns The complete filename with extension
 */
export function createOutputFilename(sanitizedBase: string, targetExt: string): string {
  const ext = targetExt.toLowerCase().replace(/^\./, '');
  return `${sanitizedBase}.${ext}`;
}