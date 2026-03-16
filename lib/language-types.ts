/**
 * Language codes enum
 * Internal language codes (simplified): 'zh' | 'en'
 */

/**
 * Language codes enum
 * Internal language codes (simplified): 'zh' | 'en'
 * OnlyOffice language codes (BCP 47 standard): 'zh-CN' | 'en'
 */
export enum LanguageCode {
  /** Simplified Chinese (internal) */
  ZH = 'zh',
  /** English (internal) */
  EN = 'en',
}

/**
 * OnlyOffice language codes (BCP 47 standard)
 */
export enum OnlyOfficeLanguageCode {
  /** Simplified Chinese (Mainland China) - BCP 47 standard */
  ZH_CN = 'zh-CN',
  /** English */
  EN = 'en',
}

export type Language = LanguageCode.ZH | LanguageCode.EN;

/**
 * Check if a value is a valid Language
 * @param value - The value to check
 * @returns True if the value is a valid Language
 */
export function isValidLanguage(value: unknown): value is Language {
  return value === LanguageCode.ZH || value === LanguageCode.EN;
}

/**
 * Map internal language code to OnlyOffice BCP 47 standard code
 * @param lang - Internal language code
 * @returns OnlyOffice language code
 */
export function toOnlyOfficeLang(lang: Language): OnlyOfficeLanguageCode {
  const langMap: Record<Language, OnlyOfficeLanguageCode> = {
    [LanguageCode.ZH]: OnlyOfficeLanguageCode.ZH_CN,
    [LanguageCode.EN]: OnlyOfficeLanguageCode.EN,
  };
  return langMap[lang];
}
