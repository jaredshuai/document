/**
 * Byte-level utility functions for file processing.
 * These are pure functions that can be tested without browser dependencies.
 */

/**
 * UTF-8 Byte Order Mark (BOM) bytes: EF BB BF
 */
export const UTF8_BOM = new Uint8Array([0xef, 0xbb, 0xbf]);

/**
 * Check if a Uint8Array starts with a UTF-8 BOM.
 *
 * @param data - The byte array to check
 * @returns true if the data starts with UTF-8 BOM, false otherwise
 */
export function hasUtf8Bom(data: Uint8Array): boolean {
  if (data.length < 3) return false;
  return data[0] === 0xef && data[1] === 0xbb && data[2] === 0xbf;
}

/**
 * Add UTF-8 BOM to the beginning of a byte array.
 * If the data already has a BOM, returns the data unchanged.
 *
 * @param data - The byte array to add BOM to
 * @returns A new Uint8Array with BOM prepended (or original if BOM exists)
 */
export function addUtf8Bom(data: Uint8Array): Uint8Array {
  if (hasUtf8Bom(data)) return data;

  const result = new Uint8Array(UTF8_BOM.length + data.length);
  result.set(UTF8_BOM, 0);
  result.set(data, UTF8_BOM.length);
  return result;
}

/**
 * Remove UTF-8 BOM from the beginning of a byte array.
 * If the data doesn't have a BOM, returns the data unchanged.
 *
 * @param data - The byte array to remove BOM from
 * @returns A new Uint8Array without BOM (or original if no BOM)
 */
export function stripUtf8Bom(data: Uint8Array): Uint8Array {
  if (!hasUtf8Bom(data)) return data;
  return data.slice(3);
}

/**
 * Decode a byte array to string, handling UTF-8 BOM.
 * Strips BOM if present before decoding.
 *
 * @param data - The byte array to decode
 * @param fallbackEncoding - Fallback encoding if UTF-8 fails (default: 'latin1')
 * @returns The decoded string
 */
export function decodeBytes(
  data: Uint8Array,
  _fallbackEncoding: string = 'latin1',
): string {
  const dataWithoutBom = stripUtf8Bom(data);
  return new TextDecoder('utf-8').decode(dataWithoutBom);
}

/**
 * Encode a string to UTF-8 bytes, optionally adding BOM.
 *
 * @param text - The string to encode
 * @param withBom - Whether to prepend UTF-8 BOM (default: false)
 * @returns The encoded byte array
 */
export function encodeToBytes(text: string, withBom: boolean = false): Uint8Array {
  const encoded = new TextEncoder().encode(text);
  return withBom ? addUtf8Bom(encoded) : encoded;
}

/**
 * Check if a byte array is empty or contains only whitespace.
 *
 * @param data - The byte array to check
 * @returns true if empty or whitespace-only
 */
export function isEmptyOrWhitespace(data: Uint8Array): boolean {
  if (data.length === 0) return true;

  // Check for UTF-8 BOM + whitespace
  const checkData = stripUtf8Bom(data);
  if (checkData.length === 0) return true;

  // Decode and check for whitespace
  const text = new TextDecoder('utf-8').decode(checkData);
  return text.trim().length === 0;
}

/**
 * Concatenate multiple Uint8Arrays into one.
 *
 * @param arrays - The arrays to concatenate
 * @returns A new Uint8Array containing all input arrays
 */
export function concatBytes(...arrays: Uint8Array[]): Uint8Array {
  const totalLength = arrays.reduce((sum, arr) => sum + arr.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }
  return result;
}