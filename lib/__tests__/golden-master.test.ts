/**
 * Phase 60: Snapshot and Golden Master Tests
 *
 * These tests use snapshot-style assertions to detect unexpected changes
 * in function outputs. They act as "golden master" tests that catch regressions.
 */

import { describe, it, expect } from 'vitest';
import {
  getMimeType,
  getFileDescription,
  isSupportedExtension,
  getFileExtension,
} from '../url-utils';
import {
  DOCUMENT_TYPE_MAP,
} from '../document-utils';
import {
  createConversionParams,
  escapeXml,
} from '../conversion-utils';
import {
  oAscFileType,
  c_oAscFileType2,
} from '../file-types';
import {
  createEditorConfig,
  DEFAULT_EDITOR_PERMISSIONS,
  DEFAULT_EDITOR_CUSTOMIZATION,
} from '../editor-config';
import {
  createFilePickerType,
  createSavePickerOptions,
  createOpenPickerOptions,
  getFileInputAccept,
} from '../file-picker';
import {
  requireNewDocumentTemplate,
  isNewDocumentSupported,
} from '../document-template';

describe('Golden Master Tests - MIME Types', () => {
  it('should produce consistent MIME type mappings for document formats', () => {
    const expectedMimeTypes = {
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      doc: 'application/msword',
      odt: 'application/vnd.oasis.opendocument.text',
      rtf: 'application/rtf',
      txt: 'text/plain',
      pdf: 'application/pdf',
    };

    for (const [ext, expectedMime] of Object.entries(expectedMimeTypes)) {
      expect(getMimeType(ext)).toBe(expectedMime);
    }
  });

  it('should produce consistent MIME type mappings for spreadsheet formats', () => {
    const expectedMimeTypes = {
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      xls: 'application/vnd.ms-excel',
      ods: 'application/vnd.oasis.opendocument.spreadsheet',
      csv: 'text/csv',
    };

    for (const [ext, expectedMime] of Object.entries(expectedMimeTypes)) {
      expect(getMimeType(ext)).toBe(expectedMime);
    }
  });

  it('should produce consistent MIME type mappings for presentation formats', () => {
    const expectedMimeTypes = {
      pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      ppt: 'application/vnd.ms-powerpoint',
      odp: 'application/vnd.oasis.opendocument.presentation',
    };

    for (const [ext, expectedMime] of Object.entries(expectedMimeTypes)) {
      expect(getMimeType(ext)).toBe(expectedMime);
    }
  });

  it('should produce consistent MIME type mappings for image formats', () => {
    const expectedMimeTypes = {
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      gif: 'image/gif',
      bmp: 'image/bmp',
      webp: 'image/webp',
      svg: 'image/svg+xml',
    };

    for (const [ext, expectedMime] of Object.entries(expectedMimeTypes)) {
      expect(getMimeType(ext)).toBe(expectedMime);
    }
  });
});

describe('Golden Master Tests - File Descriptions', () => {
  it('should produce consistent file descriptions', () => {
    const expectedDescriptions = {
      docx: 'Word Document',
      doc: 'Word 97-2003 Document',
      odt: 'OpenDocument Text',
      pdf: 'PDF Document',
      xlsx: 'Excel Workbook',
      xls: 'Excel 97-2003 Workbook',
      ods: 'OpenDocument Spreadsheet',
      pptx: 'PowerPoint Presentation',
      ppt: 'PowerPoint 97-2003 Presentation',
      odp: 'OpenDocument Presentation',
      txt: 'Text Document',
      rtf: 'Rich Text Format',
      csv: 'CSV File',
    };

    for (const [ext, expectedDesc] of Object.entries(expectedDescriptions)) {
      expect(getFileDescription(ext)).toBe(expectedDesc);
    }
  });
});

describe('Golden Master Tests - XML Generation', () => {
  it('should produce consistent XML params for document conversion', () => {
    const params = createConversionParams('/working/input.docx', '/working/output.pdf');

    // Snapshot-style assertion - check key structural elements
    expect(params).toContain('<?xml version="1.0" encoding="utf-8"?>');
    expect(params).toContain('<TaskQueueDataConvert');
    expect(params).toContain('<m_sFileFrom>/working/input.docx</m_sFileFrom>');
    expect(params).toContain('<m_sFileTo>/working/output.pdf</m_sFileTo>');
    expect(params).toContain('<m_sThemeDir>/working/themes</m_sThemeDir>');
    expect(params).toContain('<m_bIsNoBase64>false</m_bIsNoBase64>');
    expect(params).toContain('</TaskQueueDataConvert>');
  });

  it('should produce consistent XML params with additional params', () => {
    const params = createConversionParams('input.xlsx', 'output.pdf', '<extra>value</extra>');

    expect(params).toContain('<m_sFileFrom>input.xlsx</m_sFileFrom>');
    expect(params).toContain('<m_sFileTo>output.pdf</m_sFileTo>');
    expect(params).toContain('<extra>value</extra>');
  });

  it('should produce consistent XML escaping for special characters', () => {
    const testCases = [
      { input: '<script>alert(1)</script>', expected: '&lt;script&gt;alert(1)&lt;/script&gt;' },
      { input: 'a & b', expected: 'a &amp; b' },
      { input: '"quoted"', expected: '&quot;quoted&quot;' },
      { input: "it's", expected: 'it&apos;s' },
    ];

    for (const { input, expected } of testCases) {
      expect(escapeXml(input)).toBe(expected);
    }
  });
});

