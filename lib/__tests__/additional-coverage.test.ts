/**
 * Phase 66: Additional Test Coverage
 *
 * Additional tests to cover more edge cases and scenarios
 */

import { describe, it, expect } from 'vitest';
import {
  isEditableFileType,
  requiresConversion,
  getConversionTarget,
  DEFAULT_EDITOR_PERMISSIONS,
  DEFAULT_EDITOR_CUSTOMIZATION,
} from '../editor-config';
import {
  getEditorCleanupDelay,
  isPresentationType,
  EDITOR_DELAYS,
} from '../editor-utils';
import {
  createFilePickerType,
  getSupportedEditExtensions,
  getFileInputAccept,
} from '../file-picker';
import {
  createConversionPaths,
  getParamsPath,
  getWorkingPath,
  extractFileName,
} from '../conversion-paths';

describe('Editor Config Extended Tests', () => {
  describe('isEditableFileType', () => {
    it('should return true for editable document types', () => {
      expect(isEditableFileType('docx')).toBe(true);
      expect(isEditableFileType('doc')).toBe(true);
      expect(isEditableFileType('odt')).toBe(true);
      expect(isEditableFileType('rtf')).toBe(true);
      expect(isEditableFileType('txt')).toBe(true);
    });

    it('should return true for editable spreadsheet types', () => {
      expect(isEditableFileType('xlsx')).toBe(true);
      expect(isEditableFileType('xls')).toBe(true);
      expect(isEditableFileType('ods')).toBe(true);
      expect(isEditableFileType('csv')).toBe(true);
    });

    it('should return true for editable presentation types', () => {
      expect(isEditableFileType('pptx')).toBe(true);
      expect(isEditableFileType('ppt')).toBe(true);
      expect(isEditableFileType('odp')).toBe(true);
    });

    it('should return true for PDF (viewable)', () => {
      expect(isEditableFileType('pdf')).toBe(true);
    });

    it('should return false for non-editable types', () => {
      expect(isEditableFileType('exe')).toBe(false);
      expect(isEditableFileType('zip')).toBe(false);
      expect(isEditableFileType('xyz')).toBe(false);
    });
  });

  describe('requiresConversion', () => {
    it('should return false for OOXML formats', () => {
      expect(requiresConversion('docx')).toBe(false);
      expect(requiresConversion('xlsx')).toBe(false);
      expect(requiresConversion('pptx')).toBe(false);
    });

    it('should return false for PDF', () => {
      expect(requiresConversion('pdf')).toBe(false);
    });

    it('should return true for legacy formats', () => {
      expect(requiresConversion('doc')).toBe(true);
      expect(requiresConversion('xls')).toBe(true);
      expect(requiresConversion('ppt')).toBe(true);
    });

    it('should return true for ODF formats', () => {
      expect(requiresConversion('odt')).toBe(true);
      expect(requiresConversion('ods')).toBe(true);
      expect(requiresConversion('odp')).toBe(true);
    });

    it('should return true for other formats', () => {
      expect(requiresConversion('rtf')).toBe(true);
      expect(requiresConversion('txt')).toBe(true);
      expect(requiresConversion('csv')).toBe(true);
    });
  });

  describe('getConversionTarget', () => {
    it('should map document formats to docx', () => {
      expect(getConversionTarget('doc')).toBe('docx');
      expect(getConversionTarget('odt')).toBe('docx');
      expect(getConversionTarget('rtf')).toBe('docx');
      expect(getConversionTarget('txt')).toBe('docx');
    });

    it('should map spreadsheet formats to xlsx', () => {
      expect(getConversionTarget('xls')).toBe('xlsx');
      expect(getConversionTarget('ods')).toBe('xlsx');
      expect(getConversionTarget('csv')).toBe('xlsx');
    });

    it('should map presentation formats to pptx', () => {
      expect(getConversionTarget('ppt')).toBe('pptx');
      expect(getConversionTarget('odp')).toBe('pptx');
    });

    it('should return undefined for formats that dont need conversion', () => {
      expect(getConversionTarget('docx')).toBeUndefined();
      expect(getConversionTarget('xlsx')).toBeUndefined();
      expect(getConversionTarget('pptx')).toBeUndefined();
    });
  });
});

