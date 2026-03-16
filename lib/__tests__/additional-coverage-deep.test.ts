/**
 * Phase 78: Additional Coverage Deep Tests
 * Tests to fill remaining coverage gaps
 */

import { describe, expect, it } from 'vitest';
import {
  getMimeType,
  extractFileType,
} from '../url-utils';
import { encodeToBytes, decodeBytes, hasUtf8Bom, stripUtf8Bom } from '../byte-utils';
import {
  safeAsync,
  isNetworkError,
  isFileError,
} from '../error-utils';
import { getDocumentType } from '../document-utils';
import { getNewDocumentTemplate, isNewDocumentSupported } from '../document-template';
import { determineSaveFormat, hasFileExtension } from '../save-format';
import { isEditableFileType, requiresConversion } from '../editor-config';
import { createOperationQueue, isQueueTimeoutError, DEFAULT_QUEUE_TIMEOUT } from '../operation-queue';
import {
  updateRenderChunkState,
  hasMatchingRenderChunkMetadata,
  sortRenderChunks,
} from '../render-workflow';
import type { RenderOfficeData } from '../events';

// =============================================================================
// ADDITIONAL MIME TYPE TESTS
// =============================================================================

describe('Coverage: MIME Types', () => {
  describe('getMimeType for all supported formats', () => {
    it('should return MIME type for docx', () => {
      expect(getMimeType('docx')).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    });

    it('should return MIME type for xlsx', () => {
      expect(getMimeType('xlsx')).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    });

    it('should return MIME type for pptx', () => {
      expect(getMimeType('pptx')).toBe('application/vnd.openxmlformats-officedocument.presentationml.presentation');
    });

    it('should return MIME type for legacy formats', () => {
      expect(getMimeType('doc')).toBe('application/msword');
      expect(getMimeType('xls')).toBe('application/vnd.ms-excel');
      expect(getMimeType('ppt')).toBe('application/vnd.ms-powerpoint');
    });

    it('should return MIME type for ODF formats', () => {
      expect(getMimeType('odt')).toBe('application/vnd.oasis.opendocument.text');
      expect(getMimeType('ods')).toBe('application/vnd.oasis.opendocument.spreadsheet');
      expect(getMimeType('odp')).toBe('application/vnd.oasis.opendocument.presentation');
    });

    it('should return MIME type for PDF', () => {
      expect(getMimeType('pdf')).toBe('application/pdf');
    });

    it('should return default for unknown extensions', () => {
      expect(getMimeType('xyz')).toBe('application/octet-stream');
      expect(getMimeType('')).toBe('application/octet-stream');
    });
  });

  describe('extractFileType', () => {
    it('should extract from MIME type', () => {
      expect(extractFileType('application/vnd.openxmlformats-officedocument.wordprocessingml.document')).toBe('docx');
      expect(extractFileType('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')).toBe('xlsx');
    });

    it('should fall back to filename extension', () => {
      expect(extractFileType(undefined, 'document.docx')).toBe('docx');
      expect(extractFileType('unknown/mime', 'file.xlsx')).toBe('xlsx');
    });

    it('should return empty string for unknown', () => {
      expect(extractFileType()).toBe('');
    });
  });
});

// =============================================================================
// ADDITIONAL DOCUMENT TYPE TESTS
// =============================================================================

describe('Coverage: Document Types', () => {
  describe('getDocumentType for all extensions', () => {
    it('should return correct type for OOXML formats', () => {
      expect(getDocumentType('docx')).toBe('word');
      expect(getDocumentType('xlsx')).toBe('cell');
      expect(getDocumentType('pptx')).toBe('slide');
    });

    it('should return correct type for legacy formats', () => {
      expect(getDocumentType('doc')).toBe('word');
      expect(getDocumentType('xls')).toBe('cell');
      expect(getDocumentType('ppt')).toBe('slide');
    });

    it('should return null for unsupported formats', () => {
      expect(getDocumentType('exe')).toBeNull();
      expect(getDocumentType('')).toBeNull();
      expect(getDocumentType('xyz')).toBeNull();
    });

    it('should return null for PDF', () => {
      expect(getDocumentType('pdf')).toBeNull();
    });
  });
});

// =============================================================================
// ADDITIONAL TEMPLATE TESTS
// =============================================================================

