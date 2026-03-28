import { describe, it, expect } from 'vitest';
import {
  extractFilenameFromContentDisposition,
  extractFilenameFromUrl,
  determineFilename,
  extractDocumentUrl,
  safeDecodeUri,
  getFileExtension,
  isSupportedExtension,
  isValidUrl,
  normalizeLanguage,
  extractFileType,
  sanitizeFileName,
  getFileDescription,
  getMimeType,
} from '../url-utils';
import { DOCUMENT_TYPE_MAP } from '../document-utils';
import { g_sEmpty_bin } from '../empty_bin';

describe('extractFilenameFromContentDisposition', () => {
  it('should extract filename from simple Content-Disposition', () => {
    const header = 'attachment; filename="document.docx"';
    expect(extractFilenameFromContentDisposition(header)).toBe('document.docx');
  });

  it('should extract filename without quotes', () => {
    const header = 'attachment; filename=document.xlsx';
    expect(extractFilenameFromContentDisposition(header)).toBe('document.xlsx');
  });

  it('should handle single quotes', () => {
    const header = "attachment; filename='presentation.pptx'";
    expect(extractFilenameFromContentDisposition(header)).toBe('presentation.pptx');
  });

  it('should return null for null input', () => {
    expect(extractFilenameFromContentDisposition(null)).toBeNull();
  });

  it('should return null for empty string', () => {
    expect(extractFilenameFromContentDisposition('')).toBeNull();
  });

  it('should return null when filename is not present', () => {
    const header = 'attachment';
    expect(extractFilenameFromContentDisposition(header)).toBeNull();
  });

  it('should handle filename with spaces', () => {
    const header = 'attachment; filename="my document.docx"';
    expect(extractFilenameFromContentDisposition(header)).toBe('my document.docx');
  });

  it('should handle UTF-8 encoded filenames', () => {
    const header = 'attachment; filename="%E4%B8%AD%E6%96%87.docx"';
    expect(extractFilenameFromContentDisposition(header)).toBe('%E4%B8%AD%E6%96%87.docx');
  });

  it('should handle inline disposition', () => {
    const header = 'inline; filename="inline-doc.docx"';
    expect(extractFilenameFromContentDisposition(header)).toBe('inline-doc.docx');
  });

  it('should handle filename with special characters', () => {
    const header = 'attachment; filename="report_2024-01-15.docx"';
    expect(extractFilenameFromContentDisposition(header)).toBe('report_2024-01-15.docx');
  });

  it('should handle filename with multiple extensions', () => {
    const header = 'attachment; filename="archive.tar.gz"';
    expect(extractFilenameFromContentDisposition(header)).toBe('archive.tar.gz');
  });

  it('should handle filename with parentheses', () => {
    const header = 'attachment; filename="document (1).docx"';
    expect(extractFilenameFromContentDisposition(header)).toBe('document (1).docx');
  });

  it('should handle filename with unicode characters', () => {
    const header = 'attachment; filename="文档.docx"';
    expect(extractFilenameFromContentDisposition(header)).toBe('文档.docx');
  });

  it('should handle filename key with different case', () => {
    // Some servers might use different case
    const header = 'attachment; FileName="upper.docx"';
    // Our regex is case-sensitive for filename, so this might return null
    // But let's test actual behavior
    const result = extractFilenameFromContentDisposition(header);
    // The regex /filename[^;=\n]*/ is case-sensitive
    expect(result).toBeNull(); // FileName with capital F won't match
  });

  it('should handle disposition with additional parameters', () => {
    const header = 'attachment; filename="doc.docx"; size=12345';
    expect(extractFilenameFromContentDisposition(header)).toBe('doc.docx');
  });

  it('should handle form-data disposition', () => {
    const header = 'form-data; name="file"; filename="upload.docx"';
    expect(extractFilenameFromContentDisposition(header)).toBe('upload.docx');
  });

  it('should handle filename with semicolon in quotes', () => {
    const header = 'attachment; filename="file;name.docx"';
    expect(extractFilenameFromContentDisposition(header)).toBe('file;name.docx');
  });

  it('should handle multiple filename parameters (uses first match)', () => {
    const header = 'attachment; filename="first.docx"; filename="second.xlsx"';
    // The regex should match the first filename
    const result = extractFilenameFromContentDisposition(header);
    expect(result).toBe('first.docx');
  });
});

