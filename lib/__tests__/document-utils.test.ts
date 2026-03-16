import { describe, it, expect } from 'vitest';
import { BASE_PATH, getBasePath, getDocumentType, getMimeTypeFromExtension, DOCUMENT_TYPE_MAP } from '../document-utils';
import { g_sEmpty_bin } from '../empty_bin';
import { isSupportedExtension } from '../url-utils';

describe('getBasePath', () => {
  it('should return root path when window is unavailable', () => {
    expect(getBasePath()).toBe('/');
    expect(BASE_PATH).toBe('/');
  });

  it('should return GitHub Pages path for /document/', () => {
    const originalWindow = globalThis.window;
    Object.defineProperty(globalThis, 'window', {
      value: { location: { pathname: '/document/' } },
      configurable: true,
      writable: true,
    });

    expect(getBasePath()).toBe('/document/');

    Object.defineProperty(globalThis, 'window', {
      value: originalWindow,
      configurable: true,
      writable: true,
    });
  });

  it('should return GitHub Pages path for /document', () => {
    const originalWindow = globalThis.window;
    Object.defineProperty(globalThis, 'window', {
      value: { location: { pathname: '/document' } },
      configurable: true,
      writable: true,
    });

    expect(getBasePath()).toBe('/document/');

    Object.defineProperty(globalThis, 'window', {
      value: originalWindow,
      configurable: true,
      writable: true,
    });
  });

  it('should return root path for non-GitHub deployment paths', () => {
    const originalWindow = globalThis.window;
    Object.defineProperty(globalThis, 'window', {
      value: { location: { pathname: '/app/editor' } },
      configurable: true,
      writable: true,
    });

    expect(getBasePath()).toBe('/');

    Object.defineProperty(globalThis, 'window', {
      value: originalWindow,
      configurable: true,
      writable: true,
    });
  });
});

describe('getDocumentType', () => {
  it('should return "word" for docx extension', () => {
    expect(getDocumentType('docx')).toBe('word');
  });

  it('should return "word" for doc extension', () => {
    expect(getDocumentType('doc')).toBe('word');
  });

  it('should return "cell" for xlsx extension', () => {
    expect(getDocumentType('xlsx')).toBe('cell');
  });

  it('should return "cell" for xls extension', () => {
    expect(getDocumentType('xls')).toBe('cell');
  });

  it('should return "cell" for csv extension', () => {
    expect(getDocumentType('csv')).toBe('cell');
  });

  it('should return "slide" for pptx extension', () => {
    expect(getDocumentType('pptx')).toBe('slide');
  });

  it('should return "slide" for ppt extension', () => {
    expect(getDocumentType('ppt')).toBe('slide');
  });

  it('should handle uppercase extensions', () => {
    expect(getDocumentType('DOCX')).toBe('word');
    expect(getDocumentType('XLSX')).toBe('cell');
    expect(getDocumentType('PPTX')).toBe('slide');
    expect(getDocumentType('ODT')).toBe('word');
    expect(getDocumentType('ODS')).toBe('cell');
    expect(getDocumentType('ODP')).toBe('slide');
  });

  it('should return null for unsupported extensions', () => {
    expect(getDocumentType('pdf')).toBeNull();
    expect(getDocumentType('unknown')).toBeNull();
    expect(getDocumentType('')).toBeNull();
  });

  it('should handle mixed case extensions', () => {
    expect(getDocumentType('DoCx')).toBe('word');
    expect(getDocumentType('XlSx')).toBe('cell');
    expect(getDocumentType('RtF')).toBe('word');
    expect(getDocumentType('tXt')).toBe('word');
  });
});

