/**
 * Additional edge case tests for format detection and validation.
 */
import { describe, expect, it } from 'vitest';
import { oAscFileType, c_oAscFileType2 } from '../file-types';
import {
  getFileExtension,
  getMimeType,
  isSupportedExtension,
  extractFileType,
} from '../url-utils';
import { getDocumentType } from '../document-utils';
import { requiresConversion, getConversionTarget, isEditableFileType } from '../editor-config';
import {
  determineSaveFormat,
  getSaveFormatOverride,
  hasFileExtension,
} from '../save-format';
import {
  isNewDocumentSupported,
  getNewDocumentTemplate,
} from '../document-template';

// =============================================================================
// FORMAT DETECTION EDGE CASES
// =============================================================================

describe('Format Detection: Edge Cases', () => {
  describe('Extension case handling', () => {
    it('should handle uppercase extensions', () => {
      expect(getFileExtension('document.DOCX')).toBe('docx');
      expect(getFileExtension('spreadsheet.XLSX')).toBe('xlsx');
      expect(getFileExtension('presentation.PPTX')).toBe('pptx');
    });

    it('should handle mixed case extensions', () => {
      expect(getFileExtension('document.DoCx')).toBe('docx');
      expect(getFileExtension('spreadsheet.XlSx')).toBe('xlsx');
    });

    it('should handle multiple dots in filename', () => {
      expect(getFileExtension('my.document.final.docx')).toBe('docx');
      expect(getFileExtension('report.2024.03.xlsx')).toBe('xlsx');
      expect(getFileExtension('..docx')).toBe('docx');
    });

    it('should handle no extension', () => {
      expect(getFileExtension('document')).toBe('');
      expect(getFileExtension('.')).toBe('');
      expect(getFileExtension('')).toBe('');
    });
  });

  describe('MIME type detection', () => {
    it('should return correct MIME for all document types', () => {
      const docMimes = {
        docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        doc: 'application/msword',
        odt: 'application/vnd.oasis.opendocument.text',
        rtf: 'application/rtf',
        txt: 'text/plain',
        pdf: 'application/pdf',
      };

      for (const [ext, expectedMime] of Object.entries(docMimes)) {
        expect(getMimeType(ext)).toBe(expectedMime);
      }
    });

    it('should return correct MIME for all spreadsheet types', () => {
      const sheetMimes = {
        xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        xls: 'application/vnd.ms-excel',
        ods: 'application/vnd.oasis.opendocument.spreadsheet',
        csv: 'text/csv',
      };

      for (const [ext, expectedMime] of Object.entries(sheetMimes)) {
        expect(getMimeType(ext)).toBe(expectedMime);
      }
    });

    it('should return correct MIME for all presentation types', () => {
      const presMimes = {
        pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        ppt: 'application/vnd.ms-powerpoint',
        odp: 'application/vnd.oasis.opendocument.presentation',
      };

      for (const [ext, expectedMime] of Object.entries(presMimes)) {
        expect(getMimeType(ext)).toBe(expectedMime);
      }
    });

    it('should return octet-stream for unknown extensions', () => {
      expect(getMimeType('xyz')).toBe('application/octet-stream');
      expect(getMimeType('unknown')).toBe('application/octet-stream');
      expect(getMimeType('')).toBe('application/octet-stream');
    });
  });

  describe('Extension support validation', () => {
    it('should recognize all OOXML formats as supported', () => {
      expect(isSupportedExtension('docx')).toBe(true);
      expect(isSupportedExtension('xlsx')).toBe(true);
      expect(isSupportedExtension('pptx')).toBe(true);
    });

    it('should recognize legacy formats as supported', () => {
      expect(isSupportedExtension('doc')).toBe(true);
      expect(isSupportedExtension('xls')).toBe(true);
      expect(isSupportedExtension('ppt')).toBe(true);
    });

    it('should recognize ODF formats as supported', () => {
      expect(isSupportedExtension('odt')).toBe(true);
      expect(isSupportedExtension('ods')).toBe(true);
      expect(isSupportedExtension('odp')).toBe(true);
    });

    it('should handle unsupported extensions', () => {
      expect(isSupportedExtension('xyz')).toBe(false);
      expect(isSupportedExtension('exe')).toBe(false);
      expect(isSupportedExtension('')).toBe(false);
    });
  });
});

// =============================================================================
// CONVERSION REQUIREMENTS
// =============================================================================

