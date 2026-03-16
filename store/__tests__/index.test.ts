import { describe, it, expect } from 'vitest';
import { getDocmentObj, setDocmentObj } from '../index';

describe('Store', () => {
  it('should have initial state with empty fileName', () => {
    const state = getDocmentObj();
    expect(state.fileName).toBe('');
    expect(state.file).toBeUndefined();
    expect(state.url).toBeUndefined();
  });

  it('should update state with setDocmentObj', () => {
    setDocmentObj({
      fileName: 'test.docx',
      file: undefined,
      url: 'https://example.com/test.docx',
    });

    const state = getDocmentObj();
    expect(state.fileName).toBe('test.docx');
    expect(state.url).toBe('https://example.com/test.docx');
  });

  it('should accept partial updates', () => {
    setDocmentObj({
      fileName: 'initial.docx',
    });

    const state = getDocmentObj();
    expect(state.fileName).toBe('initial.docx');
  });

  it('should handle File objects', () => {
    const mockFile = new File(['content'], 'document.docx', {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });

    setDocmentObj({
      fileName: 'document.docx',
      file: mockFile,
    });

    const state = getDocmentObj();
    expect(state.fileName).toBe('document.docx');
    expect(state.file).toBeInstanceOf(File);
    expect(state.file?.name).toBe('document.docx');
  });

  it('should return the same object reference after update', () => {
    setDocmentObj({ fileName: 'first.docx' });
    const state1 = getDocmentObj();

    setDocmentObj({ fileName: 'second.xlsx' });
    const state2 = getDocmentObj();

    // Signal should return updated values
    expect(state2.fileName).toBe('second.xlsx');
    expect(state2.fileName).not.toBe(state1.fileName);
  });
});

describe('Store edge cases', () => {
  it('should handle empty string fileName', () => {
    setDocmentObj({ fileName: '' });
    const state = getDocmentObj();
    expect(state.fileName).toBe('');
  });

  it('should handle null file value', () => {
    setDocmentObj({
      fileName: 'test.docx',
      file: null as any,
    });
    const state = getDocmentObj();
    expect(state.file).toBeNull();
  });

  it('should handle URL objects', () => {
    const url = new URL('https://example.com/document.docx');
    setDocmentObj({
      fileName: 'document.docx',
      url: url,
    });
    const state = getDocmentObj();
    expect(state.url).toBe(url);
    expect(state.url?.toString()).toBe('https://example.com/document.docx');
  });

  it('should handle various file types', () => {
    const fileTypes = ['docx', 'xlsx', 'pptx', 'csv'];
    for (const ext of fileTypes) {
      const mockFile = new File(['content'], `document.${ext}`, {
        type: 'application/octet-stream',
      });
      setDocmentObj({
        fileName: `document.${ext}`,
        file: mockFile,
      });
      const state = getDocmentObj();
      expect(state.fileName).toBe(`document.${ext}`);
    }
  });

  it('should handle special characters in fileName', () => {
    const specialNames = [
      '文档.docx',
      'документ.xlsx',
      'file with spaces.pptx',
      'file-with-dashes.csv',
      'file_with_underscores.docx',
    ];
    for (const name of specialNames) {
      setDocmentObj({ fileName: name });
      const state = getDocmentObj();
      expect(state.fileName).toBe(name);
    }
  });
});
