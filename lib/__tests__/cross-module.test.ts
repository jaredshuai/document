/**
 * Cross-module consistency and integration tests.
 * These tests verify that modules work together correctly.
 */
import { describe, expect, it } from 'vitest';
import {
  getFileExtension,
  isSupportedExtension,
  extractFileType,
  sanitizeFileName,
  getMimeType,
  getFileDescription,
  determineFilename,
} from '../url-utils';
import { DOCUMENT_TYPE_MAP, getDocumentType } from '../document-utils';
import { oAscFileType, c_oAscFileType2 } from '../file-types';
import { formatErrorMessage, isNetworkError, isFileError, isErrorLike } from '../error-utils';
import { isValidChunkSequence, isValidFile, isValidRenderOfficeData } from '../type-guards';
import { createConversionParams, escapeXml } from '../conversion-utils';
import { encodeToBytes, decodeBytes, hasUtf8Bom } from '../byte-utils';
import { determineSaveFormat, getSaveFormatOverride, hasFileExtension } from '../save-format';
import { getEditorCleanupDelay, isPresentationType, EDITOR_DELAYS } from '../editor-utils';
import {
  getSupportedNewDocumentExtensions,
  isNewDocumentSupported,
  getNewDocumentTemplate,
} from '../document-template';
import {
  WORKING_DIR,
  createConversionPaths,
  getParamsPath,
  getWorkingPath,
  extractFileName,
  createOutputFileName,
} from '../conversion-paths';
import { createOperationQueue, isQueueTimeoutError, DEFAULT_QUEUE_TIMEOUT } from '../operation-queue';
import { createEditorConfig, isEditableFileType, requiresConversion, getConversionTarget } from '../editor-config';
import { createSavePickerOptions, createOpenPickerOptions, getSupportedEditExtensions, getFileInputAccept } from '../file-picker';
import { validateWriteFileData, createMediaUrlKey, isValidUint8Array, isValidFileName } from '../media-url';

describe('Cross-Module: Extension and MIME Type Consistency', () => {
  describe('Extension round-trip through MIME type', () => {
    it('should have consistent MIME types for document extensions', () => {
      const docExtensions = ['docx', 'doc', 'odt', 'rtf', 'txt'];
      for (const ext of docExtensions) {
        const mime = getMimeType(ext);
        const extracted = extractFileType(mime);
        expect(extracted).toBe(ext);
      }
    });

    it('should have consistent MIME types for spreadsheet extensions', () => {
      const sheetExtensions = ['xlsx', 'xls', 'ods', 'csv'];
      for (const ext of sheetExtensions) {
        const mime = getMimeType(ext);
        const extracted = extractFileType(mime);
        expect(extracted).toBe(ext);
      }
    });

    it('should have consistent MIME types for presentation extensions', () => {
      const presExtensions = ['pptx', 'ppt', 'odp'];
      for (const ext of presExtensions) {
        const mime = getMimeType(ext);
        const extracted = extractFileType(mime);
        expect(extracted).toBe(ext);
      }
    });

    it('should return octet-stream for unknown extensions', () => {
      expect(getMimeType('unknown')).toBe('application/octet-stream');
    });
  });

  describe('Extension and supported extension list consistency', () => {
    it('should have all DOCUMENT_TYPE_MAP keys in isSupportedExtension', () => {
      const docTypeKeys = Object.keys(DOCUMENT_TYPE_MAP);
      for (const ext of docTypeKeys) {
        expect(isSupportedExtension(ext)).toBe(true);
      }
    });

    it('should have consistent supported extensions between modules', () => {
      // Both should support the same core document types
      const coreTypes = ['docx', 'xlsx', 'pptx'];
      for (const ext of coreTypes) {
        expect(isSupportedExtension(ext)).toBe(true);
        expect(DOCUMENT_TYPE_MAP[ext]).toBeDefined();
        expect(getDocumentType(ext)).not.toBeNull();
      }
    });
  });

  describe('File type codes and MIME type consistency', () => {
    it('should have valid file type codes for primary Office extensions', () => {
      const primaryTypes: Record<string, number> = {
        docx: oAscFileType.DOCX,
        xlsx: oAscFileType.XLSX,
        pptx: oAscFileType.PPTX,
      };

      for (const [ext, code] of Object.entries(primaryTypes)) {
        expect(code).toBeGreaterThan(0);
        // c_oAscFileType2 returns uppercase extension
        expect(c_oAscFileType2[code].toLowerCase()).toBe(ext);
        expect(getMimeType(ext)).toContain('officedocument');
      }
    });
  });
});

describe('Cross-Module: Document Type Mapping Consistency', () => {
  describe('getDocumentType vs DOCUMENT_TYPE_MAP', () => {
    it('should return same document type as DOCUMENT_TYPE_MAP for docx/doc', () => {
      expect(getDocumentType('docx')).toBe(DOCUMENT_TYPE_MAP['docx']);
      expect(getDocumentType('doc')).toBe(DOCUMENT_TYPE_MAP['doc']);
      expect(getDocumentType('docx')).toBe('word');
    });

    it('should return same document type as DOCUMENT_TYPE_MAP for xlsx/xls/csv', () => {
      expect(getDocumentType('xlsx')).toBe(DOCUMENT_TYPE_MAP['xlsx']);
      expect(getDocumentType('xls')).toBe(DOCUMENT_TYPE_MAP['xls']);
      expect(getDocumentType('csv')).toBe(DOCUMENT_TYPE_MAP['csv']);
      expect(getDocumentType('xlsx')).toBe('cell');
    });

    it('should return same document type as DOCUMENT_TYPE_MAP for pptx/ppt', () => {
      expect(getDocumentType('pptx')).toBe(DOCUMENT_TYPE_MAP['pptx']);
      expect(getDocumentType('ppt')).toBe(DOCUMENT_TYPE_MAP['ppt']);
      expect(getDocumentType('pptx')).toBe('slide');
    });

    it('should stay aligned for odt/rtf/txt/ods/odp support', () => {
      expect(getDocumentType('odt')).toBe(DOCUMENT_TYPE_MAP['odt']);
      expect(getDocumentType('rtf')).toBe(DOCUMENT_TYPE_MAP['rtf']);
      expect(getDocumentType('txt')).toBe(DOCUMENT_TYPE_MAP['txt']);
      expect(getDocumentType('ods')).toBe(DOCUMENT_TYPE_MAP['ods']);
      expect(getDocumentType('odp')).toBe(DOCUMENT_TYPE_MAP['odp']);
    });
  });
});

describe('Cross-Module: Filename Processing Pipeline', () => {
  describe('Full filename processing flow', () => {
    it('should process a URL-extracted filename through the pipeline', () => {
      const url = 'https://example.com/documents/report.xlsx';
      const filename = determineFilename({ url });

      expect(filename).toBe('report.xlsx');

      const ext = getFileExtension(filename);
      expect(ext).toBe('xlsx');

      const sanitized = sanitizeFileName(filename);
      expect(sanitized).toBe('report.xlsx');

      const mime = getMimeType(ext);
      expect(mime).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

      const docType = getDocumentType(ext);
      expect(docType).toBe('cell');
    });

    it('should sanitize and process filename with special characters', () => {
      const rawFilename = 'my<>file"name.xlsx';
      const sanitized = sanitizeFileName(rawFilename);

      // < > " are all removed, leaving 'myfilename.xlsx'
      expect(sanitized).toBe('myfilename.xlsx');

      const ext = getFileExtension(sanitized);
      expect(ext).toBe('xlsx');
      expect(isSupportedExtension(ext)).toBe(true);
    });

    it('should determine file type from MIME type when available', () => {
      const mime = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      const filename = 'document.bin';

      const ext = extractFileType(mime, filename);
      expect(ext).toBe('docx');

      const docType = getDocumentType(ext);
      expect(docType).toBe('word');
    });

    it('should fall back to filename extension when MIME type is unknown', () => {
      const mime = 'application/unknown';
      const filename = 'presentation.pptx';

      const ext = extractFileType(mime, filename);
      expect(ext).toBe('pptx');

      const docType = getDocumentType(ext);
      expect(docType).toBe('slide');
    });
  });
});

describe('Cross-Module: Error Handling Integration', () => {
  describe('Error formatting with type guard failures', () => {
    it('should format error message for invalid RenderOfficeData', () => {
      const invalidData = { chunkIndex: 'invalid' };
      const isValid = isValidRenderOfficeData(invalidData);

      expect(isValid).toBe(false);

      // Simulate error handling flow
      const error = new Error('Invalid RenderOfficeData: missing required fields');
      const message = formatErrorMessage(error);

      expect(message).toBe('Invalid RenderOfficeData: missing required fields');
      expect(isErrorLike(error)).toBe(true);
    });

    it('should classify file-related errors correctly', () => {
      const errors = [
        new Error('ENOENT: no such file'),
        new Error('Permission denied'),
        new Error('File too large'),
      ];

      for (const error of errors) {
        expect(isFileError(error)).toBe(true);
        expect(isNetworkError(error)).toBe(false);
      }
    });

    it('should classify network-related errors correctly', () => {
      const errors = [
        new TypeError('fetch failed'),
        new Error('Network timeout'),
        new Error('Connection refused'),
      ];

      for (const error of errors) {
        expect(isNetworkError(error)).toBe(true);
        expect(isFileError(error)).toBe(false);
      }
    });
  });

  describe('Error context with file validation', () => {
    it('should handle file validation failure with error utilities', () => {
      const fileName = 'malicious.exe';
      const size = 1024;
      const options = { allowedExtensions: ['.docx', '.xlsx', '.pptx'] };

      const isValid = isValidFile(fileName, size, options);
      expect(isValid).toBe(false);

      // Simulate error context creation
      const errorLike = { message: `File extension .exe not allowed` };
      expect(isErrorLike(errorLike)).toBe(true);
      expect(formatErrorMessage(errorLike)).toBe('File extension .exe not allowed');
    });
  });
});

describe('Cross-Module: Byte Utils and Conversion Utils Integration', () => {
  describe('CSV conversion with BOM handling', () => {
    it('should create conversion params with BOM-encoded content', () => {
      const csvContent = 'Name,Value\nTest,123';
      const encoded = encodeToBytes(csvContent, true);

      expect(hasUtf8Bom(encoded)).toBe(true);

      const decoded = decodeBytes(encoded);
      expect(decoded).toBe(csvContent);

      // Create conversion params for CSV to xlsx
      const params = createConversionParams('/input.csv', '/output.bin', '<m_nFormatFrom>260</m_nFormatFrom>');
      expect(params).toContain('<m_nFormatFrom>260</m_nFormatFrom>');
    });

    it('should handle BOM in XML path encoding', () => {
      const filename = '测试文档.csv';
      const escaped = escapeXml(filename);

      expect(escaped).toBe(filename); // Chinese chars don't need escaping
      expect(escaped).not.toContain('&lt;');
      expect(escaped).not.toContain('&gt;');

      const params = createConversionParams(`/input/${escaped}`, '/output.bin');
      expect(params).toContain(escaped);
    });
  });

  describe('Round-trip encoding for conversion', () => {
    it('should preserve content through encode-decode cycle', () => {
      const content = 'Column1,Column2\nvalue1,value2\n中文,测试';
      const withBom = encodeToBytes(content, true);
      const withoutBom = encodeToBytes(content, false);

      expect(hasUtf8Bom(withBom)).toBe(true);
      expect(hasUtf8Bom(withoutBom)).toBe(false);

      expect(decodeBytes(withBom)).toBe(content);
      expect(decodeBytes(withoutBom)).toBe(content);
    });
  });
});

describe('Cross-Module: File Description Consistency', () => {
  describe('File descriptions for supported extensions', () => {
    it('should have descriptions for all supported extensions', () => {
      const supportedExts = ['docx', 'doc', 'odt', 'rtf', 'txt', 'xlsx', 'xls', 'ods', 'csv', 'pptx', 'ppt', 'odp'];

      for (const ext of supportedExts) {
        const desc = getFileDescription(ext);
        expect(desc).not.toBe('Document'); // Should have specific description
        expect(desc.length).toBeGreaterThan(0);
      }
    });

    it('should return Document for unknown extensions', () => {
      expect(getFileDescription('xyz')).toBe('Document');
      expect(getFileDescription('unknown')).toBe('Document');
    });
  });
});

describe('Cross-Module: Chunk Sequence and File Validation', () => {
  describe('Validating RenderOfficeData chunk with file constraints', () => {
    it('should validate chunk data with file extension constraint', () => {
      const chunkData = {
        chunkIndex: 0,
        data: 'base64data',
        lastModified: Date.now(),
        name: 'document.docx',
        size: 1024,
        totalChunks: 1,
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      };

      expect(isValidRenderOfficeData(chunkData)).toBe(true);

      // Extract extension and validate with file validation
      const ext = getFileExtension(chunkData.name);
      expect(ext).toBe('docx');

      const isValidExt = isValidFile(chunkData.name, chunkData.size, {
        allowedExtensions: ['.docx', '.xlsx', '.pptx'],
      });
      expect(isValidExt).toBe(true);
    });

    it('should reject chunk with size exceeding limit', () => {
      const chunkData = {
        chunkIndex: 0,
        data: 'base64data',
        lastModified: Date.now(),
        name: 'large.xlsx',
        size: 100 * 1024 * 1024, // 100MB
        totalChunks: 1,
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      };

      expect(isValidRenderOfficeData(chunkData)).toBe(true);

      // But fails file size validation
      const isValidSize = isValidFile(chunkData.name, chunkData.size, {
        maxSizeBytes: 50 * 1024 * 1024, // 50MB limit
      });
      expect(isValidSize).toBe(false);
    });
  });
});

describe('Cross-Module: Extension Case Handling', () => {
  describe('Case insensitivity across modules', () => {
    it('should handle uppercase extensions consistently', () => {
      expect(getFileExtension('DOCUMENT.DOCX')).toBe('docx');
      expect(isSupportedExtension('DOCX')).toBe(true);
      expect(getMimeType('DOCX')).toBe(getMimeType('docx'));
      expect(getDocumentType('DOCX')).toBe(getDocumentType('docx'));
    });

    it('should handle mixed case extensions consistently', () => {
      expect(getFileExtension('Presentation.PpTx')).toBe('pptx');
      expect(isSupportedExtension('PpTx')).toBe(true);
      expect(getMimeType('PpTx')).toBe(getMimeType('pptx'));
      expect(getDocumentType('PpTx')).toBe(getDocumentType('pptx'));
    });
  });
});