describe('Golden Master Tests - Editor Configuration', () => {
  it('should produce consistent default permissions', () => {
    const expectedPermissions = {
      edit: true,
      chat: false,
      protect: false,
    };

    expect(DEFAULT_EDITOR_PERMISSIONS).toEqual(expectedPermissions);
  });

  it('should produce consistent default customization', () => {
    expect(DEFAULT_EDITOR_CUSTOMIZATION.help).toBe(false);
    expect(DEFAULT_EDITOR_CUSTOMIZATION.about).toBe(false);
    expect(DEFAULT_EDITOR_CUSTOMIZATION.hideRightMenu).toBe(true);
    expect(DEFAULT_EDITOR_CUSTOMIZATION.anonymous.request).toBe(false);
  });

  it('should produce consistent editor config structure', () => {
    const config = createEditorConfig({
      fileName: 'test.docx',
      fileType: 'docx',
      lang: 'en',
      events: {
        onAppReady: () => {},
        onDocumentReady: () => {},
        onSave: () => {},
        writeFile: () => {},
      },
    });

    // Check required structure
    expect(config.document.title).toBe('test.docx');
    expect(config.document.fileType).toBe('docx');
    expect(config.document.permissions).toEqual(DEFAULT_EDITOR_PERMISSIONS);
    expect(config.editorConfig.lang).toBe('en');
    expect(config.editorConfig.customization).toEqual(DEFAULT_EDITOR_CUSTOMIZATION);
  });
});

describe('Golden Master Tests - File Picker Configuration', () => {
  it('should produce consistent file picker type objects', () => {
    const pickerType = createFilePickerType('docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');

    expect(pickerType.description).toBe('Word Document');
    expect(pickerType.accept).toEqual({
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    });
  });

  it('should produce consistent save picker options', () => {
    const options = createSavePickerOptions('my-document.docx');

    expect(options.suggestedName).toBe('my-document.docx');
    expect(options.types).toHaveLength(1);
    expect(options.types![0].accept).toBeDefined();
  });

  it('should produce consistent open picker options', () => {
    const options = createOpenPickerOptions(['.docx', '.xlsx'], { multiple: true });

    expect(options.multiple).toBe(true);
    expect(options.types).toHaveLength(2);
  });

  it('should produce consistent file input accept attribute', () => {
    const accept = getFileInputAccept();

    // Should contain common document formats
    expect(accept).toContain('.docx');
    expect(accept).toContain('.xlsx');
    expect(accept).toContain('.pptx');
    expect(accept).toContain('.pdf');
    expect(accept).toContain('.txt');
    expect(accept).toContain('.csv');
  });
});

describe('Golden Master Tests - Document Templates', () => {
  it('should return supported extensions consistently', () => {
    // Check known supported extensions
    expect(isNewDocumentSupported('.docx')).toBe(true);
    expect(isNewDocumentSupported('.xlsx')).toBe(true);
    expect(isNewDocumentSupported('.pptx')).toBe(true);
    expect(isNewDocumentSupported('docx')).toBe(true); // Without dot also works
  });

  it('should return false for unsupported new document extensions', () => {
    expect(isNewDocumentSupported('.pdf')).toBe(false);
    expect(isNewDocumentSupported('.xyz')).toBe(false);
  });

  it('should return consistent template strings for supported types', () => {
    const templateExtensions = ['.docx', '.xlsx', '.pptx'];

    for (const ext of templateExtensions) {
      const template = requireNewDocumentTemplate(ext);
      // Templates are strings (base64 encoded)
      expect(typeof template).toBe('string');
      expect(template.length).toBeGreaterThan(0);
    }
  });
});

describe('Golden Master Tests - File Type Codes', () => {
  it('should have consistent file type codes for document formats', () => {
    expect(oAscFileType.DOCX).toBeDefined();
    expect(oAscFileType.DOC).toBeDefined();
    expect(oAscFileType.ODT).toBeDefined();
    expect(oAscFileType.RTF).toBeDefined();
    expect(oAscFileType.TXT).toBeDefined();
    expect(oAscFileType.PDF).toBeDefined();
  });

  it('should have consistent file type codes for spreadsheet formats', () => {
    expect(oAscFileType.XLSX).toBeDefined();
    expect(oAscFileType.XLS).toBeDefined();
    expect(oAscFileType.ODS).toBeDefined();
    expect(oAscFileType.CSV).toBeDefined();
  });

  it('should have consistent file type codes for presentation formats', () => {
    expect(oAscFileType.PPTX).toBeDefined();
    expect(oAscFileType.PPT).toBeDefined();
    expect(oAscFileType.ODP).toBeDefined();
  });

  it('should have consistent reverse mapping', () => {
    // c_oAscFileType2 maps codes back to strings
    expect(typeof c_oAscFileType2[oAscFileType.DOCX]).toBe('string');
    expect(typeof c_oAscFileType2[oAscFileType.XLSX]).toBe('string');
    expect(typeof c_oAscFileType2[oAscFileType.PPTX]).toBe('string');
  });
});

