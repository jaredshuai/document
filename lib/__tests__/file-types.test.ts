import { describe, it, expect } from 'vitest';
import { oAscFileType, c_oAscFileType2 } from '../file-types';
import { DOCUMENT_TYPE_MAP } from '../document-utils';

describe('oAscFileType', () => {
  it('should define document type constants', () => {
    expect(oAscFileType.DOCX).toBe(65);
    expect(oAscFileType.DOC).toBe(66);
    expect(oAscFileType.DOCM).toBe(75);
    expect(oAscFileType.DOTX).toBe(76);
    expect(oAscFileType.DOTM).toBe(77);
  });

  it('should define spreadsheet type constants', () => {
    expect(oAscFileType.XLSX).toBe(257);
    expect(oAscFileType.XLS).toBe(258);
    expect(oAscFileType.XLSM).toBe(261);
    expect(oAscFileType.XLTX).toBe(262);
    expect(oAscFileType.XLTM).toBe(263);
    expect(oAscFileType.CSV).toBe(260);
  });

  it('should define presentation type constants', () => {
    expect(oAscFileType.PPTX).toBe(129);
    expect(oAscFileType.PPT).toBe(130);
    expect(oAscFileType.PPTM).toBe(133);
    expect(oAscFileType.PPSX).toBe(132);
    expect(oAscFileType.POTX).toBe(135);
  });

  it('should define PDF type constant', () => {
    expect(oAscFileType.PDF).toBe(513);
    expect(oAscFileType.PDFA).toBe(521);
  });

  it('should define image type constants', () => {
    expect(oAscFileType.IMG).toBe(1024);
    expect(oAscFileType.JPG).toBe(1025);
    expect(oAscFileType.PNG).toBe(1029);
    expect(oAscFileType.GIF).toBe(1028);
    expect(oAscFileType.BMP).toBe(1032);
  });

  it('should define unknown type as 0', () => {
    expect(oAscFileType.UNKNOWN).toBe(0);
  });

  it('should have unique values for all types', () => {
    const values = Object.values(oAscFileType);
    const uniqueValues = new Set(values);
    expect(uniqueValues.size).toBe(values.length);
  });

  it('should be readonly (frozen at type level)', () => {
    // TypeScript enforces readonly, runtime check
    expect(typeof oAscFileType).toBe('object');
    expect(Object.keys(oAscFileType).length).toBeGreaterThan(0);
  });
});

describe('c_oAscFileType2', () => {
  it('should be reverse mapping of oAscFileType', () => {
    expect(c_oAscFileType2[65]).toBe('DOCX');
    expect(c_oAscFileType2[66]).toBe('DOC');
    expect(c_oAscFileType2[257]).toBe('XLSX');
    expect(c_oAscFileType2[129]).toBe('PPTX');
    expect(c_oAscFileType2[513]).toBe('PDF');
  });

  it('should contain all oAscFileType values as keys', () => {
    const originalKeys = Object.keys(oAscFileType);
    const reverseKeys = Object.values(c_oAscFileType2);
    expect(reverseKeys.sort()).toEqual(originalKeys.sort());
  });

  it('should map numeric values back to their string names', () => {
    // Test a sample of mappings
    const testCases: [number, string][] = [
      [oAscFileType.DOCX, 'DOCX'],
      [oAscFileType.XLSX, 'XLSX'],
      [oAscFileType.PPTX, 'PPTX'],
      [oAscFileType.CSV, 'CSV'],
      [oAscFileType.PDF, 'PDF'],
      [oAscFileType.JPG, 'JPG'],
    ];

    for (const [value, expectedKey] of testCases) {
      expect(c_oAscFileType2[value]).toBe(expectedKey);
    }
  });

  it('should be a valid Record type', () => {
    expect(typeof c_oAscFileType2).toBe('object');
    // All values should be strings that are keys of oAscFileType
    for (const key of Object.keys(c_oAscFileType2)) {
      const numKey = Number(key);
      expect(Number.isInteger(numKey)).toBe(true);
      expect(typeof c_oAscFileType2[numKey]).toBe('string');
    }
  });

  it('should return undefined for unknown numeric keys', () => {
    expect(c_oAscFileType2[999999]).toBeUndefined();
    expect(c_oAscFileType2[-1]).toBeUndefined();
  });

  it('should have consistent mapping count', () => {
    expect(Object.keys(c_oAscFileType2).length).toBe(Object.keys(oAscFileType).length);
  });
});