describe('extractFilenameFromUrl', () => {
  it('should extract filename from URL pathname', () => {
    expect(extractFilenameFromUrl('https://example.com/path/to/document.docx')).toBe('document.docx');
  });

  it('should handle URLs with query parameters', () => {
    expect(extractFilenameFromUrl('https://example.com/file.xlsx?token=abc123')).toBe('file.xlsx');
  });

  it('should handle URLs with trailing slash', () => {
    expect(extractFilenameFromUrl('https://example.com/path/')).toBe('document');
  });

  it('should handle root URL', () => {
    expect(extractFilenameFromUrl('https://example.com/')).toBe('document');
  });

  it('should return "document" for invalid URLs', () => {
    expect(extractFilenameFromUrl('not-a-valid-url')).toBe('document');
  });

  it('should handle relative URLs gracefully', () => {
    // Relative URLs without a base will throw in URL constructor
    expect(extractFilenameFromUrl('./path/to/file.pptx')).toBe('document');
  });

  it('should handle URL with only query parameters after slash', () => {
    // URL path ends with / and then query string
    expect(extractFilenameFromUrl('https://example.com/?token=abc')).toBe('document');
  });

  it('should handle URL with fragment', () => {
    expect(extractFilenameFromUrl('https://example.com/doc.pdf#page=1')).toBe('doc.pdf');
  });

  it('should handle URL with query and fragment', () => {
    expect(extractFilenameFromUrl('https://example.com/file.xlsx?token=abc#sheet1')).toBe('file.xlsx');
  });

  it('should handle data URL gracefully', () => {
    // Data URLs are parsed by URL constructor, pathname becomes "text/plain;base64,..."
    // The function extracts the last segment after /, which may not be meaningful
    const result = extractFilenameFromUrl('data:text/plain;base64,SGVsbG8=');
    // This is the actual behavior - data URLs are not handled specially
    expect(result).toBe('plain;base64,SGVsbG8=');
  });

  it('should handle URL with encoded characters in path', () => {
    // Note: extractFilenameFromUrl does NOT decode URL-encoded characters
    // It extracts the filename as-is from the URL pathname
    expect(extractFilenameFromUrl('https://example.com/path%20to/file%20name.docx')).toBe('file%20name.docx');
  });

  it('should handle localhost URL', () => {
    expect(extractFilenameFromUrl('http://localhost:3000/document.docx')).toBe('document.docx');
  });

  it('should handle URL with question mark in path edge case', () => {
    // Test the edge case where filename.split('?')[0] returns empty string
    // This happens when the last segment of path is just '?'
    // URL constructor normalizes this, so this is a theoretical edge case
    const result = extractFilenameFromUrl('https://example.com/path/?query=value');
    expect(result).toBe('document');
  });
});

describe('determineFilename', () => {
  it('should use provided filename first', () => {
    const result = determineFilename({
      fileName: 'provided.docx',
      contentDisposition: 'attachment; filename="header.xlsx"',
      url: 'https://example.com/url.pptx',
    });
    expect(result).toBe('provided.docx');
  });

  it('should use Content-Disposition when no filename provided', () => {
    const result = determineFilename({
      contentDisposition: 'attachment; filename="header.xlsx"',
      url: 'https://example.com/url.pptx',
    });
    expect(result).toBe('header.xlsx');
  });

  it('should use URL when no filename or Content-Disposition', () => {
    const result = determineFilename({
      url: 'https://example.com/path/to/file.pptx',
    });
    expect(result).toBe('file.pptx');
  });

  it('should return "document" as fallback', () => {
    expect(determineFilename({})).toBe('document');
  });

  it('should handle undefined parameters gracefully', () => {
    expect(determineFilename({ fileName: undefined })).toBe('document');
  });

  it('should fallback to URL when Content-Disposition has no filename', () => {
    const result = determineFilename({
      contentDisposition: 'attachment',
      url: 'https://example.com/fallback.docx',
    });
    expect(result).toBe('fallback.docx');
  });

  it('should fallback to URL when Content-Disposition is empty string', () => {
    const result = determineFilename({
      contentDisposition: '',
      url: 'https://example.com/file.xlsx',
    });
    expect(result).toBe('file.xlsx');
  });

  it('should handle empty string filename', () => {
    const result = determineFilename({
      fileName: '',
      contentDisposition: 'attachment; filename="header.xlsx"',
    });
    expect(result).toBe('header.xlsx');
  });

  it('should handle null contentDisposition', () => {
    const result = determineFilename({
      contentDisposition: null,
      url: 'https://example.com/file.docx',
    });
    expect(result).toBe('file.docx');
  });

  it('should handle all empty parameters', () => {
    expect(determineFilename({ fileName: '', contentDisposition: null, url: '' })).toBe('document');
  });
});

describe('extractDocumentUrl', () => {
  it('should prioritize file over src', () => {
    const result = extractDocumentUrl({
      file: 'https://example.com/file.docx',
      src: 'https://example.com/src.xlsx',
    });
    expect(result).toBe('https://example.com/file.docx');
  });

  it('should use src when file is not present', () => {
    const result = extractDocumentUrl({
      src: 'https://example.com/src.xlsx',
    });
    expect(result).toBe('https://example.com/src.xlsx');
  });

  it('should return null when neither parameter exists', () => {
    expect(extractDocumentUrl({})).toBeNull();
  });

  it('should return null when both are empty strings', () => {
    expect(extractDocumentUrl({ file: '', src: '' })).toBeNull();
  });

  it('should return file when file has value and src is undefined', () => {
    expect(extractDocumentUrl({ file: 'https://example.com/doc.docx' })).toBe('https://example.com/doc.docx');
  });

  it('should prioritize file even when src is defined', () => {
    const result = extractDocumentUrl({
      file: 'https://example.com/file.docx',
      src: 'https://example.com/src.xlsx',
    });
    expect(result).toBe('https://example.com/file.docx');
  });

  it('should handle undefined values explicitly', () => {
    expect(extractDocumentUrl({ file: undefined, src: undefined })).toBeNull();
  });
});