describe('Golden Master Tests - Supported Extensions', () => {
  it('should consistently support all expected document extensions', () => {
    const expectedSupported = [
      'docx', 'doc', 'odt', 'rtf', 'txt',
      'xlsx', 'xls', 'ods', 'csv',
      'pptx', 'ppt', 'odp',
    ];

    for (const ext of expectedSupported) {
      expect(isSupportedExtension(ext)).toBe(true);
    }
  });

  it('should consistently reject unsupported extensions', () => {
    const expectedUnsupported = [
      'pdf', 'png', 'jpg', 'gif',
      'mp3', 'mp4', 'zip', 'exe',
    ];

    for (const ext of expectedUnsupported) {
      expect(isSupportedExtension(ext)).toBe(false);
    }
  });
});

describe('Golden Master Tests - Document Type Map', () => {
  it('should have consistent entries for all editable formats', () => {
    // Verify DOCUMENT_TYPE_MAP has expected structure
    // Note: PDF is NOT in this map as it's view-only, not editable
    expect(DOCUMENT_TYPE_MAP['docx']).toBeDefined();
    expect(DOCUMENT_TYPE_MAP['xlsx']).toBeDefined();
    expect(DOCUMENT_TYPE_MAP['pptx']).toBeDefined();
    expect(DOCUMENT_TYPE_MAP['odt']).toBeDefined();
  });

  it('should map extensions to consistent document types', () => {
    // Word documents should map to 'word'
    expect(DOCUMENT_TYPE_MAP['docx']).toBe('word');
    expect(DOCUMENT_TYPE_MAP['doc']).toBe('word');
    expect(DOCUMENT_TYPE_MAP['odt']).toBe('word');
    expect(DOCUMENT_TYPE_MAP['rtf']).toBe('word');
    expect(DOCUMENT_TYPE_MAP['txt']).toBe('word');

    // Spreadsheets should map to 'cell'
    expect(DOCUMENT_TYPE_MAP['xlsx']).toBe('cell');
    expect(DOCUMENT_TYPE_MAP['xls']).toBe('cell');
    expect(DOCUMENT_TYPE_MAP['ods']).toBe('cell');
    expect(DOCUMENT_TYPE_MAP['csv']).toBe('cell');

    // Presentations should map to 'slide'
    expect(DOCUMENT_TYPE_MAP['pptx']).toBe('slide');
    expect(DOCUMENT_TYPE_MAP['ppt']).toBe('slide');
    expect(DOCUMENT_TYPE_MAP['odp']).toBe('slide');
  });

  it('should NOT include PDF (view-only format)', () => {
    // PDF is view-only and not editable, so it's not in the document type map
    expect(DOCUMENT_TYPE_MAP['pdf']).toBeUndefined();
  });
});

describe('Golden Master Tests - Extension Extraction', () => {
  it('should extract extensions consistently regardless of case', () => {
    const cases = [
      { input: 'FILE.DOCX', expected: 'docx' },
      { input: 'File.Xlsx', expected: 'xlsx' },
      { input: 'file.PPTX', expected: 'pptx' },
      { input: 'FILE.PDF', expected: 'pdf' },
    ];

    for (const { input, expected } of cases) {
      expect(getFileExtension(input)).toBe(expected);
    }
  });

  it('should extract extensions consistently for files with multiple dots', () => {
    expect(getFileExtension('my.document.file.docx')).toBe('docx');
    expect(getFileExtension('2024-01-15.report.xlsx')).toBe('xlsx');
    expect(getFileExtension('final.version.pptx')).toBe('pptx');
  });
});

describe('Golden Master Tests - Integration Consistency', () => {
  it('should have consistent MIME type round-trip for Office formats', () => {
    // Extensions that have MIME types should round-trip
    const officeExtensions = ['docx', 'xlsx', 'pptx', 'doc', 'xls', 'ppt'];

    for (const ext of officeExtensions) {
      const mime = getMimeType(ext);
      // The MIME type should be a valid Office MIME type
      expect(mime).toContain('application/');
    }
  });

  it('should have consistent support status across functions', () => {
    // Extensions marked as supported should have file descriptions
    const supportedExts = ['docx', 'xlsx', 'pptx', 'txt', 'csv'];

    for (const ext of supportedExts) {
      expect(isSupportedExtension(ext)).toBe(true);
      expect(getFileDescription(ext)).not.toBe('Document'); // Should have specific description
    }
  });
});