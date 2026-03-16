import { describe, it, expect } from 'vitest';
import {
  createFilePickerType,
  createSavePickerOptions,
  createOpenPickerOptions,
  getSupportedEditExtensions,
  getFileInputAccept,
} from '../file-picker';
import { getMimeType, getFileDescription } from '../url-utils';

describe('file-picker', () => {
  describe('createFilePickerType', () => {
    it('should create file picker type for docx', () => {
      const type = createFilePickerType('docx');

      expect(type.description).toBe('Word Document');
      expect(type.accept).toHaveProperty(
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      );
      expect(type.accept['application/vnd.openxmlformats-officedocument.wordprocessingml.document']).toEqual(['.docx']);
    });

    it('should create file picker type for xlsx', () => {
      const type = createFilePickerType('xlsx');

      expect(type.description).toBe('Excel Workbook');
      expect(type.accept).toHaveProperty(
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
    });

    it('should create file picker type for pptx', () => {
      const type = createFilePickerType('pptx');

      expect(type.description).toBe('PowerPoint Presentation');
      expect(type.accept).toHaveProperty(
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      );
    });

    it('should create file picker type for pdf', () => {
      const type = createFilePickerType('pdf');

      expect(type.description).toBe('PDF Document');
      expect(type.accept).toHaveProperty('application/pdf');
    });

    it('should create file picker type for csv', () => {
      const type = createFilePickerType('csv');

      expect(type.description).toBe('CSV File');
      expect(type.accept).toHaveProperty('text/csv');
    });

    it('should create file picker type for unknown extension', () => {
      const type = createFilePickerType('unknown');

      expect(type.description).toBe('Document');
      expect(type.accept).toHaveProperty('application/octet-stream');
    });

    it('should use provided MIME type over detected', () => {
      const type = createFilePickerType('docx', 'application/custom');

      expect(type.accept).toHaveProperty('application/custom');
      expect(type.accept['application/custom']).toEqual(['.docx']);
    });

    it('should handle extension with leading dot', () => {
      const type = createFilePickerType('.docx');

      expect(type.accept).toHaveProperty(
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      );
    });

    it('should normalize extension to lowercase', () => {
      const type = createFilePickerType('DOCX');

      expect(type.accept).toHaveProperty(
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      );
      expect(
        type.accept['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
      ).toEqual(['.docx']);
    });

    it('should create file picker type for legacy doc format', () => {
      const type = createFilePickerType('doc');

      expect(type.description).toBe('Word 97-2003 Document');
      expect(type.accept).toHaveProperty('application/msword');
    });

    it('should create file picker type for legacy xls format', () => {
      const type = createFilePickerType('xls');

      expect(type.description).toBe('Excel 97-2003 Workbook');
      expect(type.accept).toHaveProperty('application/vnd.ms-excel');
    });

    it('should create file picker type for legacy ppt format', () => {
      const type = createFilePickerType('ppt');

      expect(type.description).toBe('PowerPoint 97-2003 Presentation');
      expect(type.accept).toHaveProperty('application/vnd.ms-powerpoint');
    });

    it('should create file picker type for ODT', () => {
      const type = createFilePickerType('odt');

      expect(type.description).toBe('OpenDocument Text');
      expect(type.accept).toHaveProperty('application/vnd.oasis.opendocument.text');
    });

    it('should create file picker type for ODS', () => {
      const type = createFilePickerType('ods');

      expect(type.description).toBe('OpenDocument Spreadsheet');
      expect(type.accept).toHaveProperty('application/vnd.oasis.opendocument.spreadsheet');
    });

    it('should create file picker type for ODP', () => {
      const type = createFilePickerType('odp');

      expect(type.description).toBe('OpenDocument Presentation');
      expect(type.accept).toHaveProperty('application/vnd.oasis.opendocument.presentation');
    });
  });

  describe('createSavePickerOptions', () => {
    it('should create save picker options for docx file', () => {
      const options = createSavePickerOptions('document.docx');

      expect(options.suggestedName).toBe('document.docx');
      expect(options.types).toHaveLength(1);
      expect(options.types[0].description).toBe('Word Document');
    });

    it('should create save picker options for xlsx file', () => {
      const options = createSavePickerOptions('spreadsheet.xlsx');

      expect(options.suggestedName).toBe('spreadsheet.xlsx');
      expect(options.types[0].description).toBe('Excel Workbook');
    });

    it('should create save picker options for file without extension', () => {
      const options = createSavePickerOptions('noextension');

      expect(options.suggestedName).toBe('noextension');
      expect(options.types).toHaveLength(1);
    });

    it('should create save picker options for empty filename', () => {
      const options = createSavePickerOptions('');

      expect(options.suggestedName).toBe('');
      expect(options.types).toHaveLength(1);
      // Empty string split returns [''], pop returns '', fallback to 'bin' extension
      expect(options.types[0].accept).toHaveProperty('application/octet-stream');
    });

    it('should create save picker options with custom MIME type', () => {
      const options = createSavePickerOptions('custom.bin', 'application/x-custom');

      expect(options.suggestedName).toBe('custom.bin');
      expect(options.types[0].accept).toHaveProperty('application/x-custom');
    });

    it('should handle file with multiple dots in name', () => {
      const options = createSavePickerOptions('my.document.final.docx');

      expect(options.suggestedName).toBe('my.document.final.docx');
      expect(options.types[0].accept).toHaveProperty(
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      );
    });

    it('should handle file with path separators (normalized by picker)', () => {
      const options = createSavePickerOptions('/path/to/document.docx');

      // The extension is extracted from the last segment
      expect(options.types[0].description).toBe('Word Document');
    });
  });

  describe('createOpenPickerOptions', () => {
    it('should create open picker options for single extension', () => {
      const options = createOpenPickerOptions(['docx']);

      expect(options.types).toHaveLength(1);
      expect(options.multiple).toBe(false);
    });

    it('should create open picker options for multiple extensions', () => {
      const options = createOpenPickerOptions(['docx', 'xlsx', 'pptx']);

      expect(options.types).toHaveLength(3);
      expect(options.types[0].description).toBe('Word Document');
      expect(options.types[1].description).toBe('Excel Workbook');
      expect(options.types[2].description).toBe('PowerPoint Presentation');
    });

    it('should create open picker options with multiple=true', () => {
      const options = createOpenPickerOptions(['docx'], { multiple: true });

      expect(options.multiple).toBe(true);
    });

    it('should create open picker options with multiple=false', () => {
      const options = createOpenPickerOptions(['docx'], { multiple: false });

      expect(options.multiple).toBe(false);
    });

    it('should default to multiple=false', () => {
      const options = createOpenPickerOptions(['docx']);

      expect(options.multiple).toBe(false);
    });

    it('should handle empty extensions array', () => {
      const options = createOpenPickerOptions([]);

      expect(options.types).toHaveLength(0);
    });
  });

  describe('getSupportedEditExtensions', () => {
    it('should return array of supported extensions', () => {
      const extensions = getSupportedEditExtensions();

      expect(Array.isArray(extensions)).toBe(true);
      expect(extensions.length).toBeGreaterThan(0);
    });

    it('should include modern Office formats', () => {
      const extensions = getSupportedEditExtensions();

      expect(extensions).toContain('docx');
      expect(extensions).toContain('xlsx');
      expect(extensions).toContain('pptx');
    });

    it('should include legacy Office formats', () => {
      const extensions = getSupportedEditExtensions();

      expect(extensions).toContain('doc');
      expect(extensions).toContain('xls');
      expect(extensions).toContain('ppt');
    });

    it('should include other supported formats', () => {
      const extensions = getSupportedEditExtensions();

      expect(extensions).toContain('csv');
      expect(extensions).toContain('pdf');
      expect(extensions).toContain('txt');
      expect(extensions).toContain('rtf');
    });

    it('should include OpenDocument formats', () => {
      const extensions = getSupportedEditExtensions();

      expect(extensions).toContain('odt');
      expect(extensions).toContain('ods');
      expect(extensions).toContain('odp');
    });

    it('should return extensions without leading dots', () => {
      const extensions = getSupportedEditExtensions();

      extensions.forEach((ext) => {
        expect(ext).not.toMatch(/^\./);
      });
    });
  });

  describe('getFileInputAccept', () => {
    it('should return comma-separated string of extensions', () => {
      const accept = getFileInputAccept();

      expect(typeof accept).toBe('string');
      expect(accept).toContain('.docx');
      expect(accept).toContain('.xlsx');
    });

    it('should have leading dots on all extensions', () => {
      const accept = getFileInputAccept();
      const parts = accept.split(',');

      parts.forEach((part) => {
        expect(part).toMatch(/^\.[a-z]+$/);
      });
    });

    it('should be usable as HTML file input accept attribute', () => {
      const accept = getFileInputAccept();

      // Should match expected format: .ext1,.ext2,.ext3
      expect(accept).toMatch(/^(\.[a-z]+,)*\.[a-z]+$/);
    });

    it('should include all supported extensions', () => {
      const accept = getFileInputAccept();
      const extensions = getSupportedEditExtensions();

      extensions.forEach((ext) => {
        expect(accept).toContain(`.${ext}`);
      });
    });
  });

  describe('integration with url-utils', () => {
    it('should create consistent MIME types between modules', () => {
      const type = createFilePickerType('docx');

      const detectedMime = getMimeType('docx');
      const pickerMime = Object.keys(type.accept)[0];

      expect(pickerMime).toBe(detectedMime);
    });

    it('should create consistent descriptions between modules', () => {
      const type = createFilePickerType('xlsx');

      const detectedDesc = getFileDescription('xlsx');

      expect(type.description).toBe(detectedDesc);
    });
  });
});