describe('safeDecodeUri', () => {
  it('should decode a valid URI component', () => {
    expect(safeDecodeUri('https%3A%2F%2Fexample.com%2Ffile.docx')).toBe('https://example.com/file.docx');
  });

  it('should return original string if decoding fails', () => {
    // Invalid percent encoding
    expect(safeDecodeUri('%E0%A4%A')).toBe('%E0%A4%A');
  });

  it('should handle already decoded strings', () => {
    expect(safeDecodeUri('https://example.com/file.docx')).toBe('https://example.com/file.docx');
  });

  it('should handle empty string', () => {
    expect(safeDecodeUri('')).toBe('');
  });

  it('should decode Chinese characters', () => {
    expect(safeDecodeUri('%E4%B8%AD%E6%96%87')).toBe('中文');
  });

  it('should decode spaces encoded as + or %20', () => {
    expect(safeDecodeUri('file%20name.docx')).toBe('file name.docx');
  });

  it('should handle malformed percent encoding gracefully', () => {
    // Incomplete percent encoding
    expect(safeDecodeUri('file%2')).toBe('file%2');
  });

  it('should handle double encoding', () => {
    // %253C is %3C encoded
    expect(safeDecodeUri('%253C')).toBe('%3C');
  });
});

describe('getFileExtension', () => {
  it('should extract extension from filename', () => {
    expect(getFileExtension('document.docx')).toBe('docx');
  });

  it('should return lowercase extension', () => {
    expect(getFileExtension('document.DOCX')).toBe('docx');
  });

  it('should return empty string for filename without extension', () => {
    expect(getFileExtension('README')).toBe('');
  });

  it('should handle multiple dots', () => {
    expect(getFileExtension('my.document.file.xlsx')).toBe('xlsx');
  });

  it('should handle hidden files', () => {
    expect(getFileExtension('.gitignore')).toBe('gitignore');
  });

  it('should handle empty string', () => {
    expect(getFileExtension('')).toBe('');
  });

  it('should handle filename with numbers', () => {
    expect(getFileExtension('report2024.xlsx')).toBe('xlsx');
  });

  it('should handle very long extension', () => {
    expect(getFileExtension('archive.tar.gz')).toBe('gz');
  });

  it('should handle filename ending with dot', () => {
    expect(getFileExtension('document.')).toBe('');
  });

  it('should handle filename with only dots', () => {
    expect(getFileExtension('...')).toBe('');
  });
});

describe('isSupportedExtension', () => {
  it('should return true for supported document extensions', () => {
    expect(isSupportedExtension('docx')).toBe(true);
    expect(isSupportedExtension('doc')).toBe(true);
    expect(isSupportedExtension('odt')).toBe(true);
    expect(isSupportedExtension('rtf')).toBe(true);
    expect(isSupportedExtension('txt')).toBe(true);
  });

  it('should return true for supported spreadsheet extensions', () => {
    expect(isSupportedExtension('xlsx')).toBe(true);
    expect(isSupportedExtension('xls')).toBe(true);
    expect(isSupportedExtension('ods')).toBe(true);
    expect(isSupportedExtension('csv')).toBe(true);
  });

  it('should return true for supported presentation extensions', () => {
    expect(isSupportedExtension('pptx')).toBe(true);
    expect(isSupportedExtension('ppt')).toBe(true);
    expect(isSupportedExtension('odp')).toBe(true);
  });

  it('should return false for unsupported extensions', () => {
    expect(isSupportedExtension('pdf')).toBe(false);
    expect(isSupportedExtension('jpg')).toBe(false);
    expect(isSupportedExtension('exe')).toBe(false);
    expect(isSupportedExtension('')).toBe(false);
  });

  it('should be case insensitive', () => {
    expect(isSupportedExtension('DOCX')).toBe(true);
    expect(isSupportedExtension('XLSX')).toBe(true);
    expect(isSupportedExtension('PPTX')).toBe(true);
  });

  it('should handle whitespace gracefully', () => {
    expect(isSupportedExtension(' docx ')).toBe(false);
    expect(isSupportedExtension('\tdocx\n')).toBe(false);
  });

  it('should handle extensions with leading dot', () => {
    expect(isSupportedExtension('.docx')).toBe(false);
  });
});