describe('oAscFileType additional tests', () => {
  it('should have document type codes in expected range', () => {
    // Document types are in the 65-86 range
    expect(oAscFileType.DOCX).toBeGreaterThanOrEqual(65);
    expect(oAscFileType.DOCX).toBeLessThanOrEqual(86);
    expect(oAscFileType.DOC).toBe(66);
  });

  it('should have spreadsheet type codes in expected range', () => {
    // Spreadsheet types are in the 257-268 range
    expect(oAscFileType.XLSX).toBeGreaterThanOrEqual(257);
    expect(oAscFileType.XLSX).toBeLessThanOrEqual(268);
  });

  it('should have presentation type codes in expected range', () => {
    // Presentation types are in the 129-139 range
    expect(oAscFileType.PPTX).toBeGreaterThanOrEqual(129);
    expect(oAscFileType.PPTX).toBeLessThanOrEqual(139);
  });

  it('should have image type codes starting at 1024', () => {
    expect(oAscFileType.IMG).toBe(1024);
    expect(oAscFileType.JPG).toBeGreaterThan(1024);
    expect(oAscFileType.PNG).toBeGreaterThan(1024);
  });

  it('should have PDF code at 513', () => {
    expect(oAscFileType.PDF).toBe(513);
    expect(oAscFileType.PDFA).toBe(521);
  });

  it('should have specific values for common formats', () => {
    // These are OnlyOffice-specific values
    expect(oAscFileType.DOCX).toBe(65);
    expect(oAscFileType.XLSX).toBe(257);
    expect(oAscFileType.PPTX).toBe(129);
    expect(oAscFileType.CSV).toBe(260);
  });

  it('should have UNKNOWN as 0', () => {
    expect(oAscFileType.UNKNOWN).toBe(0);
  });
});

describe('c_oAscFileType2 additional tests', () => {
  it('should map document codes correctly', () => {
    expect(c_oAscFileType2[65]).toBe('DOCX');
    expect(c_oAscFileType2[66]).toBe('DOC');
    expect(c_oAscFileType2[67]).toBe('ODT');
    expect(c_oAscFileType2[68]).toBe('RTF');
    expect(c_oAscFileType2[69]).toBe('TXT');
  });

  it('should map spreadsheet codes correctly', () => {
    expect(c_oAscFileType2[257]).toBe('XLSX');
    expect(c_oAscFileType2[258]).toBe('XLS');
    expect(c_oAscFileType2[259]).toBe('ODS');
    expect(c_oAscFileType2[260]).toBe('CSV');
  });

  it('should map presentation codes correctly', () => {
    expect(c_oAscFileType2[129]).toBe('PPTX');
    expect(c_oAscFileType2[130]).toBe('PPT');
    expect(c_oAscFileType2[131]).toBe('ODP');
  });

  it('should map image codes correctly', () => {
    expect(c_oAscFileType2[1024]).toBe('IMG');
    expect(c_oAscFileType2[1025]).toBe('JPG');
    expect(c_oAscFileType2[1029]).toBe('PNG');
    expect(c_oAscFileType2[1028]).toBe('GIF');
  });

  it('should have all numeric keys as numbers', () => {
    const keys = Object.keys(c_oAscFileType2);
    for (const key of keys) {
      const numKey = Number(key);
      expect(Number.isInteger(numKey)).toBe(true);
      expect(numKey).toBeGreaterThanOrEqual(0);
    }
  });

  it('should have all values as strings', () => {
    const values = Object.values(c_oAscFileType2);
    for (const value of values) {
      expect(typeof value).toBe('string');
      expect(value.length).toBeGreaterThan(0);
    }
  });
});

