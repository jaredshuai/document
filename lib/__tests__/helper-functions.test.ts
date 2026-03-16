/**
 * Phase 65: Helper Function Tests
 *
 * These tests verify the behavior of helper functions that are used
 * internally across the codebase.
 */

import { describe, it, expect } from 'vitest';
import {
  getDocumentType,
  getMimeTypeFromExtension,
} from '../document-utils';
import {
  oAscFileType,
  c_oAscFileType2,
} from '../file-types';
import {
  getMimeType,
} from '../url-utils';

describe('Document Utils Helper Functions', () => {
  describe('getDocumentType', () => {
    it('should return "word" for document types', () => {
      const wordTypes = ['docx', 'doc', 'odt', 'rtf', 'txt'];
      for (const type of wordTypes) {
        expect(getDocumentType(type)).toBe('word');
      }
    });

    it('should return "cell" for spreadsheet types', () => {
      const cellTypes = ['xlsx', 'xls', 'ods', 'csv'];
      for (const type of cellTypes) {
        expect(getDocumentType(type)).toBe('cell');
      }
    });

    it('should return "slide" for presentation types', () => {
      const slideTypes = ['pptx', 'ppt', 'odp'];
      for (const type of slideTypes) {
        expect(getDocumentType(type)).toBe('slide');
      }
    });

    it('should return null for unsupported types', () => {
      const unsupportedTypes = ['pdf', 'png', 'jpg', 'xyz', ''];
      for (const type of unsupportedTypes) {
        expect(getDocumentType(type)).toBeNull();
      }
    });

    it('should handle case insensitivity', () => {
      expect(getDocumentType('DOCX')).toBe('word');
      expect(getDocumentType('XLSX')).toBe('cell');
      expect(getDocumentType('PPTX')).toBe('slide');
    });
  });

  describe('getMimeTypeFromExtension', () => {
    it('should return MIME types for image extensions', () => {
      expect(getMimeTypeFromExtension('.png')).toBe('image/png');
      expect(getMimeTypeFromExtension('.jpg')).toBe('image/jpeg');
      expect(getMimeTypeFromExtension('.jpeg')).toBe('image/jpeg');
      expect(getMimeTypeFromExtension('.gif')).toBe('image/gif');
    });

    it('should return MIME type from database for known extensions', () => {
      // The ranuts getMime utility has its own MIME database
      const mime = getMimeTypeFromExtension('.xyz');
      expect(typeof mime).toBe('string');
    });

    it('should handle extension with or without dot', () => {
      expect(getMimeTypeFromExtension('png')).toBe('image/png');
      expect(getMimeTypeFromExtension('.png')).toBe('image/png');
    });
  });
});

describe('File Types Constants', () => {
  describe('oAscFileType', () => {
    it('should have defined file type codes', () => {
      expect(oAscFileType.DOCX).toBeDefined();
      expect(oAscFileType.XLSX).toBeDefined();
      expect(oAscFileType.PPTX).toBeDefined();
      expect(oAscFileType.PDF).toBeDefined();
    });

    it('should have distinct codes for different types', () => {
      expect(oAscFileType.DOCX).not.toBe(oAscFileType.XLSX);
      expect(oAscFileType.XLSX).not.toBe(oAscFileType.PPTX);
      expect(oAscFileType.PPTX).not.toBe(oAscFileType.PDF);
    });

    it('should have expected numeric values', () => {
      // These are OnlyOffice SDK constants
      expect(typeof oAscFileType.DOCX).toBe('number');
      expect(typeof oAscFileType.XLSX).toBe('number');
      expect(typeof oAscFileType.PPTX).toBe('number');
    });

    it('should have image type codes', () => {
      expect(oAscFileType.PNG).toBeDefined();
      expect(oAscFileType.JPG).toBeDefined();
      expect(oAscFileType.GIF).toBeDefined();
    });
  });

  describe('c_oAscFileType2 reverse mapping', () => {
    it('should map numeric codes back to string names', () => {
      expect(c_oAscFileType2[oAscFileType.DOCX]).toBe('DOCX');
      expect(c_oAscFileType2[oAscFileType.XLSX]).toBe('XLSX');
      expect(c_oAscFileType2[oAscFileType.PPTX]).toBe('PPTX');
    });

    it('should have consistent bidirectional mapping', () => {
      const types = ['DOCX', 'XLSX', 'PPTX', 'PDF', 'CSV', 'TXT'];
      for (const type of types) {
        const code = oAscFileType[type as keyof typeof oAscFileType];
        const name = c_oAscFileType2[code];
        expect(name).toBe(type);
      }
    });
  });
});

describe('Extension Type Consistency', () => {
  it('should have consistent extension handling across modules', () => {
    // Extensions that are supported for editing
    const editableExtensions = ['docx', 'xlsx', 'pptx', 'doc', 'xls', 'ppt'];

    for (const ext of editableExtensions) {
      // Should have a document type
      const docType = getDocumentType(ext);
      expect(docType).not.toBeNull();
    }
  });

  it('should have consistent MIME type mappings', () => {
    // These extensions should have MIME types (not octet-stream)
    const extensionsWithMime = ['docx', 'xlsx', 'pptx', 'txt', 'csv'];

    for (const ext of extensionsWithMime) {
      const mime = getMimeType(ext);
      expect(mime).not.toBe('application/octet-stream');
    }
  });
});

describe('File Type Code Ranges', () => {
  it('should have document codes in expected range', () => {
    // Document type codes (60-100 range)
    expect(oAscFileType.DOCX).toBeGreaterThanOrEqual(60);
    expect(oAscFileType.DOCX).toBeLessThan(100);
    expect(oAscFileType.DOC).toBeGreaterThanOrEqual(60);
    expect(oAscFileType.DOC).toBeLessThan(100);
  });

  it('should have spreadsheet codes in expected range', () => {
    // Spreadsheet type codes (250-300 range)
    expect(oAscFileType.XLSX).toBeGreaterThanOrEqual(250);
    expect(oAscFileType.XLSX).toBeLessThan(300);
    expect(oAscFileType.XLS).toBeGreaterThanOrEqual(250);
    expect(oAscFileType.XLS).toBeLessThan(300);
  });

  it('should have presentation codes in expected range', () => {
    // Presentation type codes (120-150 range)
    expect(oAscFileType.PPTX).toBeGreaterThanOrEqual(120);
    expect(oAscFileType.PPTX).toBeLessThan(150);
    expect(oAscFileType.PPT).toBeGreaterThanOrEqual(120);
    expect(oAscFileType.PPT).toBeLessThan(150);
  });

  it('should have PDF in expected range', () => {
    // PDF codes (500+ range)
    expect(oAscFileType.PDF).toBeGreaterThanOrEqual(500);
  });
});

describe('Edge Cases and Error Handling', () => {
  it('should handle unknown file type codes', () => {
    // c_oAscFileType2 should return undefined for unknown codes
    expect(c_oAscFileType2[999999]).toBeUndefined();
  });

  it('should handle empty extension', () => {
    expect(getDocumentType('')).toBeNull();
  });
});