describe('Coverage: Document Templates', () => {
  describe('isNewDocumentSupported', () => {
    it('should return true for supported formats', () => {
      expect(isNewDocumentSupported('docx')).toBe(true);
      expect(isNewDocumentSupported('xlsx')).toBe(true);
      expect(isNewDocumentSupported('pptx')).toBe(true);
    });

    it('should return false for unsupported formats', () => {
      expect(isNewDocumentSupported('pdf')).toBe(false);
      expect(isNewDocumentSupported('doc')).toBe(false);
      expect(isNewDocumentSupported('xyz')).toBe(false);
    });
  });

  describe('getNewDocumentTemplate', () => {
    it('should return template for supported formats', () => {
      expect(getNewDocumentTemplate('docx')).toBeTruthy();
      expect(getNewDocumentTemplate('xlsx')).toBeTruthy();
      expect(getNewDocumentTemplate('pptx')).toBeTruthy();
    });

    it('should return undefined for unsupported formats', () => {
      expect(getNewDocumentTemplate('pdf')).toBeUndefined();
      expect(getNewDocumentTemplate('xyz')).toBeUndefined();
    });
  });
});

// =============================================================================
// ADDITIONAL SAVE FORMAT TESTS
// =============================================================================

describe('Coverage: Save Formats', () => {
  describe('determineSaveFormat', () => {
    it('should return correct format for known codes', () => {
      expect(determineSaveFormat(65)).toBe('DOCX');
      expect(determineSaveFormat(257)).toBe('XLSX');
      expect(determineSaveFormat(129)).toBe('PPTX');
    });

    it('should return undefined for unknown codes', () => {
      expect(determineSaveFormat(999)).toBeUndefined();
      expect(determineSaveFormat(0)).toBe('UNKNOWN');
    });

    it('should handle CSV with filename', () => {
      expect(determineSaveFormat(512, 'data.csv')).toBe('CSV');
    });
  });

  describe('hasFileExtension', () => {
    it('should detect extension correctly', () => {
      expect(hasFileExtension('document.docx', 'docx')).toBe(true);
      expect(hasFileExtension('data.xlsx', 'xlsx')).toBe(true);
      expect(hasFileExtension('slides.pptx', 'pptx')).toBe(true);
    });

    it('should be case-insensitive', () => {
      expect(hasFileExtension('document.DOCX', 'docx')).toBe(true);
      expect(hasFileExtension('document.docx', 'DOCX')).toBe(true);
    });

    it('should return false for mismatched extensions', () => {
      expect(hasFileExtension('document.docx', 'xlsx')).toBe(false);
      expect(hasFileExtension('document', 'docx')).toBe(false);
    });
  });
});

// =============================================================================
// ADDITIONAL EDITOR CONFIG TESTS
// =============================================================================