describe('Conversion Requirements: Edge Cases', () => {
  describe('Direct edit formats', () => {
    it('should not require conversion for OOXML formats', () => {
      expect(requiresConversion('docx')).toBe(false);
      expect(requiresConversion('xlsx')).toBe(false);
      expect(requiresConversion('pptx')).toBe(false);
    });

    it('should not require conversion for PDF (view-only)', () => {
      expect(requiresConversion('pdf')).toBe(false);
    });
  });

  describe('Conversion required formats', () => {
    it('should require conversion for legacy formats', () => {
      expect(requiresConversion('doc')).toBe(true);
      expect(requiresConversion('xls')).toBe(true);
      expect(requiresConversion('ppt')).toBe(true);
    });

    it('should require conversion for ODF formats', () => {
      expect(requiresConversion('odt')).toBe(true);
      expect(requiresConversion('ods')).toBe(true);
      expect(requiresConversion('odp')).toBe(true);
    });

    it('should require conversion for other formats', () => {
      expect(requiresConversion('rtf')).toBe(true);
      expect(requiresConversion('txt')).toBe(true);
      expect(requiresConversion('csv')).toBe(true);
    });
  });

  describe('Conversion targets', () => {
    it('should target DOCX for document formats', () => {
      expect(getConversionTarget('doc')).toBe('docx');
      expect(getConversionTarget('odt')).toBe('docx');
      expect(getConversionTarget('rtf')).toBe('docx');
      expect(getConversionTarget('txt')).toBe('docx');
    });

    it('should target XLSX for spreadsheet formats', () => {
      expect(getConversionTarget('xls')).toBe('xlsx');
      expect(getConversionTarget('ods')).toBe('xlsx');
      expect(getConversionTarget('csv')).toBe('xlsx');
    });

    it('should target PPTX for presentation formats', () => {
      expect(getConversionTarget('ppt')).toBe('pptx');
      expect(getConversionTarget('odp')).toBe('pptx');
    });

    it('should return undefined for direct-edit formats', () => {
      expect(getConversionTarget('docx')).toBeUndefined();
      expect(getConversionTarget('xlsx')).toBeUndefined();
      expect(getConversionTarget('pptx')).toBeUndefined();
      expect(getConversionTarget('pdf')).toBeUndefined();
    });
  });
});

// =============================================================================
// EDITABLE FILE TYPES
// =============================================================================

describe('Editable File Types: Edge Cases', () => {
  it('should recognize OOXML formats as editable', () => {
    expect(isEditableFileType('docx')).toBe(true);
    expect(isEditableFileType('xlsx')).toBe(true);
    expect(isEditableFileType('pptx')).toBe(true);
  });

  it('should recognize legacy formats as editable', () => {
    expect(isEditableFileType('doc')).toBe(true);
    expect(isEditableFileType('xls')).toBe(true);
    expect(isEditableFileType('ppt')).toBe(true);
  });

  it('should recognize ODF formats as editable', () => {
    expect(isEditableFileType('odt')).toBe(true);
    expect(isEditableFileType('ods')).toBe(true);
    expect(isEditableFileType('odp')).toBe(true);
  });

  it('should recognize other supported formats as editable', () => {
    expect(isEditableFileType('rtf')).toBe(true);
    expect(isEditableFileType('txt')).toBe(true);
    expect(isEditableFileType('csv')).toBe(true);
    expect(isEditableFileType('pdf')).toBe(true);
  });

  it('should not recognize unsupported formats as editable', () => {
    expect(isEditableFileType('xyz')).toBe(false);
    expect(isEditableFileType('exe')).toBe(false);
  });

  it('should handle case insensitivity', () => {
    expect(isEditableFileType('DOCX')).toBe(true);
    expect(isEditableFileType('XLSX')).toBe(true);
    expect(isEditableFileType('PPTX')).toBe(true);
  });
});

// =============================================================================
// NEW DOCUMENT SUPPORT
// =============================================================================

describe('New Document Support: Edge Cases', () => {
  it('should support creating new OOXML documents', () => {
    expect(isNewDocumentSupported('docx')).toBe(true);
    expect(isNewDocumentSupported('xlsx')).toBe(true);
    expect(isNewDocumentSupported('pptx')).toBe(true);
  });

  it('should not support creating new legacy format documents', () => {
    expect(isNewDocumentSupported('doc')).toBe(false);
    expect(isNewDocumentSupported('xls')).toBe(false);
    expect(isNewDocumentSupported('ppt')).toBe(false);
  });

  it('should not support creating new ODF documents', () => {
    expect(isNewDocumentSupported('odt')).toBe(false);
    expect(isNewDocumentSupported('ods')).toBe(false);
    expect(isNewDocumentSupported('odp')).toBe(false);
  });

  it('should not support creating new other format documents', () => {
    expect(isNewDocumentSupported('pdf')).toBe(false);
    expect(isNewDocumentSupported('txt')).toBe(false);
    expect(isNewDocumentSupported('csv')).toBe(false);
  });

  it('should return templates for supported types', () => {
    expect(getNewDocumentTemplate('docx')).toBeDefined();
    expect(getNewDocumentTemplate('xlsx')).toBeDefined();
    expect(getNewDocumentTemplate('pptx')).toBeDefined();
  });

  it('should return undefined for unsupported types', () => {
    expect(getNewDocumentTemplate('pdf')).toBeUndefined();
    expect(getNewDocumentTemplate('doc')).toBeUndefined();
    expect(getNewDocumentTemplate('xyz')).toBeUndefined();
  });
});

// =============================================================================
// SAVE FORMAT DETERMINATION
// =============================================================================

