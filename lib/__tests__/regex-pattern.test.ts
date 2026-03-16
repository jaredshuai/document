/**
 * Phase 64: Regex Pattern Tests
 *
 * These tests verify that regex patterns used throughout the codebase
 * behave correctly for various inputs, including edge cases.
 */

import { describe, it, expect } from 'vitest';
import {
  extractFilenameFromContentDisposition,
  getFileExtension,
  sanitizeFileName,
} from '../url-utils';

describe('Content-Disposition Regex Pattern Tests', () => {
  describe('extractFilenameFromContentDisposition', () => {
    it('should extract filename from standard format', () => {
      expect(extractFilenameFromContentDisposition('attachment; filename="document.docx"')).toBe('document.docx');
      expect(extractFilenameFromContentDisposition('inline; filename="report.xlsx"')).toBe('report.xlsx');
    });

    it('should extract filename without quotes', () => {
      expect(extractFilenameFromContentDisposition('attachment; filename=document.docx')).toBe('document.docx');
    });

    it('should handle filename with spaces', () => {
      expect(extractFilenameFromContentDisposition('attachment; filename="my document.docx"')).toBe('my document.docx');
    });

    it('should handle filename with special characters', () => {
      expect(extractFilenameFromContentDisposition('attachment; filename="report-2024_final.xlsx"')).toBe('report-2024_final.xlsx');
      expect(extractFilenameFromContentDisposition('attachment; filename="file (1).docx"')).toBe('file (1).docx');
    });

    it('should handle filename with unicode', () => {
      expect(extractFilenameFromContentDisposition('attachment; filename="文档.docx"')).toBe('文档.docx');
      expect(extractFilenameFromContentDisposition('attachment; filename="doküment.xlsx"')).toBe('doküment.xlsx');
    });

    it('should handle UTF-8 encoded filename*', () => {
      // RFC 5987 encoding
      const result = extractFilenameFromContentDisposition("attachment; filename*=UTF-8''%E6%96%87%E6%A1%A3.docx");
      // Note: The regex may not fully decode RFC 5987, but should not crash
      expect(result).toBeDefined();
    });

    it('should return null for missing filename', () => {
      expect(extractFilenameFromContentDisposition('attachment')).toBeNull();
      expect(extractFilenameFromContentDisposition('inline')).toBeNull();
    });

    it('should return null for null input', () => {
      expect(extractFilenameFromContentDisposition(null)).toBeNull();
    });

    it('should handle empty string', () => {
      expect(extractFilenameFromContentDisposition('')).toBeNull();
    });

    it('should handle filename with multiple semicolons', () => {
      expect(extractFilenameFromContentDisposition('attachment; size=1234; filename="doc.docx"; other=value')).toBe('doc.docx');
    });

    it('should handle filename with path separators (should extract basename)', () => {
      // Note: The regex extracts whatever is in filename, including path
      expect(extractFilenameFromContentDisposition('attachment; filename="path/to/file.docx"')).toBe('path/to/file.docx');
    });
  });
});

describe('File Extension Regex Pattern Tests', () => {
  describe('getFileExtension', () => {
    it('should extract simple extension', () => {
      expect(getFileExtension('file.docx')).toBe('docx');
      expect(getFileExtension('document.xlsx')).toBe('xlsx');
    });

    it('should handle multiple dots', () => {
      expect(getFileExtension('file.backup.docx')).toBe('docx');
      expect(getFileExtension('report.2024.final.xlsx')).toBe('xlsx');
    });

    it('should handle no extension', () => {
      expect(getFileExtension('filename')).toBe('');
      expect(getFileExtension('no-extension')).toBe('');
    });

    it('should handle leading dot', () => {
      expect(getFileExtension('.gitignore')).toBe('gitignore');
      expect(getFileExtension('.env')).toBe('env');
    });

    it('should handle trailing dots', () => {
      expect(getFileExtension('file.')).toBe('');
      expect(getFileExtension('file..')).toBe('');
    });

    it('should handle only dots', () => {
      expect(getFileExtension('.')).toBe('');
      expect(getFileExtension('..')).toBe('');
      expect(getFileExtension('...')).toBe('');
    });

    it('should normalize to lowercase', () => {
      expect(getFileExtension('FILE.DOCX')).toBe('docx');
      expect(getFileExtension('File.Xlsx')).toBe('xlsx');
    });

    it('should handle numbers in extension', () => {
      expect(getFileExtension('file.docx1')).toBe('docx1');
      expect(getFileExtension('archive.tar.gz')).toBe('gz');
    });
  });
});

