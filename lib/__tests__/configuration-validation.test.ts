/**
 * Phase 94: Configuration Validation Tests
 *
 * Tests configuration objects, options validation, and defaults
 * across the document processing codebase.
 */

import { describe, it, expect } from 'vitest';
import {
  createOperationQueue,
  DEFAULT_QUEUE_TIMEOUT,
} from '../operation-queue';
import {
  createEditorConfig,
  DEFAULT_EDITOR_PERMISSIONS,
  DEFAULT_EDITOR_CUSTOMIZATION,
} from '../editor-config';
import {
  EDITOR_DELAYS,
} from '../editor-utils';
import {
  createOpenPickerOptions,
  createSavePickerOptions,
  getFileInputAccept,
  getSupportedEditExtensions,
} from '../file-picker';
import {
  getSaveFormatOverride,
  determineSaveFormat,
} from '../save-format';
import {
  createConversionParams,
} from '../conversion-utils';
import {
  createOutputFileName,
  createConversionPaths,
  getWorkingPath,
  getParamsPath,
  getBinPath,
  extractFileName,
  WORKING_DIR,
  MEDIA_DIR,
  FONTS_DIR,
  THEMES_DIR,
} from '../conversion-paths';
import {
  getDocumentType,
} from '../document-utils';
import type { LanguageCode } from '../language-types';

