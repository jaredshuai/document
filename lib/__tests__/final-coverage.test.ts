/**
 * Phase 80: Final Coverage Expansion Tests
 * Additional tests to maximize coverage for remaining edge cases
 */

import { describe, expect, it } from 'vitest';

// Import modules used in tests
import { oAscFileType, c_oAscFileType2 } from '../file-types';
import { isNetworkError, isFileError } from '../error-utils';
import { getSaveFormatOverride } from '../save-format';
import { DEFAULT_EDITOR_PERMISSIONS, DEFAULT_EDITOR_CUSTOMIZATION } from '../editor-config';
import { isQueueTimeoutError, DEFAULT_QUEUE_TIMEOUT } from '../operation-queue';
import {
  isValidRenderOfficeData,
  isValidChunkSequence,
  isValidFile,
} from '../type-guards';
import {
  updateRenderChunkState,
  hasMatchingRenderChunkMetadata,
  sortRenderChunks,
} from '../render-workflow';
import type { RenderOfficeData } from '../events';

// =============================================================================
// FILE TYPES COMPREHENSIVE TESTS
// =============================================================================

describe('Final: File Types Constants', () => {
  describe('oAscFileType constants', () => {
    it('should have correct DOCX value', () => {
      expect(oAscFileType.DOCX).toBe(65);
    });

    it('should have correct XLSX value', () => {
      expect(oAscFileType.XLSX).toBe(257);
    });

    it('should have correct PPTX value', () => {
      expect(oAscFileType.PPTX).toBe(129);
    });

    it('should have PDF value', () => {
      expect(oAscFileType.PDF).toBe(513);
    });

    it('should have UNKNOWN value', () => {
      expect(oAscFileType.UNKNOWN).toBe(0);
    });

    it('should have legacy format values', () => {
      expect(oAscFileType.DOC).toBe(66);
      expect(oAscFileType.XLS).toBe(258);
      expect(oAscFileType.PPT).toBe(130);
    });
  });

  describe('c_oAscFileType2 reverse mapping', () => {
    it('should map DOCX code to DOCX string', () => {
      expect(c_oAscFileType2[65]).toBe('DOCX');
    });

    it('should map XLSX code to XLSX string', () => {
      expect(c_oAscFileType2[257]).toBe('XLSX');
    });

    it('should map PPTX code to PPTX string', () => {
      expect(c_oAscFileType2[129]).toBe('PPTX');
    });

    it('should return undefined for unknown codes', () => {
      expect(c_oAscFileType2[999999]).toBeUndefined();
    });
  });
});

// =============================================================================
// SAVE FORMAT OVERRIDE TESTS
// =============================================================================

describe('Final: Save Format Override', () => {
  describe('getSaveFormatOverride', () => {
    it('should return CSV for CSV files', () => {
      expect(getSaveFormatOverride('data.csv')).toBe('CSV');
      expect(getSaveFormatOverride('DATA.CSV')).toBe('CSV');
    });

    it('should return null for non-CSV files', () => {
      expect(getSaveFormatOverride('document.docx')).toBeNull();
      expect(getSaveFormatOverride('report.xlsx')).toBeNull();
    });

    it('should return null for undefined', () => {
      expect(getSaveFormatOverride(undefined)).toBeNull();
    });
  });
});

// =============================================================================
// EDITOR DEFAULTS TESTS
// =============================================================================