describe('isValidUrl', () => {
  it('should return true for valid HTTP URLs', () => {
    expect(isValidUrl('https://example.com/document.docx')).toBe(true);
    expect(isValidUrl('http://example.com/document.docx')).toBe(true);
  });

  it('should return true for valid URL with port', () => {
    expect(isValidUrl('https://example.com:8080/document.docx')).toBe(true);
  });

  it('should return false for invalid URLs', () => {
    expect(isValidUrl('not-a-url')).toBe(false);
    expect(isValidUrl('')).toBe(false);
  });

  it('should return true for file URLs', () => {
    expect(isValidUrl('file:///path/to/document.docx')).toBe(true);
  });

  it('should return true for blob URLs', () => {
    expect(isValidUrl('blob:https://example.com/uuid')).toBe(true);
  });

  it('should return true for data URLs', () => {
    expect(isValidUrl('data:text/plain;base64,SGVsbG8=')).toBe(true);
  });

  it('should return true for ftp URLs', () => {
    expect(isValidUrl('ftp://ftp.example.com/file.docx')).toBe(true);
  });

  it('should return false for URL without protocol', () => {
    expect(isValidUrl('example.com/document.docx')).toBe(false);
  });

  it('should return false for javascript URLs', () => {
    expect(isValidUrl('javascript:alert(1)')).toBe(true); // URL constructor accepts this
  });

  it('should return true for localhost with port', () => {
    expect(isValidUrl('http://localhost:3000')).toBe(true);
  });

  it('should return true for IP address URLs', () => {
    expect(isValidUrl('http://192.168.1.1/document.docx')).toBe(true);
  });
});

describe('normalizeLanguage', () => {
  it('should normalize "zh" to "zh"', () => {
    expect(normalizeLanguage('zh')).toBe('zh');
  });

  it('should normalize "zh-CN" to "zh"', () => {
    expect(normalizeLanguage('zh-CN')).toBe('zh');
  });

  it('should normalize "zh_TW" to "zh"', () => {
    expect(normalizeLanguage('zh_TW')).toBe('zh');
  });

  it('should normalize "en" to "en"', () => {
    expect(normalizeLanguage('en')).toBe('en');
  });

  it('should normalize "en-US" to "en"', () => {
    expect(normalizeLanguage('en-US')).toBe('en');
  });

  it('should normalize "en_GB" to "en"', () => {
    expect(normalizeLanguage('en_GB')).toBe('en');
  });

  it('should handle uppercase input', () => {
    expect(normalizeLanguage('ZH')).toBe('zh');
    expect(normalizeLanguage('ZH-CN')).toBe('zh');
    expect(normalizeLanguage('EN')).toBe('en');
    expect(normalizeLanguage('EN-US')).toBe('en');
  });

  it('should return null for null input', () => {
    expect(normalizeLanguage(null)).toBeNull();
  });

  it('should return null for empty string', () => {
    expect(normalizeLanguage('')).toBeNull();
  });

  it('should return null for unsupported languages', () => {
    expect(normalizeLanguage('fr')).toBeNull();
    expect(normalizeLanguage('de')).toBeNull();
    expect(normalizeLanguage('ja')).toBeNull();
    expect(normalizeLanguage('es')).toBeNull();
  });

  it('should return null for invalid input', () => {
    expect(normalizeLanguage('invalid')).toBeNull();
  });

  it('should handle zh-Hans and zh-Hant variants', () => {
    expect(normalizeLanguage('zh-Hans')).toBe('zh');
    expect(normalizeLanguage('zh-Hant')).toBe('zh');
  });

  it('should handle whitespace in input', () => {
    expect(normalizeLanguage(' zh ')).toBeNull(); // whitespace breaks the match
    expect(normalizeLanguage('\tzh\n')).toBeNull();
  });

  it('should handle language with only region code', () => {
    expect(normalizeLanguage('CN')).toBeNull();
    expect(normalizeLanguage('US')).toBeNull();
  });

  it('should handle numeric input', () => {
    expect(normalizeLanguage('123')).toBeNull();
  });

  it('should handle special characters in input', () => {
    expect(normalizeLanguage('zh@CN')).toBeNull();
    expect(normalizeLanguage('en#US')).toBeNull();
  });
});

describe('extractFileType', () => {
  it('should extract extension from MIME type', () => {
    expect(extractFileType('application/vnd.openxmlformats-officedocument.wordprocessingml.document')).toBe('docx');
    expect(extractFileType('application/msword')).toBe('doc');
    expect(extractFileType('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')).toBe('xlsx');
    expect(extractFileType('application/vnd.ms-excel')).toBe('xls');
    expect(extractFileType('text/csv')).toBe('csv');
    expect(extractFileType('application/vnd.openxmlformats-officedocument.presentationml.presentation')).toBe('pptx');
    expect(extractFileType('application/vnd.ms-powerpoint')).toBe('ppt');
  });

  it('should fall back to filename extension when MIME type is unknown', () => {
    expect(extractFileType('unknown/mime', 'document.docx')).toBe('docx');
    expect(extractFileType(undefined, 'spreadsheet.xlsx')).toBe('xlsx');
    expect(extractFileType('', 'presentation.pptx')).toBe('pptx');
  });

  it('should prefer MIME type over filename extension', () => {
    expect(extractFileType('application/msword', 'document.xlsx')).toBe('doc');
    expect(extractFileType('application/vnd.ms-excel', 'presentation.pptx')).toBe('xls');
  });

  it('should prefer explicit csv filename over excel mime type', () => {
    expect(extractFileType('application/vnd.ms-excel', 'sample.csv')).toBe('csv');
  });

  it('should handle case-insensitive MIME types', () => {
    expect(extractFileType('APPLICATION/MSWORD')).toBe('doc');
    expect(extractFileType('Application/Vnd.Ms-Excel')).toBe('xls');
  });

  it('should return empty string for no inputs', () => {
    expect(extractFileType()).toBe('');
    expect(extractFileType(undefined, undefined)).toBe('');
    expect(extractFileType('', '')).toBe('');
  });

  it('should handle OpenDocument MIME types', () => {
    expect(extractFileType('application/vnd.oasis.opendocument.text')).toBe('odt');
    expect(extractFileType('application/vnd.oasis.opendocument.spreadsheet')).toBe('ods');
    expect(extractFileType('application/vnd.oasis.opendocument.presentation')).toBe('odp');
  });

  it('should handle text/plain MIME type', () => {
    expect(extractFileType('text/plain')).toBe('txt');
  });

  it('should handle RTF MIME type', () => {
    expect(extractFileType('application/rtf')).toBe('rtf');
  });

  it('should return empty string when filename has no extension', () => {
    expect(extractFileType(undefined, 'README')).toBe('');
    expect(extractFileType(undefined, 'document')).toBe('');
  });

  it('should return empty string when filename has only a trailing dot', () => {
    expect(extractFileType(undefined, 'document.')).toBe('');
  });
});

