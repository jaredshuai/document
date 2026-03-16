import { describe, it, expect } from 'vitest';
import { LanguageCode, OnlyOfficeLanguageCode, isValidLanguage, toOnlyOfficeLang } from '../language-types';

describe('LanguageCode enum', () => {
  it('should have ZH as "zh"', () => {
    expect(LanguageCode.ZH).toBe('zh');
  });

  it('should have EN as "en"', () => {
    expect(LanguageCode.EN).toBe('en');
  });

  it('should have exactly 2 language codes', () => {
    const keys = Object.keys(LanguageCode).filter((k) => isNaN(Number(k)));
    expect(keys).toHaveLength(2);
    expect(keys).toContain('ZH');
    expect(keys).toContain('EN');
  });

  it('should have valid string values', () => {
    expect(typeof LanguageCode.ZH).toBe('string');
    expect(typeof LanguageCode.EN).toBe('string');
  });
});

describe('OnlyOfficeLanguageCode enum', () => {
  it('should have ZH_CN as "zh-CN"', () => {
    expect(OnlyOfficeLanguageCode.ZH_CN).toBe('zh-CN');
  });

  it('should have EN as "en"', () => {
    expect(OnlyOfficeLanguageCode.EN).toBe('en');
  });

  it('should have exactly 2 language codes', () => {
    const keys = Object.keys(OnlyOfficeLanguageCode).filter((k) => isNaN(Number(k)));
    expect(keys).toHaveLength(2);
    expect(keys).toContain('ZH_CN');
    expect(keys).toContain('EN');
  });

  it('should use BCP 47 standard for Chinese', () => {
    // BCP 47 standard for Simplified Chinese (Mainland China)
    expect(OnlyOfficeLanguageCode.ZH_CN).toMatch(/^[a-z]{2}-[A-Z]{2}$/);
  });
});

describe('isValidLanguage', () => {
  it('should return true for valid languages', () => {
    expect(isValidLanguage('zh')).toBe(true);
    expect(isValidLanguage('en')).toBe(true);
  });

  it('should return false for invalid languages', () => {
    expect(isValidLanguage('fr')).toBe(false);
    expect(isValidLanguage('de')).toBe(false);
    expect(isValidLanguage('')).toBe(false);
    expect(isValidLanguage(null)).toBe(false);
    expect(isValidLanguage(undefined)).toBe(false);
    expect(isValidLanguage(123)).toBe(false);
    expect(isValidLanguage({})).toBe(false);
  });
});

describe('toOnlyOfficeLang', () => {
  it('should map "zh" to "zh-CN"', () => {
    expect(toOnlyOfficeLang(LanguageCode.ZH)).toBe(OnlyOfficeLanguageCode.ZH_CN);
  });

  it('should map "en" to "en"', () => {
    expect(toOnlyOfficeLang(LanguageCode.EN)).toBe(OnlyOfficeLanguageCode.EN);
  });

  it('should return valid OnlyOfficeLanguageCode values', () => {
    const zhResult = toOnlyOfficeLang(LanguageCode.ZH);
    const enResult = toOnlyOfficeLang(LanguageCode.EN);

    expect(Object.values(OnlyOfficeLanguageCode)).toContain(zhResult);
    expect(Object.values(OnlyOfficeLanguageCode)).toContain(enResult);
  });
});

describe('LanguageCode and OnlyOfficeLanguageCode consistency', () => {
  it('should have matching EN values', () => {
    // Both use 'en' for English
    expect(LanguageCode.EN).toBe('en');
    expect(OnlyOfficeLanguageCode.EN).toBe('en');
  });

  it('should have different ZH values (internal vs BCP 47)', () => {
    // Internal uses 'zh', OnlyOffice uses 'zh-CN'
    expect(LanguageCode.ZH).toBe('zh');
    expect(OnlyOfficeLanguageCode.ZH_CN).toBe('zh-CN');
  });

  it('should have toOnlyOfficeLang map correctly', () => {
    // Verify the mapping function
    expect(toOnlyOfficeLang(LanguageCode.ZH)).toBe('zh-CN');
    expect(toOnlyOfficeLang(LanguageCode.EN)).toBe('en');
  });
});

describe('isValidLanguage edge cases', () => {
  it('should be case sensitive', () => {
    // Language codes are case-sensitive
    expect(isValidLanguage('ZH')).toBe(false);
    expect(isValidLanguage('EN')).toBe(false);
    expect(isValidLanguage('Zh')).toBe(false);
    expect(isValidLanguage('En')).toBe(false);
  });

  it('should reject language-region codes', () => {
    // Full language codes like 'zh-CN' are not valid internal codes
    expect(isValidLanguage('zh-CN')).toBe(false);
    expect(isValidLanguage('en-US')).toBe(false);
    expect(isValidLanguage('zh-TW')).toBe(false);
  });

  it('should reject whitespace', () => {
    expect(isValidLanguage(' zh')).toBe(false);
    expect(isValidLanguage('zh ')).toBe(false);
    expect(isValidLanguage(' zh ')).toBe(false);
  });

  it('should reject arrays and objects', () => {
    expect(isValidLanguage(['zh'])).toBe(false);
    expect(isValidLanguage({ lang: 'zh' })).toBe(false);
  });
});
