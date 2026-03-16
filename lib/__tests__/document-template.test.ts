import { describe, expect, it } from 'vitest';
import {
  getSupportedNewDocumentExtensions,
  isNewDocumentSupported,
  getNewDocumentTemplate,
  requireNewDocumentTemplate,
} from '../document-template';

describe('document-template', () => {
  describe('getSupportedNewDocumentExtensions', () => {
    it('should return the list of supported extensions for new documents', () => {
      const extensions = getSupportedNewDocumentExtensions();
      expect(extensions).toContain('.docx');
      expect(extensions).toContain('.xlsx');
      expect(extensions).toContain('.pptx');
    });

    it('should return extensions with leading dots', () => {
      const extensions = getSupportedNewDocumentExtensions();
      for (const ext of extensions) {
        expect(ext).toMatch(/^\./);
      }
    });
  });

  describe('isNewDocumentSupported', () => {
    it('should return true for supported file types with leading dot', () => {
      expect(isNewDocumentSupported('.docx')).toBe(true);
      expect(isNewDocumentSupported('.xlsx')).toBe(true);
      expect(isNewDocumentSupported('.pptx')).toBe(true);
    });

    it('should return true for supported file types without leading dot', () => {
      expect(isNewDocumentSupported('docx')).toBe(true);
      expect(isNewDocumentSupported('xlsx')).toBe(true);
      expect(isNewDocumentSupported('pptx')).toBe(true);
    });

    it('should return false for unsupported file types', () => {
      expect(isNewDocumentSupported('.doc')).toBe(false);
      expect(isNewDocumentSupported('.pdf')).toBe(false);
      expect(isNewDocumentSupported('.txt')).toBe(false);
      expect(isNewDocumentSupported('.ods')).toBe(false);
    });

    it('should return false for unknown file types', () => {
      expect(isNewDocumentSupported('.xyz')).toBe(false);
      expect(isNewDocumentSupported('unknown')).toBe(false);
    });

    it('should return false for empty or falsy values', () => {
      expect(isNewDocumentSupported('')).toBe(false);
    });

    it('should be case sensitive', () => {
      expect(isNewDocumentSupported('.DOCX')).toBe(false);
      expect(isNewDocumentSupported('XLSX')).toBe(false);
    });
  });

  describe('getNewDocumentTemplate', () => {
    it('should return template string for supported file types', () => {
      const template = getNewDocumentTemplate('.docx');
      expect(template).toBeDefined();
      expect(typeof template).toBe('string');
      expect(template!.length).toBeGreaterThan(100);
    });

    it('should work with or without leading dot', () => {
      const template1 = getNewDocumentTemplate('docx');
      const template2 = getNewDocumentTemplate('.docx');
      expect(template1).toBe(template2);
    });

    it('should return undefined for unsupported file types', () => {
      expect(getNewDocumentTemplate('.doc')).toBeUndefined();
      expect(getNewDocumentTemplate('.pdf')).toBeUndefined();
      expect(getNewDocumentTemplate('.xyz')).toBeUndefined();
    });

    it('should return undefined for empty input', () => {
      expect(getNewDocumentTemplate('')).toBeUndefined();
    });

    it('should return different templates for different file types', () => {
      const docxTemplate = getNewDocumentTemplate('.docx');
      const xlsxTemplate = getNewDocumentTemplate('.xlsx');
      const pptxTemplate = getNewDocumentTemplate('.pptx');

      expect(docxTemplate).not.toBe(xlsxTemplate);
      expect(xlsxTemplate).not.toBe(pptxTemplate);
    });
  });

  describe('requireNewDocumentTemplate', () => {
    it('should return template for supported file types', () => {
      const template = requireNewDocumentTemplate('.docx');
      expect(template).toBeDefined();
      expect(typeof template).toBe('string');
    });

    it('should throw error for unsupported file types', () => {
      expect(() => requireNewDocumentTemplate('.doc')).toThrow(
        'Unsupported file type for new document: .doc',
      );
      expect(() => requireNewDocumentTemplate('.pdf')).toThrow(
        'Unsupported file type for new document: .pdf',
      );
    });

    it('should throw error for unknown file types', () => {
      expect(() => requireNewDocumentTemplate('.xyz')).toThrow(
        'Unsupported file type for new document: .xyz',
      );
    });

    it('should throw error for empty input', () => {
      expect(() => requireNewDocumentTemplate('')).toThrow(
        'Unsupported file type for new document: ',
      );
    });
  });

  describe('integration with document workflow', () => {
    it('should have all supported new document types in DOCUMENT_TYPE_MAP', async () => {
      const { DOCUMENT_TYPE_MAP } = await import('../document-utils');
      const extensions = getSupportedNewDocumentExtensions();

      for (const ext of extensions) {
        const extWithoutDot = ext.slice(1);
        expect(DOCUMENT_TYPE_MAP[extWithoutDot]).toBeDefined();
      }
    });

    it('should have MIME types for all supported new document types', async () => {
      const { getMimeType } = await import('../url-utils');
      const extensions = getSupportedNewDocumentExtensions();

      for (const ext of extensions) {
        const extWithoutDot = ext.slice(1);
        const mimeType = getMimeType(extWithoutDot);
        expect(mimeType).toBeDefined();
      }
    });
  });
});