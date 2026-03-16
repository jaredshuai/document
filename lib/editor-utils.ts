/**
 * Editor utilities for document operations
 * Pure functions extracted from onlyoffice-editor.ts
 */

/**
 * Check if file type is a presentation
 */
export function isPresentationType(fileType: string): boolean {
  return fileType === 'pptx' || fileType === 'ppt';
}

/**
 * Get the delay for editor destruction/cleanup
 * Presentations require longer delays due to resource-intensive editors
 *
 * @param fileType - The file type (e.g., 'docx', 'xlsx', 'pptx')
 * @param hasExistingEditor - Whether there's an existing editor to clean up
 * @returns Delay in milliseconds
 */
export function getEditorCleanupDelay(fileType: string, hasExistingEditor: boolean): number {
  const isPresentation = isPresentationType(fileType);

  if (hasExistingEditor && isPresentation) {
    return 400;
  }
  if (hasExistingEditor) {
    return 250;
  }
  return 150;
}

/**
 * Default delays for editor operations
 */
export const EDITOR_DELAYS = {
  /** Delay when switching editors with presentation types */
  PRESENTATION_SWITCH: 400,
  /** Delay when switching editors with non-presentation types */
  STANDARD_SWITCH: 250,
  /** Delay for new editor creation (no existing editor) */
  NEW_EDITOR: 150,
} as const;