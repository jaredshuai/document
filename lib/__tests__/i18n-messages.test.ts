import { describe, it, expect } from 'vitest';
import {
  i18nMessages,
  getMessageKeys,
  validateMessageKeys,
  validateMessagesNonEmpty,
  validateKeysForMessages,
  validateNonEmptyForMessages,
  type I18nMessages,
} from '../i18n-messages';
import { LanguageCode } from '../language-types';

describe('i18nMessages', () => {
  it('should have messages for all supported languages', () => {
    expect(i18nMessages[LanguageCode.ZH]).toBeDefined();
    expect(i18nMessages[LanguageCode.EN]).toBeDefined();
  });

  it('should have 2 language entries', () => {
    const languages = Object.keys(i18nMessages);
    expect(languages).toHaveLength(2);
    expect(languages).toContain('zh');
    expect(languages).toContain('en');
  });
});

describe('getMessageKeys', () => {
  it('should return all message keys', () => {
    const keys = getMessageKeys();
    expect(keys.length).toBeGreaterThan(0);
  });

  it('should return expected keys', () => {
    const keys = getMessageKeys();
    expect(keys).toContain('webOffice');
    expect(keys).toContain('uploadDocument');
    expect(keys).toContain('returnHome');
    expect(keys).toContain('close');
    expect(keys).toContain('newWord');
    expect(keys).toContain('newExcel');
    expect(keys).toContain('newPowerPoint');
    expect(keys).toContain('menu');
    expect(keys).toContain('menuGuide');
    expect(keys).toContain('fileSavedSuccess');
    expect(keys).toContain('documentLoaded');
    expect(keys).toContain('failedToLoadEditor');
    expect(keys).toContain('unsupportedFileType');
    expect(keys).toContain('invalidFileObject');
    expect(keys).toContain('documentOperationFailed');
  });

  it('should return 15 keys', () => {
    expect(getMessageKeys()).toHaveLength(15);
  });
});

describe('validateMessageKeys', () => {
  it('should return valid for current messages', () => {
    const result = validateMessageKeys();
    expect(result.valid).toBe(true);
  });

  it('should return empty missing keys for all languages', () => {
    const result = validateMessageKeys();
    expect(result.missingKeys[LanguageCode.ZH]).toHaveLength(0);
    expect(result.missingKeys[LanguageCode.EN]).toHaveLength(0);
  });
});

describe('validateMessagesNonEmpty', () => {
  it('should return valid for current messages', () => {
    const result = validateMessagesNonEmpty();
    expect(result.valid).toBe(true);
  });

  it('should return empty emptyMessages for all languages', () => {
    const result = validateMessagesNonEmpty();
    expect(result.emptyMessages[LanguageCode.ZH]).toHaveLength(0);
    expect(result.emptyMessages[LanguageCode.EN]).toHaveLength(0);
  });
});

describe('Message key consistency', () => {
  it('should have same keys in both languages', () => {
    const zhKeys = Object.keys(i18nMessages[LanguageCode.ZH]);
    const enKeys = Object.keys(i18nMessages[LanguageCode.EN]);
    expect(zhKeys.sort()).toEqual(enKeys.sort());
  });

  it('should have all required keys in both languages', () => {
    const requiredKeys = getMessageKeys();
    const zhKeys = Object.keys(i18nMessages[LanguageCode.ZH]);
    const enKeys = Object.keys(i18nMessages[LanguageCode.EN]);

    for (const key of requiredKeys) {
      expect(zhKeys).toContain(key);
      expect(enKeys).toContain(key);
    }
  });
});

describe('Message completeness', () => {
  it('should have non-empty Chinese messages', () => {
    const messages = i18nMessages[LanguageCode.ZH];
    for (const key of getMessageKeys()) {
      expect(messages[key as keyof I18nMessages]).toBeTruthy();
      expect(messages[key as keyof I18nMessages].trim()).not.toBe('');
    }
  });

  it('should have non-empty English messages', () => {
    const messages = i18nMessages[LanguageCode.EN];
    for (const key of getMessageKeys()) {
      expect(messages[key as keyof I18nMessages]).toBeTruthy();
      expect(messages[key as keyof I18nMessages].trim()).not.toBe('');
    }
  });
});

describe('Chinese message content', () => {
  it('should have Chinese text in Chinese messages', () => {
    const messages = i18nMessages[LanguageCode.ZH];
    // Check that Chinese messages contain Chinese characters
    expect(messages.uploadDocument).toMatch(/[\u4e00-\u9fa5]/);
    expect(messages.newWord).toMatch(/[\u4e00-\u9fa5]/);
    expect(messages.menu).toMatch(/[\u4e00-\u9fa5]/);
  });

  it('should have English webOffice in both languages', () => {
    // webOffice is intentionally the same in both languages
    expect(i18nMessages[LanguageCode.ZH].webOffice).toBe('Web Office');
    expect(i18nMessages[LanguageCode.EN].webOffice).toBe('Web Office');
  });
});