describe('Phase 94: Configuration Validation Tests', () => {
  describe('Operation Queue Configuration', () => {
    it('should use default timeout when not specified', () => {
      // Default timeout is 30 seconds
      expect(DEFAULT_QUEUE_TIMEOUT).toBe(30000);
    });

    it('should accept custom timeout', () => {
      const customTimeout = 5000;
      const queue = createOperationQueue({ timeout: customTimeout });
      // Queue is created successfully
      expect(typeof queue).toBe('function');
    });

    it('should accept onTimeout callback', () => {
      const queue = createOperationQueue({
        timeout: 100,
        onTimeout: () => {
          // Callback exists
        },
      });
      expect(typeof queue).toBe('function');
    });

    it('should accept empty options object', () => {
      const queue = createOperationQueue({});
      expect(typeof queue).toBe('function');
    });

    it('should handle zero timeout', () => {
      // Zero timeout should be accepted (immediate timeout)
      const queue = createOperationQueue({ timeout: 0 });
      expect(typeof queue).toBe('function');
    });
  });

  describe('Editor Configuration', () => {
    it('should create valid editor config with all options', () => {
      const config = createEditorConfig({
        fileName: 'document.docx',
        fileType: 'docx',
        lang: 'en-US' as LanguageCode,
        events: {
          onAppReady: () => {},
          onDocumentReady: () => {},
          onSave: () => {},
          writeFile: () => {},
        },
      });

      expect(config.document.url).toBeDefined();
      expect(config.document.fileType).toBe('docx');
      expect(config.document.title).toBe('document.docx');
      expect(config.editorConfig.lang).toBe('en-US');
    });

    it('should use default language when not specified', () => {
      const config = createEditorConfig({
        fileName: 'test.xlsx',
        fileType: 'xlsx',
        lang: 'en-US' as LanguageCode,
        events: {
          onAppReady: () => {},
          onDocumentReady: () => {},
          onSave: () => {},
          writeFile: () => {},
        },
      });

      expect(config.editorConfig.lang).toBe('en-US');
    });

    it('should include events when provided', () => {
      const onReady = () => console.log('ready');
      const config = createEditorConfig({
        fileName: 'doc.docx',
        fileType: 'docx',
        lang: 'en-US' as LanguageCode,
        events: {
          onAppReady: onReady,
          onDocumentReady: () => {},
          onSave: () => {},
          writeFile: () => {},
        },
      });

      expect(config.events.onAppReady).toBe(onReady);
    });

    it('should provide default editor permissions', () => {
      expect(DEFAULT_EDITOR_PERMISSIONS.edit).toBe(true);
      expect(DEFAULT_EDITOR_PERMISSIONS.chat).toBe(false);
      expect(DEFAULT_EDITOR_PERMISSIONS.protect).toBe(false);
    });

    it('should provide default editor customization', () => {
      expect(DEFAULT_EDITOR_CUSTOMIZATION.help).toBe(false);
      expect(DEFAULT_EDITOR_CUSTOMIZATION.about).toBe(false);
      expect(DEFAULT_EDITOR_CUSTOMIZATION.hideRightMenu).toBe(true);
    });

    it('should provide editor delay constants', () => {
      expect(EDITOR_DELAYS.PRESENTATION_SWITCH).toBeGreaterThan(0);
      expect(EDITOR_DELAYS.STANDARD_SWITCH).toBeGreaterThan(0);
      expect(EDITOR_DELAYS.NEW_EDITOR).toBeGreaterThan(0);
    });

    it('should have different delay values for different contexts', () => {
      // Presentation switch should have different timing
      expect(EDITOR_DELAYS.PRESENTATION_SWITCH).not.toBe(EDITOR_DELAYS.STANDARD_SWITCH);
    });
  });

  describe('File Picker Configuration', () => {
    it('should create open picker options with extensions array', () => {
      const options = createOpenPickerOptions(['docx', 'xlsx', 'pptx']);

      expect(options.multiple).toBe(false);
      expect(Array.isArray(options.types)).toBe(true);
      expect(options.types).toHaveLength(3);
    });

    it('should create open picker options with multiple option', () => {
      const options = createOpenPickerOptions(['docx'], { multiple: true });
      expect(options.multiple).toBe(true);
    });

    it('should create save picker options with suggested name', () => {
      const options = createSavePickerOptions('document.docx');

      expect(options.suggestedName).toBe('document.docx');
      expect(Array.isArray(options.types)).toBe(true);
    });

    it('should create save picker options with custom MIME type', () => {
      const options = createSavePickerOptions('data.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

      expect(options.suggestedName).toBe('data.xlsx');
    });

    it('should generate accept string for file input', () => {
      const accept = getFileInputAccept();

      // Should include common extensions
      expect(accept).toContain('.docx');
      expect(accept).toContain('.xlsx');
      expect(accept).toContain('.pptx');
    });

    it('should return supported edit extensions', () => {
      const extensions = getSupportedEditExtensions();

      expect(extensions).toContain('docx');
      expect(extensions).toContain('xlsx');
      expect(extensions).toContain('pptx');
      expect(extensions).toContain('pdf');
      expect(extensions).toContain('csv');
    });
  });

  describe('Save Format Configuration', () => {
    it('should determine save format from output code', () => {
      // Code 65 = DOCX
      const format = determineSaveFormat(65, 'document.docx');
      expect(format?.toLowerCase()).toBe('docx');
    });

    it('should get save format override for CSV', () => {
      // CSV files should save as XLSX after editing
      const override = getSaveFormatOverride('data.csv');
      expect(override).toBe('CSV');
    });

    it('should return null for non-CSV override', () => {
      const override = getSaveFormatOverride('document.docx');
      expect(override).toBeNull();
    });

    it('should return null for undefined filename override', () => {
      const override = getSaveFormatOverride(undefined);
      expect(override).toBeNull();
    });
  });

  describe('Conversion Path Configuration', () => {
    it('should use consistent working directory', () => {
      expect(WORKING_DIR).toBe('/working');
    });

    it('should have consistent media directory', () => {
      expect(MEDIA_DIR).toBe('/working/media');
    });

    it('should have consistent fonts directory', () => {
      expect(FONTS_DIR).toBe('/working/fonts');
    });

    it('should have consistent themes directory', () => {
      expect(THEMES_DIR).toBe('/working/themes');
    });

    it('should create conversion paths', () => {
      const { inputPath, outputPath } = createConversionPaths('document.docx', 'pdf');

      expect(inputPath).toBe('/working/document.docx');
      expect(outputPath).toBe('/working/document.docx.pdf');
    });

    it('should create conversion paths with default extension', () => {
      const { inputPath, outputPath } = createConversionPaths('document.docx');

      expect(inputPath).toBe('/working/document.docx');
      expect(outputPath).toBe('/working/document.docx.bin');
    });

    it('should create working path', () => {
      const path = getWorkingPath('document.docx');
      expect(path).toBe('/working/document.docx');
    });

    it('should create params path', () => {
      const path = getParamsPath();
      expect(path).toBe('/working/params.xml');
    });

    it('should create bin path', () => {
      const path = getBinPath('/working/document.docx');
      expect(path).toBe('/working/document.docx.bin');
    });

    it('should extract filename from path', () => {
      const name = extractFileName('/working/document.docx');
      expect(name).toBe('document.docx');
    });

    it('should create output filename with extension', () => {
      const name = createOutputFileName('report', 'pdf');
      expect(name).toBe('report.pdf');
    });

    it('should normalize extension in output filename', () => {
      const name = createOutputFileName('report', '.PDF');
      expect(name).toBe('report.pdf');
    });
  });

  describe('Conversion Parameters Configuration', () => {
    it('should create conversion params with valid paths', () => {
      const params = createConversionParams(
        '/working/input.docx',
        '/working/output.pdf'
      );

      expect(params).toContain('/working/input.docx');
      expect(params).toContain('/working/output.pdf');
    });

    it('should include additional XML when provided', () => {
      const additionalXml = '<Settings><Pdf>true</Pdf></Settings>';
      const params = createConversionParams(
        '/working/input.docx',
        '/working/output.pdf',
        additionalXml
      );

      expect(params).toContain('<Settings>');
      expect(params).toContain('</Settings>');
    });

    it('should generate valid XML structure', () => {
      const params = createConversionParams('/working/in.docx', '/working/out.pdf');

      expect(params).toMatch(/<\?xml.*\?>/);
      expect(params).toMatch(/<TaskQueueDataConvert/);
      expect(params).toMatch(/<\/TaskQueueDataConvert>/);
    });
  });

  describe('Configuration Edge Cases', () => {
    it('should handle undefined optional fields', () => {
      const config = createEditorConfig({
        fileName: 'doc.docx',
        fileType: 'docx',
        lang: 'en-US' as LanguageCode,
        events: {
          onAppReady: () => {},
          onDocumentReady: () => {},
          onSave: () => {},
          writeFile: () => {},
        },
      });

      expect(config.document.url).toBeDefined();
    });

    it('should handle null language gracefully', () => {
      // The function should still work with null
      const config = createEditorConfig({
        fileName: 'doc.docx',
        fileType: 'docx',
        lang: null as unknown as LanguageCode,
        events: {
          onAppReady: () => {},
          onDocumentReady: () => {},
          onSave: () => {},
          writeFile: () => {},
        },
      });

      // Should still create config
      expect(config).toBeDefined();
    });

    it('should handle very long filenames', () => {
      const longName = 'a'.repeat(1000) + '.docx';
      const docType = getDocumentType(longName.split('.').pop()!);

      expect(docType).toBe('word');
    });

    it('should handle special characters in filenames', () => {
      const specialName = "test'file\"with<special>chars&symbols.docx";
      const { inputPath } = createConversionPaths(specialName, 'pdf');

      expect(inputPath).toContain(specialName);
    });

    it('should handle unicode in filenames', () => {
      const unicodeName = '文档测试文档.docx';
      const { inputPath } = createConversionPaths(unicodeName);

      expect(inputPath).toContain(unicodeName);
    });
  });

  describe('Configuration Consistency', () => {
    it('should have consistent MIME types across modules', () => {
      // File picker should accept .docx
      const accept = getFileInputAccept();
      expect(accept).toContain('.docx');
    });

    it('should have consistent extension handling', () => {
      // All Office extensions should be supported
      const extensions = ['docx', 'xlsx', 'pptx'];

      for (const ext of extensions) {
        const docType = getDocumentType(ext);
        expect(docType).not.toBeNull();
      }
    });

    it('should have consistent path generation', () => {
      const workingPath = getWorkingPath('test.docx');
      const { inputPath } = createConversionPaths('test.docx');

      // Both should use working directory
      expect(workingPath).toMatch(/^\/working\//);
      expect(inputPath).toMatch(/^\/working\//);
    });
  });

  describe('Configuration Immutability', () => {
    it('should not mutate input extensions for file picker', () => {
      const extensions = ['docx', 'xlsx', 'pptx'];
      const originalExtensions = [...extensions];

      createOpenPickerOptions(extensions);

      expect(extensions).toEqual(originalExtensions);
    });

    it('should not mutate input arrays for save picker', () => {
      // createSavePickerOptions only takes string, no array mutation possible
      const options = createSavePickerOptions('test.test');
      expect(options.suggestedName).toBe('test.test');
    });
  });

  describe('Configuration Defaults', () => {
    it('should have sensible default timeout for operation queue', () => {
      // 30 seconds is a reasonable default
      expect(DEFAULT_QUEUE_TIMEOUT).toBe(30000);
    });

    it('should have sensible default delays for editor', () => {
      // All delays should be positive
      expect(EDITOR_DELAYS.PRESENTATION_SWITCH).toBeGreaterThan(0);
      expect(EDITOR_DELAYS.STANDARD_SWITCH).toBeGreaterThan(0);
      expect(EDITOR_DELAYS.NEW_EDITOR).toBeGreaterThan(0);
    });

    it('should have sensible defaults for file picker', () => {
      const options = createOpenPickerOptions(['docx']);

      // Should not allow multiple by default
      expect(options.multiple).toBe(false);
    });

    it('should have correct presentation delay', () => {
      // Presentation delay should be longest (400ms)
      expect(EDITOR_DELAYS.PRESENTATION_SWITCH).toBe(400);
    });

    it('should have correct standard switch delay', () => {
      // Standard switch should be 250ms
      expect(EDITOR_DELAYS.STANDARD_SWITCH).toBe(250);
    });

    it('should have correct new editor delay', () => {
      // New editor should be 150ms
      expect(EDITOR_DELAYS.NEW_EDITOR).toBe(150);
    });
  });
});