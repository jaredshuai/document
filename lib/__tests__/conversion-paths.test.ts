import { describe, expect, it } from 'vitest';
import {
  WORKING_DIR,
  MEDIA_DIR,
  FONTS_DIR,
  THEMES_DIR,
  WORKING_DIRS,
  createConversionPaths,
  getParamsPath,
  getBinPath,
  getWorkingPath,
  extractFileName,
  createOutputFileName,
} from '../conversion-paths';

describe('conversion-paths', () => {
  describe('constants', () => {
    it('should define correct working directory', () => {
      expect(WORKING_DIR).toBe('/working');
    });

    it('should define correct media directory', () => {
      expect(MEDIA_DIR).toBe('/working/media');
    });

    it('should define correct fonts directory', () => {
      expect(FONTS_DIR).toBe('/working/fonts');
    });

    it('should define correct themes directory', () => {
      expect(THEMES_DIR).toBe('/working/themes');
    });

    it('should have all working directories in array', () => {
      expect(WORKING_DIRS).toEqual(['/working', '/working/media', '/working/fonts', '/working/themes']);
      expect(WORKING_DIRS).toHaveLength(4);
    });
  });

  describe('createConversionPaths', () => {
    it('should create default paths with bin extension', () => {
      const result = createConversionPaths('document.docx');
      expect(result.inputPath).toBe('/working/document.docx');
      expect(result.outputPath).toBe('/working/document.docx.bin');
    });

    it('should create paths with custom extension', () => {
      const result = createConversionPaths('document.bin', 'xlsx');
      expect(result.inputPath).toBe('/working/document.bin');
      expect(result.outputPath).toBe('/working/document.bin.xlsx');
    });

    it('should create paths with PDF extension', () => {
      const result = createConversionPaths('presentation.bin', 'PDF');
      expect(result.inputPath).toBe('/working/presentation.bin');
      expect(result.outputPath).toBe('/working/presentation.bin.PDF');
    });

    it('should handle file names with spaces', () => {
      const result = createConversionPaths('my document.docx');
      expect(result.inputPath).toBe('/working/my document.docx');
      expect(result.outputPath).toBe('/working/my document.docx.bin');
    });

    it('should handle file names with multiple dots', () => {
      const result = createConversionPaths('my.file.name.docx');
      expect(result.inputPath).toBe('/working/my.file.name.docx');
      expect(result.outputPath).toBe('/working/my.file.name.docx.bin');
    });

    it('should handle empty target extension as default', () => {
      const result = createConversionPaths('file.txt', '');
      expect(result.outputPath).toBe('/working/file.txt.bin');
    });

    it('should handle special characters in file name', () => {
      const result = createConversionPaths('file_test-123.xlsx');
      expect(result.inputPath).toBe('/working/file_test-123.xlsx');
      expect(result.outputPath).toBe('/working/file_test-123.xlsx.bin');
    });
  });

  describe('getParamsPath', () => {
    it('should return correct params.xml path', () => {
      expect(getParamsPath()).toBe('/working/params.xml');
    });
  });

  describe('getBinPath', () => {
    it('should append .bin to input path', () => {
      expect(getBinPath('/working/document.docx')).toBe('/working/document.docx.bin');
    });

    it('should handle paths without extension', () => {
      expect(getBinPath('/working/document')).toBe('/working/document.bin');
    });

    it('should handle paths already with .bin', () => {
      expect(getBinPath('/working/file.bin')).toBe('/working/file.bin.bin');
    });
  });

  describe('getWorkingPath', () => {
    it('should prepend working directory to file name', () => {
      expect(getWorkingPath('document.docx')).toBe('/working/document.docx');
    });

    it('should handle file names with spaces', () => {
      expect(getWorkingPath('my document.xlsx')).toBe('/working/my document.xlsx');
    });

    it('should handle empty file name', () => {
      expect(getWorkingPath('')).toBe('/working/');
    });
  });

  describe('extractFileName', () => {
    it('should extract file name from working directory path', () => {
      expect(extractFileName('/working/document.docx')).toBe('document.docx');
    });

    it('should extract file name from bin path', () => {
      expect(extractFileName('/working/document.docx.bin')).toBe('document.docx.bin');
    });

    it('should handle paths without working prefix', () => {
      expect(extractFileName('/other/path/file.txt')).toBe('file.txt');
    });

    it('should handle simple file names', () => {
      expect(extractFileName('file.txt')).toBe('file.txt');
    });

    it('should handle nested paths', () => {
      expect(extractFileName('/working/media/image.png')).toBe('media/image.png');
    });

    it('should handle path ending with slash', () => {
      expect(extractFileName('/path/')).toBe('/path/');
    });

    it('should handle root path', () => {
      expect(extractFileName('/')).toBe('/');
    });
  });

  describe('createOutputFileName', () => {
    it('should create output file name with extension', () => {
      expect(createOutputFileName('document', 'docx')).toBe('document.docx');
    });

    it('should normalize extension with leading dot', () => {
      expect(createOutputFileName('document', '.docx')).toBe('document.docx');
    });

    it('should handle uppercase extension', () => {
      expect(createOutputFileName('document', 'DOCX')).toBe('document.docx');
    });

    it('should handle CSV extension', () => {
      expect(createOutputFileName('data', 'csv')).toBe('data.csv');
    });

    it('should handle PDF extension', () => {
      expect(createOutputFileName('document', 'PDF')).toBe('document.pdf');
    });

    it('should handle base names with existing extensions', () => {
      // Base name without extension should just add new extension
      expect(createOutputFileName('document.docx', 'pdf')).toBe('document.docx.pdf');
    });

    it('should handle empty base name', () => {
      expect(createOutputFileName('', 'docx')).toBe('.docx');
    });
  });
});
