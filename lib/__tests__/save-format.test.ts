import { describe, expect, it } from 'vitest';
import {
  determineSaveFormat,
  getSaveFormatOverride,
  hasFileExtension,
} from '../save-format';
import { oAscFileType } from '../file-types';

describe('save-format', () => {
  describe('getSaveFormatOverride', () => {
    it('should return null when originalFileName is undefined', () => {
      expect(getSaveFormatOverride(undefined)).toBeNull();
    });

    it('should return null when originalFileName is empty', () => {
      expect(getSaveFormatOverride('')).toBeNull();
    });

    it('should return CSV for CSV files regardless of current format', () => {
      expect(getSaveFormatOverride('report.csv')).toBe('CSV');
      expect(getSaveFormatOverride('DATA.CSV')).toBe('CSV');
      expect(getSaveFormatOverride('path/to/file.csv')).toBe('CSV');
    });

    it('should return null for non-CSV files', () => {
      expect(getSaveFormatOverride('report.xlsx')).toBeNull();
      expect(getSaveFormatOverride('document.docx')).toBeNull();
      expect(getSaveFormatOverride('presentation.pptx')).toBeNull();
    });
  });

  describe('determineSaveFormat', () => {
    it('should return format from output format code for standard files', () => {
      // oAscFileType.DOCX = 65, maps to 'DOCX'
      const result = determineSaveFormat(oAscFileType.DOCX);
      expect(result).toBe('DOCX');
    });

    it('should return format from output format code for spreadsheets', () => {
      // oAscFileType.XLSX = 257, maps to 'XLSX'
      const result = determineSaveFormat(oAscFileType.XLSX);
      expect(result).toBe('XLSX');
    });

    it('should return format from output format code for presentations', () => {
      // oAscFileType.PPTX = 129, maps to 'PPTX'
      const result = determineSaveFormat(oAscFileType.PPTX);
      expect(result).toBe('PPTX');
    });

    it('should override to CSV when original file is CSV', () => {
      // Even if editor returns XLSX format code, CSV should be forced
      const result = determineSaveFormat(oAscFileType.XLSX, 'data.csv');
      expect(result).toBe('CSV');
    });

    it('should not override format for non-CSV files', () => {
      const result = determineSaveFormat(oAscFileType.XLSX, 'report.xlsx');
      expect(result).toBe('XLSX');
    });

    it('should handle case-insensitive CSV extension', () => {
      expect(determineSaveFormat(oAscFileType.XLSX, 'DATA.CSV')).toBe('CSV');
      expect(determineSaveFormat(oAscFileType.XLSX, 'Data.Csv')).toBe('CSV');
    });

    it('should handle CSV files with paths', () => {
      expect(determineSaveFormat(oAscFileType.XLSX, '/path/to/data.csv')).toBe('CSV');
      expect(determineSaveFormat(oAscFileType.XLSX, 'C:\\Users\\Documents\\data.csv')).toBe('CSV');
    });
  });

  describe('hasFileExtension', () => {
    it('should return true for matching extension with dot', () => {
      expect(hasFileExtension('document.docx', '.docx')).toBe(true);
      expect(hasFileExtension('spreadsheet.xlsx', '.xlsx')).toBe(true);
      expect(hasFileExtension('presentation.pptx', '.pptx')).toBe(true);
    });

    it('should return true for matching extension without dot', () => {
      expect(hasFileExtension('document.docx', 'docx')).toBe(true);
      expect(hasFileExtension('spreadsheet.xlsx', 'xlsx')).toBe(true);
      expect(hasFileExtension('presentation.pptx', 'pptx')).toBe(true);
    });

    it('should be case-insensitive', () => {
      expect(hasFileExtension('DOCUMENT.DOCX', 'docx')).toBe(true);
      expect(hasFileExtension('document.docx', 'DOCX')).toBe(true);
      expect(hasFileExtension('Document.Docx', 'docx')).toBe(true);
    });

    it('should return false for non-matching extension', () => {
      expect(hasFileExtension('document.docx', 'xlsx')).toBe(false);
      expect(hasFileExtension('spreadsheet.xlsx', 'docx')).toBe(false);
    });

    it('should handle files with multiple dots', () => {
      expect(hasFileExtension('my.document.file.docx', 'docx')).toBe(true);
      expect(hasFileExtension('report.final.v2.xlsx', 'xlsx')).toBe(true);
    });

    it('should handle CSV extension', () => {
      expect(hasFileExtension('data.csv', 'csv')).toBe(true);
      expect(hasFileExtension('data.csv', '.csv')).toBe(true);
      expect(hasFileExtension('DATA.CSV', 'csv')).toBe(true);
    });

    it('should return false for file without extension', () => {
      expect(hasFileExtension('README', 'md')).toBe(false);
      expect(hasFileExtension('Makefile', 'txt')).toBe(false);
    });

    it('should return false for empty filename', () => {
      expect(hasFileExtension('', 'docx')).toBe(false);
    });
  });

  describe('integration with file-types', () => {
    it('should correctly map all primary document format codes', () => {
      expect(determineSaveFormat(oAscFileType.DOCX)).toBe('DOCX');
      expect(determineSaveFormat(oAscFileType.DOC)).toBe('DOC');
      expect(determineSaveFormat(oAscFileType.ODT)).toBe('ODT');
      expect(determineSaveFormat(oAscFileType.RTF)).toBe('RTF');
      expect(determineSaveFormat(oAscFileType.TXT)).toBe('TXT');
      expect(determineSaveFormat(oAscFileType.PDF)).toBe('PDF');
    });

    it('should correctly map all primary spreadsheet format codes', () => {
      expect(determineSaveFormat(oAscFileType.XLSX)).toBe('XLSX');
      expect(determineSaveFormat(oAscFileType.XLS)).toBe('XLS');
      expect(determineSaveFormat(oAscFileType.ODS)).toBe('ODS');
      expect(determineSaveFormat(oAscFileType.CSV)).toBe('CSV');
    });

    it('should correctly map all primary presentation format codes', () => {
      expect(determineSaveFormat(oAscFileType.PPTX)).toBe('PPTX');
      expect(determineSaveFormat(oAscFileType.PPT)).toBe('PPT');
      expect(determineSaveFormat(oAscFileType.ODP)).toBe('ODP');
    });
  });
});