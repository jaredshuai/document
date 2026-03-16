/**
 * Editor configuration utilities for OnlyOffice Editor
 *
 * This module provides pure helper functions for creating editor configuration
 * objects, separating static configuration from dynamic values.
 */

/**
 * Default editor permissions configuration
 *
 * These settings control what actions users can perform in the editor.
 */
export const DEFAULT_EDITOR_PERMISSIONS = {
  edit: true,
  chat: false,
  protect: false,
} as const;

/**
 * Default editor customization settings
 *
 * These settings control the editor UI and behavior.
 */
export const DEFAULT_EDITOR_CUSTOMIZATION = {
  help: false,
  about: false,
  hideRightMenu: true,
  features: {
    spellcheck: {
      change: false,
    },
  },
  anonymous: {
    request: false,
    label: 'Guest',
  },
} as const;

/**
 * Editor event handlers interface
 */
export interface EditorEventHandlers {
  onAppReady: () => void;
  onDocumentReady: () => void;
  onSave: (event: any) => void;
  writeFile: (event: any) => void;
}

/**
 * Editor configuration options
 */
export interface CreateEditorConfigOptions {
  fileName: string;
  fileType: string;
  lang: string;
  events: EditorEventHandlers;
}

/**
 * Editor document configuration
 */
export interface EditorDocumentConfig {
  document: {
    title: string;
    url: string;
    fileType: string;
    permissions: typeof DEFAULT_EDITOR_PERMISSIONS;
  };
  editorConfig: {
    lang: string;
    customization: typeof DEFAULT_EDITOR_CUSTOMIZATION;
  };
  events: EditorEventHandlers;
}

/**
 * Creates an editor configuration object for OnlyOffice DocEditor
 *
 * This is a pure function that constructs the configuration object
 * needed to initialize the OnlyOffice editor.
 *
 * @param options - Configuration options
 * @param options.fileName - The document file name
 * @param options.fileType - The document file type (extension without dot)
 * @param options.lang - The editor language code (BCP 47 format)
 * @param options.events - Event handler callbacks
 * @returns The complete editor configuration object
 *
 * @example
 * ```ts
 * const config = createEditorConfig({
 *   fileName: 'document.docx',
 *   fileType: 'docx',
 *   lang: 'en',
 *   events: {
 *     onAppReady: () => console.log('Ready'),
 *     onDocumentReady: () => console.log('Document loaded'),
 *     onSave: (e) => console.log('Save', e),
 *     writeFile: (e) => console.log('Write file', e),
 *   },
 * });
 * ```
 */
export function createEditorConfig(options: CreateEditorConfigOptions): EditorDocumentConfig {
  const { fileName, fileType, lang, events } = options;

  return {
    document: {
      title: fileName,
      url: fileName, // Use file name as identifier
      fileType: fileType,
      permissions: DEFAULT_EDITOR_PERMISSIONS,
    },
    editorConfig: {
      lang: lang,
      customization: DEFAULT_EDITOR_CUSTOMIZATION,
    },
    events: events,
  };
}

/**
 * Validates that a file type is supported for editing
 *
 * @param fileType - The file type/extension to validate
 * @returns True if the file type is supported for editing
 */
export function isEditableFileType(fileType: string): boolean {
  const editableTypes = new Set([
    // Documents
    'docx', 'doc', 'odt', 'rtf', 'txt',
    // Spreadsheets
    'xlsx', 'xls', 'ods', 'csv',
    // Presentations
    'pptx', 'ppt', 'odp',
    // PDF (can be viewed but not edited)
    'pdf',
  ]);

  return editableTypes.has(fileType.toLowerCase());
}

/**
 * Determines if a file type requires conversion before editing
 *
 * Non-OOXML formats (doc, xls, ppt, odt, ods, odp, rtf, txt, csv) need
 * to be converted to their OOXML equivalents for editing.
 *
 * @param fileType - The file type/extension to check
 * @returns True if the file type requires conversion
 */
export function requiresConversion(fileType: string): boolean {
  const directEditTypes = new Set([
    'docx', 'xlsx', 'pptx', // OOXML formats
    'pdf', // PDF is view-only, no conversion needed
  ]);

  return !directEditTypes.has(fileType.toLowerCase());
}

/**
 * Gets the target conversion format for a source file type
 *
 * Returns the OOXML format that a non-OOXML file should be converted to.
 *
 * @param sourceFileType - The source file type
 * @returns The target file type for conversion, or undefined if no conversion needed
 */
export function getConversionTarget(sourceFileType: string): string | undefined {
  const conversionMap: Record<string, string> = {
    // Document formats -> DOCX
    'doc': 'docx',
    'odt': 'docx',
    'rtf': 'docx',
    'txt': 'docx',
    // Spreadsheet formats -> XLSX
    'xls': 'xlsx',
    'ods': 'xlsx',
    'csv': 'xlsx',
    // Presentation formats -> PPTX
    'ppt': 'pptx',
    'odp': 'pptx',
  };

  return conversionMap[sourceFileType.toLowerCase()];
}