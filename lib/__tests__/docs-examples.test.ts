/**
 * Phase 79: Documentation Examples Verification Tests
 * Tests that verify code examples from documentation work correctly
 */

import { describe, expect, it } from 'vitest';

// Import all documented modules
import {
  sanitizeFileName,
  getFileExtension,
  getMimeType,
  isValidUrl,
  determineFilename,
} from '../url-utils';
import { encodeToBytes, decodeBytes, concatBytes, hasUtf8Bom } from '../byte-utils';
import { escapeXml, createConversionParams } from '../conversion-utils';
import {
  formatErrorMessage,
  isError,
  isErrorLike,
  createErrorContext,
} from '../error-utils';
import { getDocumentType } from '../document-utils';
import { getNewDocumentTemplate, isNewDocumentSupported } from '../document-template';
import { determineSaveFormat, hasFileExtension } from '../save-format';
import { isEditableFileType, requiresConversion } from '../editor-config';
import { createOperationQueue, DEFAULT_QUEUE_TIMEOUT } from '../operation-queue';

// =============================================================================
// README EXAMPLES VERIFICATION
// =============================================================================

describe('Docs Examples: URL Utilities', () => {
  describe('sanitizeFileName examples', () => {
    it('should work as documented - basic usage', () => {
      // Example from docs
      const result = sanitizeFileName('my<>file.docx');
      expect(result).toBe('myfile.docx');
    });

    it('should work as documented - multiple illegal chars', () => {
      const result = sanitizeFileName('file<>:"/\\|?*.docx');
      expect(result).toBe('file.docx');
    });

    it('should preserve extension', () => {
      const result = sanitizeFileName('document final.docx');
      expect(result).toBe('document final.docx');
    });
  });

  describe('getFileExtension examples', () => {
    it('should work as documented', () => {
      expect(getFileExtension('document.docx')).toBe('docx');
      expect(getFileExtension('spreadsheet.xlsx')).toBe('xlsx');
      expect(getFileExtension('file.with.dots.pdf')).toBe('pdf');
    });

    it('should handle files without extension', () => {
      expect(getFileExtension('README')).toBe('');
    });
  });

  describe('getMimeType examples', () => {
    it('should work as documented', () => {
      expect(getMimeType('docx')).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      expect(getMimeType('xlsx')).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      expect(getMimeType('pdf')).toBe('application/pdf');
    });

    it('should return octet-stream for unknown', () => {
      expect(getMimeType('unknown')).toBe('application/octet-stream');
    });
  });

  describe('isValidUrl examples', () => {
    it('should work as documented', () => {
      expect(isValidUrl('https://example.com/document.docx')).toBe(true);
      expect(isValidUrl('http://localhost:3000/file.xlsx')).toBe(true);
      expect(isValidUrl('not a url')).toBe(false);
    });
  });
});

// =============================================================================
// BYTE UTILITIES EXAMPLES VERIFICATION
// =============================================================================

describe('Docs Examples: Byte Utilities', () => {
  describe('encodeToBytes examples', () => {
    it('should work as documented', () => {
      const bytes = encodeToBytes('Hello, World!');
      expect(bytes).toBeInstanceOf(Uint8Array);
      expect(bytes.length).toBeGreaterThan(0);
    });

    it('should handle unicode', () => {
      const bytes = encodeToBytes('你好世界');
      expect(bytes).toBeInstanceOf(Uint8Array);
      expect(decodeBytes(bytes)).toBe('你好世界');
    });
  });

  describe('decodeBytes examples', () => {
    it('should work as documented', () => {
      const text = 'Test content';
      const bytes = encodeToBytes(text);
      expect(decodeBytes(bytes)).toBe(text);
    });
  });

  describe('concatBytes examples', () => {
    it('should work as documented', () => {
      const a = encodeToBytes('Hello');
      const b = encodeToBytes(' ');
      const c = encodeToBytes('World');
      const combined = concatBytes(concatBytes(a, b), c);
      expect(decodeBytes(combined)).toBe('Hello World');
    });
  });

  describe('BOM handling examples', () => {
    it('should detect BOM', () => {
      const withBom = new Uint8Array([0xEF, 0xBB, 0xBF, 0x48, 0x69]);
      expect(hasUtf8Bom(withBom)).toBe(true);
    });

    it('should not detect BOM in regular content', () => {
      const noBom = encodeToBytes('Hello');
      expect(hasUtf8Bom(noBom)).toBe(false);
    });
  });
});

