import { getCookie, getQuery, localStorageGetItem, localStorageSetItem } from 'ranuts/utils';
import { normalizeLanguage as normalizeLangCode } from './url-utils';
import { LanguageCode, OnlyOfficeLanguageCode, type Language, toOnlyOfficeLang } from './language-types';
import { i18nMessages, type I18nMessages } from './i18n-messages';

// Re-export for backward compatibility
export { LanguageCode, OnlyOfficeLanguageCode, type Language } from './language-types';
export type { I18nMessages } from './i18n-messages';

class I18n {
  private currentLanguage: Language = LanguageCode.EN;

  /**
   * Get cookie value by name (using ranuts utility)
   */
  private getCookie(name: string): string | null {
    return getCookie(name);
  }

  /**
   * Get URL parameter by name (using ranuts utility)
   */
  private getUrlParameter(name: string): string | null {
    return getQuery()?.[name] || null;
  }

  /**
   * Normalize language code to LanguageCode enum
   * Supports: 'zh', 'zh-CN', 'zh_CN', 'en', 'en-US', etc.
   */
  private normalizeLanguage(lang: string | null): Language | null {
    const normalized = normalizeLangCode(lang);
    if (normalized === 'zh') return LanguageCode.ZH;
    if (normalized === 'en') return LanguageCode.EN;
    return null;
  }

  constructor() {
    // Priority: URL locale -> cookie -> localStorage -> navigator.language -> 'en'
    let detectedLang: Language | null = null;

    // 1. Try to get from URL parameter 'locale' (highest priority)
    const urlLocale = this.getUrlParameter('locale');
    detectedLang = this.normalizeLanguage(urlLocale);

    // 2. If not found in URL, try cookies (locale field)
    if (!detectedLang) {
      const cookieLang = this.getCookie('locale');
      detectedLang = this.normalizeLanguage(cookieLang);
    }

    // 3. If not found in cookies, try localStorage
    if (!detectedLang) {
      const savedLang = localStorageGetItem('document-lang') as Language;
      if (savedLang && (savedLang === LanguageCode.ZH || savedLang === LanguageCode.EN)) {
        detectedLang = savedLang;
      }
    }

    // 4. If not found in localStorage, try navigator.language
    if (!detectedLang) {
      const browserLang =
        // eslint-disable-next-line n/no-unsupported-features/node-builtins
        typeof navigator !== 'undefined' && navigator.language
          ? // eslint-disable-next-line n/no-unsupported-features/node-builtins
            navigator.language
          : LanguageCode.EN;
      detectedLang = this.normalizeLanguage(browserLang);
    }

    // 5. Default to 'en' if nothing found
    this.currentLanguage = detectedLang || LanguageCode.EN;
  }

  /**
   * Get current language
   */
  getLanguage(): Language {
    return this.currentLanguage;
  }

  /**
   * Set language
   */
  setLanguage(lang: Language): void {
    if (lang === LanguageCode.ZH || lang === LanguageCode.EN) {
      this.currentLanguage = lang;
      localStorageSetItem('document-lang', lang);
      // Trigger language change event
      // eslint-disable-next-line n/no-unsupported-features/node-builtins
      window.dispatchEvent(new CustomEvent('languagechange', { detail: { language: lang } }));
    }
  }

  /**
   * Get translated text
   */
  t(key: keyof I18nMessages): string {
    return i18nMessages[this.currentLanguage][key] || i18nMessages[LanguageCode.EN][key] || key;
  }

  /**
   * Get all messages
   */
  getMessages(): I18nMessages {
    return i18nMessages[this.currentLanguage];
  }

  /**
   * Get OnlyOffice language code (BCP 47 standard)
   * OnlyOffice uses BCP 47 standard language codes
   * - English: 'en'
   * - Simplified Chinese (Mainland China): 'zh-CN'
   */
  getOnlyOfficeLang(): string {
    return toOnlyOfficeLang(this.currentLanguage);
  }
}

// Export singleton
export const i18n = new I18n();

// Export convenience functions
export const t = (key: keyof I18nMessages): string => i18n.t(key);
export const getLanguage = (): Language => i18n.getLanguage();
export const setLanguage = (lang: Language): void => i18n.setLanguage(lang);
export const getOnlyOfficeLang = (): string => i18n.getOnlyOfficeLang();
