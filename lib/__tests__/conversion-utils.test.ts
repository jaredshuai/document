import { describe, it, expect } from 'vitest';
import { createConversionParams, escapeXml, createOutputFilename } from '../conversion-utils';

describe('createConversionParams', () => {
  it('should create XML with basic paths', () => {
    const result = createConversionParams('/working/input.docx', '/working/output.bin');

    expect(result).toContain('<?xml version="1.0" encoding="utf-8"?>');
    expect(result).toContain('<m_sFileFrom>/working/input.docx</m_sFileFrom>');
    expect(result).toContain('<m_sFileTo>/working/output.bin</m_sFileTo>');
    expect(result).toContain('<m_sThemeDir>/working/themes</m_sThemeDir>');
    expect(result).toContain('<m_bIsNoBase64>false</m_bIsNoBase64>');
  });

  it('should include additional params when provided', () => {
    const additionalParams = '<m_nFormatFrom>260</m_nFormatFrom>';
    const result = createConversionParams('/input.csv', '/output.bin', additionalParams);

    expect(result).toContain('<m_nFormatFrom>260</m_nFormatFrom>');
  });

  it('should handle empty additional params', () => {
    const result = createConversionParams('/input.docx', '/output.bin', '');

    expect(result).toContain('<m_sFileFrom>/input.docx</m_sFileFrom>');
    expect(result).not.toContain('<m_nFormatFrom>');
  });

  it('should handle paths with special characters', () => {
    const result = createConversionParams('/working/my file.docx', '/working/output.bin');

    expect(result).toContain('<m_sFileFrom>/working/my file.docx</m_sFileFrom>');
  });

  it('should include correct XML namespaces', () => {
    const result = createConversionParams('/input.docx', '/output.bin');

    expect(result).toContain('xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"');
    expect(result).toContain('xmlns:xsd="http://www.w3.org/2001/XMLSchema"');
  });

  it('should handle PDF font directory param', () => {
    const additionalParams = '<m_sFontDir>/working/fonts/</m_sFontDir>';
    const result = createConversionParams('/input.bin', '/output.pdf', additionalParams);

    expect(result).toContain('<m_sFontDir>/working/fonts/</m_sFontDir>');
  });

  it('should handle CSV format param', () => {
    const additionalParams = '<m_nFormatFrom>260</m_nFormatFrom>';
    const result = createConversionParams('/input.csv', '/output.bin', additionalParams);

    expect(result).toContain('<m_nFormatFrom>260</m_nFormatFrom>');
  });

  it('should handle paths with Chinese characters', () => {
    const result = createConversionParams('/working/文档.docx', '/working/output.bin');

    expect(result).toContain('<m_sFileFrom>/working/文档.docx</m_sFileFrom>');
  });

  it('should produce valid XML structure', () => {
    const result = createConversionParams('/input.docx', '/output.bin');

    // Check XML structure
    expect(result).toMatch(/<TaskQueueDataConvert[^>]*>[\s\S]*<\/TaskQueueDataConvert>/);
    expect(result).toContain('<m_sFileFrom>');
    expect(result).toContain('<m_sFileTo>');
    expect(result).toContain('<m_sThemeDir>');
    expect(result).toContain('<m_bIsNoBase64>');
  });
});

describe('escapeXml', () => {
  it('should escape ampersand', () => {
    expect(escapeXml('foo & bar')).toBe('foo &amp; bar');
  });

  it('should escape less than', () => {
    expect(escapeXml('a < b')).toBe('a &lt; b');
  });

  it('should escape greater than', () => {
    expect(escapeXml('a > b')).toBe('a &gt; b');
  });

  it('should escape double quotes', () => {
    expect(escapeXml('say "hello"')).toBe('say &quot;hello&quot;');
  });

  it('should escape single quotes', () => {
    expect(escapeXml("it's")).toBe('it&apos;s');
  });

  it('should escape multiple special characters', () => {
    expect(escapeXml('<foo & "bar" and \'baz\' >')).toBe('&lt;foo &amp; &quot;bar&quot; and &apos;baz&apos; &gt;');
  });

  it('should not modify strings without special characters', () => {
    expect(escapeXml('normal filename.docx')).toBe('normal filename.docx');
  });

  it('should handle empty string', () => {
    expect(escapeXml('')).toBe('');
  });

  it('should handle string with only special characters', () => {
    expect(escapeXml('<>&"\'')).toBe('&lt;&gt;&amp;&quot;&apos;');
  });
});

describe('createOutputFilename', () => {
  it('should create filename with extension', () => {
    expect(createOutputFilename('document', 'docx')).toBe('document.docx');
  });

  it('should lowercase extension', () => {
    expect(createOutputFilename('report', 'DOCX')).toBe('report.docx');
    expect(createOutputFilename('report', 'XLSX')).toBe('report.xlsx');
  });

  it('should handle extension with leading dot', () => {
    expect(createOutputFilename('file', '.docx')).toBe('file.docx');
  });

  it('should handle empty extension', () => {
    expect(createOutputFilename('file', '')).toBe('file.');
  });

  it('should handle empty base name', () => {
    expect(createOutputFilename('', 'docx')).toBe('.docx');
  });

  it('should handle various file types', () => {
    expect(createOutputFilename('presentation', 'pptx')).toBe('presentation.pptx');
    expect(createOutputFilename('spreadsheet', 'xlsx')).toBe('spreadsheet.xlsx');
    expect(createOutputFilename('document', 'pdf')).toBe('document.pdf');
  });

  it('should handle base with existing extension', () => {
    // Function doesn't remove existing extensions
    expect(createOutputFilename('document.txt', 'docx')).toBe('document.txt.docx');
  });

  it('should handle special characters in base name', () => {
    expect(createOutputFilename('my-file_2024', 'docx')).toBe('my-file_2024.docx');
  });
});