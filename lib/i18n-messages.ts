import { LanguageCode, type Language } from './language-types';

/**
 * Internationalization message keys
 */
export interface I18nMessages {
  // UI text
  webOffice: string;
  uploadDocument: string;
  returnHome: string;
  close: string;
  newWord: string;
  newExcel: string;
  newPowerPoint: string;
  menu: string;
  menuGuide: string;

  // Messages
  fileSavedSuccess: string;
  documentLoaded: string;

  // Error messages
  failedToLoadEditor: string;
  unsupportedFileType: string;
  invalidFileObject: string;
  documentOperationFailed: string;
}

/**
 * All i18n messages for supported languages
 */
export const i18nMessages: Record<Language, I18nMessages> = {
  [LanguageCode.ZH]: {
    webOffice: 'Web Office',
    uploadDocument: '查看/编辑文档',
    returnHome: '返回首页',
    close: '关闭',
    newWord: '新建 Word',
    newExcel: '新建 Excel',
    newPowerPoint: '新建 PowerPoint',
    menu: '菜单',
    menuGuide: '关闭按钮在右上角，点击即可退出编辑（关闭后不再提示）',
    fileSavedSuccess: '文件保存成功：',
    documentLoaded: '文档加载完成：',
    failedToLoadEditor: '无法加载编辑器组件。请确保已正确安装 OnlyOffice API。',
    unsupportedFileType: '不支持的文件类型：',
    invalidFileObject: '无效的文件对象',
    documentOperationFailed: '文档操作失败：',
  },
  [LanguageCode.EN]: {
    webOffice: 'Web Office',
    uploadDocument: 'View/Edit Document',
    returnHome: 'Back to Home',
    close: 'Close',
    newWord: 'New Word',
    newExcel: 'New Excel',
    newPowerPoint: 'New PowerPoint',
    menu: 'Menu',
    menuGuide: "The close button is in the top right corner. Click it to exit editing (dismissed after closing).",
    fileSavedSuccess: 'File saved successfully: ',
    documentLoaded: 'Document loaded: ',
    failedToLoadEditor: 'Failed to load editor component. Please ensure OnlyOffice API is properly installed.',
    unsupportedFileType: 'Unsupported file type: ',
    invalidFileObject: 'Invalid file object',
    documentOperationFailed: 'Document operation failed: ',
  },
};

/**
 * Get all message keys
 */
export function getMessageKeys(): (keyof I18nMessages)[] {
  return [
    'webOffice',
    'uploadDocument',
    'returnHome',
    'close',
    'newWord',
    'newExcel',
    'newPowerPoint',
    'menu',
    'menuGuide',
    'fileSavedSuccess',
    'documentLoaded',
    'failedToLoadEditor',
    'unsupportedFileType',
    'invalidFileObject',
    'documentOperationFailed',
  ];
}

/**
 * Check if all languages have the same message keys
 * @param messages - The messages object to validate
 * @param languages - The languages to check
 * @param expectedKeys - The expected keys
 */
export function validateKeysForMessages(
  messages: Record<Language, Partial<I18nMessages>>,
  languages: Language[],
  expectedKeys: (keyof I18nMessages)[],
): { valid: boolean; missingKeys: Record<Language, string[]> } {
  const missingKeys: Record<Language, string[]> = {} as Record<Language, string[]>;

  for (const lang of languages) {
    missingKeys[lang] = [];
    const langMessages = messages[lang];
    for (const key of expectedKeys) {
      if (!(key in langMessages)) {
        missingKeys[lang].push(key);
      }
    }
  }

  const valid = languages.every((lang) => missingKeys[lang].length === 0);
  return { valid, missingKeys };
}

/**
 * Check if all messages are non-empty
 * @param messages - The messages object to validate
 * @param languages - The languages to check
 * @param expectedKeys - The expected keys
 */
export function validateNonEmptyForMessages(
  messages: Record<Language, Partial<I18nMessages>>,
  languages: Language[],
  expectedKeys: (keyof I18nMessages)[],
): { valid: boolean; emptyMessages: Record<Language, string[]> } {
  const emptyMessages: Record<Language, string[]> = {} as Record<Language, string[]>;

  for (const lang of languages) {
    emptyMessages[lang] = [];
    const langMessages = messages[lang];
    for (const key of expectedKeys) {
      const value = langMessages[key];
      if (!value || value.trim() === '') {
        emptyMessages[lang].push(key);
      }
    }
  }

  const valid = languages.every((lang) => emptyMessages[lang].length === 0);
  return { valid, emptyMessages };
}

/**
 * Check if all languages have the same message keys
 */
export function validateMessageKeys(): { valid: boolean; missingKeys: Record<Language, string[]> } {
  const languages = [LanguageCode.ZH, LanguageCode.EN] as Language[];
  return validateKeysForMessages(i18nMessages, languages, getMessageKeys());
}

/**
 * Check if all messages are non-empty
 */
export function validateMessagesNonEmpty(): { valid: boolean; emptyMessages: Record<Language, string[]> } {
  const languages = [LanguageCode.ZH, LanguageCode.EN] as Language[];
  return validateNonEmptyForMessages(i18nMessages, languages, getMessageKeys());
}
