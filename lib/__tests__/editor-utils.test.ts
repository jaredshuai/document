import { describe, it, expect } from 'vitest';
import {
  isPresentationType,
  getEditorCleanupDelay,
  EDITOR_DELAYS,
} from '../editor-utils';

describe('editor-utils', () => {
  describe('isPresentationType', () => {
    it('should return true for pptx', () => {
      expect(isPresentationType('pptx')).toBe(true);
    });

    it('should return true for ppt', () => {
      expect(isPresentationType('ppt')).toBe(true);
    });

    it('should return false for docx', () => {
      expect(isPresentationType('docx')).toBe(false);
    });

    it('should return false for xlsx', () => {
      expect(isPresentationType('xlsx')).toBe(false);
    });

    it('should return false for other types', () => {
      expect(isPresentationType('pdf')).toBe(false);
      expect(isPresentationType('csv')).toBe(false);
      expect(isPresentationType('txt')).toBe(false);
    });

    it('should be case sensitive', () => {
      expect(isPresentationType('PPTX')).toBe(false);
      expect(isPresentationType('PPT')).toBe(false);
      expect(isPresentationType('Pptx')).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(isPresentationType('')).toBe(false);
    });

    it('should return false for undefined-like values', () => {
      expect(isPresentationType('undefined')).toBe(false);
      expect(isPresentationType('null')).toBe(false);
    });
  });

  describe('getEditorCleanupDelay', () => {
    it('should return PRESENTATION_SWITCH delay for presentation with existing editor', () => {
      expect(getEditorCleanupDelay('pptx', true)).toBe(EDITOR_DELAYS.PRESENTATION_SWITCH);
      expect(getEditorCleanupDelay('ppt', true)).toBe(EDITOR_DELAYS.PRESENTATION_SWITCH);
    });

    it('should return STANDARD_SWITCH delay for non-presentation with existing editor', () => {
      expect(getEditorCleanupDelay('docx', true)).toBe(EDITOR_DELAYS.STANDARD_SWITCH);
      expect(getEditorCleanupDelay('xlsx', true)).toBe(EDITOR_DELAYS.STANDARD_SWITCH);
    });

    it('should return NEW_EDITOR delay for new presentation editor', () => {
      expect(getEditorCleanupDelay('pptx', false)).toBe(EDITOR_DELAYS.NEW_EDITOR);
      expect(getEditorCleanupDelay('ppt', false)).toBe(EDITOR_DELAYS.NEW_EDITOR);
    });

    it('should return NEW_EDITOR delay for new non-presentation editor', () => {
      expect(getEditorCleanupDelay('docx', false)).toBe(EDITOR_DELAYS.NEW_EDITOR);
      expect(getEditorCleanupDelay('xlsx', false)).toBe(EDITOR_DELAYS.NEW_EDITOR);
    });

    it('should return correct delays for all combinations', () => {
      // Presentation + existing = 400
      expect(getEditorCleanupDelay('pptx', true)).toBe(400);
      expect(getEditorCleanupDelay('ppt', true)).toBe(400);

      // Non-presentation + existing = 250
      expect(getEditorCleanupDelay('docx', true)).toBe(250);
      expect(getEditorCleanupDelay('xlsx', true)).toBe(250);
      expect(getEditorCleanupDelay('pdf', true)).toBe(250);

      // Any type + no existing = 150
      expect(getEditorCleanupDelay('pptx', false)).toBe(150);
      expect(getEditorCleanupDelay('ppt', false)).toBe(150);
      expect(getEditorCleanupDelay('docx', false)).toBe(150);
      expect(getEditorCleanupDelay('xlsx', false)).toBe(150);
    });

    it('should handle edge case file types', () => {
      // Unknown types should use standard delays
      expect(getEditorCleanupDelay('', true)).toBe(250);
      expect(getEditorCleanupDelay('unknown', true)).toBe(250);
      expect(getEditorCleanupDelay('odp', true)).toBe(250); // OpenDocument Presentation is not recognized
    });
  });

  describe('EDITOR_DELAYS constant', () => {
    it('should have correct values', () => {
      expect(EDITOR_DELAYS.PRESENTATION_SWITCH).toBe(400);
      expect(EDITOR_DELAYS.STANDARD_SWITCH).toBe(250);
      expect(EDITOR_DELAYS.NEW_EDITOR).toBe(150);
    });

    it('should be readonly', () => {
      // TypeScript enforces readonly, but at runtime they're just values
      expect(typeof EDITOR_DELAYS.PRESENTATION_SWITCH).toBe('number');
      expect(typeof EDITOR_DELAYS.STANDARD_SWITCH).toBe('number');
      expect(typeof EDITOR_DELAYS.NEW_EDITOR).toBe('number');
    });

    it('should match delay hierarchy', () => {
      // Presentation delay should be longest
      expect(EDITOR_DELAYS.PRESENTATION_SWITCH).toBeGreaterThan(EDITOR_DELAYS.STANDARD_SWITCH);
      // Standard switch delay should be longer than new editor
      expect(EDITOR_DELAYS.STANDARD_SWITCH).toBeGreaterThan(EDITOR_DELAYS.NEW_EDITOR);
    });
  });

  describe('integration with isPresentationType', () => {
    it('should use isPresentationType internally for delay calculation', () => {
      // Verify that getEditorCleanupDelay behaves consistently with isPresentationType
      const presentationTypes = ['pptx', 'ppt'];
      const nonPresentationTypes = ['docx', 'xlsx', 'pdf', 'txt', 'csv'];

      presentationTypes.forEach((type) => {
        expect(isPresentationType(type)).toBe(true);
        expect(getEditorCleanupDelay(type, true)).toBe(400);
      });

      nonPresentationTypes.forEach((type) => {
        expect(isPresentationType(type)).toBe(false);
        expect(getEditorCleanupDelay(type, true)).toBe(250);
      });
    });
  });
});