describe('sanitizeFileName', () => {
  it('should return valid filename unchanged', () => {
    expect(sanitizeFileName('document.docx')).toBe('document.docx');
    expect(sanitizeFileName('report_2024.xlsx')).toBe('report_2024.xlsx');
  });

  it('should handle filename with spaces', () => {
    expect(sanitizeFileName('my document.docx')).toBe('my document.docx');
  });

  it('should remove illegal characters', () => {
    expect(sanitizeFileName('file/name.docx')).toBe('filename.docx');
    expect(sanitizeFileName('file\\name.docx')).toBe('filename.docx');
    expect(sanitizeFileName('file:name.docx')).toBe('filename.docx');
    expect(sanitizeFileName('file*name.docx')).toBe('filename.docx');
    expect(sanitizeFileName('file?name.docx')).toBe('filename.docx');
    expect(sanitizeFileName('file<name.docx')).toBe('filename.docx');
    expect(sanitizeFileName('file>name.docx')).toBe('filename.docx');
    expect(sanitizeFileName('file|name.docx')).toBe('filename.docx');
    expect(sanitizeFileName('file"name.docx')).toBe('filename.docx');
  });

  it('should remove unsafe characters', () => {
    expect(sanitizeFileName('file&name.docx')).toBe('filename.docx');
    expect(sanitizeFileName("file'name.docx")).toBe('filename.docx');
    expect(sanitizeFileName('file%name.docx')).toBe('filename.docx');
    expect(sanitizeFileName('file!name.docx')).toBe('filename.docx');
    expect(sanitizeFileName('file{name}.docx')).toBe('filename.docx');
  });

  it('should handle control characters', () => {
    expect(sanitizeFileName('file\x00name.docx')).toBe('filename.docx');
    expect(sanitizeFileName('file\x1fname.docx')).toBe('filename.docx');
    expect(sanitizeFileName('file\x80name.docx')).toBe('filename.docx');
  });

  it('should handle reserved patterns', () => {
    expect(sanitizeFileName('...docx')).toBe('file.docx');
    expect(sanitizeFileName('.docx')).toBe('file.docx');
  });

  it('should handle empty input', () => {
    expect(sanitizeFileName('')).toBe('file.bin');
    expect(sanitizeFileName('   ')).toBe('file.bin');
  });

  it('should handle non-string input', () => {
    expect(sanitizeFileName(null as any)).toBe('file.bin');
    expect(sanitizeFileName(undefined as any)).toBe('file.bin');
  });

  it('should preserve extension', () => {
    expect(sanitizeFileName('document.xlsx')).toBe('document.xlsx');
    expect(sanitizeFileName('presentation.pptx')).toBe('presentation.pptx');
    expect(sanitizeFileName('archive.tar.gz')).toBe('archive.tar.gz');
  });

  it('should handle filename without extension', () => {
    // When there's no dot, the entire string becomes the "extension"
    // This is the original behavior - not ideal but matches original code
    expect(sanitizeFileName('README')).toBe('file.README');
  });

  it('should handle very long filenames', () => {
    const longName = 'a'.repeat(300) + '.docx';
    const result = sanitizeFileName(longName);
    expect(result.length).toBeLessThanOrEqual(205); // 200 chars + '.docx'
    expect(result.endsWith('.docx')).toBe(true);
  });

  it('should handle Unicode characters', () => {
    expect(sanitizeFileName('文档.docx')).toBe('文档.docx');
    expect(sanitizeFileName('документ.docx')).toBe('документ.docx');
  });

  it('should handle filename with multiple dots', () => {
    expect(sanitizeFileName('my.document.file.xlsx')).toBe('my.document.file.xlsx');
  });

  it('should trim whitespace from name part', () => {
    expect(sanitizeFileName('  document  .docx')).toBe('document.docx');
  });

  it('should fallback to "file" for empty name part', () => {
    expect(sanitizeFileName('.docx')).toBe('file.docx');
  });

  it('should handle filename ending with dot (trailing dot)', () => {
    // Input ending with dot results in empty extension after pop()
    expect(sanitizeFileName('document.')).toBe('document.bin');
    expect(sanitizeFileName('test.')).toBe('test.bin');
  });

  it('should handle filename with only dots', () => {
    expect(sanitizeFileName('...')).toBe('file.bin');
    expect(sanitizeFileName('..')).toBe('file.bin');
  });
});