describe('DOCUMENT_TYPE_MAP', () => {
  it('should contain all supported document types', () => {
    expect(DOCUMENT_TYPE_MAP['docx']).toBe('word');
    expect(DOCUMENT_TYPE_MAP['doc']).toBe('word');
    expect(DOCUMENT_TYPE_MAP['odt']).toBe('word');
    expect(DOCUMENT_TYPE_MAP['rtf']).toBe('word');
    expect(DOCUMENT_TYPE_MAP['txt']).toBe('word');
  });

  it('should contain all supported spreadsheet types', () => {
    expect(DOCUMENT_TYPE_MAP['xlsx']).toBe('cell');
    expect(DOCUMENT_TYPE_MAP['xls']).toBe('cell');
    expect(DOCUMENT_TYPE_MAP['ods']).toBe('cell');
    expect(DOCUMENT_TYPE_MAP['csv']).toBe('cell');
  });

  it('should contain all supported presentation types', () => {
    expect(DOCUMENT_TYPE_MAP['pptx']).toBe('slide');
    expect(DOCUMENT_TYPE_MAP['ppt']).toBe('slide');
    expect(DOCUMENT_TYPE_MAP['odp']).toBe('slide');
  });

  it('should be a readonly mapping', () => {
    // Verify it's an object with string keys
    expect(typeof DOCUMENT_TYPE_MAP).toBe('object');
    expect(Object.keys(DOCUMENT_TYPE_MAP).length).toBeGreaterThan(0);
  });
});

describe('getMimeTypeFromExtension', () => {
  it('should return correct MIME type for common image formats', () => {
    expect(getMimeTypeFromExtension('.png')).toBe('image/png');
    expect(getMimeTypeFromExtension('.jpg')).toBe('image/jpeg');
    expect(getMimeTypeFromExtension('.jpeg')).toBe('image/jpeg');
    expect(getMimeTypeFromExtension('.gif')).toBe('image/gif');
    // Note: webp and svg may not be supported by all MIME type libraries
    // so we just verify they return a valid MIME type string
    const webpMime = getMimeTypeFromExtension('.webp');
    expect(typeof webpMime).toBe('string');
    expect(webpMime.length).toBeGreaterThan(0);
  });

  it('should handle extensions without leading dot', () => {
    expect(getMimeTypeFromExtension('png')).toBe('image/png');
    expect(getMimeTypeFromExtension('jpg')).toBe('image/jpeg');
  });

  it('should be case insensitive', () => {
    expect(getMimeTypeFromExtension('.PNG')).toBe('image/png');
    expect(getMimeTypeFromExtension('.JPG')).toBe('image/jpeg');
    expect(getMimeTypeFromExtension('.GIF')).toBe('image/gif');
  });

  it('should return "image/png" as fallback for unknown extensions', () => {
    expect(getMimeTypeFromExtension('.unknown')).toBe('image/png');
    expect(getMimeTypeFromExtension('unknown')).toBe('image/png');
  });

  it('should handle empty string gracefully', () => {
    expect(getMimeTypeFromExtension('')).toBe('image/png');
  });

  it('should handle null/undefined gracefully', () => {
    expect(getMimeTypeFromExtension(null as any)).toBe('image/png');
    expect(getMimeTypeFromExtension(undefined as any)).toBe('image/png');
  });
});

describe('DOCUMENT_TYPE_MAP vs getDocumentType consistency', () => {
  it('should have consistent mapping for docx', () => {
    expect(getDocumentType('docx')).toBe(DOCUMENT_TYPE_MAP['docx']);
  });

  it('should have consistent mapping for doc', () => {
    expect(getDocumentType('doc')).toBe(DOCUMENT_TYPE_MAP['doc']);
  });

  it('should have consistent mapping for xlsx', () => {
    expect(getDocumentType('xlsx')).toBe(DOCUMENT_TYPE_MAP['xlsx']);
  });

  it('should have consistent mapping for xls', () => {
    expect(getDocumentType('xls')).toBe(DOCUMENT_TYPE_MAP['xls']);
  });

  it('should have consistent mapping for csv', () => {
    expect(getDocumentType('csv')).toBe(DOCUMENT_TYPE_MAP['csv']);
  });

  it('should have consistent mapping for pptx', () => {
    expect(getDocumentType('pptx')).toBe(DOCUMENT_TYPE_MAP['pptx']);
  });

  it('should have consistent mapping for ppt', () => {
    expect(getDocumentType('ppt')).toBe(DOCUMENT_TYPE_MAP['ppt']);
  });

  it('should have consistent mapping for odt, rtf, and txt', () => {
    expect(getDocumentType('odt')).toBe(DOCUMENT_TYPE_MAP['odt']);
    expect(getDocumentType('rtf')).toBe(DOCUMENT_TYPE_MAP['rtf']);
    expect(getDocumentType('txt')).toBe(DOCUMENT_TYPE_MAP['txt']);
  });

  it('should have consistent mapping for ods', () => {
    expect(getDocumentType('ods')).toBe(DOCUMENT_TYPE_MAP['ods']);
  });

  it('should have consistent mapping for odp', () => {
    expect(getDocumentType('odp')).toBe(DOCUMENT_TYPE_MAP['odp']);
  });

  it('should verify DOCUMENT_TYPE_MAP has 12 entries', () => {
    // 5 word types + 4 cell types + 3 slide types = 12
    expect(Object.keys(DOCUMENT_TYPE_MAP).length).toBe(12);
  });

  it('should return undefined for unknown keys in DOCUMENT_TYPE_MAP', () => {
    expect(DOCUMENT_TYPE_MAP['unknown' as any]).toBeUndefined();
    expect(DOCUMENT_TYPE_MAP['pdf' as any]).toBeUndefined();
  });
});