// =============================================================================
// CONVERSION UTILITIES EXAMPLES VERIFICATION
// =============================================================================

describe('Docs Examples: Conversion Utilities', () => {
  describe('escapeXml examples', () => {
    it('should work as documented', () => {
      expect(escapeXml('<div>Test</div>')).toBe('&lt;div&gt;Test&lt;/div&gt;');
    });

    it('should handle all special characters', () => {
      expect(escapeXml('<>&"\'')).toBe('&lt;&gt;&amp;&quot;&apos;');
    });
  });

  describe('createConversionParams examples', () => {
    it('should work as documented', () => {
      const params = createConversionParams('/input/document.docx', '/output/document.pdf');
      expect(params).toContain('<?xml');
      expect(params).toContain('<m_sFileFrom>');
      expect(params).toContain('<m_sFileTo>');
    });
  });
});

// =============================================================================
// ERROR UTILITIES EXAMPLES VERIFICATION
// =============================================================================

describe('Docs Examples: Error Utilities', () => {
  describe('formatErrorMessage examples', () => {
    it('should work as documented', () => {
      expect(formatErrorMessage(new Error('File not found'))).toBe('File not found');
      expect(formatErrorMessage(null)).toBe('Unknown error');
      expect(formatErrorMessage('Something went wrong')).toBe('Something went wrong');
    });
  });

  describe('isError examples', () => {
    it('should work as documented', () => {
      expect(isError(new Error('test'))).toBe(true);
      expect(isError('error')).toBe(false);
      expect(isError({ message: 'test' })).toBe(false);
    });
  });

  describe('isErrorLike examples', () => {
    it('should work as documented', () => {
      expect(isErrorLike(new Error('test'))).toBe(true);
      expect(isErrorLike({ message: 'test' })).toBe(true);
      expect(isErrorLike('error')).toBe(false);
    });
  });

  describe('createErrorContext examples', () => {
    it('should work as documented', () => {
      const error = new Error('Failed');
      const context = createErrorContext(error, {
        operation: 'documentConversion',
        context: { fileName: 'test.docx' }
      });
      expect(context.message).toBe('Failed');
      expect(context.operation).toBe('documentConversion');
      expect(context.context).toEqual({ fileName: 'test.docx' });
    });
  });
});

// =============================================================================
// DOCUMENT TYPE EXAMPLES VERIFICATION
// =============================================================================

describe('Docs Examples: Document Types', () => {
  describe('getDocumentType examples', () => {
    it('should work as documented', () => {
      expect(getDocumentType('docx')).toBe('word');
      expect(getDocumentType('xlsx')).toBe('cell');
      expect(getDocumentType('pptx')).toBe('slide');
      expect(getDocumentType('pdf')).toBeNull();
    });
  });
});

// =============================================================================
// TEMPLATE EXAMPLES VERIFICATION
// =============================================================================

describe('Docs Examples: Document Templates', () => {
  describe('isNewDocumentSupported examples', () => {
    it('should work as documented', () => {
      expect(isNewDocumentSupported('docx')).toBe(true);
      expect(isNewDocumentSupported('xlsx')).toBe(true);
      expect(isNewDocumentSupported('pptx')).toBe(true);
      expect(isNewDocumentSupported('pdf')).toBe(false);
    });
  });

  describe('getNewDocumentTemplate examples', () => {
    it('should return template for supported formats', () => {
      const template = getNewDocumentTemplate('docx');
      expect(template).toBeTruthy();
      expect(typeof template).toBe('string');
    });
  });
});