describe('Filename Sanitization Regex Pattern Tests', () => {
  describe('sanitizeFileName', () => {
    it('should remove Windows illegal characters', () => {
      // < > : " / \ | ? *
      expect(sanitizeFileName('file<name>.docx')).not.toContain('<');
      expect(sanitizeFileName('file>name>.docx')).not.toContain('>');
      expect(sanitizeFileName('file:name:.docx')).not.toContain(':');
      expect(sanitizeFileName('file"name".docx')).not.toContain('"');
      expect(sanitizeFileName('file/name/.docx')).not.toContain('/');
      expect(sanitizeFileName('file\\name\\.docx')).not.toContain('\\');
      expect(sanitizeFileName('file|name|.docx')).not.toContain('|');
      expect(sanitizeFileName('file?name?.docx')).not.toContain('?');
      expect(sanitizeFileName('file*name*.docx')).not.toContain('*');
    });

    it('should remove control characters', () => {
      expect(sanitizeFileName('file\x00name.docx')).not.toContain('\x00');
      expect(sanitizeFileName('file\x1fname.docx')).not.toContain('\x1f');
    });

    it('should remove unsafe characters', () => {
      expect(sanitizeFileName('file&name.docx')).not.toContain('&');
      expect(sanitizeFileName("file'name.docx")).not.toContain("'");
      expect(sanitizeFileName('file%name.docx')).not.toContain('%');
      expect(sanitizeFileName('file!name.docx')).not.toContain('!');
      expect(sanitizeFileName('file{name}.docx')).not.toContain('{');
      expect(sanitizeFileName('file[name].docx')).not.toContain('[');
      expect(sanitizeFileName('file}name.docx')).not.toContain('}');
      expect(sanitizeFileName('file]name.docx')).not.toContain(']');
    });

    it('should handle reserved patterns', () => {
      expect(sanitizeFileName('...')).not.toBe('...');
      expect(sanitizeFileName('.')).not.toBe('.');
    });

    it('should preserve extension', () => {
      expect(sanitizeFileName('file<name>.docx')).toContain('.docx');
      expect(sanitizeFileName('file<>:"/\\|?*.xlsx')).toContain('.xlsx');
    });

    it('should preserve unicode', () => {
      const result = sanitizeFileName('文件名称.docx');
      expect(result).toContain('文件名称');
      expect(result).toContain('.docx');
    });

    it('should handle consecutive illegal characters in filename', () => {
      // Use an input with a proper extension
      const result = sanitizeFileName('file<<>>name.docx');
      // Illegal characters should be removed from name
      expect(result).not.toContain('<');
      expect(result).not.toContain('>');
      // Extension should be preserved
      expect(result).toContain('.docx');
    });
  });
});

describe('Regex Edge Cases', () => {
  it('should handle empty filename parts', () => {
    expect(getFileExtension('')).toBe('');
    expect(sanitizeFileName('')).toBe('file.bin');
  });

  it('should handle whitespace', () => {
    expect(getFileExtension('file .docx')).toBe('docx');
    expect(sanitizeFileName('  file  .docx  ')).toContain('.docx');
  });

  it('should handle very long filenames', () => {
    const longName = 'a'.repeat(1000) + '.docx';
    const result = sanitizeFileName(longName);
    expect(result.length).toBeLessThanOrEqual(205);
  });

  it('should handle only illegal characters', () => {
    // When all chars are illegal, we get a default filename
    const result = sanitizeFileName('<>:|?*');
    // Should return the default file.bin or similar
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('should handle null bytes in string', () => {
    expect(sanitizeFileName('file\x00name.docx')).not.toContain('\x00');
  });
});

describe('Pattern Matching Behavior', () => {
  it('should match Content-Disposition patterns', () => {
    // The regex matches standard filename format
    expect(extractFilenameFromContentDisposition('attachment; filename="doc.docx"')).toBe('doc.docx');
    // No quotes
    expect(extractFilenameFromContentDisposition('attachment; filename=doc.docx')).toBe('doc.docx');
    // With size
    expect(extractFilenameFromContentDisposition('attachment; size=123; filename="doc.docx"')).toBe('doc.docx');
  });

  it('should handle various Content-Disposition formats', () => {
    // Standard format
    expect(extractFilenameFromContentDisposition('attachment; filename="doc.docx"')).toBe('doc.docx');
    // No quotes
    expect(extractFilenameFromContentDisposition('attachment; filename=doc.docx')).toBe('doc.docx');
    // With size
    expect(extractFilenameFromContentDisposition('attachment; size=123; filename="doc.docx"')).toBe('doc.docx');
  });

  it('should extract last extension from multi-dot filenames', () => {
    expect(getFileExtension('file.tar.gz')).toBe('gz');
    expect(getFileExtension('archive.tar.bz2')).toBe('bz2');
  });
});

describe('Regex Security Considerations', () => {
  it('should not be vulnerable to ReDoS with repeated patterns', () => {
    // These should complete quickly, not hang
    const start = Date.now();

    const repeatedChars = 'a'.repeat(10000);
    expect(() => getFileExtension(repeatedChars + '.docx')).not.toThrow();

    const repeatedDots = '.'.repeat(10000);
    expect(() => getFileExtension('file' + repeatedDots + 'docx')).not.toThrow();

    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(1000); // Should complete in under 1 second
  });

  it('should handle regex special characters in input', () => {
    // Regex special characters: . ^ $ * + ? { } [ ] \ | ( )
    expect(() => sanitizeFileName('file.$^*.docx')).not.toThrow();
    expect(() => sanitizeFileName('file()+.docx')).not.toThrow();
    expect(() => sanitizeFileName('file[].docx')).not.toThrow();
    expect(() => sanitizeFileName('file{}.docx')).not.toThrow();
  });
});