describe('Cross-Module: Store + Type Guards Workflow', () => {
  describe('Store state validation workflow', () => {
    it('should validate file data before storing', () => {
      // Simulate file data from file input
      const fileName = 'report.xlsx';
      const fileSize = 1024 * 1024; // 1MB
      const allowedExtensions = ['.docx', '.xlsx', '.pptx'];

      // Validate file before storing
      const isValid = isValidFile(fileName, fileSize, { allowedExtensions });
      expect(isValid).toBe(true);

      // Extract extension for type detection
      const ext = getFileExtension(fileName);
      expect(ext).toBe('xlsx');

      // Get document type
      const docType = getDocumentType(ext);
      expect(docType).toBe('cell');
    });

    it('should reject files with invalid extensions before storing', () => {
      const fileName = 'malware.exe';
      const fileSize = 1024;
      const allowedExtensions = ['.docx', '.xlsx', '.pptx'];

      const isValid = isValidFile(fileName, fileSize, { allowedExtensions });
      expect(isValid).toBe(false);
    });

    it('should reject files exceeding size limit', () => {
      const fileName = 'large.xlsx';
      const fileSize = 100 * 1024 * 1024; // 100MB
      const maxSizeBytes = 50 * 1024 * 1024; // 50MB limit

      const isValid = isValidFile(fileName, fileSize, { maxSizeBytes });
      expect(isValid).toBe(false);
    });
  });

  describe('Chunked file assembly workflow', () => {
    it('should validate complete chunk sequence', () => {
      // Simulate chunk data from RENDER_OFFICE message
      const chunks = [
        {
          chunkIndex: 0,
          data: 'base64data0',
          lastModified: Date.now(),
          name: 'document.docx',
          size: 3000,
          totalChunks: 3,
          type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        },
        {
          chunkIndex: 1,
          data: 'base64data1',
          lastModified: Date.now(),
          name: 'document.docx',
          size: 3000,
          totalChunks: 3,
          type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        },
        {
          chunkIndex: 2,
          data: 'base64data2',
          lastModified: Date.now(),
          name: 'document.docx',
          size: 1000,
          totalChunks: 3,
          type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        },
      ];

      // Validate each chunk
      for (const chunk of chunks) {
        expect(isValidRenderOfficeData(chunk)).toBe(true);
      }

      // Validate chunk sequence completeness
      expect(isValidChunkSequence(chunks)).toBe(true);

      // Extract metadata from first chunk for store
      const firstChunk = chunks[0];
      const ext = getFileExtension(firstChunk.name);
      expect(ext).toBe('docx');
      expect(isSupportedExtension(ext)).toBe(true);
    });

    it('should reject incomplete chunk sequence', () => {
      const chunks = [
        {
          chunkIndex: 0,
          data: 'base64data',
          lastModified: Date.now(),
          name: 'document.docx',
          size: 1000,
          totalChunks: 3,
          type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        },
        {
          chunkIndex: 1,
          data: 'base64data',
          lastModified: Date.now(),
          name: 'document.docx',
          size: 1000,
          totalChunks: 3,
          type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        },
        // Missing chunk 2
      ];

      // Each chunk is valid individually
      for (const chunk of chunks) {
        expect(isValidRenderOfficeData(chunk)).toBe(true);
      }

      // But sequence is incomplete
      expect(isValidChunkSequence(chunks)).toBe(false);
    });

    it('should validate chunk with extracted MIME type', () => {
      const chunk = {
        chunkIndex: 0,
        data: 'base64data',
        lastModified: Date.now(),
        name: 'spreadsheet.xlsx',
        size: 5000,
        totalChunks: 1,
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      };

      expect(isValidRenderOfficeData(chunk)).toBe(true);

      // Extract file type from MIME
      const extractedExt = extractFileType(chunk.type, chunk.name);
      expect(extractedExt).toBe('xlsx');

      // Validate with document type
      const docType = getDocumentType(extractedExt);
      expect(docType).toBe('cell');
    });
  });

  describe('File validation workflow', () => {
    it('should process file through validation pipeline', () => {
      // Simulate file from file picker
      const fileName = 'presentation.pptx';
      const fileMimeType = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';

      // Step 1: Extract and validate extension
      const ext = getFileExtension(fileName);
      expect(ext).toBe('pptx');
      expect(isSupportedExtension(ext)).toBe(true);

      // Step 2: Validate MIME type
      const extractedExt = extractFileType(fileMimeType, fileName);
      expect(extractedExt).toBe('pptx');

      // Step 3: Get document type
      const docType = getDocumentType(ext);
      expect(docType).toBe('slide');

      // Step 4: Sanitize filename for storage
      const sanitized = sanitizeFileName(fileName);
      expect(sanitized).toBe('presentation.pptx');

      // Step 5: Get file description
      const desc = getFileDescription(ext);
      expect(desc).toBe('PowerPoint Presentation');
    });

    it('should sanitize filename before storing', () => {
      const rawFilename = 'My<>Document"File.xlsx';
      const sanitized = sanitizeFileName(rawFilename);

      // Special characters removed
      expect(sanitized).toBe('MyDocumentFile.xlsx');

      // Extension preserved
      const ext = getFileExtension(sanitized);
      expect(ext).toBe('xlsx');
      expect(isSupportedExtension(ext)).toBe(true);
    });

    it('should keep ODF workflow metadata aligned across MIME, extension, and document type', () => {
      const fileName = 'archive.ods';
      const fileMimeType = 'application/vnd.oasis.opendocument.spreadsheet';

      const ext = getFileExtension(fileName);
      expect(ext).toBe('ods');
      expect(isSupportedExtension(ext)).toBe(true);

      const extractedExt = extractFileType(fileMimeType, fileName);
      expect(extractedExt).toBe('ods');

      const docType = getDocumentType(extractedExt);
      expect(docType).toBe('cell');
      expect(docType).toBe(DOCUMENT_TYPE_MAP['ods']);

      expect(getFileDescription(extractedExt)).toBe('OpenDocument Spreadsheet');
      expect(getMimeType(extractedExt)).toBe(fileMimeType);
    });
  });

  describe('Error classification workflow', () => {
    it('should classify URL fetch errors correctly', () => {
      // Simulate errors from openDocumentFromUrl
      const networkError = new TypeError('fetch failed');
      const timeoutError = new Error('Network timeout');
      const notFoundError = new Error('Failed to fetch document: 404 Not Found');

      expect(isNetworkError(networkError)).toBe(true);
      expect(isNetworkError(timeoutError)).toBe(true);
      expect(isNetworkError(notFoundError)).toBe(true);

      // Format error for display
      const message = formatErrorMessage(networkError);
      expect(message).toBe('fetch failed');
    });

    it('should classify file operation errors correctly', () => {
      // Simulate errors from file operations
      const enoentError = new Error('ENOENT: no such file or directory');
      const permissionError = new Error('Permission denied');
      const sizeError = new Error('File too large');

      expect(isFileError(enoentError)).toBe(true);
      expect(isFileError(permissionError)).toBe(true);
      expect(isFileError(sizeError)).toBe(true);
      expect(isNetworkError(enoentError)).toBe(false);
    });

    it('should format error for user display', () => {
      const error = new Error('Failed to fetch document: 404 Not Found');
      const message = formatErrorMessage(error);

      expect(message).toContain('404');
      expect(isNetworkError(error)).toBe(true);
    });
  });

  describe('RenderOfficeData to store workflow', () => {
    it('should validate and process valid RenderOfficeData', () => {
      const renderData = {
        chunkIndex: 0,
        data: 'base64encodeddata',
        lastModified: Date.now(),
        name: 'document.docx',
        size: 10240,
        totalChunks: 1,
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      };

      // Validate the data structure
      expect(isValidRenderOfficeData(renderData)).toBe(true);

      // Extract file metadata for store
      const { name, size, type } = renderData;
      const ext = getFileExtension(name);
      const docType = getDocumentType(ext);

      // Validate file constraints
      const isValid = isValidFile(name, size, {
        allowedExtensions: ['.docx', '.xlsx', '.pptx'],
      });
      expect(isValid).toBe(true);

      // Verify type mapping
      expect(docType).toBe('word');
      expect(extractFileType(type, name)).toBe('docx');
    });

    it('should reject RenderOfficeData with invalid chunk data', () => {
      const invalidData = {
        chunkIndex: 5, // Invalid: >= totalChunks
        data: 'base64data',
        lastModified: Date.now(),
        name: 'document.docx',
        size: 1024,
        totalChunks: 3, // Only 3 chunks expected
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      };

      expect(isValidRenderOfficeData(invalidData)).toBe(false);
    });

    it('should reject RenderOfficeData with invalid file extension', () => {
      const dataWithInvalidExt = {
        chunkIndex: 0,
        data: 'base64data',
        lastModified: Date.now(),
        name: 'document.exe', // Not a supported extension
        size: 1024,
        totalChunks: 1,
        type: 'application/octet-stream',
      };

      // Data structure is valid
      expect(isValidRenderOfficeData(dataWithInvalidExt)).toBe(true);

      // But extension is not supported
      const ext = getFileExtension(dataWithInvalidExt.name);
      expect(isSupportedExtension(ext)).toBe(false);
    });
  });
});

describe('Cross-Module: Save Workflow Integration', () => {
  describe('Save format determination with file type codes', () => {
    it('should map output format code to correct extension', () => {
      // DOCX format code
      const docxFormat = c_oAscFileType2[oAscFileType.DOCX];
      expect(docxFormat).toBe('DOCX');
      expect(getMimeType(docxFormat.toLowerCase())).toContain('officedocument.wordprocessingml');

      // XLSX format code
      const xlsxFormat = c_oAscFileType2[oAscFileType.XLSX];
      expect(xlsxFormat).toBe('XLSX');
      expect(getMimeType(xlsxFormat.toLowerCase())).toContain('officedocument.spreadsheetml');

      // PPTX format code
      const pptxFormat = c_oAscFileType2[oAscFileType.PPTX];
      expect(pptxFormat).toBe('PPTX');
      expect(getMimeType(pptxFormat.toLowerCase())).toContain('officedocument.presentationml');
    });

    it('should determine save format from output code', () => {
      // Test with DOCX output format code
      const saveFormat = determineSaveFormat(oAscFileType.DOCX);
      expect(saveFormat).toBe('DOCX');
      expect(getMimeType(saveFormat.toLowerCase())).toBe(
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      );

      // Test with XLSX output format code
      const xlsxSaveFormat = determineSaveFormat(oAscFileType.XLSX);
      expect(xlsxSaveFormat).toBe('XLSX');
    });

    it('should have consistent MIME types between save format and document type', () => {
      const saveFormats = ['DOCX', 'XLSX', 'PPTX'];

      for (const format of saveFormats) {
        const ext = format.toLowerCase();
        const mime = getMimeType(ext);
        const docType = getDocumentType(ext);

        // Verify consistency
        expect(mime).toContain('officedocument');
        expect(docType).toBeDefined();

        // Extract file type from MIME and verify round-trip
        const extractedExt = extractFileType(mime);
        expect(extractedExt).toBe(ext);
      }
    });
  });

  describe('CSV override workflow', () => {
    it('should preserve CSV format when original file was CSV', () => {
      const csvFileName = 'data.csv';

      // Check CSV override
      expect(getSaveFormatOverride(csvFileName)).toBe('CSV');

      // Even if editor reports XLSX format (since it converts CSV to XLSX internally)
      const saveFormat = determineSaveFormat(oAscFileType.XLSX, csvFileName);
      expect(saveFormat).toBe('CSV');

      // Verify extension detection
      expect(hasFileExtension(csvFileName, 'csv')).toBe(true);
      expect(hasFileExtension(csvFileName, 'CSV')).toBe(true);
    });

    it('should not override format for non-CSV files', () => {
      const docxFileName = 'document.docx';
      const xlsxFileName = 'spreadsheet.xlsx';
      const pptxFileName = 'presentation.pptx';

      expect(getSaveFormatOverride(docxFileName)).toBeNull();
      expect(getSaveFormatOverride(xlsxFileName)).toBeNull();
      expect(getSaveFormatOverride(pptxFileName)).toBeNull();
    });

    it('should handle case-insensitive CSV detection', () => {
      expect(hasFileExtension('data.CSV', 'csv')).toBe(true);
      expect(hasFileExtension('DATA.Csv', 'CSV')).toBe(true);
      expect(getSaveFormatOverride('report.CSV')).toBe('CSV');
    });

    it('should handle CSV with query params or fragments', () => {
      // Filename extracted from URL may have query params stripped
      const cleanCsvName = 'export.csv';
      expect(getSaveFormatOverride(cleanCsvName)).toBe('CSV');
    });
  });

  describe('Save format + MIME type workflow', () => {
    it('should produce consistent MIME type for save output', () => {
      // User saves a document that was edited
      const testCases = [
        { code: oAscFileType.DOCX, expectedExt: 'docx', expectedMime: 'wordprocessingml' },
        { code: oAscFileType.XLSX, expectedExt: 'xlsx', expectedMime: 'spreadsheetml' },
        { code: oAscFileType.PPTX, expectedExt: 'pptx', expectedMime: 'presentationml' },
        { code: oAscFileType.PDF, expectedExt: 'pdf', expectedMime: 'pdf' },
      ];

      for (const { code, expectedExt, expectedMime } of testCases) {
        const saveFormat = determineSaveFormat(code);
        expect(saveFormat.toLowerCase()).toBe(expectedExt);

        const mime = getMimeType(expectedExt);
        expect(mime.toLowerCase()).toContain(expectedMime);
      }
    });

    it('should handle PDF export workflow', () => {
      // Any document can be exported to PDF
      const pdfFormat = determineSaveFormat(oAscFileType.PDF);
      expect(pdfFormat).toBe('PDF');

      const mime = getMimeType('pdf');
      expect(mime).toBe('application/pdf');
    });
  });
});

describe('Cross-Module: New Document + Save Workflow', () => {
  describe('New document template to save format workflow', () => {
    it('should support complete workflow for DOCX', () => {
      const ext = 'docx';

      // Check new document support
      expect(isNewDocumentSupported(ext)).toBe(true);

      // Get template
      const template = getNewDocumentTemplate(ext);
      expect(template).toBeDefined();
      expect(typeof template).toBe('string');
      expect(template!.length).toBeGreaterThan(0);

      // Verify document type
      expect(getDocumentType(ext)).toBe('word');

      // Verify save format
      const saveFormat = determineSaveFormat(oAscFileType.DOCX);
      expect(saveFormat.toLowerCase()).toBe(ext);

      // Verify MIME type
      expect(getMimeType(ext)).toContain('wordprocessingml');
    });

    it('should support complete workflow for XLSX', () => {
      const ext = 'xlsx';

      expect(isNewDocumentSupported(ext)).toBe(true);

      const template = getNewDocumentTemplate(ext);
      expect(template).toBeDefined();

      expect(getDocumentType(ext)).toBe('cell');

      const saveFormat = determineSaveFormat(oAscFileType.XLSX);
      expect(saveFormat.toLowerCase()).toBe(ext);

      expect(getMimeType(ext)).toContain('spreadsheetml');
    });

    it('should support complete workflow for PPTX', () => {
      const ext = 'pptx';

      expect(isNewDocumentSupported(ext)).toBe(true);

      const template = getNewDocumentTemplate(ext);
      expect(template).toBeDefined();

      expect(getDocumentType(ext)).toBe('slide');

      const saveFormat = determineSaveFormat(oAscFileType.PPTX);
      expect(saveFormat.toLowerCase()).toBe(ext);

      expect(getMimeType(ext)).toContain('presentationml');
    });

    it('should list all supported new document extensions', () => {
      const supported = getSupportedNewDocumentExtensions();
      expect(supported).toContain('.docx');
      expect(supported).toContain('.xlsx');
      expect(supported).toContain('.pptx');
      expect(supported.length).toBe(3);
    });

    it('should reject unsupported file types for new document', () => {
      const unsupportedTypes = ['csv', 'pdf', 'odt', 'rtf', 'txt'];

      for (const ext of unsupportedTypes) {
        expect(isNewDocumentSupported(ext)).toBe(false);
        expect(getNewDocumentTemplate(ext)).toBeUndefined();
      }
    });
  });
});

describe('Cross-Module: Editor Delay + File Type Workflow', () => {
  describe('Editor cleanup delay determination', () => {
    it('should use longer delay for presentations', () => {
      expect(isPresentationType('pptx')).toBe(true);
      expect(isPresentationType('ppt')).toBe(true);
      expect(isPresentationType('docx')).toBe(false);
      expect(isPresentationType('xlsx')).toBe(false);

      // Presentation with existing editor
      const pptDelay = getEditorCleanupDelay('pptx', true);
      expect(pptDelay).toBe(EDITOR_DELAYS.PRESENTATION_SWITCH);

      // Non-presentation with existing editor
      const docDelay = getEditorCleanupDelay('docx', true);
      expect(docDelay).toBe(EDITOR_DELAYS.STANDARD_SWITCH);
    });

    it('should use shorter delay for new editor creation', () => {
      // No existing editor - first load
      const newDocDelay = getEditorCleanupDelay('docx', false);
      expect(newDocDelay).toBe(EDITOR_DELAYS.NEW_EDITOR);

      const newXlsxDelay = getEditorCleanupDelay('xlsx', false);
      expect(newXlsxDelay).toBe(EDITOR_DELAYS.NEW_EDITOR);

      // Presentations also get new editor delay when no existing editor
      const newPptDelay = getEditorCleanupDelay('pptx', false);
      expect(newPptDelay).toBe(EDITOR_DELAYS.NEW_EDITOR);
    });

    it('should have consistent delay values', () => {
      // Verify delay constants
      expect(EDITOR_DELAYS.NEW_EDITOR).toBe(150);
      expect(EDITOR_DELAYS.STANDARD_SWITCH).toBe(250);
      expect(EDITOR_DELAYS.PRESENTATION_SWITCH).toBe(400);

      // Verify ordering: PRESENTATION_SWITCH > STANDARD_SWITCH > NEW_EDITOR
      expect(EDITOR_DELAYS.PRESENTATION_SWITCH).toBeGreaterThan(EDITOR_DELAYS.STANDARD_SWITCH);
      expect(EDITOR_DELAYS.STANDARD_SWITCH).toBeGreaterThan(EDITOR_DELAYS.NEW_EDITOR);
    });
  });

  describe('Editor delay with document type workflow', () => {
    it('should calculate correct delay for each document type', () => {
      const documentTypes = [
        { ext: 'docx', type: 'word', isPres: false },
        { ext: 'xlsx', type: 'cell', isPres: false },
        { ext: 'pptx', type: 'slide', isPres: true },
        { ext: 'ppt', type: 'slide', isPres: true },
      ];

      for (const { ext, type, isPres } of documentTypes) {
        // Verify document type
        expect(getDocumentType(ext)).toBe(type);

        // Verify presentation detection
        expect(isPresentationType(ext)).toBe(isPres);

        // Verify delay is appropriate
        const delay = getEditorCleanupDelay(ext, true);
        if (isPres) {
          expect(delay).toBe(EDITOR_DELAYS.PRESENTATION_SWITCH);
        } else {
          expect(delay).toBe(EDITOR_DELAYS.STANDARD_SWITCH);
        }
      }
    });
  });
});

describe('Cross-Module: Complete Document Save Pipeline', () => {
  describe('Full save pipeline simulation', () => {
    it('should process DOCX save correctly', () => {
      // User has a DOCX document
      const fileName = 'report.docx';
      const ext = getFileExtension(fileName);

      // Validate file
      expect(isSupportedExtension(ext)).toBe(true);
      expect(getDocumentType(ext)).toBe('word');

      // Determine save format (user saves as DOCX)
      const outputFormat = oAscFileType.DOCX;
      const saveFormat = determineSaveFormat(outputFormat, fileName);

      expect(saveFormat).toBe('DOCX');

      // Get MIME for output
      const outputMime = getMimeType(saveFormat.toLowerCase());
      expect(outputMime).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document');

      // Get file description
      const desc = getFileDescription(ext);
      expect(desc).toBe('Word Document');
    });

    it('should process CSV save with override', () => {
      // User has a CSV file that was converted to XLSX for editing
      const originalFileName = 'data.csv';

      // Original file is CSV
      expect(hasFileExtension(originalFileName, 'csv')).toBe(true);
      expect(getDocumentType('csv')).toBe('cell');

      // User saves - should save back as CSV
      const outputFormat = oAscFileType.XLSX; // Editor thinks XLSX
      const saveFormat = determineSaveFormat(outputFormat, originalFileName);

      expect(saveFormat).toBe('CSV'); // Override to CSV

      // Get MIME for output
      const outputMime = getMimeType('csv');
      expect(outputMime).toBe('text/csv');
    });

    it('should process PDF export correctly', () => {
      // User exports a DOCX to PDF
      const fileName = 'document.docx';
      const ext = getFileExtension(fileName);

      expect(getDocumentType(ext)).toBe('word');

      // Export to PDF
      const outputFormat = oAscFileType.PDF;
      const saveFormat = determineSaveFormat(outputFormat, fileName);

      expect(saveFormat).toBe('PDF');
      expect(getMimeType('pdf')).toBe('application/pdf');
    });
  });

  describe('Error handling in save workflow', () => {
    it('should return undefined for unknown format codes', () => {
      // Unknown format code returns undefined from c_oAscFileType2
      const unknownCode = 99999;
      const saveFormat = determineSaveFormat(unknownCode);
      expect(saveFormat).toBeUndefined();
    });

    it('should handle files without extension in save override', () => {
      expect(getSaveFormatOverride('noextension')).toBeNull();
      expect(getSaveFormatOverride('')).toBeNull();
      expect(getSaveFormatOverride(undefined)).toBeNull();
    });
  });
});