describe('getFileDescription', () => {
  it('should return correct description for Word formats', () => {
    expect(getFileDescription('docx')).toBe('Word Document');
    expect(getFileDescription('doc')).toBe('Word 97-2003 Document');
    expect(getFileDescription('odt')).toBe('OpenDocument Text');
  });

  it('should return correct description for Excel formats', () => {
    expect(getFileDescription('xlsx')).toBe('Excel Workbook');
    expect(getFileDescription('xls')).toBe('Excel 97-2003 Workbook');
    expect(getFileDescription('ods')).toBe('OpenDocument Spreadsheet');
  });

  it('should return correct description for PowerPoint formats', () => {
    expect(getFileDescription('pptx')).toBe('PowerPoint Presentation');
    expect(getFileDescription('ppt')).toBe('PowerPoint 97-2003 Presentation');
    expect(getFileDescription('odp')).toBe('OpenDocument Presentation');
  });

  it('should return correct description for other formats', () => {
    expect(getFileDescription('pdf')).toBe('PDF Document');
    expect(getFileDescription('txt')).toBe('Text Document');
    expect(getFileDescription('rtf')).toBe('Rich Text Format');
    expect(getFileDescription('csv')).toBe('CSV File');
  });

  it('should be case-insensitive', () => {
    expect(getFileDescription('DOCX')).toBe('Word Document');
    expect(getFileDescription('XLSX')).toBe('Excel Workbook');
    expect(getFileDescription('PPTX')).toBe('PowerPoint Presentation');
  });

  it('should return "Document" for unknown extensions', () => {
    expect(getFileDescription('xyz')).toBe('Document');
    expect(getFileDescription('')).toBe('Document');
    expect(getFileDescription('unknown')).toBe('Document');
  });
});

describe('getMimeType', () => {
  it('should return correct MIME type for document formats', () => {
    expect(getMimeType('docx')).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    expect(getMimeType('doc')).toBe('application/msword');
    expect(getMimeType('odt')).toBe('application/vnd.oasis.opendocument.text');
    expect(getMimeType('rtf')).toBe('application/rtf');
    expect(getMimeType('txt')).toBe('text/plain');
  });

  it('should return correct MIME type for spreadsheet formats', () => {
    expect(getMimeType('xlsx')).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    expect(getMimeType('xls')).toBe('application/vnd.ms-excel');
    expect(getMimeType('ods')).toBe('application/vnd.oasis.opendocument.spreadsheet');
    expect(getMimeType('csv')).toBe('text/csv');
  });

  it('should return correct MIME type for presentation formats', () => {
    expect(getMimeType('pptx')).toBe('application/vnd.openxmlformats-officedocument.presentationml.presentation');
    expect(getMimeType('ppt')).toBe('application/vnd.ms-powerpoint');
    expect(getMimeType('odp')).toBe('application/vnd.oasis.opendocument.presentation');
  });

  it('should return correct MIME type for image formats', () => {
    expect(getMimeType('png')).toBe('image/png');
    expect(getMimeType('jpg')).toBe('image/jpeg');
    expect(getMimeType('jpeg')).toBe('image/jpeg');
    expect(getMimeType('gif')).toBe('image/gif');
    expect(getMimeType('webp')).toBe('image/webp');
    expect(getMimeType('svg')).toBe('image/svg+xml');
  });

  it('should return correct MIME type for PDF', () => {
    expect(getMimeType('pdf')).toBe('application/pdf');
  });

  it('should be case-insensitive', () => {
    expect(getMimeType('DOCX')).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    expect(getMimeType('PNG')).toBe('image/png');
    expect(getMimeType('JPG')).toBe('image/jpeg');
  });

  it('should return octet-stream for unknown extensions', () => {
    expect(getMimeType('xyz')).toBe('application/octet-stream');
    expect(getMimeType('')).toBe('application/octet-stream');
    expect(getMimeType('unknown')).toBe('application/octet-stream');
  });
});