describe('Final: Editor Defaults', () => {
  describe('DEFAULT_EDITOR_PERMISSIONS', () => {
    it('should have correct default values', () => {
      expect(DEFAULT_EDITOR_PERMISSIONS.edit).toBe(true);
      expect(DEFAULT_EDITOR_PERMISSIONS.chat).toBe(false);
      expect(DEFAULT_EDITOR_PERMISSIONS.protect).toBe(false);
    });
  });

  describe('DEFAULT_EDITOR_CUSTOMIZATION', () => {
    it('should have correct default values', () => {
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

// =============================================================================
// OPERATION QUEUE CONSTANTS TESTS
// =============================================================================

describe('Final: Operation Queue Constants', () => {
  describe('DEFAULT_QUEUE_TIMEOUT', () => {
    it('should be 30000ms', () => {
      expect(DEFAULT_QUEUE_TIMEOUT).toBe(30000);
    });
  });

  describe('isQueueTimeoutError', () => {
    it('should match exact message', () => {
      expect(isQueueTimeoutError(new Error('Operation queue timeout'))).toBe(true);
      expect(isQueueTimeoutError(new Error('other error'))).toBe(false);
      expect(isQueueTimeoutError('not an error')).toBe(false);
      expect(isQueueTimeoutError(null)).toBe(false);
    });
  });
});

// =============================================================================
// RENDER WORKFLOW COMPREHENSIVE TESTS
// =============================================================================

describe('Final: Render Workflow', () => {
  const createChunk = (
    index: number,
    total: number,
    overrides: Partial<RenderOfficeData> = {}
  ): RenderOfficeData => ({
    chunkIndex: index,
    totalChunks: total,
    data: `chunk-${index}`,
    name: 'test.docx',
    size: 1000,
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    lastModified: 1709500000000,
    ...overrides,
  });

  describe('hasMatchingRenderChunkMetadata all fields', () => {
    it('should match when all fields are equal', () => {
      const chunk1 = createChunk(0, 3);
      const chunk2 = createChunk(1, 3);
      expect(hasMatchingRenderChunkMetadata(chunk1, chunk2)).toBe(true);
    });

    it('should not match when lastModified differs', () => {
      const chunk1 = createChunk(0, 3, { lastModified: 1000 });
      const chunk2 = createChunk(1, 3, { lastModified: 2000 });
      expect(hasMatchingRenderChunkMetadata(chunk1, chunk2)).toBe(false);
    });

    it('should not match when name differs', () => {
      const chunk1 = createChunk(0, 3, { name: 'file1.docx' });
      const chunk2 = createChunk(1, 3, { name: 'file2.docx' });
      expect(hasMatchingRenderChunkMetadata(chunk1, chunk2)).toBe(false);
    });

    it('should not match when size differs', () => {
      const chunk1 = createChunk(0, 3, { size: 1000 });
      const chunk2 = createChunk(1, 3, { size: 2000 });
      expect(hasMatchingRenderChunkMetadata(chunk1, chunk2)).toBe(false);
    });

    it('should not match when totalChunks differs', () => {
      const chunk1 = createChunk(0, 3, { totalChunks: 3 });
      const chunk2 = createChunk(1, 3, { totalChunks: 4 });
      expect(hasMatchingRenderChunkMetadata(chunk1, chunk2)).toBe(false);
    });

    it('should not match when type differs', () => {
      const chunk1 = createChunk(0, 3, { type: 'type1' });
      const chunk2 = createChunk(1, 3, { type: 'type2' });
      expect(hasMatchingRenderChunkMetadata(chunk1, chunk2)).toBe(false);
    });

    it('should match regardless of chunkIndex', () => {
      const chunk1 = createChunk(0, 3);
      const chunk2 = createChunk(2, 3);
      expect(hasMatchingRenderChunkMetadata(chunk1, chunk2)).toBe(true);
    });
  });

  describe('sortRenderChunks edge cases', () => {
    it('should handle single chunk', () => {
      const chunks = [createChunk(0, 1)];
      const sorted = sortRenderChunks(chunks);
      expect(sorted.length).toBe(1);
    });

    it('should handle already sorted chunks', () => {
      const chunks = [createChunk(0, 3), createChunk(1, 3), createChunk(2, 3)];
      const sorted = sortRenderChunks(chunks);
      expect(sorted[0].chunkIndex).toBe(0);
      expect(sorted[1].chunkIndex).toBe(1);
      expect(sorted[2].chunkIndex).toBe(2);
    });

    it('should handle reverse sorted chunks', () => {
      const chunks = [createChunk(2, 3), createChunk(1, 3), createChunk(0, 3)];
      const sorted = sortRenderChunks(chunks);
      expect(sorted[0].chunkIndex).toBe(0);
      expect(sorted[1].chunkIndex).toBe(1);
      expect(sorted[2].chunkIndex).toBe(2);
    });

    it('should handle random order chunks', () => {
      const chunks = [createChunk(2, 5), createChunk(0, 5), createChunk(4, 5), createChunk(1, 5), createChunk(3, 5)];
      const sorted = sortRenderChunks(chunks);
      for (let i = 0; i < 5; i++) {
        expect(sorted[i].chunkIndex).toBe(i);
      }
    });
  });

  describe('updateRenderChunkState state transitions', () => {
    it('should transition from empty to waiting', () => {
      const chunk = createChunk(0, 3);
      const result = updateRenderChunkState([], chunk);
      expect(result.status).toBe('waiting');
      expect(result.receivedChunks).toBe(1);
      expect(result.expectedChunks).toBe(3);
    });

    it('should transition from waiting to ready', () => {
      let state = updateRenderChunkState([], createChunk(0, 2));
      expect(state.status).toBe('waiting');

      state = updateRenderChunkState(state.chunks, createChunk(1, 2));
      expect(state.status).toBe('ready');
    });

    it('should transition to reset on metadata mismatch', () => {
      let state = updateRenderChunkState([], createChunk(0, 2, { name: 'file1.docx' }));
      state = updateRenderChunkState(state.chunks, createChunk(1, 2, { name: 'file2.docx' }));
      expect(state.status).toBe('reset');
    });

    it('should restart on new chunk 0', () => {
      let state = updateRenderChunkState([], createChunk(0, 2, { name: 'file1.docx' }));
      state = updateRenderChunkState(state.chunks, createChunk(0, 3, { name: 'file2.docx' }));
      expect(state.status).toBe('waiting');
      expect(state.expectedChunks).toBe(3);
    });
  });
});

// =============================================================================
// TYPE GUARDS COMPREHENSIVE TESTS
// =============================================================================

describe('Final: Type Guards Comprehensive', () => {
  describe('isValidRenderOfficeData all validations', () => {
    const createValid = (): RenderOfficeData => ({
      chunkIndex: 0,
      totalChunks: 1,
      data: 'test',
      name: 'test.docx',
      size: 100,
      type: 'application/test',
      lastModified: Date.now(),
    });

    it('should accept valid data', () => {
      expect(isValidRenderOfficeData(createValid())).toBe(true);
    });

    it('should reject null', () => {
      expect(isValidRenderOfficeData(null)).toBe(false);
    });

    it('should reject undefined', () => {
      expect(isValidRenderOfficeData(undefined)).toBe(false);
    });

    it('should reject non-object', () => {
      expect(isValidRenderOfficeData('string')).toBe(false);
      expect(isValidRenderOfficeData(123)).toBe(false);
    });

    it('should reject missing chunkIndex', () => {
      const data = { ...createValid(), chunkIndex: undefined };
      expect(isValidRenderOfficeData(data)).toBe(false);
    });

    it('should reject missing data', () => {
      const data = { ...createValid(), data: undefined };
      expect(isValidRenderOfficeData(data)).toBe(false);
    });
  });

  describe('isValidChunkSequence comprehensive', () => {
    const createChunks = (count: number): RenderOfficeData[] => {
      return Array.from({ length: count }, (_, i) => ({
        chunkIndex: i,
        totalChunks: count,
        data: `chunk-${i}`,
        name: 'test.docx',
        size: 100,
        type: 'application/test',
        lastModified: Date.now(),
      }));
    };

    it('should accept complete sequence', () => {
      expect(isValidChunkSequence(createChunks(3))).toBe(true);
    });

    it('should reject incomplete sequence', () => {
      const chunks = createChunks(3).slice(0, 2);
      expect(isValidChunkSequence(chunks)).toBe(false);
    });

    it('should reject sequence with duplicate indices', () => {
      const chunks = createChunks(2);
      chunks[1] = { ...chunks[1], chunkIndex: 0 };
      expect(isValidChunkSequence(chunks)).toBe(false);
    });

    it('should reject empty array', () => {
      expect(isValidChunkSequence([])).toBe(false);
    });
  });

  describe('isValidFile comprehensive', () => {
    it('should accept valid file', () => {
      expect(isValidFile('test.docx', 1024)).toBe(true);
    });

    it('should reject empty filename', () => {
      expect(isValidFile('', 1024)).toBe(false);
    });

    it('should reject negative size', () => {
      expect(isValidFile('test.docx', -1)).toBe(false);
    });

    it('should enforce max size', () => {
      expect(isValidFile('test.docx', 2000, { maxSizeBytes: 1000 })).toBe(false);
    });

    it('should enforce extension filter', () => {
      expect(isValidFile('test.docx', 100, { allowedExtensions: ['.xlsx'] })).toBe(false);
    });
  });
});

// =============================================================================
// ERROR CLASSIFICATION COMPREHENSIVE TESTS
// =============================================================================

describe('Final: Error Classification', () => {
  describe('isNetworkError comprehensive', () => {
    it('should detect network indicators', () => {
      expect(isNetworkError(new Error('network error'))).toBe(true);
      expect(isNetworkError(new Error('fetch failed'))).toBe(true);
      expect(isNetworkError(new Error('connection timeout'))).toBe(true);
      expect(isNetworkError(new Error('ECONNREFUSED'))).toBe(true);
      expect(isNetworkError(new Error('ENOTFOUND'))).toBe(true);
      expect(isNetworkError(new Error('ETIMEDOUT'))).toBe(true);
      expect(isNetworkError(new Error('abort error'))).toBe(true);
      expect(isNetworkError(new Error('cancel request'))).toBe(true);
    });

    it('should reject non-network errors', () => {
      expect(isNetworkError(new Error('file not found'))).toBe(false);
      expect(isNetworkError(new Error('permission denied'))).toBe(false);
    });

    it('should handle non-error values', () => {
      expect(isNetworkError('error')).toBe(false);
      expect(isNetworkError(null)).toBe(false);
    });
  });

  describe('isFileError comprehensive', () => {
    it('should detect file indicators', () => {
      expect(isFileError(new Error('file not found'))).toBe(true);
      expect(isFileError(new Error('ENOENT'))).toBe(true);
      expect(isFileError(new Error('permission denied'))).toBe(true);
      expect(isFileError(new Error('EACCES'))).toBe(true);
      expect(isFileError(new Error('is a directory'))).toBe(true);
      expect(isFileError(new Error('EISDIR'))).toBe(true);
      expect(isFileError(new Error('not a directory'))).toBe(true);
      expect(isFileError(new Error('ENOTDIR'))).toBe(true);
      expect(isFileError(new Error('file too large'))).toBe(true);
      expect(isFileError(new Error('EFBIG'))).toBe(true);
      expect(isFileError(new Error('no space left'))).toBe(true);
      expect(isFileError(new Error('ENOSPC'))).toBe(true);
    });

    it('should reject non-file errors', () => {
      expect(isFileError(new Error('network error'))).toBe(false);
      expect(isFileError(new Error('timeout'))).toBe(false);
    });
  });
});