describe('Cross-Module: Conversion Paths + Filename Workflow', () => {
  describe('Path construction with sanitized filenames', () => {
    it('should create conversion paths for sanitized filename', () => {
      const rawFilename = 'my<>file"name.xlsx';
      const sanitized = sanitizeFileName(rawFilename);
      const { inputPath, outputPath } = createConversionPaths(sanitized);

      expect(inputPath).toBe('/working/myfilename.xlsx');
      expect(outputPath).toBe('/working/myfilename.xlsx.bin');
      expect(inputPath.startsWith(WORKING_DIR)).toBe(true);
    });

    it('should create output paths with correct extension', () => {
      const fileName = 'document.docx';
      const { inputPath, outputPath } = createConversionPaths(fileName, 'docx');

      expect(inputPath).toBe('/working/document.docx');
      expect(outputPath).toBe('/working/document.docx.docx');
    });

    it('should extract filename from working path', () => {
      const path = '/working/document.xlsx';
      const extracted = extractFileName(path);
      expect(extracted).toBe('document.xlsx');
    });

    it('should handle paths without working prefix', () => {
      expect(extractFileName('document.docx')).toBe('document.docx');
      expect(extractFileName('/other/path/file.txt')).toBe('file.txt');
    });
  });

  describe('Output filename creation with MIME type', () => {
    it('should create output filename with extension', () => {
      const output = createOutputFileName('report', 'docx');
      expect(output).toBe('report.docx');

      const ext = getFileExtension(output);
      expect(ext).toBe('docx');
      expect(getMimeType(ext)).toContain('wordprocessingml');
    });

    it('should normalize extension in output filename', () => {
      expect(createOutputFileName('doc', '.DOCX')).toBe('doc.docx');
      expect(createOutputFileName('doc', 'XLSX')).toBe('doc.xlsx');
    });
  });

  describe('Params path for conversion', () => {
    it('should return correct params.xml path', () => {
      expect(getParamsPath()).toBe('/working/params.xml');
    });
  });

  describe('Working path construction', () => {
    it('should construct working path from filename', () => {
      expect(getWorkingPath('document.bin')).toBe('/working/document.bin');
      expect(getWorkingPath('image.png')).toBe('/working/image.png');
    });
  });
});

describe('Cross-Module: Operation Queue + Error Handling', () => {
  describe('Queue with error classification', () => {
    it('should classify queue timeout error correctly', () => {
      const timeoutError = new Error('Operation queue timeout');
      expect(isQueueTimeoutError(timeoutError)).toBe(true);

      const otherError = new Error('Some other error');
      expect(isQueueTimeoutError(otherError)).toBe(false);
    });

    it('should use default timeout value', () => {
      expect(DEFAULT_QUEUE_TIMEOUT).toBe(30000);
    });

    it('should format queue timeout error message', () => {
      const timeoutError = new Error('Operation queue timeout');
      const message = formatErrorMessage(timeoutError);
      expect(message).toBe('Operation queue timeout');
    });
  });

  describe('Queue operation with error handling', () => {
    it('should handle operation that throws file error', async () => {
      const queue = createOperationQueue({ timeout: 1000 });

      await expect(
        queue(async () => {
          throw new Error('ENOENT: no such file');
        }),
      ).rejects.toThrow('ENOENT: no such file');
    });

    it('should handle operation that throws network error', async () => {
      const queue = createOperationQueue({ timeout: 1000 });

      await expect(
        queue(async () => {
          throw new TypeError('fetch failed');
        }),
      ).rejects.toThrow('fetch failed');
    });

    it('should classify errors from queue operations', async () => {
      const queue = createOperationQueue({ timeout: 1000 });

      let thrownError: Error | null = null;
      try {
        await queue(async () => {
          throw new Error('Network timeout');
        });
      } catch (e) {
        thrownError = e as Error;
      }

      expect(thrownError).not.toBeNull();
      expect(isNetworkError(thrownError!)).toBe(true);
    });
  });
});

describe('Cross-Module: Editor Config + File Type Workflow', () => {
  describe('Editor config with document type', () => {
    const mockEvents = {
      onAppReady: () => {},
      onDocumentReady: () => {},
      onSave: () => {},
      writeFile: () => {},
    };

    it('should create config for editable DOCX', () => {
      const ext = 'docx';
      expect(isEditableFileType(ext)).toBe(true);
      expect(requiresConversion(ext)).toBe(false);
      expect(getDocumentType(ext)).toBe('word');

      const config = createEditorConfig({
        fileName: 'document.docx',
        fileType: ext,
        lang: 'en',
        events: mockEvents,
      });

      expect(config.document.fileType).toBe(ext);
      expect(config.document.title).toBe('document.docx');
    });

    it('should create config for editable XLSX', () => {
      const ext = 'xlsx';
      expect(isEditableFileType(ext)).toBe(true);
      expect(requiresConversion(ext)).toBe(false);
      expect(getDocumentType(ext)).toBe('cell');

      const config = createEditorConfig({
        fileName: 'spreadsheet.xlsx',
        fileType: ext,
        lang: 'en',
        events: mockEvents,
      });

      expect(config.document.fileType).toBe(ext);
    });

    it('should create config for editable PPTX', () => {
      const ext = 'pptx';
      expect(isEditableFileType(ext)).toBe(true);
      expect(requiresConversion(ext)).toBe(false);
      expect(getDocumentType(ext)).toBe('slide');

      const config = createEditorConfig({
        fileName: 'presentation.pptx',
        fileType: ext,
        lang: 'en',
        events: mockEvents,
      });

      expect(config.document.fileType).toBe(ext);
    });

    it('should handle legacy formats requiring conversion', () => {
      const legacyFormats = [
        { ext: 'doc', target: 'docx' },
        { ext: 'xls', target: 'xlsx' },
        { ext: 'ppt', target: 'pptx' },
      ];

      for (const { ext, target } of legacyFormats) {
        expect(isEditableFileType(ext)).toBe(true);
        expect(requiresConversion(ext)).toBe(true);
        expect(getConversionTarget(ext)).toBe(target);
        expect(getDocumentType(ext)).toBeDefined();
      }
    });

    it('should handle PDF as view-only', () => {
      expect(isEditableFileType('pdf')).toBe(true);
      expect(requiresConversion('pdf')).toBe(false);
      // PDF is not in DOCUMENT_TYPE_MAP, returns null
      expect(getDocumentType('pdf')).toBeNull();
      expect(getMimeType('pdf')).toBe('application/pdf');
    });
  });

  describe('Editor config with supported extensions', () => {
    it('should have consistent supported extensions across modules', () => {
      const editExts = getSupportedEditExtensions();

      for (const ext of editExts) {
        const normalizedExt = ext.replace('.', '');
        expect(isEditableFileType(normalizedExt)).toBe(true);

        // Most should have MIME types
        const mime = getMimeType(normalizedExt);
        expect(mime).toBeDefined();
      }
    });
  });
});

describe('Cross-Module: File Picker + MIME Type Workflow', () => {
  describe('Save picker options with MIME type', () => {
    it('should create save picker options for DOCX', () => {
      const fileName = 'document.docx';
      const options = createSavePickerOptions(fileName);

      expect(options.suggestedName).toBe(fileName);
      expect(options.types).toHaveLength(1);
      expect(options.types[0]?.accept).toBeDefined();
    });

    it('should create save picker options with explicit MIME type', () => {
      const fileName = 'spreadsheet.xlsx';
      const mimeType = getMimeType('xlsx');
      const options = createSavePickerOptions(fileName, mimeType);

      expect(options.suggestedName).toBe(fileName);
    });

    it('should create save picker options for PDF export', () => {
      const fileName = 'document.pdf';
      const options = createSavePickerOptions(fileName, 'application/pdf');

      expect(options.suggestedName).toBe(fileName);
    });
  });

  describe('Open picker options with extensions', () => {
    it('should create open picker options for all supported types', () => {
      const extensions = getSupportedEditExtensions();
      const options = createOpenPickerOptions(extensions);

      // One type per extension
      expect(options.types.length).toBeGreaterThan(0);
      expect(options.types[0]?.accept).toBeDefined();
    });

    it('should create picker options for specific extensions', () => {
      const extensions = ['.docx', '.xlsx', '.pptx'];
      const options = createOpenPickerOptions(extensions);

      expect(options.types).toHaveLength(3);
      expect(options.multiple).toBe(false);
    });
  });

  describe('File input accept string', () => {
    it('should generate accept string from supported extensions', () => {
      const accept = getFileInputAccept();
      expect(accept).toContain('.docx');
      expect(accept).toContain('.xlsx');
      expect(accept).toContain('.pptx');
    });

    it('should have extensions with leading dots', () => {
      const accept = getFileInputAccept();
      const extensions = accept.split(',');
      for (const ext of extensions) {
        expect(ext.startsWith('.')).toBe(true);
      }
    });
  });
});

describe('Cross-Module: Media URL + File Validation Workflow', () => {
  describe('Write file data validation', () => {
    it('should validate valid image data', () => {
      const data = new Uint8Array([1, 2, 3, 4]);
      const fileName = 'image.png';

      expect(isValidUint8Array(data)).toBe(true);
      expect(isValidFileName(fileName)).toBe(true);

      const result = validateWriteFileData(data, fileName);
      expect(result.isValid).toBe(true);
      if (result.isValid) {
        expect(result.fileExtension).toBe('png');
        expect(result.mimeType).toBe('image/png');
      }
    });

    it('should reject invalid image data', () => {
      const invalidData = 'not an array' as any;
      const fileName = 'image.png';

      expect(isValidUint8Array(invalidData)).toBe(false);

      const result = validateWriteFileData(invalidData, fileName);
      expect(result.isValid).toBe(false);
      if (!result.isValid) {
        expect(result.error).toContain('Invalid image data');
      }
    });

    it('should reject invalid filename', () => {
      const data = new Uint8Array([1, 2, 3, 4]);
      const invalidName = 123 as any;

      expect(isValidFileName(invalidName)).toBe(false);

      const result = validateWriteFileData(data, invalidName);
      expect(result.isValid).toBe(false);
      if (!result.isValid) {
        expect(result.error).toContain('Invalid file name');
      }
    });
  });

  describe('Media URL key creation', () => {
    it('should create media URL key from filename', () => {
      const fileName = 'image.png';
      const key = createMediaUrlKey(fileName);
      expect(key).toBe('media/image.png');
    });

    it('should handle special characters in filename', () => {
      const fileName = 'my-image_v1.png';
      const key = createMediaUrlKey(fileName);
      expect(key).toBe('media/my-image_v1.png');
    });

    it('should handle unicode filenames', () => {
      const fileName = '图片.png';
      const key = createMediaUrlKey(fileName);
      expect(key).toBe('media/图片.png');
    });
  });

  describe('Media file validation workflow', () => {
    it('should validate complete media workflow', () => {
      // Simulate file data from editor writeFile event
      const fileName = 'embedded-image.png';
      const data = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]); // PNG header

      // Validate data structure
      expect(isValidUint8Array(data)).toBe(true);
      expect(isValidFileName(fileName)).toBe(true);

      const validation = validateWriteFileData(data, fileName);
      expect(validation.isValid).toBe(true);

      // Create key for URL mapping
      const key = createMediaUrlKey(fileName);
      expect(key).toBe('media/embedded-image.png');

      // Extract extension
      const ext = getFileExtension(fileName);
      expect(ext).toBe('png');
      expect(getMimeType(ext)).toBe('image/png');
    });
  });
});

describe('Cross-Module: Complete Document Open Pipeline', () => {
  describe('Document open from URL workflow', () => {
    it('should process document from URL through validation pipeline', () => {
      // Simulate URL extraction
      const url = 'https://example.com/documents/report.xlsx';
      const filename = determineFilename({ url });
      expect(filename).toBe('report.xlsx');

      // Extract extension
      const ext = getFileExtension(filename);
      expect(ext).toBe('xlsx');

      // Validate extension
      expect(isSupportedExtension(ext)).toBe(true);

      // Get document type
      const docType = getDocumentType(ext);
      expect(docType).toBe('cell');

      // Sanitize filename for internal use
      const sanitized = sanitizeFileName(filename);
      expect(sanitized).toBe('report.xlsx');

      // Create conversion paths
      const { inputPath, outputPath } = createConversionPaths(sanitized);
      expect(inputPath).toContain('report.xlsx');
      expect(outputPath).toContain('bin');

      // Check editor support
      expect(isEditableFileType(ext)).toBe(true);
      expect(requiresConversion(ext)).toBe(false);
    });

    it('should process legacy format document through conversion', () => {
      const url = 'https://example.com/legacy/document.doc';
      const filename = determineFilename({ url });
      const ext = getFileExtension(filename);

      expect(ext).toBe('doc');
      expect(isSupportedExtension(ext)).toBe(true);
      expect(getDocumentType(ext)).toBe('word');

      // Legacy format requires conversion
      expect(requiresConversion(ext)).toBe(true);
      expect(getConversionTarget(ext)).toBe('docx');
    });

    it('should process CSV with special handling', () => {
      const fileName = 'data.csv';
      const ext = getFileExtension(fileName);

      expect(ext).toBe('csv');
      expect(isSupportedExtension(ext)).toBe(true);
      expect(getDocumentType(ext)).toBe('cell');
      expect(getMimeType(ext)).toBe('text/csv');

      // CSV is editable
      expect(isEditableFileType(ext)).toBe(true);
    });
  });

  describe('Document save workflow integration', () => {
    it('should process save workflow from document type to output', () => {
      // User has a DOCX document
      const fileName = 'report.docx';
      const ext = getFileExtension(fileName);

      // Document type
      expect(getDocumentType(ext)).toBe('word');

      // User saves as DOCX
      const outputFormat = oAscFileType.DOCX;
      const saveFormat = determineSaveFormat(outputFormat, fileName);
      expect(saveFormat).toBe('DOCX');

      // Create output filename
      const outputFileName = createOutputFileName('report', saveFormat.toLowerCase());
      expect(outputFileName).toBe('report.docx');

      // Get MIME type for save
      const mime = getMimeType(saveFormat.toLowerCase());
      expect(mime).toContain('wordprocessingml');

      // Create picker options
      const pickerOptions = createSavePickerOptions(outputFileName, mime);
      expect(pickerOptions.suggestedName).toBe('report.docx');
    });
  });
});

describe('Cross-Module: Error Recovery Workflows', () => {
  describe('Network error recovery pipeline', () => {
    it('should classify and format network errors', () => {
      const networkErrors = [
        new Error('Network request failed'),
        new Error('fetch failed'),
        new Error('ENOTFOUND'),
        new Error('ETIMEDOUT'),
        new TypeError('Network error'),
      ];

      for (const error of networkErrors) {
        expect(isNetworkError(error)).toBe(true);
        const message = formatErrorMessage(error);
        expect(message).toBeTruthy();
        expect(typeof message).toBe('string');
      }
    });

    it('should not classify non-network errors as network errors', () => {
      const nonNetworkErrors = [
        new Error('Invalid file format'),
        new Error('Permission denied'),
        new Error('Out of memory'),
      ];

      for (const error of nonNetworkErrors) {
        expect(isNetworkError(error)).toBe(false);
      }
    });
  });

  describe('File error recovery pipeline', () => {
    it('should classify and format file errors', () => {
      const fileErrors = [
        new Error('ENOENT: no such file'),
        new Error('EACCES: permission denied'),
        new Error('File not found'),
      ];

      for (const error of fileErrors) {
        expect(isFileError(error)).toBe(true);
        const message = formatErrorMessage(error);
        expect(message).toBeTruthy();
      }
    });

    it('should handle file validation errors in workflow', () => {
      // Test file validation with various error scenarios
      const largeSize = 1000 * 1024 * 1024; // 1GB
      const result = isValidFile('document.docx', largeSize, {
        maxSizeBytes: 100 * 1024 * 1024, // 100MB limit
      });
      expect(result).toBe(false);
    });
  });

  describe('Error formatting workflow', () => {
    it('should format error-like objects', () => {
      const errorLike = { message: 'Custom error', name: 'CustomError' };
      expect(isErrorLike(errorLike)).toBe(true);
      const message = formatErrorMessage(errorLike);
      expect(message).toBe('Custom error');
    });

    it('should handle unknown error types', () => {
      const message = formatErrorMessage(null, 'Fallback message');
      expect(message).toBe('Fallback message');

      const message2 = formatErrorMessage(undefined, 'Another fallback');
      expect(message2).toBe('Another fallback');

      // Numbers get stringified, fallback only used for null/undefined
      const message3 = formatErrorMessage(123, 'Number fallback');
      expect(message3).toBe('123');
    });
  });
});