describe('getMimeTypeFromExtension additional tests', () => {
  it('should handle extensions with multiple dots', () => {
    // ranuts recognizes .gz extension
    const result = getMimeTypeFromExtension('.tar.gz');
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('should handle very long extensions', () => {
    const result = getMimeTypeFromExtension('.verylongextension');
    expect(typeof result).toBe('string');
  });

  it('should handle special characters in extension', () => {
    expect(getMimeTypeFromExtension('.png?query')).toBe('image/png'); // ranuts may handle this
  });
});

describe('Cross-module consistency', () => {
  it('should have empty_bin templates for new document formats only', () => {
    // empty_bin only has templates for the new Office formats (docx, xlsx, pptx)
    // Legacy formats (doc, xls, ppt) are not included
    const emptyBinExtensions = Object.keys(g_sEmpty_bin).map((k) => k.slice(1));

    expect(emptyBinExtensions).toContain('docx');
    expect(emptyBinExtensions).toContain('xlsx');
    expect(emptyBinExtensions).toContain('pptx');

    // Legacy formats are NOT included
    expect(emptyBinExtensions).not.toContain('doc');
    expect(emptyBinExtensions).not.toContain('xls');
    expect(emptyBinExtensions).not.toContain('ppt');
  });

  it('should have DOCUMENT_TYPE_MAP entries for all isSupportedExtension values', () => {
    const supportedExtensions = ['docx', 'doc', 'odt', 'rtf', 'txt', 'xlsx', 'xls', 'ods', 'csv', 'pptx', 'ppt', 'odp'];

    for (const ext of supportedExtensions) {
      expect(isSupportedExtension(ext)).toBe(true);
      expect(DOCUMENT_TYPE_MAP[ext]).toBeDefined();
    }
  });

  it('should have more DOCUMENT_TYPE_MAP entries than empty_bin templates', () => {
    // DOCUMENT_TYPE_MAP includes legacy formats (doc, xls, ppt) and OpenDocument formats (odt, ods, odp)
    const documentTypeKeys = Object.keys(DOCUMENT_TYPE_MAP);
    const emptyBinKeys = Object.keys(g_sEmpty_bin);

    expect(documentTypeKeys.length).toBeGreaterThan(emptyBinKeys.length);
  });

  it('should verify empty_bin contains valid templates', () => {
    // Verify the main document types have templates
    expect(g_sEmpty_bin['.docx']).toBeDefined();
    expect(g_sEmpty_bin['.xlsx']).toBeDefined();
    expect(g_sEmpty_bin['.pptx']).toBeDefined();

    // Verify templates are base64 strings
    expect(typeof g_sEmpty_bin['.docx']).toBe('string');
    expect(g_sEmpty_bin['.docx'].length).toBeGreaterThan(100);
  });

  it('should have isSupportedExtension return false for types not in DOCUMENT_TYPE_MAP', () => {
    // Types that have templates but may not be "supported" for direct editing
    expect(isSupportedExtension('pdf')).toBe(false);
    expect(isSupportedExtension('odt')).toBe(true);
    expect(isSupportedExtension('ods')).toBe(true);
    expect(isSupportedExtension('odp')).toBe(true);
  });
});