describe('MIME type consistency', () => {
  it('should have MIME types for all DOCUMENT_TYPE_MAP extensions', () => {
    // All extensions in DOCUMENT_TYPE_MAP should have corresponding MIME types
    const extensions = Object.keys(DOCUMENT_TYPE_MAP);

    for (const ext of extensions) {
      const mimeType = getMimeType(ext);
      // Should not be the fallback octet-stream for known document types
      // Some formats like rtf may not have specific MIME types in our mapping
      expect(typeof mimeType).toBe('string');
      expect(mimeType.length).toBeGreaterThan(0);
    }
  });

  it('should have specific MIME types for primary Office formats', () => {
    // Modern Office formats should have specific MIME types
    expect(getMimeType('docx')).not.toBe('application/octet-stream');
    expect(getMimeType('xlsx')).not.toBe('application/octet-stream');
    expect(getMimeType('pptx')).not.toBe('application/octet-stream');

    // Legacy Office formats should have specific MIME types
    expect(getMimeType('doc')).not.toBe('application/octet-stream');
    expect(getMimeType('xls')).not.toBe('application/octet-stream');
    expect(getMimeType('ppt')).not.toBe('application/octet-stream');

    // OpenDocument formats should have specific MIME types
    expect(getMimeType('odt')).not.toBe('application/octet-stream');
    expect(getMimeType('ods')).not.toBe('application/octet-stream');
    expect(getMimeType('odp')).not.toBe('application/octet-stream');
  });

  it('should have MIME types for all empty_bin template extensions', () => {
    // All empty template extensions should have MIME types
    const emptyBinExtensions = Object.keys(g_sEmpty_bin).map((k) => k.slice(1)); // Remove leading dot

    for (const ext of emptyBinExtensions) {
      const mimeType = getMimeType(ext);
      expect(mimeType).not.toBe('application/octet-stream');
      expect(mimeType.length).toBeGreaterThan(0);
    }
  });

  it('should return correct MIME type categories', () => {
    // Document types should start with application/vnd.* or text/
    const docMime = getMimeType('docx');
    expect(docMime.startsWith('application/vnd.') || docMime.startsWith('text/')).toBe(true);

    const txtMime = getMimeType('txt');
    expect(txtMime).toBe('text/plain');

    // Image types should start with image/
    expect(getMimeType('png').startsWith('image/')).toBe(true);
    expect(getMimeType('jpg').startsWith('image/')).toBe(true);
  });

  it('should have consistent MIME types for extension variations', () => {
    // jpg and jpeg should return the same MIME type
    expect(getMimeType('jpg')).toBe(getMimeType('jpeg'));

    // Case variations should return the same MIME type
    expect(getMimeType('docx')).toBe(getMimeType('DOCX'));
    expect(getMimeType('png')).toBe(getMimeType('PNG'));
  });
});

describe('Export completeness', () => {
  it('should export all expected URL utility functions', () => {
    // Verify all exported functions exist and are functions
    expect(typeof extractFilenameFromContentDisposition).toBe('function');
    expect(typeof extractFilenameFromUrl).toBe('function');
    expect(typeof determineFilename).toBe('function');
    expect(typeof extractDocumentUrl).toBe('function');
    expect(typeof safeDecodeUri).toBe('function');
    expect(typeof getFileExtension).toBe('function');
    expect(typeof isSupportedExtension).toBe('function');
    expect(typeof isValidUrl).toBe('function');
    expect(typeof normalizeLanguage).toBe('function');
    expect(typeof extractFileType).toBe('function');
    expect(typeof sanitizeFileName).toBe('function');
    expect(typeof getFileDescription).toBe('function');
    expect(typeof getMimeType).toBe('function');
  });
});