describe('Save Format: Edge Cases', () => {
  describe('hasFileExtension', () => {
    it('should detect extension correctly', () => {
      expect(hasFileExtension('document.docx', 'docx')).toBe(true);
      expect(hasFileExtension('document.docx', '.docx')).toBe(true);
      expect(hasFileExtension('document.DOCX', 'docx')).toBe(true);
    });

    it('should handle edge cases', () => {
      expect(hasFileExtension('document', 'docx')).toBe(false);
      expect(hasFileExtension('document.docx', 'xlsx')).toBe(false);
      expect(hasFileExtension('', 'docx')).toBe(false);
    });
  });

  describe('getSaveFormatOverride', () => {
    it('should return CSV for CSV files', () => {
      expect(getSaveFormatOverride('data.csv')).toBe('CSV');
      expect(getSaveFormatOverride('report.CSV')).toBe('CSV');
    });

    it('should return null for non-CSV files', () => {
      expect(getSaveFormatOverride('document.docx')).toBeNull();
      expect(getSaveFormatOverride('spreadsheet.xlsx')).toBeNull();
      expect(getSaveFormatOverride(undefined)).toBeNull();
    });
  });

  describe('determineSaveFormat', () => {
    it('should return correct format for file type codes', () => {
      expect(determineSaveFormat(oAscFileType.DOCX, 'doc.docx').toLowerCase()).toBe('docx');
      expect(determineSaveFormat(oAscFileType.XLSX, 'doc.xlsx').toLowerCase()).toBe('xlsx');
      expect(determineSaveFormat(oAscFileType.PPTX, 'doc.pptx').toLowerCase()).toBe('pptx');
    });

    it('should apply CSV override', () => {
      expect(determineSaveFormat(oAscFileType.XLSX, 'data.csv').toLowerCase()).toBe('csv');
    });
  });
});

// =============================================================================
// DOCUMENT TYPE MAPPING
// =============================================================================

describe('Document Type Mapping: Edge Cases', () => {
  it('should map OOXML formats correctly', () => {
    expect(getDocumentType('docx')).toBe('word');
    expect(getDocumentType('xlsx')).toBe('cell');
    expect(getDocumentType('pptx')).toBe('slide');
  });

  it('should map legacy formats correctly', () => {
    expect(getDocumentType('doc')).toBe('word');
    expect(getDocumentType('xls')).toBe('cell');
    expect(getDocumentType('ppt')).toBe('slide');
  });

  it('should map ODF formats correctly', () => {
    expect(getDocumentType('odt')).toBe('word');
    expect(getDocumentType('ods')).toBe('cell');
    expect(getDocumentType('odp')).toBe('slide');
  });

  it('should map other formats correctly', () => {
    expect(getDocumentType('rtf')).toBe('word');
    expect(getDocumentType('txt')).toBe('word');
    expect(getDocumentType('csv')).toBe('cell');
    // PDF is not in the type map, returns null
    expect(getDocumentType('pdf')).toBeNull();
  });

  it('should handle unknown formats', () => {
    expect(getDocumentType('xyz')).toBeNull();
    expect(getDocumentType('')).toBeNull();
  });
});

// =============================================================================
// FILE TYPE CODES
// =============================================================================

describe('File Type Codes: Consistency', () => {
  it('should have consistent mapping in c_oAscFileType2', () => {
    expect(c_oAscFileType2[oAscFileType.DOCX]).toBe('DOCX');
    expect(c_oAscFileType2[oAscFileType.XLSX]).toBe('XLSX');
    expect(c_oAscFileType2[oAscFileType.PPTX]).toBe('PPTX');
    expect(c_oAscFileType2[oAscFileType.PDF]).toBe('PDF');
    expect(c_oAscFileType2[oAscFileType.CSV]).toBe('CSV');
  });

  it('should have valid codes for all primary formats', () => {
    expect(oAscFileType.DOCX).toBeGreaterThan(0);
    expect(oAscFileType.XLSX).toBeGreaterThan(0);
    expect(oAscFileType.PPTX).toBeGreaterThan(0);
    expect(oAscFileType.PDF).toBeGreaterThan(0);
    expect(oAscFileType.CSV).toBeGreaterThan(0);
  });
});

// =============================================================================
// EXTRACT FILE TYPE FROM MIME
// =============================================================================

describe('Extract File Type: Edge Cases', () => {
  it('should extract extension from MIME type', () => {
    expect(extractFileType('application/vnd.openxmlformats-officedocument.wordprocessingml.document')).toBe('docx');
    expect(extractFileType('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')).toBe('xlsx');
    expect(extractFileType('application/vnd.openxmlformats-officedocument.presentationml.presentation')).toBe('pptx');
  });

  it('should fallback to filename extension for unknown MIME', () => {
    expect(extractFileType('application/octet-stream', 'document.xyz')).toBe('xyz');
    expect(extractFileType('unknown/type', 'file.custom')).toBe('custom');
  });

  it('should handle missing parameters', () => {
    // Returns empty string when no extension can be determined
    expect(extractFileType('application/octet-stream')).toBe('');
    expect(extractFileType(undefined, 'document.docx')).toBe('docx');
    expect(extractFileType()).toBe('');
  });
});
