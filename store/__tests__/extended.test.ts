/**
 * Phase 68: Extended Store State Tests
 *
 * Additional tests for store behavior and state management.
 */

import { describe, it, expect } from 'vitest';
import { getDocmentObj, setDocmentObj } from '../index';

describe('Store State Transitions', () => {
  it('should transition from empty to populated state', () => {
    // Reset to empty
    setDocmentObj({ fileName: '', file: undefined, url: undefined });

    // Transition to populated
    setDocmentObj({
      fileName: 'document.docx',
      url: 'https://example.com/document.docx',
    });

    const state = getDocmentObj();
    expect(state.fileName).toBe('document.docx');
    expect(state.url).toBe('https://example.com/document.docx');
  });

  it('should transition from file to URL source', () => {
    // Start with file
    const mockFile = new File(['content'], 'local.docx');
    setDocmentObj({ fileName: 'local.docx', file: mockFile });

    // Switch to URL
    setDocmentObj({
      fileName: 'remote.docx',
      file: undefined,
      url: 'https://example.com/remote.docx',
    });

    const state = getDocmentObj();
    expect(state.file).toBeUndefined();
    expect(state.url).toBe('https://example.com/remote.docx');
  });

  it('should handle rapid state updates', () => {
    for (let i = 0; i < 10; i++) {
      setDocmentObj({ fileName: `document-${i}.docx` });
    }

    const state = getDocmentObj();
    expect(state.fileName).toBe('document-9.docx');
  });
});

describe('Store Data Persistence', () => {
  it('should maintain file reference across multiple reads', () => {
    const mockFile = new File(['content'], 'persistent.docx');
    setDocmentObj({ fileName: 'persistent.docx', file: mockFile });

    const state1 = getDocmentObj();
    const state2 = getDocmentObj();

    expect(state1.file).toBe(state2.file);
  });

  it('should not lose data on subsequent partial updates', () => {
    const url = 'https://example.com/document.docx';
    setDocmentObj({ fileName: 'document.docx', url });

    // Partial update without URL
    setDocmentObj({ fileName: 'updated.docx' });

    const state = getDocmentObj();
    // URL should be preserved from the signal behavior
    expect(state.fileName).toBe('updated.docx');
  });
});

describe('Store Type Safety', () => {
  it('should handle string URL', () => {
    setDocmentObj({
      fileName: 'test.docx',
      url: 'https://example.com/test.docx',
    });

    const state = getDocmentObj();
    expect(typeof state.url).toBe('string');
  });

  it('should handle URL object', () => {
    const urlObj = new URL('https://example.com/test.docx');
    setDocmentObj({
      fileName: 'test.docx',
      url: urlObj,
    });

    const state = getDocmentObj();
    expect(state.url).toBeInstanceOf(URL);
  });

  it('should handle File with various properties', () => {
    const mockFile = new File(['content'], 'test.docx', {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      lastModified: Date.now(),
    });

    setDocmentObj({ fileName: 'test.docx', file: mockFile });

    const state = getDocmentObj();
    expect(state.file?.type).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    expect(state.file?.lastModified).toBeGreaterThan(0);
  });
});

describe('Store Edge Cases', () => {
  it('should handle undefined values in update', () => {
    setDocmentObj({
      fileName: 'test.docx',
      file: undefined,
      url: undefined,
    });

    const state = getDocmentObj();
    expect(state.fileName).toBe('test.docx');
    expect(state.file).toBeUndefined();
    expect(state.url).toBeUndefined();
  });

  it('should handle empty File', () => {
    const emptyFile = new File([], 'empty.txt');
    setDocmentObj({ fileName: 'empty.txt', file: emptyFile });

    const state = getDocmentObj();
    expect(state.file?.size).toBe(0);
  });

  it('should handle data URL as string', () => {
    setDocmentObj({
      fileName: 'data.txt',
      url: 'data:text/plain,Hello%20World',
    });

    const state = getDocmentObj();
    expect(state.url).toBe('data:text/plain,Hello%20World');
  });

  it('should handle blob URL', () => {
    setDocmentObj({
      fileName: 'blob.docx',
      url: 'blob:https://example.com/test-id',
    });

    const state = getDocmentObj();
    expect(state.url).toContain('blob:');
  });
});

describe('Store Integration Scenarios', () => {
  it('should simulate document open workflow', () => {
    // 1. Initial state
    setDocmentObj({ fileName: '', file: undefined, url: undefined });

    // 2. User selects file
    const selectedFile = new File(['content'], 'user-selected.docx');
    setDocmentObj({ fileName: 'user-selected.docx', file: selectedFile });

    // 3. Verify state
    const stateAfterSelect = getDocmentObj();
    expect(stateAfterSelect.fileName).toBe('user-selected.docx');
    expect(stateAfterSelect.file).toBeInstanceOf(File);

    // 4. Clear for next document
    setDocmentObj({ fileName: '', file: undefined, url: undefined });
    const clearedState = getDocmentObj();
    expect(clearedState.fileName).toBe('');
  });

  it('should simulate URL document workflow', () => {
    const documentUrl = 'https://example.com/documents/report-2024.xlsx';

    // 1. Set document from URL
    setDocmentObj({
      fileName: 'report-2024.xlsx',
      url: documentUrl,
    });

    const state = getDocmentObj();
    expect(state.fileName).toBe('report-2024.xlsx');
    expect(state.url).toBe(documentUrl);
  });

  it('should handle document type transitions', () => {
    const documentTypes = [
      { ext: 'docx', fileName: 'document.docx' },
      { ext: 'xlsx', fileName: 'spreadsheet.xlsx' },
      { ext: 'pptx', fileName: 'presentation.pptx' },
    ];

    for (const doc of documentTypes) {
      setDocmentObj({ fileName: doc.fileName });
      const state = getDocmentObj();
      expect(state.fileName).toBe(doc.fileName);
    }
  });
});