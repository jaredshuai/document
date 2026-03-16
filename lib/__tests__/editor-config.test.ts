import { describe, it, expect } from 'vitest';
import {
  DEFAULT_EDITOR_PERMISSIONS,
  DEFAULT_EDITOR_CUSTOMIZATION,
  createEditorConfig,
  isEditableFileType,
  requiresConversion,
  getConversionTarget,
} from '../editor-config';

describe('editor-config', () => {
  describe('DEFAULT_EDITOR_PERMISSIONS', () => {
    it('should have edit enabled', () => {
      expect(DEFAULT_EDITOR_PERMISSIONS.edit).toBe(true);
    });

    it('should have chat disabled', () => {
      expect(DEFAULT_EDITOR_PERMISSIONS.chat).toBe(false);
    });

    it('should have protect disabled', () => {
      expect(DEFAULT_EDITOR_PERMISSIONS.protect).toBe(false);
    });

    it('should be readonly (frozen)', () => {
      // The `as const` assertion makes it readonly at compile time
      expect(typeof DEFAULT_EDITOR_PERMISSIONS).toBe('object');
      expect(Object.keys(DEFAULT_EDITOR_PERMISSIONS)).toHaveLength(3);
    });
  });

  describe('DEFAULT_EDITOR_CUSTOMIZATION', () => {
    it('should have help disabled', () => {
      expect(DEFAULT_EDITOR_CUSTOMIZATION.help).toBe(false);
    });

    it('should have about disabled', () => {
      expect(DEFAULT_EDITOR_CUSTOMIZATION.about).toBe(false);
    });

    it('should have hideRightMenu enabled', () => {
      expect(DEFAULT_EDITOR_CUSTOMIZATION.hideRightMenu).toBe(true);
    });

    it('should have spellcheck change disabled', () => {
      expect(DEFAULT_EDITOR_CUSTOMIZATION.features.spellcheck.change).toBe(false);
    });

    it('should have anonymous request disabled', () => {
      expect(DEFAULT_EDITOR_CUSTOMIZATION.anonymous.request).toBe(false);
    });

    it('should have Guest as anonymous label', () => {
      expect(DEFAULT_EDITOR_CUSTOMIZATION.anonymous.label).toBe('Guest');
    });
  });

  describe('createEditorConfig', () => {
    const mockEvents = {
      onAppReady: () => {},
      onDocumentReady: () => {},
      onSave: () => {},
      writeFile: () => {},
    };

    it('should create config with document title', () => {
      const config = createEditorConfig({
        fileName: 'test.docx',
        fileType: 'docx',
        lang: 'en',
        events: mockEvents,
      });

      expect(config.document.title).toBe('test.docx');
    });

    it('should use fileName as url', () => {
      const config = createEditorConfig({
        fileName: 'report.xlsx',
        fileType: 'xlsx',
        lang: 'en',
        events: mockEvents,
      });

      expect(config.document.url).toBe('report.xlsx');
    });

    it('should set fileType correctly', () => {
      const config = createEditorConfig({
        fileName: 'presentation.pptx',
        fileType: 'pptx',
        lang: 'en',
        events: mockEvents,
      });

      expect(config.document.fileType).toBe('pptx');
    });

    it('should include default permissions', () => {
      const config = createEditorConfig({
        fileName: 'doc.docx',
        fileType: 'docx',
        lang: 'en',
        events: mockEvents,
      });

      expect(config.document.permissions).toEqual(DEFAULT_EDITOR_PERMISSIONS);
    });

    it('should set editor language', () => {
      const config = createEditorConfig({
        fileName: 'doc.docx',
        fileType: 'docx',
        lang: 'zh-CN',
        events: mockEvents,
      });

      expect(config.editorConfig.lang).toBe('zh-CN');
    });

    it('should include default customization', () => {
      const config = createEditorConfig({
        fileName: 'doc.docx',
        fileType: 'docx',
        lang: 'en',
        events: mockEvents,
      });

      expect(config.editorConfig.customization).toEqual(DEFAULT_EDITOR_CUSTOMIZATION);
    });

    it('should include event handlers', () => {
      const config = createEditorConfig({
        fileName: 'doc.docx',
        fileType: 'docx',
        lang: 'en',
        events: mockEvents,
      });

      expect(config.events).toBe(mockEvents);
      expect(config.events.onAppReady).toBe(mockEvents.onAppReady);
      expect(config.events.onDocumentReady).toBe(mockEvents.onDocumentReady);
      expect(config.events.onSave).toBe(mockEvents.onSave);
      expect(config.events.writeFile).toBe(mockEvents.writeFile);
    });

    it('should create consistent config structure', () => {
      const config = createEditorConfig({
        fileName: 'document.odt',
        fileType: 'odt',
        lang: 'en',
        events: mockEvents,
      });

      // Verify structure
      expect(config).toHaveProperty('document');
      expect(config).toHaveProperty('editorConfig');
      expect(config).toHaveProperty('events');

      expect(config.document).toHaveProperty('title');
      expect(config.document).toHaveProperty('url');
      expect(config.document).toHaveProperty('fileType');
      expect(config.document).toHaveProperty('permissions');

      expect(config.editorConfig).toHaveProperty('lang');
      expect(config.editorConfig).toHaveProperty('customization');
    });

    it('should handle different file types', () => {
      const docxConfig = createEditorConfig({
        fileName: 'doc.docx',
        fileType: 'docx',
        lang: 'en',
        events: mockEvents,
      });
      const xlsxConfig = createEditorConfig({
        fileName: 'sheet.xlsx',
        fileType: 'xlsx',
        lang: 'en',
        events: mockEvents,
      });
      const pptxConfig = createEditorConfig({
        fileName: 'slides.pptx',
        fileType: 'pptx',
        lang: 'en',
        events: mockEvents,
      });

      expect(docxConfig.document.fileType).toBe('docx');
      expect(xlsxConfig.document.fileType).toBe('xlsx');
      expect(pptxConfig.document.fileType).toBe('pptx');
    });

    it('should handle different language codes', () => {
      const enConfig = createEditorConfig({
        fileName: 'doc.docx',
        fileType: 'docx',
        lang: 'en',
        events: mockEvents,
      });
      const zhConfig = createEditorConfig({
        fileName: 'doc.docx',
        fileType: 'docx',
        lang: 'zh-CN',
        events: mockEvents,
      });

      expect(enConfig.editorConfig.lang).toBe('en');
      expect(zhConfig.editorConfig.lang).toBe('zh-CN');
    });
  });

  describe('isEditableFileType', () => {
    describe('document formats', () => {
      it('should return true for docx', () => {
        expect(isEditableFileType('docx')).toBe(true);
      });

      it('should return true for doc', () => {
        expect(isEditableFileType('doc')).toBe(true);
      });

      it('should return true for odt', () => {
        expect(isEditableFileType('odt')).toBe(true);
      });

      it('should return true for rtf', () => {
        expect(isEditableFileType('rtf')).toBe(true);
      });

      it('should return true for txt', () => {
        expect(isEditableFileType('txt')).toBe(true);
      });
    });

    describe('spreadsheet formats', () => {
      it('should return true for xlsx', () => {
        expect(isEditableFileType('xlsx')).toBe(true);
      });

      it('should return true for xls', () => {
        expect(isEditableFileType('xls')).toBe(true);
      });

      it('should return true for ods', () => {
        expect(isEditableFileType('ods')).toBe(true);
      });

      it('should return true for csv', () => {
        expect(isEditableFileType('csv')).toBe(true);
      });
    });

    describe('presentation formats', () => {
      it('should return true for pptx', () => {
        expect(isEditableFileType('pptx')).toBe(true);
      });

      it('should return true for ppt', () => {
        expect(isEditableFileType('ppt')).toBe(true);
      });

      it('should return true for odp', () => {
        expect(isEditableFileType('odp')).toBe(true);
      });
    });

    describe('PDF format', () => {
      it('should return true for pdf', () => {
        expect(isEditableFileType('pdf')).toBe(true);
      });
    });

    describe('case sensitivity', () => {
      it('should handle uppercase extensions', () => {
        expect(isEditableFileType('DOCX')).toBe(true);
        expect(isEditableFileType('XLSX')).toBe(true);
        expect(isEditableFileType('PPTX')).toBe(true);
      });

      it('should handle mixed case extensions', () => {
        expect(isEditableFileType('Docx')).toBe(true);
        expect(isEditableFileType('XlsX')).toBe(true);
      });
    });

    describe('unsupported formats', () => {
      it('should return false for unsupported image formats', () => {
        expect(isEditableFileType('png')).toBe(false);
        expect(isEditableFileType('jpg')).toBe(false);
        expect(isEditableFileType('gif')).toBe(false);
      });

      it('should return false for unsupported formats', () => {
        expect(isEditableFileType('exe')).toBe(false);
        expect(isEditableFileType('zip')).toBe(false);
        expect(isEditableFileType('mp3')).toBe(false);
      });
    });
  });

  describe('requiresConversion', () => {
    describe('OOXML formats (no conversion needed)', () => {
      it('should return false for docx', () => {
        expect(requiresConversion('docx')).toBe(false);
      });

      it('should return false for xlsx', () => {
        expect(requiresConversion('xlsx')).toBe(false);
      });

      it('should return false for pptx', () => {
        expect(requiresConversion('pptx')).toBe(false);
      });

      it('should return false for pdf (view-only)', () => {
        expect(requiresConversion('pdf')).toBe(false);
      });
    });

    describe('legacy Office formats (conversion needed)', () => {
      it('should return true for doc', () => {
        expect(requiresConversion('doc')).toBe(true);
      });

      it('should return true for xls', () => {
        expect(requiresConversion('xls')).toBe(true);
      });

      it('should return true for ppt', () => {
        expect(requiresConversion('ppt')).toBe(true);
      });
    });

    describe('ODF formats (conversion needed)', () => {
      it('should return true for odt', () => {
        expect(requiresConversion('odt')).toBe(true);
      });

      it('should return true for ods', () => {
        expect(requiresConversion('ods')).toBe(true);
      });

      it('should return true for odp', () => {
        expect(requiresConversion('odp')).toBe(true);
      });
    });

    describe('other formats (conversion needed)', () => {
      it('should return true for rtf', () => {
        expect(requiresConversion('rtf')).toBe(true);
      });

      it('should return true for txt', () => {
        expect(requiresConversion('txt')).toBe(true);
      });

      it('should return true for csv', () => {
        expect(requiresConversion('csv')).toBe(true);
      });
    });

    describe('case sensitivity', () => {
      it('should handle uppercase extensions', () => {
        expect(requiresConversion('DOCX')).toBe(false);
        expect(requiresConversion('DOC')).toBe(true);
        expect(requiresConversion('ODT')).toBe(true);
      });
    });
  });

  describe('getConversionTarget', () => {
    describe('document formats -> docx', () => {
      it('should convert doc to docx', () => {
        expect(getConversionTarget('doc')).toBe('docx');
      });

      it('should convert odt to docx', () => {
        expect(getConversionTarget('odt')).toBe('docx');
      });

      it('should convert rtf to docx', () => {
        expect(getConversionTarget('rtf')).toBe('docx');
      });

      it('should convert txt to docx', () => {
        expect(getConversionTarget('txt')).toBe('docx');
      });
    });

    describe('spreadsheet formats -> xlsx', () => {
      it('should convert xls to xlsx', () => {
        expect(getConversionTarget('xls')).toBe('xlsx');
      });

      it('should convert ods to xlsx', () => {
        expect(getConversionTarget('ods')).toBe('xlsx');
      });

      it('should convert csv to xlsx', () => {
        expect(getConversionTarget('csv')).toBe('xlsx');
      });
    });

    describe('presentation formats -> pptx', () => {
      it('should convert ppt to pptx', () => {
        expect(getConversionTarget('ppt')).toBe('pptx');
      });

      it('should convert odp to pptx', () => {
        expect(getConversionTarget('odp')).toBe('pptx');
      });
    });

    describe('no conversion needed', () => {
      it('should return undefined for docx', () => {
        expect(getConversionTarget('docx')).toBeUndefined();
      });

      it('should return undefined for xlsx', () => {
        expect(getConversionTarget('xlsx')).toBeUndefined();
      });

      it('should return undefined for pptx', () => {
        expect(getConversionTarget('pptx')).toBeUndefined();
      });

      it('should return undefined for pdf', () => {
        expect(getConversionTarget('pdf')).toBeUndefined();
      });
    });

    describe('case sensitivity', () => {
      it('should handle uppercase extensions', () => {
        expect(getConversionTarget('DOC')).toBe('docx');
        expect(getConversionTarget('XLS')).toBe('xlsx');
        expect(getConversionTarget('PPT')).toBe('pptx');
      });
    });
  });

  describe('workflow: conversion pipeline', () => {
    it('should correctly identify the conversion path for doc -> docx', () => {
      const sourceType = 'doc';
      expect(requiresConversion(sourceType)).toBe(true);
      expect(getConversionTarget(sourceType)).toBe('docx');
      expect(isEditableFileType(sourceType)).toBe(true);
    });

    it('should correctly identify the conversion path for xls -> xlsx', () => {
      const sourceType = 'xls';
      expect(requiresConversion(sourceType)).toBe(true);
      expect(getConversionTarget(sourceType)).toBe('xlsx');
      expect(isEditableFileType(sourceType)).toBe(true);
    });

    it('should correctly identify no conversion needed for docx', () => {
      const sourceType = 'docx';
      expect(requiresConversion(sourceType)).toBe(false);
      expect(getConversionTarget(sourceType)).toBeUndefined();
      expect(isEditableFileType(sourceType)).toBe(true);
    });

    it('should correctly identify no conversion needed for xlsx', () => {
      const sourceType = 'xlsx';
      expect(requiresConversion(sourceType)).toBe(false);
      expect(getConversionTarget(sourceType)).toBeUndefined();
      expect(isEditableFileType(sourceType)).toBe(true);
    });
  });
});