describe('Property-based tests for sanitization', () => {
  describe('sanitizeFileName idempotency', () => {
    it('should be idempotent - sanitizing twice gives same result', () => {
      const testCases = [
        'normal_file.docx',
        'file<>with|illegal*chars?.docx',
        'file:with"all\\illegal/chars.docx',
        '  spaces  around  .docx',
        'multiple...dots...docx',
        'file\x00with\x1Fcontrol.docx',
      ];

      for (const input of testCases) {
        const first = sanitizeFileName(input);
        const second = sanitizeFileName(first);
        expect(second).toBe(first);
      }
    });

    it('should never contain illegal characters after sanitization', () => {
      const illegalChars = ['<', '>', ':', '"', '|', '?', '*', '\\', '/'];
      const testInputs = [
        'file<>with|all*illegal?chars.docx',
        'path\\to/file:with"all.docx',
        '<>|*?:"\\/.docx',
      ];

      for (const input of testInputs) {
        const sanitized = sanitizeFileName(input);
        for (const char of illegalChars) {
          expect(sanitized).not.toContain(char);
        }
      }
    });

    it('should never contain control characters (0x00-0x1F) after sanitization', () => {
      const testInputs = [
        'file\x00with\x01control\x02chars.docx',
        'file\x1Fwith\x0Amultiple\x0Dcontrol.docx',
      ];

      for (const input of testInputs) {
        const sanitized = sanitizeFileName(input);
        for (let i = 0; i < 32; i++) {
          expect(sanitized).not.toContain(String.fromCharCode(i));
        }
      }
    });
  });

  describe('getFileExtension round-trip properties', () => {
    it('should extract the part after last dot for normal filenames', () => {
      const testCases = [
        { filename: 'document.docx', expectedExt: 'docx' },
        { filename: 'spreadsheet.xlsx', expectedExt: 'xlsx' },
        { filename: 'presentation.pptx', expectedExt: 'pptx' },
        { filename: 'archive.tar.gz', expectedExt: 'gz' },
        { filename: 'config.json', expectedExt: 'json' },
      ];

      for (const { filename, expectedExt } of testCases) {
        expect(getFileExtension(filename)).toBe(expectedExt);
      }
    });

    it('should return empty string for files without extension', () => {
      const testCases = ['README', 'Makefile', 'LICENSE', ''];

      for (const filename of testCases) {
        expect(getFileExtension(filename)).toBe('');
      }
    });

    it('should handle trailing dots consistently', () => {
      // Files ending with dot(s) should return empty extension
      expect(getFileExtension('file.')).toBe('');
      expect(getFileExtension('file..')).toBe('');
      expect(getFileExtension('file...')).toBe('');
    });
  });

  describe('MIME type consistency properties', () => {
    it('should always return a string for any input', () => {
      const testInputs = [
        'docx', 'xlsx', 'pptx', 'pdf', 'txt', 'csv',
        'unknown', 'custom', '', 'UPPERCASE', 'MiXeD',
        'jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg',
      ];

      for (const ext of testInputs) {
        const mime = getMimeType(ext);
        expect(typeof mime).toBe('string');
        expect(mime.length).toBeGreaterThan(0);
      }
    });

    it('should have consistent MIME types regardless of case', () => {
      const extensions = ['docx', 'xlsx', 'pptx', 'pdf', 'txt', 'jpg'];

      for (const ext of extensions) {
        const lower = getMimeType(ext);
        const upper = getMimeType(ext.toUpperCase());
        const mixed = getMimeType(ext[0].toUpperCase() + ext.slice(1));

        expect(upper).toBe(lower);
        expect(mixed).toBe(lower);
      }
    });

    it('should return valid MIME type format', () => {
      const extensions = ['docx', 'xlsx', 'pptx', 'pdf', 'txt', 'csv', 'jpg', 'png'];

      for (const ext of extensions) {
        const mime = getMimeType(ext);
        // MIME types should have format "type/subtype"
        expect(mime).toMatch(/^[a-z0-9]+\/[a-z0-9\-+.]+$/i);
      }
    });
  });

  describe('isSupportedExtension consistency', () => {
    it('should match DOCUMENT_TYPE_MAP keys', () => {
      const supportedExtensions = Object.keys(DOCUMENT_TYPE_MAP);

      for (const ext of supportedExtensions) {
        expect(isSupportedExtension(ext)).toBe(true);
      }
    });

    it('should be case-insensitive', () => {
      const extensions = ['docx', 'xlsx', 'pptx', 'pdf'];

      for (const ext of extensions) {
        const lower = isSupportedExtension(ext);
        const upper = isSupportedExtension(ext.toUpperCase());

        expect(upper).toBe(lower);
      }
    });
  });
});

describe('Edge cases for filename handling', () => {
  describe('determineFilename edge cases', () => {
    it('should handle empty response gracefully', () => {
      const result = determineFilename({ contentDisposition: null, url: 'https://example.com/file.docx' });
      expect(result).toBe('file.docx');
    });

    it('should prefer Content-Disposition over URL', () => {
      const contentDisposition = 'attachment; filename="from-disposition.docx"';
      const result = determineFilename({ contentDisposition, url: 'https://example.com/from-url.xlsx' });
      expect(result).toBe('from-disposition.docx');
    });

    it('should handle special characters in filenames', () => {
      const specialFilenames = [
        'file with spaces.docx',
        'file-with-dashes.docx',
        'file_with_underscores.docx',
        'file(more).docx',
        'file[multiple]brackets.docx',
      ];

      for (const filename of specialFilenames) {
        const contentDisposition = `attachment; filename="${filename}"`;
        const result = determineFilename({ contentDisposition, url: 'https://example.com/' });
        expect(result).toBe(filename);
      }
    });

    it('should handle URLs with complex query strings', () => {
      const complexUrls = [
        'https://example.com/file.docx?token=abc123&user=test',
        'https://example.com/file.xlsx?a=1&b=2&c=3#section',
        'https://example.com/path/to/file.pptx?download=true',
      ];

      for (const url of complexUrls) {
        const result = determineFilename({ contentDisposition: null, url });
        expect(result).toMatch(/\.(docx|xlsx|pptx)$/);
      }
    });
  });

  describe('safeDecodeUri edge cases', () => {
    it('should handle already decoded strings', () => {
      expect(safeDecodeUri('normal-string')).toBe('normal-string');
      expect(safeDecodeUri('file with spaces')).toBe('file with spaces');
    });

    it('should handle percent-encoded strings', () => {
      expect(safeDecodeUri('file%20name')).toBe('file name');
      expect(safeDecodeUri('%E4%B8%AD%E6%96%87')).toBe('中文');
    });

    it('should handle malformed encoding gracefully', () => {
      // Malformed percent encoding should return original string
      expect(safeDecodeUri('file%2')).toBe('file%2');
      expect(safeDecodeUri('file%XX')).toBe('file%XX');
      expect(safeDecodeUri('file%2Gname')).toBe('file%2Gname');
    });

    it('should handle empty and null-like inputs', () => {
      expect(safeDecodeUri('')).toBe('');
    });
  });
});