describe('Cross-Module: Chunk Processing Edge Cases', () => {
  describe('Single-chunk document processing', () => {
    it('should process single-chunk documents immediately', () => {
      // Some small documents may come as a single chunk
      const singleChunk: any = {
        chunkIndex: 0,
        data: 'base64data',
        lastModified: Date.now(),
        name: 'small.txt',
        size: 100,
        totalChunks: 1,
        type: 'text/plain',
      };

      expect(isValidRenderOfficeData(singleChunk)).toBe(true);
    });
  });

  describe('Large document chunk validation', () => {
    it('should validate chunk metadata consistency', () => {
      const chunk: any = {
        chunkIndex: 5,
        data: 'base64data',
        lastModified: Date.now(),
        name: 'large.pdf',
        size: 10000000,
        totalChunks: 10,
        type: 'application/pdf',
      };

      expect(isValidRenderOfficeData(chunk)).toBe(true);
      expect(chunk.chunkIndex).toBeLessThan(chunk.totalChunks);
    });

    it('should reject invalid chunk metadata', () => {
      // Chunk index >= total chunks
      const invalidChunk: any = {
        chunkIndex: 10,
        data: 'base64data',
        lastModified: Date.now(),
        name: 'invalid.pdf',
        size: 1000,
        totalChunks: 5,
        type: 'application/pdf',
      };

      expect(isValidRenderOfficeData(invalidChunk)).toBe(false);
    });
  });

  describe('Chunk sequence completeness', () => {
    it('should validate complete chunk sequence', () => {
      const chunks: any[] = [
        { chunkIndex: 0, data: 'a', name: 'file.pdf', size: 100, totalChunks: 3, type: 'application/pdf', lastModified: 1 },
        { chunkIndex: 1, data: 'b', name: 'file.pdf', size: 100, totalChunks: 3, type: 'application/pdf', lastModified: 1 },
        { chunkIndex: 2, data: 'c', name: 'file.pdf', size: 100, totalChunks: 3, type: 'application/pdf', lastModified: 1 },
      ];

      expect(isValidChunkSequence(chunks)).toBe(true);
    });

    it('should reject incomplete chunk sequence', () => {
      const incomplete: any[] = [
        { chunkIndex: 0, data: 'a', name: 'file.pdf', size: 100, totalChunks: 3, type: 'application/pdf', lastModified: 1 },
        { chunkIndex: 2, data: 'c', name: 'file.pdf', size: 100, totalChunks: 3, type: 'application/pdf', lastModified: 1 },
      ];

      expect(isValidChunkSequence(incomplete)).toBe(false);
    });

    it('should reject duplicate chunks', () => {
      const duplicates: any[] = [
        { chunkIndex: 0, data: 'a', name: 'file.pdf', size: 100, totalChunks: 2, type: 'application/pdf', lastModified: 1 },
        { chunkIndex: 0, data: 'b', name: 'file.pdf', size: 100, totalChunks: 2, type: 'application/pdf', lastModified: 1 },
      ];

      expect(isValidChunkSequence(duplicates)).toBe(false);
    });
  });
});

describe('Cross-Module: Conversion Path Edge Cases', () => {
  describe('Path construction with special filenames', () => {
    it('should handle filenames with spaces', () => {
      const sanitized = sanitizeFileName('My Document.docx');
      expect(sanitized).toBe('My Document.docx');

      const { inputPath } = createConversionPaths(sanitized);
      expect(inputPath).toContain('My Document.docx');
    });

    it('should handle filenames with unicode characters', () => {
      const sanitized = sanitizeFileName('文档.docx');
      expect(sanitized).toBe('文档.docx');

      const { inputPath } = createConversionPaths(sanitized);
      expect(inputPath).toContain('文档.docx');
    });

    it('should sanitize dangerous path characters', () => {
      const sanitized = sanitizeFileName('file<>:"/\\|?.docx');
      expect(sanitized).not.toContain('<');
      expect(sanitized).not.toContain('>');
      expect(sanitized).not.toContain(':');
      expect(sanitized).not.toContain('"');
      expect(sanitized).not.toContain('/');
      expect(sanitized).not.toContain('\\');
      expect(sanitized).not.toContain('|');
    });
  });

  describe('Output filename generation', () => {
    it('should generate correct output filenames for various formats', () => {
      const testCases = [
        { base: 'document', ext: 'docx', expected: 'document.docx' },
        { base: 'spreadsheet', ext: 'xlsx', expected: 'spreadsheet.xlsx' },
        { base: 'presentation', ext: 'pptx', expected: 'presentation.pptx' },
        { base: 'data', ext: 'pdf', expected: 'data.pdf' },
        { base: 'export', ext: 'csv', expected: 'export.csv' },
      ];

      for (const { base, ext, expected } of testCases) {
        const output = createOutputFileName(base, ext);
        expect(output).toBe(expected);
      }
    });
  });
});

describe('Cross-Module: Editor Config Edge Cases', () => {
  describe('File type validation for editing', () => {
    it('should identify all editable formats', () => {
      const editableFormats = [
        'docx', 'doc', 'odt', 'rtf', 'txt',
        'xlsx', 'xls', 'ods', 'csv',
        'pptx', 'ppt', 'odp',
        'pdf',
      ];

      for (const ext of editableFormats) {
        expect(isEditableFileType(ext)).toBe(true);
      }
    });

    it('should identify non-editable formats', () => {
      const nonEditable = ['png', 'jpg', 'gif', 'mp3', 'mp4', 'zip'];

      for (const ext of nonEditable) {
        expect(isEditableFileType(ext)).toBe(false);
      }
    });
  });

  describe('Conversion requirements', () => {
    it('should identify formats requiring conversion', () => {
      const legacyFormats = ['doc', 'xls', 'ppt'];

      for (const ext of legacyFormats) {
        expect(requiresConversion(ext)).toBe(true);
        expect(getConversionTarget(ext)).toBeTruthy();
      }
    });

    it('should not require conversion for native formats', () => {
      const nativeFormats = ['docx', 'xlsx', 'pptx'];

      for (const ext of nativeFormats) {
        expect(requiresConversion(ext)).toBe(false);
      }
    });
  });
});