describe('Editor Utils Extended Tests', () => {
  describe('EDITOR_DELAYS constant', () => {
    it('should have defined delay values', () => {
      expect(EDITOR_DELAYS.PRESENTATION_SWITCH).toBeDefined();
      expect(EDITOR_DELAYS.STANDARD_SWITCH).toBeDefined();
      expect(EDITOR_DELAYS.NEW_EDITOR).toBeDefined();
    });

    it('should have reasonable delay values', () => {
      expect(EDITOR_DELAYS.PRESENTATION_SWITCH).toBeGreaterThan(0);
      expect(EDITOR_DELAYS.STANDARD_SWITCH).toBeGreaterThan(0);
      expect(EDITOR_DELAYS.NEW_EDITOR).toBeGreaterThan(0);
    });
  });

  describe('isPresentationType', () => {
    it('should return true for presentation types', () => {
      expect(isPresentationType('pptx')).toBe(true);
      expect(isPresentationType('ppt')).toBe(true);
    });

    it('should return false for non-presentation types', () => {
      expect(isPresentationType('docx')).toBe(false);
      expect(isPresentationType('xlsx')).toBe(false);
      expect(isPresentationType('pdf')).toBe(false);
      expect(isPresentationType('odp')).toBe(false);
    });
  });

  describe('getEditorCleanupDelay', () => {
    it('should return longer delay for presentations with existing editor', () => {
      const delay = getEditorCleanupDelay('pptx', true);
      expect(delay).toBe(400);
    });

    it('should return standard delay for non-presentations with existing editor', () => {
      const delay = getEditorCleanupDelay('docx', true);
      expect(delay).toBe(250);
    });

    it('should return new editor delay when no existing editor', () => {
      const delay = getEditorCleanupDelay('docx', false);
      expect(delay).toBe(150);
    });
  });
});

describe('File Picker Extended Tests', () => {
  describe('getSupportedEditExtensions', () => {
    it('should return array of supported extensions', () => {
      const extensions = getSupportedEditExtensions();
      expect(Array.isArray(extensions)).toBe(true);
      expect(extensions.length).toBeGreaterThan(0);
    });

    it('should include common document extensions', () => {
      const extensions = getSupportedEditExtensions();
      // Extensions are returned without leading dots
      expect(extensions).toContain('docx');
      expect(extensions).toContain('xlsx');
      expect(extensions).toContain('pptx');
    });
  });

  describe('getFileInputAccept', () => {
    it('should return a string', () => {
      const accept = getFileInputAccept();
      expect(typeof accept).toBe('string');
    });

    it('should contain common extensions', () => {
      const accept = getFileInputAccept();
      expect(accept).toContain('.docx');
      expect(accept).toContain('.xlsx');
      expect(accept).toContain('.pptx');
    });

    it('should be comma-separated', () => {
      const accept = getFileInputAccept();
      expect(accept).toContain(',');
    });
  });

  describe('createFilePickerType', () => {
    it('should create picker type with description', () => {
      const pickerType = createFilePickerType('docx');
      expect(pickerType.description).toBeDefined();
      expect(pickerType.accept).toBeDefined();
    });

    it('should include MIME type if provided', () => {
      const pickerType = createFilePickerType('docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      expect(pickerType.accept).toHaveProperty('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    });
  });
});

describe('Conversion Paths Extended Tests', () => {
  describe('createConversionPaths', () => {
    it('should create paths with input and output', () => {
      const paths = createConversionPaths('document.docx', 'pdf');
      expect(paths.inputPath).toBeDefined();
      expect(paths.outputPath).toBeDefined();
    });

    it('should default output extension to input extension', () => {
      const paths = createConversionPaths('document.docx');
      expect(paths.outputPath).toContain('.docx');
    });
  });

  describe('getParamsPath', () => {
    it('should return params.xml path', () => {
      const path = getParamsPath();
      expect(path).toContain('params.xml');
    });
  });

  describe('getWorkingPath', () => {
    it('should create working directory path', () => {
      const path = getWorkingPath('document.docx');
      expect(path).toContain('document.docx');
    });
  });

  describe('extractFileName', () => {
    it('should extract filename from path', () => {
      expect(extractFileName('/working/document.docx')).toBe('document.docx');
      expect(extractFileName('/path/to/file.xlsx')).toBe('file.xlsx');
    });

    it('should handle paths without directories', () => {
      expect(extractFileName('document.docx')).toBe('document.docx');
    });
  });
});

describe('Default Configuration Tests', () => {
  describe('DEFAULT_EDITOR_PERMISSIONS', () => {
    it('should have expected permission values', () => {
      expect(DEFAULT_EDITOR_PERMISSIONS.edit).toBe(true);
      expect(DEFAULT_EDITOR_PERMISSIONS.chat).toBe(false);
      expect(DEFAULT_EDITOR_PERMISSIONS.protect).toBe(false);
    });
  });

  describe('DEFAULT_EDITOR_CUSTOMIZATION', () => {
    it('should have expected customization values', () => {
      expect(DEFAULT_EDITOR_CUSTOMIZATION.help).toBe(false);
      expect(DEFAULT_EDITOR_CUSTOMIZATION.about).toBe(false);
      expect(DEFAULT_EDITOR_CUSTOMIZATION.hideRightMenu).toBe(true);
    });

    it('should have anonymous settings', () => {
      expect(DEFAULT_EDITOR_CUSTOMIZATION.anonymous.request).toBe(false);
      expect(DEFAULT_EDITOR_CUSTOMIZATION.anonymous.label).toBe('Guest');
    });
  });
});