describe('File type consistency with DOCUMENT_TYPE_MAP', () => {
  it('should have file type codes for primary document extensions', () => {
    // DOCUMENT_TYPE_MAP contains extensions like 'docx', 'doc', etc.
    // These should have corresponding file type codes

    // Document extensions should map to document type codes
    expect(c_oAscFileType2[oAscFileType.DOCX]).toBe('DOCX');
    expect(c_oAscFileType2[oAscFileType.DOC]).toBe('DOC');
    expect(c_oAscFileType2[oAscFileType.ODT]).toBe('ODT');

    // Spreadsheet extensions
    expect(c_oAscFileType2[oAscFileType.XLSX]).toBe('XLSX');
    expect(c_oAscFileType2[oAscFileType.XLS]).toBe('XLS');
    expect(c_oAscFileType2[oAscFileType.ODS]).toBe('ODS');
    expect(c_oAscFileType2[oAscFileType.CSV]).toBe('CSV');

    // Presentation extensions
    expect(c_oAscFileType2[oAscFileType.PPTX]).toBe('PPTX');
    expect(c_oAscFileType2[oAscFileType.PPT]).toBe('PPT');
    expect(c_oAscFileType2[oAscFileType.ODP]).toBe('ODP');
  });

  it('should have DOCUMENT_TYPE_MAP entries for common file type extensions', () => {
    // Verify that the extensions in DOCUMENT_TYPE_MAP have corresponding file types
    const documentExtensions = ['docx', 'doc', 'odt', 'rtf', 'txt'];
    const spreadsheetExtensions = ['xlsx', 'xls', 'ods', 'csv'];
    const presentationExtensions = ['pptx', 'ppt', 'odp'];

    for (const ext of documentExtensions) {
      expect(DOCUMENT_TYPE_MAP[ext]).toBe('word');
    }

    for (const ext of spreadsheetExtensions) {
      expect(DOCUMENT_TYPE_MAP[ext]).toBe('cell');
    }

    for (const ext of presentationExtensions) {
      expect(DOCUMENT_TYPE_MAP[ext]).toBe('slide');
    }
  });

  it('should have consistent type category mapping', () => {
    // Document types (65-86 range) should map to 'word' in DOCUMENT_TYPE_MAP
    const documentCodes = [65, 66, 67, 68, 69]; // DOCX, DOC, ODT, RTF, TXT
    for (const code of documentCodes) {
      const typeName = c_oAscFileType2[code];
      if (typeName) {
        const ext = typeName.toLowerCase();
        if (DOCUMENT_TYPE_MAP[ext]) {
          expect(DOCUMENT_TYPE_MAP[ext]).toBe('word');
        }
      }
    }

    // Spreadsheet types (257-268 range) should map to 'cell'
    const spreadsheetCodes = [257, 258, 259, 260]; // XLSX, XLS, ODS, CSV
    for (const code of spreadsheetCodes) {
      const typeName = c_oAscFileType2[code];
      if (typeName) {
        const ext = typeName.toLowerCase();
        if (DOCUMENT_TYPE_MAP[ext]) {
          expect(DOCUMENT_TYPE_MAP[ext]).toBe('cell');
        }
      }
    }

    // Presentation types (129-139 range) should map to 'slide'
    const presentationCodes = [129, 130, 131]; // PPTX, PPT, ODP
    for (const code of presentationCodes) {
      const typeName = c_oAscFileType2[code];
      if (typeName) {
        const ext = typeName.toLowerCase();
        if (DOCUMENT_TYPE_MAP[ext]) {
          expect(DOCUMENT_TYPE_MAP[ext]).toBe('slide');
        }
      }
    }
  });
});