describe('English message content', () => {
  it('should have English text in English messages', () => {
    const messages = i18nMessages[LanguageCode.EN];
    // Check that English messages are in English (no Chinese characters)
    for (const key of getMessageKeys()) {
      const message = messages[key as keyof I18nMessages];
      // webOffice and newWord/newExcel/newPowerPoint can be exceptions (brand names)
      if (!['webOffice', 'newWord', 'newExcel', 'newPowerPoint'].includes(key)) {
        expect(message).not.toMatch(/[\u4e00-\u9fa5]/);
      }
    }
  });
});

describe('Error message format', () => {
  it('should have error messages with trailing colon for dynamic content', () => {
    const zhMessages = i18nMessages[LanguageCode.ZH];
    const enMessages = i18nMessages[LanguageCode.EN];

    // These messages are expected to have dynamic content appended
    expect(zhMessages.fileSavedSuccess).toContain('：');
    expect(enMessages.fileSavedSuccess).toContain(': ');
    expect(zhMessages.unsupportedFileType).toContain('：');
    expect(enMessages.unsupportedFileType).toContain(': ');
    expect(zhMessages.documentOperationFailed).toContain('：');
    expect(enMessages.documentOperationFailed).toContain(': ');
  });
});

describe('validateKeysForMessages', () => {
  it('should return valid for complete messages', () => {
    const result = validateKeysForMessages(
      i18nMessages,
      [LanguageCode.ZH, LanguageCode.EN],
      getMessageKeys(),
    );
    expect(result.valid).toBe(true);
  });

  it('should detect missing keys in messages', () => {
    const incompleteMessages = {
      [LanguageCode.ZH]: { webOffice: 'Web Office' }, // Missing other keys
      [LanguageCode.EN]: { webOffice: 'Web Office' },
    };
    const result = validateKeysForMessages(
      incompleteMessages as Record<string, Partial<I18nMessages>>,
      [LanguageCode.ZH, LanguageCode.EN],
      getMessageKeys(),
    );
    expect(result.valid).toBe(false);
    expect(result.missingKeys[LanguageCode.ZH]).toContain('uploadDocument');
    expect(result.missingKeys[LanguageCode.EN]).toContain('uploadDocument');
  });

  it('should return all missing keys for a language', () => {
    const emptyMessages = {
      [LanguageCode.ZH]: {},
      [LanguageCode.EN]: { webOffice: 'Web Office' },
    };
    const result = validateKeysForMessages(
      emptyMessages as Record<string, Partial<I18nMessages>>,
      [LanguageCode.ZH, LanguageCode.EN],
      ['webOffice', 'uploadDocument'],
    );
    expect(result.valid).toBe(false);
    expect(result.missingKeys[LanguageCode.ZH]).toHaveLength(2);
    expect(result.missingKeys[LanguageCode.EN]).toHaveLength(1);
  });
});

describe('validateNonEmptyForMessages', () => {
  it('should return valid for non-empty messages', () => {
    const result = validateNonEmptyForMessages(
      i18nMessages,
      [LanguageCode.ZH, LanguageCode.EN],
      getMessageKeys(),
    );
    expect(result.valid).toBe(true);
  });

  it('should detect empty string values', () => {
    const messagesWithEmpty = {
      [LanguageCode.ZH]: { ...i18nMessages[LanguageCode.ZH], uploadDocument: '' },
      [LanguageCode.EN]: { ...i18nMessages[LanguageCode.EN] },
    };
    const result = validateNonEmptyForMessages(
      messagesWithEmpty as Record<string, Partial<I18nMessages>>,
      [LanguageCode.ZH, LanguageCode.EN],
      getMessageKeys(),
    );
    expect(result.valid).toBe(false);
    expect(result.emptyMessages[LanguageCode.ZH]).toContain('uploadDocument');
  });

  it('should detect whitespace-only values', () => {
    const messagesWithWhitespace = {
      [LanguageCode.ZH]: { ...i18nMessages[LanguageCode.ZH], menu: '   ' },
      [LanguageCode.EN]: { ...i18nMessages[LanguageCode.EN] },
    };
    const result = validateNonEmptyForMessages(
      messagesWithWhitespace as Record<string, Partial<I18nMessages>>,
      [LanguageCode.ZH, LanguageCode.EN],
      getMessageKeys(),
    );
    expect(result.valid).toBe(false);
    expect(result.emptyMessages[LanguageCode.ZH]).toContain('menu');
  });

  it('should detect undefined values', () => {
    const messagesWithUndefined = {
      [LanguageCode.ZH]: { ...i18nMessages[LanguageCode.ZH], menu: undefined },
      [LanguageCode.EN]: { ...i18nMessages[LanguageCode.EN] },
    };
    const result = validateNonEmptyForMessages(
      messagesWithUndefined as Record<string, Partial<I18nMessages>>,
      [LanguageCode.ZH, LanguageCode.EN],
      getMessageKeys(),
    );
    expect(result.valid).toBe(false);
    expect(result.emptyMessages[LanguageCode.ZH]).toContain('menu');
  });
});