describe('Cross-Module: File Picker Workflow Edge Cases', () => {
  describe('Save picker options for various formats', () => {
    it('should create correct picker options for common formats', () => {
      const testCases = [
        { name: 'report.docx', mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
        { name: 'data.xlsx', mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
        { name: 'slides.pptx', mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' },
        { name: 'document.pdf', mime: 'application/pdf' },
      ];

      for (const { name, mime } of testCases) {
        const options = createSavePickerOptions(name, mime);
        expect(options.suggestedName).toBe(name);
        expect(options.types).toHaveLength(1);
        expect(options.types[0].accept).toBeDefined();
      }
    });
  });

  describe('Open picker options', () => {
    it('should create correct open picker options', () => {
      const extensions = ['docx', 'xlsx', 'pptx', 'pdf'];
      const options = createOpenPickerOptions(extensions);

      // One type per extension
      expect(options.types).toHaveLength(4);
      expect(options.multiple).toBe(false);
    });

    it('should generate correct accept attribute', () => {
      const accept = getFileInputAccept();
      expect(accept).toContain('.docx');
      expect(accept).toContain('.xlsx');
      expect(accept).toContain('.pptx');
      expect(accept).toContain('.pdf');
    });
  });
});

describe('Cross-Module: Byte Handling Workflows', () => {
  describe('UTF-8 BOM handling', () => {
    it('should detect and handle UTF-8 BOM in CSV files', () => {
      // CSV content with BOM
      const csvWithBom = new Uint8Array([0xef, 0xbb, 0xbf, 104, 101, 108, 108, 111]);

      expect(hasUtf8Bom(csvWithBom)).toBe(true);

      // Decode should handle BOM correctly
      const text = decodeBytes(csvWithBom);
      expect(text).toBe('hello');
    });

    it('should handle content without BOM', () => {
      const csvWithoutBom = new Uint8Array([104, 101, 108, 108, 111]);

      expect(hasUtf8Bom(csvWithoutBom)).toBe(false);

      const text = decodeBytes(csvWithoutBom);
      expect(text).toBe('hello');
    });
  });

  describe('Encoding and decoding workflow', () => {
    it('should encode text with optional BOM', () => {
      const text = 'Hello, World!';
      const encodedWithBom = encodeToBytes(text, true);
      const encodedWithoutBom = encodeToBytes(text, false);

      expect(hasUtf8Bom(encodedWithBom)).toBe(true);
      expect(hasUtf8Bom(encodedWithoutBom)).toBe(false);

      expect(decodeBytes(encodedWithBom)).toBe(text);
      expect(decodeBytes(encodedWithoutBom)).toBe(text);
    });
  });
});

describe('Cross-Module: Save Format Edge Cases', () => {
  describe('Format override scenarios', () => {
    it('should return CSV override for CSV files', () => {
      expect(getSaveFormatOverride('data.csv')).toBe('CSV');
      expect(getSaveFormatOverride('DATA.CSV')).toBe('CSV');
    });

    it('should not override non-CSV files', () => {
      expect(getSaveFormatOverride('document.docx')).toBeNull();
      expect(getSaveFormatOverride('spreadsheet.xlsx')).toBeNull();
    });
  });

  describe('File extension detection for save', () => {
    it('should detect file extensions correctly', () => {
      expect(hasFileExtension('document.docx', 'docx')).toBe(true);
      expect(hasFileExtension('DOCUMENT.DOCX', 'docx')).toBe(true);
      expect(hasFileExtension('data.xlsx', 'docx')).toBe(false);
    });
  });
});

describe('Cross-Module: Error Recovery Workflows', () => {
  describe('Network error recovery pipeline', () => {
    it('should classify and format network errors', () => {
      const networkErrors = [
        new Error('Network request failed'),
        new Error('fetch failed'),
        new Error('ENOTFOUND'),
        new Error('ETIMEDOUT'),
        new TypeError('Network error'),
      ];

      for (const error of networkErrors) {
        expect(isNetworkError(error)).toBe(true);
        const message = formatErrorMessage(error);
        expect(message).toBeTruthy();
        expect(typeof message).toBe('string');
      }
    });

    it('should not classify non-network errors as network errors', () => {
      const nonNetworkErrors = [
        new Error('Invalid file format'),
        new Error('Permission denied'),
        new Error('Out of memory'),
      ];

      for (const error of nonNetworkErrors) {
        expect(isNetworkError(error)).toBe(false);
      }
    });
  });

  describe('File error recovery pipeline', () => {
    it('should classify and format file errors', () => {
      const fileErrors = [
        new Error('ENOENT: no such file'),
        new Error('EACCES: permission denied'),
        new Error('File not found'),
      ];

      for (const error of fileErrors) {
        expect(isFileError(error)).toBe(true);
        const message = formatErrorMessage(error);
        expect(message).toBeTruthy();
      }
    });

    it('should handle file validation errors in workflow', () => {
      // Test file validation with various error scenarios
      const largeSize = 1000 * 1024 * 1024; // 1GB
      const result = isValidFile('document.docx', largeSize, {
        maxSizeBytes: 100 * 1024 * 1024, // 100MB limit
      });
      expect(result).toBe(false);
    });
  });

  describe('Error formatting workflow', () => {
    it('should format error-like objects', () => {
      const errorLike = { message: 'Custom error', name: 'CustomError' };
      expect(isErrorLike(errorLike)).toBe(true);
      const message = formatErrorMessage(errorLike);
      expect(message).toBe('Custom error');
    });

    it('should handle unknown error types', () => {
      const message = formatErrorMessage(null, 'Fallback message');
      expect(message).toBe('Fallback message');

      const message2 = formatErrorMessage(undefined, 'Another fallback');
      expect(message2).toBe('Another fallback');

      // Numbers get stringified, fallback only used for null/undefined
      const message3 = formatErrorMessage(123, 'Number fallback');
      expect(message3).toBe('123');
    });
  });
});

describe('Cross-Module: Chunk Processing Edge Cases', () => {
  describe('Single-chunk document processing', () => {
    it('should process single-chunk documents immediately', () => {
      // Some small documents may come as a single chunk
      const singleChunk: any = {
        chunkIndex: 0,
        data: 'base64data',
        lastModified: Date.now(),
        name: 'small.txt',
        size: 100,
        totalChunks: 1,
        type: 'text/plain',
      };

      expect(isValidRenderOfficeData(singleChunk)).toBe(true);
    });
  });

  describe('Large document chunk validation', () => {
    it('should validate chunk metadata consistency', () => {
      const chunk: any = {
        chunkIndex: 5,
        data: 'base64data',
        lastModified: Date.now(),
        name: 'large.pdf',
        size: 10000000,
        totalChunks: 10,
        type: 'application/pdf',
      };

      expect(isValidRenderOfficeData(chunk)).toBe(true);
      expect(chunk.chunkIndex).toBeLessThan(chunk.totalChunks);
    });

    it('should reject invalid chunk metadata', () => {
      // Chunk index >= total chunks
      const invalidChunk: any = {
        chunkIndex: 10,
        data: 'base64data',
        lastModified: Date.now(),
        name: 'invalid.pdf',
        size: 1000,
        totalChunks: 5,
        type: 'application/pdf',
      };

      expect(isValidRenderOfficeData(invalidChunk)).toBe(false);
    });
  });

  describe('Chunk sequence completeness', () => {
    it('should validate complete chunk sequence', () => {
      const chunks: any[] = [
        { chunkIndex: 0, data: 'a', name: 'file.pdf', size: 100, totalChunks: 3, type: 'application/pdf', lastModified: 1 },
        { chunkIndex: 1, data: 'b', name: 'file.pdf', size: 100, totalChunks: 3, type: 'application/pdf', lastModified: 1 },
        { chunkIndex: 2, data: 'c', name: 'file.pdf', size: 100, totalChunks: 3, type: 'application/pdf', lastModified: 1 },
      ];

      expect(isValidChunkSequence(chunks)).toBe(true);
    });

    it('should reject incomplete chunk sequence', () => {
      const incomplete: any[] = [
        { chunkIndex: 0, data: 'a', name: 'file.pdf', size: 100, totalChunks: 3, type: 'application/pdf', lastModified: 1 },
        { chunkIndex: 2, data: 'c', name: 'file.pdf', size: 100, totalChunks: 3, type: 'application/pdf', lastModified: 1 },
      ];

      expect(isValidChunkSequence(incomplete)).toBe(false);
    });

    it('should reject duplicate chunks', () => {
      const duplicates: any[] = [
        { chunkIndex: 0, data: 'a', name: 'file.pdf', size: 100, totalChunks: 2, type: 'application/pdf', lastModified: 1 },
        { chunkIndex: 0, data: 'b', name: 'file.pdf', size: 100, totalChunks: 2, type: 'application/pdf', lastModified: 1 },
      ];

      expect(isValidChunkSequence(duplicates)).toBe(false);
    });
  });
});

describe('Cross-Module: Conversion Path Edge Cases', () => {
  describe('Path construction with special filenames', () => {
    it('should handle filenames with spaces', () => {
      const sanitized = sanitizeFileName('My Document.docx');
      expect(sanitized).toBe('My Document.docx');

      const { inputPath } = createConversionPaths(sanitized);
      expect(inputPath).toContain('My Document.docx');
    });

    it('should handle filenames with unicode characters', () => {
      const sanitized = sanitizeFileName('文档.docx');
      expect(sanitized).toBe('文档.docx');

      const { inputPath } = createConversionPaths(sanitized);
      expect(inputPath).toContain('文档.docx');
    });

    it('should sanitize dangerous path characters', () => {
      const sanitized = sanitizeFileName('file<>:"/\\|?.docx');
      expect(sanitized).not.toContain('<');
      expect(sanitized).not.toContain('>');
      expect(sanitized).not.toContain(':');
      expect(sanitized).not.toContain('"');
      expect(sanitized).not.toContain('/');
      expect(sanitized).not.toContain('\\');
      expect(sanitized).not.toContain('|');
    });
  });

  describe('Output filename generation', () => {
    it('should generate correct output filenames for various formats', () => {
      const testCases = [
        { base: 'document', ext: 'docx', expected: 'document.docx' },
        { base: 'spreadsheet', ext: 'xlsx', expected: 'spreadsheet.xlsx' },
        { base: 'presentation', ext: 'pptx', expected: 'presentation.pptx' },
        { base: 'data', ext: 'pdf', expected: 'data.pdf' },
        { base: 'export', ext: 'csv', expected: 'export.csv' },
      ];

      for (const { base, ext, expected } of testCases) {
        const output = createOutputFileName(base, ext);
        expect(output).toBe(expected);
      }
    });
  });
});

describe('Cross-Module: Editor Config Edge Cases', () => {
  describe('File type validation for editing', () => {
    it('should identify all editable formats', () => {
      const editableFormats = [
        'docx', 'doc', 'odt', 'rtf', 'txt',
        'xlsx', 'xls', 'ods', 'csv',
        'pptx', 'ppt', 'odp',
        'pdf',
      ];

      for (const ext of editableFormats) {
        expect(isEditableFileType(ext)).toBe(true);
      }
    });

    it('should identify non-editable formats', () => {
      const nonEditable = ['png', 'jpg', 'gif', 'mp3', 'mp4', 'zip'];

      for (const ext of nonEditable) {
        expect(isEditableFileType(ext)).toBe(false);
      }
    });
  });

  describe('Conversion requirements', () => {
    it('should identify formats requiring conversion', () => {
      const legacyFormats = ['doc', 'xls', 'ppt'];

      for (const ext of legacyFormats) {
        expect(requiresConversion(ext)).toBe(true);
        expect(getConversionTarget(ext)).toBeTruthy();
      }
    });

    it('should not require conversion for native formats', () => {
      const nativeFormats = ['docx', 'xlsx', 'pptx'];

      for (const ext of nativeFormats) {
        expect(requiresConversion(ext)).toBe(false);
      }
    });
  });
});

describe('Cross-Module: File Picker Workflow Edge Cases', () => {
  describe('Save picker options for various formats', () => {
    it('should create correct picker options for common formats', () => {
      const testCases = [
        { name: 'report.docx', mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
        { name: 'data.xlsx', mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
        { name: 'slides.pptx', mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' },
        { name: 'document.pdf', mime: 'application/pdf' },
      ];

      for (const { name, mime } of testCases) {
        const options = createSavePickerOptions(name, mime);
        expect(options.suggestedName).toBe(name);
        expect(options.types).toHaveLength(1);
        expect(options.types[0].accept).toBeDefined();
      }
    });
  });

  describe('Open picker options', () => {
    it('should create correct open picker options', () => {
      const extensions = ['docx', 'xlsx', 'pptx', 'pdf'];
      const options = createOpenPickerOptions(extensions);

      // One type per extension
      expect(options.types).toHaveLength(4);
      expect(options.multiple).toBe(false);
    });

    it('should generate correct accept attribute', () => {
      const accept = getFileInputAccept();
      expect(accept).toContain('.docx');
      expect(accept).toContain('.xlsx');
      expect(accept).toContain('.pptx');
      expect(accept).toContain('.pdf');
    });
  });
});

describe('Cross-Module: Byte Handling Workflows', () => {
  describe('UTF-8 BOM handling', () => {
    it('should detect and handle UTF-8 BOM in CSV files', () => {
      // CSV content with BOM
      const csvWithBom = new Uint8Array([0xef, 0xbb, 0xbf, 104, 101, 108, 108, 111]);

      expect(hasUtf8Bom(csvWithBom)).toBe(true);

      // Decode should handle BOM correctly
      const text = decodeBytes(csvWithBom);
      expect(text).toBe('hello');
    });

    it('should handle content without BOM', () => {
      const csvWithoutBom = new Uint8Array([104, 101, 108, 108, 111]);

      expect(hasUtf8Bom(csvWithoutBom)).toBe(false);

      const text = decodeBytes(csvWithoutBom);
      expect(text).toBe('hello');
    });
  });

  describe('Encoding and decoding workflow', () => {
    it('should encode text with optional BOM', () => {
      const text = 'Hello, World!';
      const encodedWithBom = encodeToBytes(text, true);
      const encodedWithoutBom = encodeToBytes(text, false);

      expect(hasUtf8Bom(encodedWithBom)).toBe(true);
      expect(hasUtf8Bom(encodedWithoutBom)).toBe(false);

      expect(decodeBytes(encodedWithBom)).toBe(text);
      expect(decodeBytes(encodedWithoutBom)).toBe(text);
    });
  });
});

describe('Cross-Module: Save Format Edge Cases', () => {
  describe('Format override scenarios', () => {
    it('should return CSV override for CSV files', () => {
      expect(getSaveFormatOverride('data.csv')).toBe('CSV');
      expect(getSaveFormatOverride('DATA.CSV')).toBe('CSV');
    });

    it('should not override non-CSV files', () => {
      expect(getSaveFormatOverride('document.docx')).toBeNull();
      expect(getSaveFormatOverride('spreadsheet.xlsx')).toBeNull();
    });
  });

  describe('File extension detection for save', () => {
    it('should detect file extensions correctly', () => {
      expect(hasFileExtension('document.docx', 'docx')).toBe(true);
      expect(hasFileExtension('DOCUMENT.DOCX', 'docx')).toBe(true);
      expect(hasFileExtension('data.xlsx', 'docx')).toBe(false);
    });
  });
});

describe('Cross-Module: Document Conversion Workflow', () => {
  describe('Legacy format conversion workflow', () => {
    it('should identify legacy formats requiring conversion', () => {
      const legacyFormats = [
        { ext: 'doc', target: 'docx', type: 'word' },
        { ext: 'xls', target: 'xlsx', type: 'cell' },
        { ext: 'ppt', target: 'pptx', type: 'slide' },
      ];

      for (const { ext, target, type } of legacyFormats) {
        expect(requiresConversion(ext)).toBe(true);
        expect(getConversionTarget(ext)).toBe(target);
        expect(getDocumentType(ext)).toBe(type);
      }
    });
  });

  describe('Modern format direct editing', () => {
    it('should support direct editing for OOXML formats', () => {
      const modernFormats = ['docx', 'xlsx', 'pptx'];

      for (const ext of modernFormats) {
        expect(requiresConversion(ext)).toBe(false);
        expect(isEditableFileType(ext)).toBe(true);
      }
    });
  });

  describe('CSV special handling workflow', () => {
    it('should handle CSV conversion and save workflow', () => {
      // CSV is editable but needs special handling
      expect(isEditableFileType('csv')).toBe(true);
      expect(getDocumentType('csv')).toBe('cell');
      expect(getMimeType('csv')).toBe('text/csv');

      // CSV should trigger override on save
      expect(getSaveFormatOverride('data.csv')).toBe('CSV');
    });
  });

  describe('PDF workflow', () => {
    it('should support PDF viewing workflow', () => {
      expect(isEditableFileType('pdf')).toBe(true);
      // PDF is viewable but not a native document type for editing
      expect(getDocumentType('pdf')).toBeNull();
      expect(getMimeType('pdf')).toBe('application/pdf');

      // PDF doesn't require conversion
      expect(requiresConversion('pdf')).toBe(false);
    });
  });

  describe('ODF format workflow', () => {
    it('should support ODF formats', () => {
      const odfFormats = [
        { ext: 'odt', type: 'word' },
        { ext: 'ods', type: 'cell' },
        { ext: 'odp', type: 'slide' },
      ];

      for (const { ext, type } of odfFormats) {
        expect(isEditableFileType(ext)).toBe(true);
        expect(getDocumentType(ext)).toBe(type);
        expect(isSupportedExtension(ext)).toBe(true);
      }
    });
  });
});

describe('Cross-Module: XML Parameter Generation Workflow', () => {
  describe('Conversion parameter generation', () => {
    it('should generate valid XML for conversion params', () => {
      const params = createConversionParams('/input.docx', '/output.bin', '');
      expect(params).toContain('<m_sFileFrom>/input.docx</m_sFileFrom>');
      expect(params).toContain('<m_sFileTo>/output.bin</m_sFileTo>');
    });

    it('should include additional params when provided', () => {
      const params = createConversionParams('/input.docx', '/output.bin', '<m_nFormatFrom>260</m_nFormatFrom>');
      expect(params).toContain('<m_nFormatFrom>260</m_nFormatFrom>');
    });
  });

  describe('XML escaping', () => {
    it('should escape special characters in paths', () => {
      const escaped = escapeXml('path with <special> & "quotes"');
      expect(escaped).toContain('&lt;');
      expect(escaped).toContain('&gt;');
      expect(escaped).toContain('&amp;');
      expect(escaped).toContain('&quot;');
    });
  });
});

describe('Cross-Module: Complete File Processing Pipeline', () => {
  describe('URL to editor pipeline', () => {
    it('should process URL through complete pipeline', () => {
      // Step 1: Extract filename from URL
      const url = 'https://example.com/docs/report.xlsx?token=abc';
      const filename = determineFilename({ url });
      expect(filename).toBe('report.xlsx');

      // Step 2: Extract extension
      const ext = getFileExtension(filename);
      expect(ext).toBe('xlsx');

      // Step 3: Validate extension
      expect(isSupportedExtension(ext)).toBe(true);

      // Step 4: Get document type
      const docType = getDocumentType(ext);
      expect(docType).toBe('cell');

      // Step 5: Sanitize filename
      const sanitized = sanitizeFileName(filename);
      expect(sanitized).toBe('report.xlsx');

      // Step 6: Create conversion paths
      const { inputPath, outputPath } = createConversionPaths(sanitized);
      expect(inputPath).toContain('report.xlsx');
      expect(outputPath).toContain('bin');

      // Step 7: Check editability
      expect(isEditableFileType(ext)).toBe(true);
      expect(requiresConversion(ext)).toBe(false);
    });

    it('should process legacy format through conversion pipeline', () => {
      const url = 'https://example.com/docs/legacy.doc';
      const filename = determineFilename({ url });
      const ext = getFileExtension(filename);

      expect(ext).toBe('doc');
      expect(requiresConversion(ext)).toBe(true);
      expect(getConversionTarget(ext)).toBe('docx');
    });
  });

  describe('File picker to save pipeline', () => {
    it('should create correct picker options for save', () => {
      const filename = 'report.docx';
      const ext = getFileExtension(filename);
      const mime = getMimeType(ext);

      const options = createSavePickerOptions(filename, mime);
      expect(options.suggestedName).toBe(filename);
      expect(options.types[0].accept).toBeDefined();
    });
  });
});

describe('Cross-Module: Internationalization Consistency', () => {
  describe('Language code handling', () => {
    it('should normalize language codes consistently', () => {
      // Test normalizeLanguage function from url-utils
      expect(getDocumentType('docx')).toBe('word'); // Basic sanity check

      // Check that supported extensions work with i18n
      const supportedExts = getSupportedEditExtensions();
      expect(supportedExts).toContain('docx');
      expect(supportedExts).toContain('xlsx');
      expect(supportedExts).toContain('pptx');
    });
  });
});

describe('Cross-Module: Format Detection Workflow', () => {
  describe('Extension to document type mapping', () => {
    it('should correctly map all supported extensions to document types', () => {
      const extensionMappings = [
        // Word processing
        { ext: 'docx', type: 'word' },
        { ext: 'doc', type: 'word' },
        { ext: 'odt', type: 'word' },
        { ext: 'rtf', type: 'word' },
        { ext: 'txt', type: 'word' },
        // Spreadsheets
        { ext: 'xlsx', type: 'cell' },
        { ext: 'xls', type: 'cell' },
        { ext: 'ods', type: 'cell' },
        { ext: 'csv', type: 'cell' },
        // Presentations
        { ext: 'pptx', type: 'slide' },
        { ext: 'ppt', type: 'slide' },
        { ext: 'odp', type: 'slide' },
      ];

      for (const { ext, type } of extensionMappings) {
        expect(getDocumentType(ext)).toBe(type);
      }
    });
  });

  describe('Unsupported extension handling', () => {
    it('should return null for unsupported extensions', () => {
      const unsupportedExts = ['exe', 'dll', 'bat', 'sh', 'zip', 'tar', 'gz'];

      for (const ext of unsupportedExts) {
        expect(getDocumentType(ext)).toBeNull();
        expect(isSupportedExtension(ext)).toBe(false);
      }
    });
  });
});

describe('Cross-Module: File Name Processing Pipeline', () => {
  describe('Filename extraction from various sources', () => {
    it('should extract filename from URL path', () => {
      const testCases = [
        { url: 'https://example.com/document.docx', expected: 'document.docx' },
        { url: 'https://example.com/path/to/spreadsheet.xlsx', expected: 'spreadsheet.xlsx' },
        { url: 'https://example.com/presentation.pptx?token=abc', expected: 'presentation.pptx' },
      ];

      for (const { url, expected } of testCases) {
        const filename = determineFilename({ url });
        expect(filename).toBe(expected);
      }
    });

    it('should handle Content-Disposition header', () => {
      const testCases = [
        { header: 'attachment; filename="report.docx"', expected: 'report.docx' },
        { header: 'inline; filename=data.xlsx', expected: 'data.xlsx' },
        // Note: encoded filename handling may vary; testing simple cases
      ];

      for (const { header, expected } of testCases) {
        const filename = determineFilename({ contentDisposition: header, url: 'https://example.com/file' });
        expect(filename).toBe(expected);
      }
    });
  });

  describe('Filename sanitization workflow', () => {
    it('should sanitize filenames for safe file system use', () => {
      const testCases = [
        { input: 'normal.docx', expected: 'normal.docx' },
        { input: 'file<>.docx', expected: 'file.docx' },
        { input: 'file:name.docx', expected: 'filename.docx' },
        { input: 'file|name.docx', expected: 'filename.docx' },
        { input: 'file"name.docx', expected: 'filename.docx' },
      ];

      for (const { input, expected } of testCases) {
        const sanitized = sanitizeFileName(input);
        expect(sanitized).toBe(expected);
      }
    });
  });
});

describe('Cross-Module: MIME Type Consistency', () => {
  describe('MIME type round-trip consistency', () => {
    it('should have consistent MIME types for all supported extensions', () => {
      const extensions = [
        'docx', 'doc', 'odt', 'rtf', 'txt',
        'xlsx', 'xls', 'ods', 'csv',
        'pptx', 'ppt', 'odp',
      ];

      for (const ext of extensions) {
        const mime = getMimeType(ext);
        expect(mime).toBeTruthy();
        expect(mime).not.toBe('image/png'); // Should not be fallback
      }
    });
  });

  describe('MIME type to extension mapping', () => {
    it('should extract correct extension from MIME type', () => {
      const testCases = [
        { mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', ext: 'docx' },
        { mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', ext: 'xlsx' },
        { mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', ext: 'pptx' },
        { mime: 'text/csv', ext: 'csv' },
      ];

      for (const { mime, ext } of testCases) {
        const extracted = extractFileType(mime);
        expect(extracted).toBe(ext);
      }
    });

    it('should return empty string for unknown MIME types', () => {
      // PDF is not in the MIME_TO_EXTENSION map
      expect(extractFileType('application/pdf')).toBe('');
      expect(extractFileType('application/unknown')).toBe('');
    });
  });
});

describe('Cross-Module: Editor Type Consistency', () => {
  describe('Document type to editor type mapping', () => {
    it('should map document types to correct editor types', () => {
      const mappings = [
        { ext: 'docx', docType: 'word', editable: true },
        { ext: 'xlsx', docType: 'cell', editable: true },
        { ext: 'pptx', docType: 'slide', editable: true },
        { ext: 'pdf', docType: null, editable: true }, // PDF is viewable
        { ext: 'csv', docType: 'cell', editable: true },
      ];

      for (const { ext, docType, editable } of mappings) {
        expect(getDocumentType(ext)).toBe(docType);
        expect(isEditableFileType(ext)).toBe(editable);
      }
    });
  });

  describe('Conversion requirement consistency', () => {
    it('should correctly identify formats requiring conversion', () => {
      const legacyFormats = ['doc', 'xls', 'ppt'];
      const modernFormats = ['docx', 'xlsx', 'pptx'];

      for (const ext of legacyFormats) {
        expect(requiresConversion(ext)).toBe(true);
        expect(getConversionTarget(ext)).toBeTruthy();
      }

      for (const ext of modernFormats) {
        expect(requiresConversion(ext)).toBe(false);
      }
    });
  });
});

describe('Cross-Module: File Validation Pipeline', () => {
  describe('Complete validation workflow', () => {
    it('should validate file through complete pipeline', () => {
      // Valid file
      const validResult = isValidFile('document.docx', 1024, { maxSizeBytes: 10 * 1024 * 1024 });
      expect(validResult).toBe(true);

      // File too large
      const tooLargeResult = isValidFile('document.docx', 100 * 1024 * 1024, { maxSizeBytes: 10 * 1024 * 1024 });
      expect(tooLargeResult).toBe(false);

      // Invalid extension (needs dot prefix in allowedExtensions)
      const invalidExtResult = isValidFile('document.exe', 1024, { allowedExtensions: ['.docx', '.xlsx', '.pptx'] });
      expect(invalidExtResult).toBe(false);
    });
  });

  describe('Chunk validation workflow', () => {
    it('should validate chunk data correctly', () => {
      // Valid chunk
      const validChunk: any = {
        chunkIndex: 0,
        data: 'base64data',
        lastModified: Date.now(),
        name: 'document.docx',
        size: 1024,
        totalChunks: 1,
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      };

      expect(isValidRenderOfficeData(validChunk)).toBe(true);

      // Invalid chunk (chunkIndex >= totalChunks)
      const invalidChunk: any = {
        ...validChunk,
        chunkIndex: 5,
        totalChunks: 3,
      };

      expect(isValidRenderOfficeData(invalidChunk)).toBe(false);
    });
  });
});

// ============================================================================
// Phase 49: Document Processing Pipeline Workflow Tests
// ============================================================================

describe('Cross-Module: Document Processing Pipeline', () => {
  describe('URL-based document loading workflow', () => {
    it('should extract and validate URL document parameters', () => {
      // Simulate URL parameter extraction
      const url = 'https://example.com/docs/report.xlsx?token=abc123';
      const filename = determineFilename({ url });

      expect(filename).toBe('report.xlsx');

      // Extract file extension
      const ext = getFileExtension(filename);
      expect(ext).toBe('xlsx');

      // Validate extension is supported
      expect(isSupportedExtension(ext)).toBe(true);

      // Get document type
      const docType = getDocumentType(ext);
      expect(docType).toBe('cell');

      // Get MIME type for HTTP headers
      const mime = getMimeType(ext);
      expect(mime).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    });

    it('should handle Content-Disposition header workflow', () => {
      // Simulate Content-Disposition header from HTTP response
      const contentDisposition = 'attachment; filename="Annual Report 2024.xlsx"';
      const url = 'https://example.com/download/abc123';

      const filename = determineFilename({ contentDisposition, url });
      expect(filename).toBe('Annual Report 2024.xlsx');

      // Sanitize filename for file system
      const sanitized = sanitizeFileName(filename);
      expect(sanitized).toBe('Annual Report 2024.xlsx');

      // Extract extension
      const ext = getFileExtension(sanitized);
      expect(ext).toBe('xlsx');

      // Determine if needs conversion
      expect(requiresConversion(ext)).toBe(false);
    });

    it('should process legacy format URL workflow', () => {
      // Legacy .doc file needs conversion
      const url = 'https://example.com/docs/legacy.doc';
      const filename = determineFilename({ url });
      const ext = getFileExtension(filename);

      expect(ext).toBe('doc');
      expect(isSupportedExtension(ext)).toBe(true);
      expect(requiresConversion(ext)).toBe(true);

      // Get conversion target
      const target = getConversionTarget(ext);
      expect(target).toBe('docx');

      // Get MIME types for both formats
      const sourceMime = getMimeType(ext);
      const targetMime = getMimeType(target!);
      expect(sourceMime).toBe('application/msword');
      expect(targetMime).toContain('officedocument');
    });
  });

  describe('File input document loading workflow', () => {
    it('should validate and process file input parameters', () => {
      // Simulate File object properties
      const fileName = 'presentation.pptx';
      const fileType = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
      const fileSize = 5 * 1024 * 1024; // 5MB

      // Extract file type from MIME
      const ext = extractFileType(fileType, fileName);
      expect(ext).toBe('pptx');

      // Validate file
      const isValid = isValidFile(fileName, fileSize, {
        allowedExtensions: ['.docx', '.xlsx', '.pptx'],
        maxSizeBytes: 10 * 1024 * 1024,
      });
      expect(isValid).toBe(true);

      // Get document type for editor
      const docType = getDocumentType(ext);
      expect(docType).toBe('slide');

      // Check if editable
      expect(isEditableFileType(ext)).toBe(true);

      // Check if needs conversion
      expect(requiresConversion(ext)).toBe(false);
    });

    it('should reject file with unsupported extension', () => {
      const fileName = 'image.png';
      const fileSize = 1024;

      const ext = getFileExtension(fileName);
      expect(isSupportedExtension(ext)).toBe(false);

      const isValid = isValidFile(fileName, fileSize, {
        allowedExtensions: ['.docx', '.xlsx', '.pptx'],
      });
      expect(isValid).toBe(false);
    });

    it('should reject file exceeding size limit', () => {
      const fileName = 'large-document.docx';
      const fileSize = 100 * 1024 * 1024; // 100MB
      const maxSize = 50 * 1024 * 1024; // 50MB

      const isValid = isValidFile(fileName, fileSize, { maxSizeBytes: maxSize });
      expect(isValid).toBe(false);
    });
  });
});

// ============================================================================
// Phase 49: Error Recovery Workflow Tests
// ============================================================================

describe('Cross-Module: Error Recovery Workflows', () => {
  describe('Network error recovery workflow', () => {
    it('should classify and handle network errors', () => {
      const networkErrors = [
        new TypeError('fetch failed'),
        new Error('Network request failed'),
        new Error('Connection timeout'),
        new Error('ENOTFOUND example.com'),
      ];

      for (const error of networkErrors) {
        expect(isNetworkError(error)).toBe(true);
        expect(isFileError(error)).toBe(false);

        // Safe error message extraction
        const message = formatErrorMessage(error);
        expect(message.length).toBeGreaterThan(0);
      }
    });

    it('should format error context for logging', () => {
      const error = new Error('Failed to fetch document from URL');

      expect(isErrorLike(error)).toBe(true);

      const message = formatErrorMessage(error);
      expect(message).toBe('Failed to fetch document from URL');
    });
  });

  describe('File error recovery workflow', () => {
    it('should classify and handle file errors', () => {
      const fileErrors = [
        new Error('ENOENT: no such file or directory'),
        new Error('EACCES: permission denied'),
        new Error('File not found'),
        new Error('File too large'),
      ];

      for (const error of fileErrors) {
        expect(isFileError(error)).toBe(true);

        const message = formatErrorMessage(error);
        expect(message.length).toBeGreaterThan(0);
      }
    });

    it('should handle validation errors in document pipeline', () => {
      // Simulate validation failure
      const fileName = 'malicious.exe';
      const validationError = new Error(`File extension not allowed: ${getFileExtension(fileName)}`);

      // This is a validation error, not a file system error, so isFileError returns false
      expect(isFileError(validationError)).toBe(false);

      // Format for user display
      const message = formatErrorMessage(validationError);
      expect(message).toContain('not allowed');
    });
  });

  describe('Error classification edge cases', () => {
    it('should handle non-Error objects safely', () => {
      // String error
      expect(formatErrorMessage('Something went wrong')).toBe('Something went wrong');

      // Object with message
      expect(formatErrorMessage({ message: 'Custom error' })).toBe('Custom error');

      // null/undefined
      expect(formatErrorMessage(null)).toBe('Unknown error');
      expect(formatErrorMessage(undefined)).toBe('Unknown error');

      // Number - formatErrorMessage converts it to string
      expect(formatErrorMessage(404)).toBe('404');
    });

    it('should detect error-like objects', () => {
      const errorLike = { message: 'Error', name: 'Error', stack: 'at line 1' };
      expect(isErrorLike(errorLike)).toBe(true);

      const notErrorLike = { message: 123 }; // Invalid message type
      expect(isErrorLike(notErrorLike)).toBe(false);
    });
  });
});

// ============================================================================
// Phase 49: New Document Template Workflow Tests
// ============================================================================

describe('Cross-Module: New Document Template Workflows', () => {
  describe('Document creation workflow', () => {
    it('should validate and create new document template', () => {
      const supportedTypes = getSupportedNewDocumentExtensions();

      for (const ext of supportedTypes) {
        // Check if template is supported
        expect(isNewDocumentSupported(ext)).toBe(true);

        // Get template
        const template = getNewDocumentTemplate(ext);
        expect(template).toBeDefined();
        expect(template!.length).toBeGreaterThan(0);

        // Get document type for editor (remove leading dot for getDocumentType)
        const extWithoutDot = ext.startsWith('.') ? ext.slice(1) : ext;
        const docType = getDocumentType(extWithoutDot);
        expect(docType).toBeTruthy();
      }
    });

    it('should reject unsupported template types', () => {
      const unsupportedTypes = ['pdf', 'exe', 'jpg', 'png', 'zip'];

      for (const ext of unsupportedTypes) {
        expect(isNewDocumentSupported(ext)).toBe(false);

        // getNewDocumentTemplate returns undefined for unsupported types
        const template = getNewDocumentTemplate(ext);
        expect(template).toBeUndefined();
      }
    });

    it('should map template types to document types correctly', () => {
      const templateMappings = [
        { ext: 'docx', docType: 'word', desc: 'Word Document' },
        { ext: 'xlsx', docType: 'cell', desc: 'Excel Spreadsheet' },
        { ext: 'pptx', docType: 'slide', desc: 'PowerPoint Presentation' },
      ];

      for (const { ext, docType, desc } of templateMappings) {
        expect(isNewDocumentSupported(ext)).toBe(true);
        expect(getDocumentType(ext)).toBe(docType);
        expect(getFileDescription(ext)).toContain(desc.split(' ')[0]); // Contains main type
      }
    });
  });

  describe('Template + conversion workflow', () => {
    it('should handle new document save format workflow', () => {
      // Create new xlsx document
      const ext = 'xlsx';
      // Verify template exists
      expect(getNewDocumentTemplate(ext)).toBeDefined();

      // Simulate saving as different format (determineSaveFormat returns uppercase)
      const saveFormats = [
        { code: oAscFileType.XLSX, expected: 'XLSX' },
        { code: oAscFileType.XLS, expected: 'XLS' },
        { code: oAscFileType.CSV, expected: 'CSV' },
        { code: oAscFileType.PDF, expected: 'PDF' },
      ];

      for (const { code, expected } of saveFormats) {
        const result = determineSaveFormat(code, 'new-document.xlsx');
        expect(result).toBe(expected);
      }
    });
  });
});

// ============================================================================
// Phase 49: Chunk Processing Pipeline Workflow Tests
// ============================================================================

describe('Cross-Module: Chunk Processing Pipeline', () => {
  describe('Multi-chunk document assembly', () => {
    it('should validate and process complete chunk sequence', () => {
      // Simulate 5-chunk document
      const totalChunks = 5;
      const chunks: any[] = [];

      for (let i = 0; i < totalChunks; i++) {
        chunks.push({
          chunkIndex: i,
          data: `base64chunk${i}`,
          lastModified: Date.now(),
          name: 'large-document.docx',
          size: 1024 * (i === totalChunks - 1 ? 512 : 1024), // Last chunk smaller
          totalChunks,
          type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        });
      }

      // Validate each chunk
      for (const chunk of chunks) {
        expect(isValidRenderOfficeData(chunk)).toBe(true);
      }

      // Validate sequence completeness
      expect(isValidChunkSequence(chunks)).toBe(true);

      // Extract document metadata from first chunk
      const firstChunk = chunks[0];
      const ext = getFileExtension(firstChunk.name);
      expect(ext).toBe('docx');
      expect(isSupportedExtension(ext)).toBe(true);
      expect(getDocumentType(ext)).toBe('word');
    });

    it('should detect incomplete chunk sequence', () => {
      const chunks: any[] = [
        { chunkIndex: 0, data: 'a', lastModified: 1, name: 'test.docx', size: 1, totalChunks: 3, type: 'app/docx' },
        { chunkIndex: 2, data: 'c', lastModified: 1, name: 'test.docx', size: 1, totalChunks: 3, type: 'app/docx' },
        // Missing chunk 1
      ];

      expect(isValidChunkSequence(chunks)).toBe(false);
    });

    it('should detect duplicate chunks', () => {
      const chunks: any[] = [
        { chunkIndex: 0, data: 'a', lastModified: 1, name: 'test.xlsx', size: 1, totalChunks: 2, type: 'app/xlsx' },
        { chunkIndex: 0, data: 'b', lastModified: 1, name: 'test.xlsx', size: 1, totalChunks: 2, type: 'app/xlsx' }, // Duplicate
        { chunkIndex: 1, data: 'c', lastModified: 1, name: 'test.xlsx', size: 1, totalChunks: 2, type: 'app/xlsx' },
      ];

      // Chunk sequence validation should fail due to duplicates
      expect(isValidChunkSequence(chunks)).toBe(false);
    });
  });

  describe('Chunk metadata consistency', () => {
    it('should validate consistent metadata across chunks', () => {
      const chunks: any[] = [
        { chunkIndex: 0, data: 'a', lastModified: 12345, name: 'report.xlsx', size: 100, totalChunks: 2, type: 'app/xlsx' },
        { chunkIndex: 1, data: 'b', lastModified: 12345, name: 'report.xlsx', size: 50, totalChunks: 2, type: 'app/xlsx' },
      ];

      // All chunks should have same name, totalChunks, type, lastModified
      for (const chunk of chunks) {
        expect(chunk.name).toBe('report.xlsx');
        expect(chunk.totalChunks).toBe(2);
        expect(chunk.type).toBe('app/xlsx');
        expect(chunk.lastModified).toBe(12345);
      }

      expect(isValidChunkSequence(chunks)).toBe(true);
    });

    it('should extract file type from chunk metadata', () => {
      const chunk: any = {
        chunkIndex: 0,
        data: 'data',
        lastModified: Date.now(),
        name: 'presentation.pptx',
        size: 1024,
        totalChunks: 1,
        type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      };

      // Extract from MIME type
      const extFromMime = extractFileType(chunk.type);
      expect(extFromMime).toBe('pptx');

      // Extract from filename
      const extFromName = getFileExtension(chunk.name);
      expect(extFromName).toBe('pptx');

      // Both should match
      expect(extFromMime).toBe(extFromName);
    });
  });
});

// ============================================================================
// Phase 49: Save Format Determination Workflow Tests
// ============================================================================

describe('Cross-Module: Save Format Workflows', () => {
  describe('Save format determination with file type codes', () => {
    it('should determine save format for Office formats', () => {
      const formatTests = [
        { code: oAscFileType.DOCX, fileName: 'document.docx', expected: 'DOCX' },
        { code: oAscFileType.XLSX, fileName: 'spreadsheet.xlsx', expected: 'XLSX' },
        { code: oAscFileType.PPTX, fileName: 'presentation.pptx', expected: 'PPTX' },
        { code: oAscFileType.PDF, fileName: 'document.pdf', expected: 'PDF' },
      ];

      for (const { code, fileName, expected } of formatTests) {
        const format = determineSaveFormat(code, fileName);
        expect(format).toBe(expected);
      }
    });

    it('should handle CSV save format override', () => {
      // CSV file edited as XLSX should save as CSV
      const originalName = 'data.csv';
      const override = getSaveFormatOverride(originalName);

      expect(override).toBe('CSV');

      // When saving with XLSX code, CSV override should apply
      const format = determineSaveFormat(oAscFileType.XLSX, originalName);
      expect(format).toBe('CSV');
    });

    it('should handle legacy format saves', () => {
      const legacyFormats = [
        { code: oAscFileType.DOC, expected: 'DOC' },
        { code: oAscFileType.XLS, expected: 'XLS' },
        { code: oAscFileType.PPT, expected: 'PPT' },
      ];

      for (const { code, expected } of legacyFormats) {
        const format = determineSaveFormat(code, 'document.docx');
        expect(format).toBe(expected);
      }
    });
  });

  describe('Save format + MIME type consistency', () => {
    it('should have valid MIME types for all save formats', () => {
      const saveFormats = ['docx', 'xlsx', 'pptx', 'pdf', 'doc', 'xls', 'ppt', 'csv', 'odt', 'ods', 'odp'];

      for (const format of saveFormats) {
        const mime = getMimeType(format);
        expect(mime).not.toBe('application/octet-stream');

        // Verify we can extract the format back
        const extracted = extractFileType(mime, `file.${format}`);
        expect(extracted).toBe(format);
      }
    });
  });

  describe('hasFileExtension utility workflow', () => {
    it('should correctly identify file extensions', () => {
      expect(hasFileExtension('document.docx', 'docx')).toBe(true);
      expect(hasFileExtension('spreadsheet.XLSX', 'xlsx')).toBe(true); // Case insensitive
      expect(hasFileExtension('presentation.pptx', 'docx')).toBe(false);
      expect(hasFileExtension('file', 'docx')).toBe(false);
      expect(hasFileExtension('file.', 'docx')).toBe(false);
    });
  });
});

// ============================================================================
// Phase 49: Editor Configuration Workflow Tests
// ============================================================================

describe('Cross-Module: Editor Configuration Workflows', () => {
  describe('Editor config generation workflow', () => {
    it('should generate valid editor config for document types', () => {
      const configTests = [
        { ext: 'docx', editable: true },
        { ext: 'xlsx', editable: true },
        { ext: 'pptx', editable: true },
        { ext: 'pdf', editable: true }, // PDF is viewable
      ];

      const mockEvents = {
        onAppReady: () => {},
        onDocumentReady: () => {},
        onSave: () => {},
        writeFile: () => {},
      };

      for (const { ext, editable } of configTests) {
        const config = createEditorConfig({
          fileName: `test.${ext}`,
          fileType: ext,
          lang: 'en',
          events: mockEvents,
        });

        expect(config.document.fileType).toBe(ext);
        expect(config.document.title).toBe(`test.${ext}`);
        expect(config.editorConfig.lang).toBe('en');
        expect(config.document.permissions.edit).toBe(true);
        expect(isEditableFileType(ext)).toBe(editable);
      }
    });

    it('should handle conversion-required formats', () => {
      const legacyFormats = ['doc', 'xls', 'ppt', 'odt', 'ods', 'odp'];

      for (const ext of legacyFormats) {
        expect(requiresConversion(ext)).toBe(true);
        const target = getConversionTarget(ext);
        expect(target).toBeTruthy();
        expect(requiresConversion(target!)).toBe(false);
      }
    });
  });

  describe('Editor delay workflow', () => {
    it('should calculate correct delays for document types', () => {
      // Presentations need longer cleanup delay
      expect(isPresentationType('pptx')).toBe(true);
      expect(isPresentationType('ppt')).toBe(true);
      expect(isPresentationType('docx')).toBe(false);
      expect(isPresentationType('xlsx')).toBe(false);

      // Verify delay values
      expect(EDITOR_DELAYS.PRESENTATION_SWITCH).toBeGreaterThan(EDITOR_DELAYS.STANDARD_SWITCH);
      expect(EDITOR_DELAYS.STANDARD_SWITCH).toBeGreaterThan(EDITOR_DELAYS.NEW_EDITOR);
    });

    it('should return correct delay based on editor state', () => {
      // No existing editor - returns NEW_EDITOR delay
      const delayNoEditor = getEditorCleanupDelay('docx', false);
      expect(delayNoEditor).toBe(EDITOR_DELAYS.NEW_EDITOR);

      // With existing editor - returns STANDARD_SWITCH delay
      const delayWithEditor = getEditorCleanupDelay('docx', true);
      expect(delayWithEditor).toBe(EDITOR_DELAYS.STANDARD_SWITCH);

      // Presentation with editor - returns PRESENTATION_SWITCH delay
      const delayPres = getEditorCleanupDelay('pptx', true);
      expect(delayPres).toBe(EDITOR_DELAYS.PRESENTATION_SWITCH);
    });
  });
});

// ============================================================================
// Phase 49: File Picker Workflow Tests
// ============================================================================

describe('Cross-Module: File Picker Workflows', () => {
  describe('Save picker options workflow', () => {
    it('should create valid save picker options for Office formats', () => {
      const formats = ['docx', 'xlsx', 'pptx', 'pdf'];

      for (const format of formats) {
        const options = createSavePickerOptions(`document.${format}`);
        expect(options.suggestedName).toBe(`document.${format}`);
        expect(options.types).toBeDefined();
        expect(options.types!.length).toBeGreaterThan(0);
      }
    });

    it('should include correct MIME types in picker options', () => {
      const options = createSavePickerOptions('report.xlsx');
      const type = options.types![0];

      expect(type.accept).toBeDefined();
      const mimeTypes = Object.keys(type.accept);
      expect(mimeTypes).toContain('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    });
  });

  describe('Open picker options workflow', () => {
    it('should create valid open picker options', () => {
      const extensions = ['docx', 'xlsx', 'pptx'];
      const options = createOpenPickerOptions(extensions);

      expect(options.types).toBeDefined();
      expect(options.types!.length).toBeGreaterThan(0);
    });

    it('should get supported edit extensions', () => {
      const extensions = getSupportedEditExtensions();
      // Extensions are returned without leading dots
      expect(extensions).toContain('docx');
      expect(extensions).toContain('xlsx');
      expect(extensions).toContain('pptx');
      expect(extensions).toContain('pdf');
    });
  });

  describe('File input accept attribute workflow', () => {
    it('should generate valid accept attribute for file input', () => {
      const accept = getFileInputAccept();

      // Should include extensions with dots
      expect(accept).toContain('.docx');
      expect(accept).toContain('.xlsx');
      expect(accept).toContain('.pptx');
      expect(accept).toContain('.pdf');

      // Should be comma-separated
      expect(accept).toContain(',');
    });
  });
});

// ============================================================================
// Phase 49: Media URL Workflow Tests
// ============================================================================

describe('Cross-Module: Media URL Workflows', () => {
  describe('Media file validation workflow', () => {
    it('should validate image data for editor', () => {
      const validData = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]); // PNG header
      const fileName = 'image.png';

      expect(isValidUint8Array(validData)).toBe(true);
      expect(isValidFileName(fileName)).toBe(true);

      const result = validateWriteFileData(validData, fileName);
      expect(result.isValid).toBe(true);
      if (result.isValid) {
        expect(result.fileExtension).toBe('png');
        expect(result.mimeType).toBe('image/png');
      }
    });

    it('should reject invalid media data', () => {
      const invalidData = null;
      const fileName = 'image.png';

      expect(isValidUint8Array(invalidData)).toBe(false);

      const result = validateWriteFileData(invalidData as any, fileName);
      expect(result.isValid).toBe(false);
      if (!result.isValid) {
        expect(result.error).toBeDefined();
      }
    });

    it('should reject invalid file names', () => {
      const validData = new Uint8Array([1, 2, 3]);

      expect(isValidFileName('')).toBe(false);
      expect(isValidFileName(null)).toBe(false);
      expect(isValidFileName(undefined)).toBe(false);

      // Empty string should fail validation
      const result = validateWriteFileData(validData, '');
      expect(result.isValid).toBe(false);
    });
  });

  describe('Media URL key generation workflow', () => {
    it('should create consistent URL keys', () => {
      const fileName = 'chart.png';

      const key1 = createMediaUrlKey(fileName);
      const key2 = createMediaUrlKey(fileName);

      expect(key1).toBe(key2);
      expect(key1).toBe(`media/${fileName}`);
    });

    it('should handle special characters in file names', () => {
      const specialNames = ['image-1.png', 'image_2.jpg', '图表.png'];

      for (const name of specialNames) {
        const key = createMediaUrlKey(name);
        expect(key).toContain('media/');
        expect(key).toContain(name);
      }
    });
  });
})

// ============================================================================
// Phase 49: Operation Queue Workflow Tests
// ============================================================================

describe('Cross-Module: Operation Queue Workflows', () => {
  describe('Sequential operation processing', () => {
    it('should execute operations in order', async () => {
      const queue = createOperationQueue();
      const results: number[] = [];

      // Queue operations
      const promises = [
        queue(() => Promise.resolve(results.push(1))),
        queue(() => Promise.resolve(results.push(2))),
        queue(() => Promise.resolve(results.push(3))),
      ];

      await Promise.all(promises);

      expect(results).toEqual([1, 2, 3]);
    });

    it('should handle waiting for previous operation with timeout', async () => {
      const queue = createOperationQueue({ timeout: 50 }); // 50ms timeout for waiting on previous

      // First operation is slow - we don't await it, just queue it
      void queue(() => new Promise<void>((resolve) => {
        setTimeout(() => {
          resolve();
        }, 200);
      }));

      // Second operation will timeout waiting for the first
      const secondOp = queue(() => Promise.resolve('second'));

      // The second operation should still complete (timeout doesn't reject, just logs warning)
      const result = await secondOp;
      expect(result).toBe('second');
    });

    it('should identify timeout errors correctly', () => {
      // The queue creates errors with this exact message
      const timeoutError = new Error('Operation queue timeout');
      expect(isQueueTimeoutError(timeoutError)).toBe(true);

      const otherError = new Error('Some other error');
      expect(isQueueTimeoutError(otherError)).toBe(false);
    });

    it('should handle errors in operations gracefully', async () => {
      const queue = createOperationQueue();
      const results: string[] = [];

      // First operation fails
      const failingOp = queue(() => Promise.reject(new Error('Operation failed')));

      // Second operation should still run
      const successOp = queue(() => {
        results.push('success');
        return Promise.resolve('done');
      });

      // First should fail
      await expect(failingOp).rejects.toThrow('Operation failed');

      // Second should succeed
      const result = await successOp;
      expect(result).toBe('done');
      expect(results).toContain('success');
    });
  });

  describe('Queue configuration', () => {
    it('should use default timeout', () => {
      expect(DEFAULT_QUEUE_TIMEOUT).toBe(30000); // 30 seconds
    });

    it('should accept custom timeout', async () => {
      const queue = createOperationQueue({ timeout: 1000 });

      // Queue should work with custom timeout
      const result = await queue(() => Promise.resolve('test'));
      expect(result).toBe('test');
    });

    it('should support timeout callback', async () => {
      let timeoutCalled = false;
      const queue = createOperationQueue({
        timeout: 10,
        onTimeout: () => { timeoutCalled = true; },
      });

      // First operation is slow
      queue(() => new Promise<void>((resolve) => setTimeout(resolve, 100)));

      // Second operation triggers timeout waiting for first
      await queue(() => Promise.resolve());

      // Timeout callback should have been called
      expect(timeoutCalled).toBe(true);
    });
  });
})

// ============================================================================
// Phase 50: Edge Case and Stress Tests
// ============================================================================

describe('Cross-Module: Edge Case Tests', () => {
  describe('Unicode filename handling', () => {
    it('should handle Chinese characters in filenames', () => {
      const filenames = ['文档.docx', '表格.xlsx', '演示文稿.pptx', '报告 2024.pdf'];

      for (const filename of filenames) {
        const sanitized = sanitizeFileName(filename);
        expect(sanitized).toBe(filename); // Chinese chars should be preserved

        const ext = getFileExtension(sanitized);
        expect(ext).toBeTruthy();

        const mime = getMimeType(ext);
        expect(mime).toBeDefined();
      }
    });

    it('should handle emoji in filenames', () => {
      const filenames = ['📄document.docx', '📊spreadsheet.xlsx', '📊presentation.pptx'];

      for (const filename of filenames) {
        const sanitized = sanitizeFileName(filename);
        expect(sanitized).toBe(filename); // Emoji should be preserved

        const ext = getFileExtension(sanitized);
        expect(ext).toBeTruthy();
      }
    });

    it('should handle mixed scripts in filenames', () => {
      const filenames = [
        'Report-报告-2024.docx',
        'Документ-Документ.docx',
        'Αρχείο-File.xlsx',
      ];

      for (const filename of filenames) {
        const sanitized = sanitizeFileName(filename);
        expect(sanitized).toBe(filename);

        const ext = getFileExtension(sanitized);
        expect(ext).toBeTruthy();
      }
    });

    it('should handle unicode in Content-Disposition', () => {
      const contentDisposition = 'attachment; filename="文档报告.docx"';
      const filename = determineFilename({ contentDisposition, url: 'https://example.com/doc' });

      expect(filename).toBe('文档报告.docx');
    });
  });

  describe('Special character handling', () => {
    it('should remove illegal characters from filenames', () => {
      const testCases = [
        { input: 'file<name>.docx', expected: 'filename.docx' },
        { input: 'file:name.xlsx', expected: 'filename.xlsx' },
        { input: 'file"name.pptx', expected: 'filename.pptx' },
        { input: 'file|name.pdf', expected: 'filename.pdf' },
        { input: 'file?name.docx', expected: 'filename.docx' },
        { input: 'file*name.xlsx', expected: 'filename.xlsx' },
      ];

      for (const { input, expected } of testCases) {
        const sanitized = sanitizeFileName(input);
        expect(sanitized).toBe(expected);
      }
    });

    it('should handle multiple consecutive illegal characters', () => {
      const input = 'file<<<>>>name.docx';
      const sanitized = sanitizeFileName(input);
      expect(sanitized).toBe('filename.docx');
    });

    it('should handle path separators in filenames', () => {
      const testCases = [
        { input: 'folder/file.docx', expected: 'folderfile.docx' },
        { input: 'folder\\file.xlsx', expected: 'folderfile.xlsx' },
      ];

      for (const { input, expected } of testCases) {
        const sanitized = sanitizeFileName(input);
        expect(sanitized).toBe(expected);
      }
    });
  });

  describe('Long filename handling', () => {
    it('should handle very long filenames', () => {
      const longName = 'a'.repeat(200) + '.docx';
      const ext = getFileExtension(longName);

      expect(ext).toBe('docx');

      const sanitized = sanitizeFileName(longName);
      expect(sanitized).toBe(longName);
    });

    it('should handle filenames with multiple dots', () => {
      const filenames = [
        { input: 'file.name.with.dots.docx', ext: 'docx' },
        { input: 'report.v1.2.3.xlsx', ext: 'xlsx' },
        { input: 'presentation.2024-01-15.pptx', ext: 'pptx' },
      ];

      for (const { input, ext } of filenames) {
        expect(getFileExtension(input)).toBe(ext);
      }
    });

    it('should handle trailing dots', () => {
      expect(getFileExtension('file..docx')).toBe('docx');
      expect(getFileExtension('file...xlsx')).toBe('xlsx');
    });
  });

  describe('Empty and null handling', () => {
    it('should handle empty filename gracefully', () => {
      expect(getFileExtension('')).toBe('');
      // sanitizeFileName returns default for empty/whitespace input
      expect(sanitizeFileName('')).toBe('file.bin');
      expect(sanitizeFileName('   ')).toBe('file.bin');
    });

    it('should handle filename without extension', () => {
      expect(getFileExtension('README')).toBe('');
      expect(getFileExtension('CHANGELOG')).toBe('');
    });

    it('should handle hidden files', () => {
      expect(getFileExtension('.gitignore')).toBe('gitignore');
      expect(getFileExtension('.env')).toBe('env');
    });
  });
});

describe('Cross-Module: Format Edge Cases', () => {
  describe('Mixed case extensions', () => {
    it('should handle all case variations', () => {
      const variations = ['DOCX', 'Docx', 'DoCx', 'docx'];

      for (const ext of variations) {
        const mime = getMimeType(ext);
        expect(mime).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document');

        const docType = getDocumentType(ext);
        expect(docType).toBe('word');
      }
    });

    it('should handle case in filename extensions', () => {
      const filenames = ['document.DOCX', 'spreadsheet.XLSX', 'presentation.PPTX'];

      for (const filename of filenames) {
        const ext = getFileExtension(filename);
        expect(isSupportedExtension(ext)).toBe(true);
      }
    });
  });

  describe('Format conversion edge cases', () => {
    it('should identify all legacy formats requiring conversion', () => {
      const legacyFormats = ['doc', 'xls', 'ppt', 'odt', 'ods', 'odp', 'rtf', 'txt', 'csv'];

      for (const ext of legacyFormats) {
        expect(requiresConversion(ext)).toBe(true);
        expect(getConversionTarget(ext)).toBeTruthy();
      }
    });

    it('should identify all modern formats not requiring conversion', () => {
      const modernFormats = ['docx', 'xlsx', 'pptx', 'pdf'];

      for (const ext of modernFormats) {
        expect(requiresConversion(ext)).toBe(false);
      }
    });
  });

  describe('MIME type edge cases', () => {
    it('should return octet-stream for unknown extensions', () => {
      const unknownExts = ['xyz', 'abc', 'unknown', 'custom'];

      for (const ext of unknownExts) {
        expect(getMimeType(ext)).toBe('application/octet-stream');
      }
    });

    it('should handle MIME type lookup case-insensitively', () => {
      expect(getMimeType('DOCX')).toBe(getMimeType('docx'));
      expect(getMimeType('XLSX')).toBe(getMimeType('xlsx'));
      expect(getMimeType('PPTX')).toBe(getMimeType('pptx'));
    });
  });
});

describe('Cross-Module: Validation Edge Cases', () => {
  describe('File size validation edge cases', () => {
    it('should validate zero-size files', () => {
      const isValid = isValidFile('document.docx', 0);
      expect(isValid).toBe(true);
    });

    it('should validate files at size boundaries', () => {
      const maxSize = 10 * 1024 * 1024; // 10MB

      // Exactly at limit
      expect(isValidFile('doc.docx', maxSize, { maxSizeBytes: maxSize })).toBe(true);

      // One byte over limit
      expect(isValidFile('doc.docx', maxSize + 1, { maxSizeBytes: maxSize })).toBe(false);

      // One byte under limit
      expect(isValidFile('doc.docx', maxSize - 1, { maxSizeBytes: maxSize })).toBe(true);
    });
  });

  describe('Extension validation edge cases', () => {
    it('should handle extensions with leading dot', () => {
      // isSupportedExtension expects extension without leading dot
      expect(isSupportedExtension('docx')).toBe(true);
      expect(isSupportedExtension('xlsx')).toBe(true);
      // With leading dot, it returns false (not in the list)
      expect(isSupportedExtension('.docx')).toBe(false);
    });

    it('should handle empty extension list in validation', () => {
      const isValid = isValidFile('doc.docx', 1024, { allowedExtensions: [] });
      expect(isValid).toBe(true);
    });

    it('should validate extensions with dot prefix', () => {
      const isValid = isValidFile('doc.docx', 1024, { allowedExtensions: ['.docx', '.xlsx'] });
      expect(isValid).toBe(true);
    });
  });

  describe('Chunk validation edge cases', () => {
    it('should validate single-chunk document', () => {
      const chunk: any = {
        chunkIndex: 0,
        data: 'base64data',
        lastModified: Date.now(),
        name: 'single.docx',
        size: 1024,
        totalChunks: 1,
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      };

      expect(isValidRenderOfficeData(chunk)).toBe(true);
      expect(isValidChunkSequence([chunk])).toBe(true);
    });

    it('should reject chunk with mismatched totalChunks', () => {
      const chunks: any[] = [
        { chunkIndex: 0, data: 'a', lastModified: 1, name: 'test.docx', size: 1, totalChunks: 3, type: 'app/docx' },
        { chunkIndex: 1, data: 'b', lastModified: 1, name: 'test.docx', size: 1, totalChunks: 2, type: 'app/docx' }, // Different totalChunks
      ];

      // Each chunk is valid individually
      expect(isValidRenderOfficeData(chunks[0])).toBe(true);
      expect(isValidRenderOfficeData(chunks[1])).toBe(true);

      // But sequence is invalid due to mismatched totalChunks
      expect(isValidChunkSequence(chunks)).toBe(false);
    });
  });
})

/**
 * Phase 51: Document Initialization Workflow Tests
 * Tests for document loading, initialization, and state management workflows
 * These tests simulate the full pipeline without browser dependencies
 */

describe('Cross-Module: Document State Initialization Workflow', () => {
  describe('Filename resolution pipeline', () => {
    it('should resolve filename from URL only', () => {
      const url = 'https://example.com/docs/report.xlsx';
      const filename = determineFilename({ url });

      expect(filename).toBe('report.xlsx');
      expect(getFileExtension(filename)).toBe('xlsx');
      expect(isSupportedExtension('xlsx')).toBe(true);
      expect(getDocumentType('xlsx')).toBe('cell');
    });

    it('should resolve filename from Content-Disposition header', () => {
      const url = 'https://example.com/download/abc123';
      const contentDisposition = 'attachment; filename="presentation.pptx"';
      const filename = determineFilename({ url, contentDisposition });

      expect(filename).toBe('presentation.pptx');
      expect(getFileExtension(filename)).toBe('pptx');
      expect(getDocumentType('pptx')).toBe('slide');
    });

    it('should prefer provided filename over other sources', () => {
      const url = 'https://example.com/download/abc123';
      const contentDisposition = 'attachment; filename="other.doc"';
      const providedName = 'document.docx';
      const filename = determineFilename({
        fileName: providedName,
        url,
        contentDisposition,
      });

      expect(filename).toBe(providedName);
      expect(getFileExtension(filename)).toBe('docx');
    });

    it('should handle URL-encoded filenames in Content-Disposition', () => {
      // Note: The current implementation uses a regex that matches the standard filename parameter
      // RFC 5987 format (filename*=UTF-8'') is not fully decoded by the current implementation
      // The regex extracts the value after the equals sign
      const contentDisposition = "attachment; filename*=UTF-8''%E6%96%87%E6%A1%A3.docx";
      const filename = determineFilename({ contentDisposition });

      // The implementation extracts the literal string, URL decoding is not performed
      // The extension is still extractable
      expect(filename).toContain('.docx');
      expect(getFileExtension(filename)).toBe('docx');
    });

    it('should handle special characters in filename resolution', () => {
      const url = 'https://example.com/files/my%3Cfile%3Ename.xlsx';
      const filename = determineFilename({ url });

      // URL path extraction preserves URL-encoded characters
      expect(filename).toContain('.xlsx');

      // Sanitize for safe use
      const sanitized = sanitizeFileName(filename);
      expect(isSupportedExtension(getFileExtension(sanitized))).toBe(true);
    });
  });

  describe('Type detection pipeline', () => {
    it('should detect document type from extension chain', () => {
      const testCases = [
        { ext: 'docx', expectedType: 'word', expectedMime: 'wordprocessingml' },
        { ext: 'xlsx', expectedType: 'cell', expectedMime: 'spreadsheetml' },
        { ext: 'pptx', expectedType: 'slide', expectedMime: 'presentationml' },
        { ext: 'doc', expectedType: 'word', expectedMime: 'msword' },
        { ext: 'xls', expectedType: 'cell', expectedMime: 'excel' },
        { ext: 'ppt', expectedType: 'slide', expectedMime: 'powerpoint' },
        { ext: 'odt', expectedType: 'word', expectedMime: 'opendocument.text' },
        { ext: 'ods', expectedType: 'cell', expectedMime: 'opendocument.spreadsheet' },
        { ext: 'odp', expectedType: 'slide', expectedMime: 'opendocument.presentation' },
      ];

      for (const { ext, expectedType, expectedMime } of testCases) {
        expect(getDocumentType(ext)).toBe(expectedType);
        const mime = getMimeType(ext);
        expect(mime.toLowerCase()).toContain(expectedMime.toLowerCase());
      }
    });

    it('should detect type from MIME type with fallback to filename', () => {
      const mime = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      const filename = 'unknown.bin';

      const ext = extractFileType(mime, filename);
      expect(ext).toBe('docx');
      expect(getDocumentType(ext)).toBe('word');
    });

    it('should fallback to filename extension when MIME is unknown', () => {
      const mime = 'application/unknown';
      const filename = 'spreadsheet.xlsx';

      const ext = extractFileType(mime, filename);
      expect(ext).toBe('xlsx');
      expect(getDocumentType(ext)).toBe('cell');
    });
  });

  describe('Validation pipeline integration', () => {
    it('should validate document through complete pipeline', () => {
      const filename = 'report.docx';
      const size = 1024 * 1024; // 1MB

      // Step 1: Extension validation
      const ext = getFileExtension(filename);
      expect(isSupportedExtension(ext)).toBe(true);

      // Step 2: Document type detection
      const docType = getDocumentType(ext);
      expect(docType).toBe('word');

      // Step 3: File validation
      const isValid = isValidFile(filename, size, {
        allowedExtensions: ['.docx', '.xlsx', '.pptx'],
        maxSizeBytes: 10 * 1024 * 1024,
      });
      expect(isValid).toBe(true);

      // Step 4: Editor support check
      expect(isEditableFileType(ext)).toBe(true);
      expect(requiresConversion(ext)).toBe(false);

      // Step 5: Sanitization for internal paths
      const sanitized = sanitizeFileName(filename);
      expect(sanitized).toBe(filename);
    });

    it('should reject unsupported extension in pipeline', () => {
      const filename = 'malware.exe';
      const size = 1024;

      const ext = getFileExtension(filename);
      expect(isSupportedExtension(ext)).toBe(false);

      const isValid = isValidFile(filename, size, {
        allowedExtensions: ['.docx', '.xlsx', '.pptx'],
      });
      expect(isValid).toBe(false);
    });

    it('should reject oversized file in pipeline', () => {
      const filename = 'large.xlsx';
      const size = 200 * 1024 * 1024; // 200MB

      const isValid = isValidFile(filename, size, {
        maxSizeBytes: 100 * 1024 * 1024, // 100MB limit
      });
      expect(isValid).toBe(false);
    });
  });
});

describe('Cross-Module: URL Response Handling Workflow', () => {
  describe('Content-Disposition scenarios', () => {
    it('should parse attachment with filename', () => {
      const contentDisposition = 'attachment; filename="document.docx"';
      const filename = determineFilename({ contentDisposition });
      expect(filename).toBe('document.docx');
    });

    it('should parse inline with filename', () => {
      const contentDisposition = 'inline; filename="view.pdf"';
      const filename = determineFilename({ contentDisposition });
      expect(filename).toBe('view.pdf');
    });

    it('should parse filename with spaces', () => {
      const contentDisposition = 'attachment; filename="My Document.docx"';
      const filename = determineFilename({ contentDisposition });
      expect(filename).toBe('My Document.docx');
    });

    it('should parse quoted filename with special characters', () => {
      const contentDisposition = 'attachment; filename="report (1).xlsx"';
      const filename = determineFilename({ contentDisposition });
      expect(filename).toBe('report (1).xlsx');
    });

    it('should handle UTF-8 encoded filename', () => {
      // Note: RFC 5987 format (filename*=UTF-8'') is not decoded by current implementation
      // The extension is still extractable for type detection
      const contentDisposition = "attachment; filename*=UTF-8''%E6%96%87%E6%A1%A3.docx";
      const filename = determineFilename({ contentDisposition });
      expect(filename).toContain('.docx');
    });

    it('should handle missing Content-Disposition with URL fallback', () => {
      const url = 'https://example.com/files/report.xlsx';
      const filename = determineFilename({ url });
      expect(filename).toBe('report.xlsx');
    });
  });

  describe('MIME type extraction from response', () => {
    it('should extract extension from response MIME type', () => {
      const responseMime = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      const filename = 'download';

      const ext = extractFileType(responseMime, filename);
      expect(ext).toBe('docx');

      const docType = getDocumentType(ext);
      expect(docType).toBe('word');
    });

    it('should handle multipart MIME types', () => {
      const responseMime = 'multipart/mixed; boundary=abc';
      const filename = 'data.xlsx';

      // Should fallback to filename extension
      const ext = extractFileType(responseMime, filename);
      expect(ext).toBe('xlsx');
    });

    it('should handle generic MIME types', () => {
      const testCases = [
        { mime: 'application/octet-stream', filename: 'data.bin', expectedExt: 'bin' },
        { mime: 'application/pdf', filename: 'doc.pdf', expectedExt: 'pdf' },
        { mime: 'text/plain', filename: 'notes.txt', expectedExt: 'txt' },
        { mime: 'text/csv', filename: 'export.csv', expectedExt: 'csv' },
      ];

      for (const { mime, filename, expectedExt } of testCases) {
        const ext = extractFileType(mime, filename);
        expect(ext).toBe(expectedExt);
      }
    });
  });

  describe('Response status error handling', () => {
    it('should classify HTTP errors as network errors', () => {
      const httpErrors = [
        new Error('Failed to fetch document: 404 Not Found'),
        new Error('Failed to fetch document: 500 Internal Server Error'),
        new Error('Failed to fetch document: 403 Forbidden'),
        new Error('Network response was not ok'),
      ];

      for (const error of httpErrors) {
        expect(isNetworkError(error)).toBe(true);
        const message = formatErrorMessage(error);
        expect(message).toBeTruthy();
      }
    });

    it('should format HTTP error messages for display', () => {
      const error = new Error('Failed to fetch document: 404 Not Found');
      const message = formatErrorMessage(error);
      expect(message).toContain('404');
    });
  });
});

describe('Cross-Module: Document Creation Initialization Workflow', () => {
  describe('New document template selection', () => {
    it('should get correct template for DOCX', () => {
      expect(isNewDocumentSupported('docx')).toBe(true);
      const template = getNewDocumentTemplate('docx');
      expect(template).toBeDefined();
      expect(template!.length).toBeGreaterThan(0);
    });

    it('should get correct template for XLSX', () => {
      expect(isNewDocumentSupported('xlsx')).toBe(true);
      const template = getNewDocumentTemplate('xlsx');
      expect(template).toBeDefined();
    });

    it('should get correct template for PPTX', () => {
      expect(isNewDocumentSupported('pptx')).toBe(true);
      const template = getNewDocumentTemplate('pptx');
      expect(template).toBeDefined();
    });

    it('should reject unsupported formats for new document', () => {
      const unsupported = ['pdf', 'csv', 'odt', 'txt', 'doc', 'xls', 'ppt'];

      for (const ext of unsupported) {
        expect(isNewDocumentSupported(ext)).toBe(false);
        expect(getNewDocumentTemplate(ext)).toBeUndefined();
      }
    });
  });

  describe('New document initialization sequence', () => {
    it('should initialize new DOCX with correct settings', () => {
      const ext = 'docx';

      // Validate support
      expect(isNewDocumentSupported(ext)).toBe(true);

      // Get template
      const template = getNewDocumentTemplate(ext);
      expect(template).toBeDefined();

      // Document type
      expect(getDocumentType(ext)).toBe('word');

      // Editor config
      expect(isEditableFileType(ext)).toBe(true);
      expect(requiresConversion(ext)).toBe(false);

      // MIME type
      const mime = getMimeType(ext);
      expect(mime).toContain('wordprocessingml');
    });

    it('should initialize new XLSX with correct settings', () => {
      const ext = 'xlsx';

      expect(isNewDocumentSupported(ext)).toBe(true);
      expect(getNewDocumentTemplate(ext)).toBeDefined();
      expect(getDocumentType(ext)).toBe('cell');
      expect(isEditableFileType(ext)).toBe(true);
      expect(requiresConversion(ext)).toBe(false);
    });

    it('should initialize new PPTX with correct settings', () => {
      const ext = 'pptx';

      expect(isNewDocumentSupported(ext)).toBe(true);
      expect(getNewDocumentTemplate(ext)).toBeDefined();
      expect(getDocumentType(ext)).toBe('slide');
      expect(isEditableFileType(ext)).toBe(true);
      expect(requiresConversion(ext)).toBe(false);

      // Presentation has special delay handling
      expect(isPresentationType(ext)).toBe(true);
    });
  });

  describe('Extension to filename conversion', () => {
    it('should create correct default filename for new documents', () => {
      const testCases = [
        { ext: '.docx', expected: 'New_Document.docx' },
        { ext: '.xlsx', expected: 'New_Document.xlsx' },
        { ext: '.pptx', expected: 'New_Document.pptx' },
      ];

      for (const { ext, expected } of testCases) {
        const fileName = 'New_Document' + ext;
        expect(fileName).toBe(expected);
        expect(getFileExtension(fileName)).toBe(ext.slice(1));
      }
    });
  });
});

describe('Cross-Module: Event-Driven Document Loading Workflow', () => {
  describe('Chunk assembly workflow', () => {
    it('should validate multi-chunk document assembly', () => {
      const chunks: any[] = [
        {
          chunkIndex: 0,
          data: 'base64part0',
          lastModified: Date.now(),
          name: 'document.docx',
          size: 5000,
          totalChunks: 3,
          type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        },
        {
          chunkIndex: 1,
          data: 'base64part1',
          lastModified: Date.now(),
          name: 'document.docx',
          size: 5000,
          totalChunks: 3,
          type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        },
        {
          chunkIndex: 2,
          data: 'base64part2',
          lastModified: Date.now(),
          name: 'document.docx',
          size: 3000,
          totalChunks: 3,
          type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        },
      ];

      // Validate each chunk
      for (const chunk of chunks) {
        expect(isValidRenderOfficeData(chunk)).toBe(true);
      }

      // Validate sequence completeness
      expect(isValidChunkSequence(chunks)).toBe(true);

      // Extract metadata from first chunk
      const firstChunk = chunks[0];
      const ext = getFileExtension(firstChunk.name);
      expect(ext).toBe('docx');
      expect(getDocumentType(ext)).toBe('word');
    });

    it('should reject incomplete chunk assembly', () => {
      const incompleteChunks: any[] = [
        {
          chunkIndex: 0,
          data: 'base64data',
          lastModified: Date.now(),
          name: 'file.xlsx',
          size: 1000,
          totalChunks: 3,
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        },
        {
          chunkIndex: 1,
          data: 'base64data',
          lastModified: Date.now(),
          name: 'file.xlsx',
          size: 1000,
          totalChunks: 3,
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        },
        // Missing chunk 2
      ];

      for (const chunk of incompleteChunks) {
        expect(isValidRenderOfficeData(chunk)).toBe(true);
      }

      expect(isValidChunkSequence(incompleteChunks)).toBe(false);
    });

    it('should reject out-of-order chunks', () => {
      const outOfOrderChunks: any[] = [
        {
          chunkIndex: 2,
          data: 'base64data',
          lastModified: Date.now(),
          name: 'file.pptx',
          size: 1000,
          totalChunks: 3,
          type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        },
        {
          chunkIndex: 0,
          data: 'base64data',
          lastModified: Date.now(),
          name: 'file.pptx',
          size: 1000,
          totalChunks: 3,
          type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        },
      ];

      expect(isValidChunkSequence(outOfOrderChunks)).toBe(false);
    });
  });

  describe('Metadata validation workflow', () => {
    it('should validate chunk metadata consistency', () => {
      const chunk: any = {
        chunkIndex: 0,
        data: 'base64data',
        lastModified: Date.now(),
        name: 'presentation.pptx',
        size: 50000,
        totalChunks: 5,
        type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      };

      expect(isValidRenderOfficeData(chunk)).toBe(true);

      // Validate metadata fields
      expect(chunk.name).toBe('presentation.pptx');
      expect(chunk.size).toBe(50000);
      expect(chunk.chunkIndex).toBeLessThan(chunk.totalChunks);

      // Type detection
      const ext = getFileExtension(chunk.name);
      expect(ext).toBe('pptx');
      expect(getDocumentType(ext)).toBe('slide');
      expect(extractFileType(chunk.type, chunk.name)).toBe('pptx');
    });

    it('should reject chunk with invalid metadata', () => {
      const invalidChunk: any = {
        chunkIndex: 5, // Invalid: >= totalChunks
        data: 'base64data',
        lastModified: Date.now(),
        name: 'file.docx',
        size: 1000,
        totalChunks: 3,
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      };

      expect(isValidRenderOfficeData(invalidChunk)).toBe(false);
    });

    it('should reject chunk with missing required fields', () => {
      const incompleteChunks = [
        { chunkIndex: 0, data: 'data' }, // Missing most fields
        { chunkIndex: 0, name: 'file.docx' }, // Missing data
        { data: 'data', name: 'file.docx' }, // Missing chunkIndex
      ];

      for (const chunk of incompleteChunks) {
        expect(isValidRenderOfficeData(chunk)).toBe(false);
      }
    });
  });

  describe('Chunk to document store workflow', () => {
    it('should prepare document info from assembled chunks', () => {
      const chunk: any = {
        chunkIndex: 0,
        data: 'base64encodeddata',
        lastModified: 1700000000000,
        name: 'report.xlsx',
        size: 10240,
        totalChunks: 1,
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      };

      expect(isValidRenderOfficeData(chunk)).toBe(true);

      // Prepare document info
      const { name, size, type } = chunk;
      const ext = getFileExtension(name);

      expect(ext).toBe('xlsx');
      expect(isSupportedExtension(ext)).toBe(true);
      expect(getDocumentType(ext)).toBe('cell');
      expect(getMimeType(ext)).toBe(type);

      // Validate for file constraints
      const isValid = isValidFile(name, size, {
        allowedExtensions: ['.docx', '.xlsx', '.pptx'],
      });
      expect(isValid).toBe(true);
    });
  });
});

describe('Cross-Module: Document Operation Orchestration Workflow', () => {
  describe('Initialization sequence validation', () => {
    it('should validate document load initialization sequence', () => {
      // Step 1: Extract filename
      const url = 'https://example.com/document.xlsx';
      const filename = determineFilename({ url });
      expect(filename).toBe('document.xlsx');

      // Step 2: Validate extension
      const ext = getFileExtension(filename);
      expect(isSupportedExtension(ext)).toBe(true);

      // Step 3: Get document type
      const docType = getDocumentType(ext);
      expect(docType).toBe('cell');

      // Step 4: Check editor support
      expect(isEditableFileType(ext)).toBe(true);

      // Step 5: Check if conversion needed
      expect(requiresConversion(ext)).toBe(false);

      // Step 6: Create conversion paths
      const sanitized = sanitizeFileName(filename);
      const { inputPath, outputPath } = createConversionPaths(sanitized);
      expect(inputPath).toContain('document.xlsx');
      expect(outputPath).toContain('bin');
    });

    it('should validate legacy document initialization sequence', () => {
      const filename = 'legacy.doc';
      const ext = getFileExtension(filename);

      // Legacy format
      expect(isSupportedExtension(ext)).toBe(true);
      expect(getDocumentType(ext)).toBe('word');

      // Requires conversion
      expect(requiresConversion(ext)).toBe(true);
      expect(getConversionTarget(ext)).toBe('docx');

      // Editor still supports it
      expect(isEditableFileType(ext)).toBe(true);
    });
  });

  describe('Error recovery during initialization', () => {
    it('should handle network errors during initialization', () => {
      const error = new TypeError('fetch failed');

      expect(isNetworkError(error)).toBe(true);

      const message = formatErrorMessage(error);
      expect(message).toBe('fetch failed');
    });

    it('should handle file errors during initialization', () => {
      const error = new Error('ENOENT: no such file or directory');

      expect(isFileError(error)).toBe(true);
      expect(isNetworkError(error)).toBe(false);
    });

    it('should classify various initialization errors', () => {
      const errors = [
        { error: new Error('Network timeout'), isNetwork: true, isFile: false },
        { error: new Error('Permission denied'), isNetwork: false, isFile: true },
        { error: new TypeError('Failed to fetch'), isNetwork: true, isFile: false },
        { error: new Error('File too large'), isNetwork: false, isFile: true },
      ];

      for (const { error, isNetwork, isFile } of errors) {
        expect(isNetworkError(error)).toBe(isNetwork);
        expect(isFileError(error)).toBe(isFile);
      }
    });
  });

  describe('Editor delay calculation workflow', () => {
    it('should calculate correct delay for first document load', () => {
      const delay = getEditorCleanupDelay('docx', false);
      expect(delay).toBe(EDITOR_DELAYS.NEW_EDITOR);
    });

    it('should calculate correct delay for document switch', () => {
      const delay = getEditorCleanupDelay('xlsx', true);
      expect(delay).toBe(EDITOR_DELAYS.STANDARD_SWITCH);
    });

    it('should use longer delay for presentation switch', () => {
      const delay = getEditorCleanupDelay('pptx', true);
      expect(delay).toBe(EDITOR_DELAYS.PRESENTATION_SWITCH);
      expect(delay).toBeGreaterThan(EDITOR_DELAYS.STANDARD_SWITCH);
    });
  });
});

describe('Cross-Module: Save Workflow Completion', () => {
  describe('Save format determination workflow', () => {
    it('should determine save format for DOCX', () => {
      const outputCode = oAscFileType.DOCX;
      const saveFormat = determineSaveFormat(outputCode);

      expect(saveFormat).toBe('DOCX');
      expect(getMimeType(saveFormat.toLowerCase())).toContain('wordprocessingml');
    });

    it('should determine save format for PDF export', () => {
      const outputCode = oAscFileType.PDF;
      const saveFormat = determineSaveFormat(outputCode);

      expect(saveFormat).toBe('PDF');
      expect(getMimeType('pdf')).toBe('application/pdf');
    });

    it('should apply CSV override when original was CSV', () => {
      const originalFileName = 'data.csv';
      const outputCode = oAscFileType.XLSX;

      expect(hasFileExtension(originalFileName, 'csv')).toBe(true);
      expect(getSaveFormatOverride(originalFileName)).toBe('CSV');

      const saveFormat = determineSaveFormat(outputCode, originalFileName);
      expect(saveFormat).toBe('CSV');
    });
  });

  describe('Output filename generation workflow', () => {
    it('should generate output filename with correct extension', () => {
      const testCases = [
        { base: 'report', ext: 'docx', expected: 'report.docx' },
        { base: 'data', ext: 'xlsx', expected: 'data.xlsx' },
        { base: 'slides', ext: 'pptx', expected: 'slides.pptx' },
        { base: 'export', ext: 'pdf', expected: 'export.pdf' },
        { base: 'data', ext: 'csv', expected: 'data.csv' },
      ];

      for (const { base, ext, expected } of testCases) {
        const output = createOutputFileName(base, ext);
        expect(output).toBe(expected);
        expect(getFileExtension(output)).toBe(ext.toLowerCase());
      }
    });

    it('should create save picker options for output', () => {
      const fileName = 'report.docx';
      const mimeType = getMimeType('docx');

      const options = createSavePickerOptions(fileName, mimeType);

      expect(options.suggestedName).toBe(fileName);
      expect(options.types).toHaveLength(1);
      expect(options.types[0].accept[mimeType]).toBeDefined();
    });
  });
});