describe('Coverage: Editor Config', () => {
  describe('isEditableFileType', () => {
    it('should return true for editable formats', () => {
      expect(isEditableFileType('docx')).toBe(true);
      expect(isEditableFileType('xlsx')).toBe(true);
      expect(isEditableFileType('pptx')).toBe(true);
      expect(isEditableFileType('doc')).toBe(true);
      expect(isEditableFileType('xls')).toBe(true);
      expect(isEditableFileType('ppt')).toBe(true);
    });

    it('should return true for viewable formats', () => {
      expect(isEditableFileType('pdf')).toBe(true);
    });

    it('should return false for unsupported formats', () => {
      expect(isEditableFileType('exe')).toBe(false);
      expect(isEditableFileType('xyz')).toBe(false);
    });
  });

  describe('requiresConversion', () => {
    it('should return false for OOXML formats', () => {
      expect(requiresConversion('docx')).toBe(false);
      expect(requiresConversion('xlsx')).toBe(false);
      expect(requiresConversion('pptx')).toBe(false);
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

    it('should return false for PDF', () => {
      expect(requiresConversion('pdf')).toBe(false);
    });
  });
});

// =============================================================================
// ADDITIONAL OPERATION QUEUE TESTS
// =============================================================================

describe('Coverage: Operation Queue', () => {
  describe('DEFAULT_QUEUE_TIMEOUT', () => {
    it('should be defined', () => {
      expect(DEFAULT_QUEUE_TIMEOUT).toBe(30000);
    });
  });

  describe('isQueueTimeoutError', () => {
    it('should identify timeout error', () => {
      const error = new Error('Operation queue timeout');
      expect(isQueueTimeoutError(error)).toBe(true);
    });

    it('should reject non-timeout error', () => {
      const error = new Error('Some other error');
      expect(isQueueTimeoutError(error)).toBe(false);
    });
  });

  describe('createOperationQueue', () => {
    it('should create queue with default options', async () => {
      const queue = createOperationQueue();
      const result = await queue(() => Promise.resolve('success'));
      expect(result).toBe('success');
    });

    it('should create queue with custom timeout', async () => {
      const queue = createOperationQueue({ timeout: 1000 });
      const result = await queue(() => Promise.resolve('success'));
      expect(result).toBe('success');
    });

    it('should handle errors', async () => {
      const queue = createOperationQueue();
      await expect(queue(() => Promise.reject(new Error('test error')))).rejects.toThrow('test error');
    });
  });
});

// =============================================================================
// ADDITIONAL RENDER WORKFLOW TESTS
// =============================================================================

describe('Coverage: Render Workflow', () => {
  const FIXED_TIMESTAMP = 1234567890000;
  const createChunk = (index: number, total: number, name: string = 'test.docx', lastModified: number = FIXED_TIMESTAMP): RenderOfficeData => ({
    chunkIndex: index,
    totalChunks: total,
    data: `chunk-${index}`,
    name,
    size: 1000,
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    lastModified,
  });

  describe('hasMatchingRenderChunkMetadata', () => {
    it('should return true for matching chunks', () => {
      const chunk1 = createChunk(0, 2);
      const chunk2 = createChunk(1, 2);
      expect(hasMatchingRenderChunkMetadata(chunk1, chunk2)).toBe(true);
    });

    it('should return false for mismatched chunks', () => {
      const chunk1 = createChunk(0, 2, 'file1.docx');
      const chunk2 = createChunk(1, 2, 'file2.docx');
      expect(hasMatchingRenderChunkMetadata(chunk1, chunk2)).toBe(false);
    });
  });

  describe('sortRenderChunks', () => {
    it('should sort chunks by index', () => {
      const chunks = [createChunk(2, 3), createChunk(0, 3), createChunk(1, 3)];
      const sorted = sortRenderChunks(chunks);
      expect(sorted[0].chunkIndex).toBe(0);
      expect(sorted[1].chunkIndex).toBe(1);
      expect(sorted[2].chunkIndex).toBe(2);
    });
  });

  describe('updateRenderChunkState', () => {
    it('should return waiting for incomplete set', () => {
      const chunk = createChunk(0, 2);
      const state = updateRenderChunkState([], chunk);
      expect(state.status).toBe('waiting');
    });

    it('should return ready for complete set', () => {
      const chunks = [createChunk(0, 2), createChunk(1, 2)];
      let state = updateRenderChunkState([], chunks[0]);
      state = updateRenderChunkState(state.chunks, chunks[1]);
      expect(state.status).toBe('ready');
    });
  });
});

// =============================================================================
// ADDITIONAL BYTE UTILITIES TESTS
// =============================================================================

describe('Coverage: Byte Utilities', () => {
  describe('stripUtf8Bom', () => {
    it('should strip BOM from array', () => {
      const withBom = new Uint8Array([0xEF, 0xBB, 0xBF, 0x48, 0x65, 0x6C, 0x6C, 0x6F]);
      const stripped = stripUtf8Bom(withBom);
      expect(stripped.length).toBe(5);
      expect(decodeBytes(stripped)).toBe('Hello');
    });

    it('should return original if no BOM', () => {
      const noBom = new Uint8Array([0x48, 0x65, 0x6C, 0x6C, 0x6F]);
      const result = stripUtf8Bom(noBom);
      expect(result).toEqual(noBom);
    });
  });

  describe('encodeToBytes withBom option', () => {
    it('should add BOM when withBom is true', () => {
      const encoded = encodeToBytes('Hello', true);
      expect(hasUtf8Bom(encoded)).toBe(true);
    });

    it('should not add BOM by default', () => {
      const encoded = encodeToBytes('Hello');
      expect(hasUtf8Bom(encoded)).toBe(false);
    });
  });
});

// =============================================================================
// ADDITIONAL ERROR UTILITIES TESTS
// =============================================================================

describe('Coverage: Error Utilities', () => {
  describe('safeAsync', () => {
    it('should return success result', async () => {
      const [result, error] = await safeAsync(() => Promise.resolve('success'));
      expect(result).toBe('success');
      expect(error).toBeNull();
    });

    it('should return error result', async () => {
      const [result, error] = await safeAsync(() => Promise.reject(new Error('test')));
      expect(result).toBeNull();
      expect(error).toBeInstanceOf(Error);
    });
  });

  describe('isNetworkError', () => {
    it('should identify network errors', () => {
      expect(isNetworkError(new Error('Network error'))).toBe(true);
      expect(isNetworkError(new Error('fetch failed'))).toBe(true);
      expect(isNetworkError(new Error('timeout'))).toBe(true);
    });

    it('should reject non-network errors', () => {
      expect(isNetworkError(new Error('file error'))).toBe(false);
    });
  });

  describe('isFileError', () => {
    it('should identify file errors', () => {
      expect(isFileError(new Error('File not found'))).toBe(true);
      expect(isFileError(new Error('ENOENT'))).toBe(true);
      expect(isFileError(new Error('permission denied'))).toBe(true);
    });

    it('should reject non-file errors', () => {
      expect(isFileError(new Error('network error'))).toBe(false);
    });
  });
});