// =============================================================================
// SAVE FORMAT EXAMPLES VERIFICATION
// =============================================================================

describe('Docs Examples: Save Formats', () => {
  describe('determineSaveFormat examples', () => {
    it('should work as documented', () => {
      expect(determineSaveFormat(65)).toBe('DOCX');
      expect(determineSaveFormat(257)).toBe('XLSX');
      expect(determineSaveFormat(129)).toBe('PPTX');
    });
  });

  describe('hasFileExtension examples', () => {
    it('should work as documented', () => {
      expect(hasFileExtension('document.docx', 'docx')).toBe(true);
      expect(hasFileExtension('DOCUMENT.DOCX', 'docx')).toBe(true);
      expect(hasFileExtension('document.pdf', 'docx')).toBe(false);
    });
  });
});

// =============================================================================
// EDITOR CONFIG EXAMPLES VERIFICATION
// =============================================================================

describe('Docs Examples: Editor Config', () => {
  describe('isEditableFileType examples', () => {
    it('should work as documented', () => {
      expect(isEditableFileType('docx')).toBe(true);
      expect(isEditableFileType('xlsx')).toBe(true);
      expect(isEditableFileType('pptx')).toBe(true);
      expect(isEditableFileType('pdf')).toBe(true); // Viewable
    });
  });

  describe('requiresConversion examples', () => {
    it('should work as documented', () => {
      expect(requiresConversion('docx')).toBe(false);
      expect(requiresConversion('doc')).toBe(true);
      expect(requiresConversion('xls')).toBe(true);
      expect(requiresConversion('ppt')).toBe(true);
    });
  });
});

// =============================================================================
// OPERATION QUEUE EXAMPLES VERIFICATION
// =============================================================================

describe('Docs Examples: Operation Queue', () => {
  describe('createOperationQueue examples', () => {
    it('should work as documented', async () => {
      const queue = createOperationQueue({ timeout: 30000 });

      // These will run sequentially
      const results: string[] = [];
      await queue(async () => { results.push('first'); });
      await queue(async () => { results.push('second'); });

      expect(results).toEqual(['first', 'second']);
    });

    it('should use default timeout', () => {
      expect(DEFAULT_QUEUE_TIMEOUT).toBe(30000);
    });
  });
});

// =============================================================================
// WORKFLOW EXAMPLES VERIFICATION
// =============================================================================

describe('Docs Examples: Complete Workflows', () => {
  describe('Document loading workflow', () => {
    it('should work as documented', () => {
      // 1. Validate URL
      const url = 'https://example.com/document.docx';
      expect(isValidUrl(url)).toBe(true);

      // 2. Extract filename
      const filename = determineFilename({ url });
      expect(filename).toBeTruthy();

      // 3. Get extension
      const ext = getFileExtension(filename);
      expect(ext).toBe('docx');

      // 4. Get document type
      const docType = getDocumentType(ext);
      expect(docType).toBe('word');

      // 5. Get MIME type
      const mimeType = getMimeType(ext);
      expect(mimeType).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    });
  });

  describe('Error handling workflow', () => {
    it('should work as documented', () => {
      // 1. Create error
      const error = new Error('Document processing failed');

      // 2. Format message
      const message = formatErrorMessage(error);
      expect(message).toBe('Document processing failed');

      // 3. Create context
      const context = createErrorContext(error, {
        operation: 'documentProcessing',
      });
      expect(context.message).toBe('Document processing failed');
      expect(context.operation).toBe('documentProcessing');
    });
  });

  describe('Byte operations workflow', () => {
    it('should work as documented', () => {
      // 1. Encode content
      const content = 'Hello, 世界!';
      const bytes = encodeToBytes(content);

      // 2. Check for BOM
      expect(hasUtf8Bom(bytes)).toBe(false);

      // 3. Decode back
      const decoded = decodeBytes(bytes);
      expect(decoded).toBe(content);
    });
  });
});
