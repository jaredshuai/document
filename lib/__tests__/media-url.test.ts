/**
 * Tests for media URL utilities.
 */
import { describe, expect, it } from 'vitest';
import {
  validateWriteFileData,
  createMediaUrlKey,
  isValidUint8Array,
  isValidFileName,
} from '../media-url';

describe('validateWriteFileData', () => {
  describe('valid inputs', () => {
    it('should return valid result for PNG image', () => {
      const imageData = new Uint8Array([137, 80, 78, 71]);
      const result = validateWriteFileData(imageData, 'image.png');

      expect(result.isValid).toBe(true);
      if (result.isValid) {
        expect(result.fileExtension).toBe('png');
        expect(result.mimeType).toBe('image/png');
      }
    });

    it('should return valid result for JPEG image', () => {
      const imageData = new Uint8Array([255, 216, 255]);
      const result = validateWriteFileData(imageData, 'photo.jpg');

      expect(result.isValid).toBe(true);
      if (result.isValid) {
        expect(result.fileExtension).toBe('jpg');
        expect(result.mimeType).toBe('image/jpeg');
      }
    });

    it('should return valid result for JPEG with .jpeg extension', () => {
      const imageData = new Uint8Array([255, 216, 255]);
      const result = validateWriteFileData(imageData, 'photo.jpeg');

      expect(result.isValid).toBe(true);
      if (result.isValid) {
        expect(result.fileExtension).toBe('jpeg');
        expect(result.mimeType).toBe('image/jpeg');
      }
    });

    it('should return valid result for GIF image', () => {
      const imageData = new Uint8Array([71, 73, 70]);
      const result = validateWriteFileData(imageData, 'animation.gif');

      expect(result.isValid).toBe(true);
      if (result.isValid) {
        expect(result.fileExtension).toBe('gif');
        expect(result.mimeType).toBe('image/gif');
      }
    });

    it('should return valid result for WebP image (falls back to png if webp not recognized)', () => {
      const imageData = new Uint8Array([82, 73, 70, 70]);
      const result = validateWriteFileData(imageData, 'modern.webp');

      expect(result.isValid).toBe(true);
      if (result.isValid) {
        expect(result.fileExtension).toBe('webp');
        // getMimeTypeFromExtension falls back to 'image/png' for unrecognized extensions like webp
        expect(result.mimeType).toBe('image/png');
      }
    });

    it('should return valid result for SVG image', () => {
      const imageData = new Uint8Array([60, 115, 118, 103]);
      const result = validateWriteFileData(imageData, 'vector.svg');

      expect(result.isValid).toBe(true);
      if (result.isValid) {
        expect(result.fileExtension).toBe('svg');
        expect(result.mimeType).toBe('image/svg+xml');
      }
    });

    it('should default to png for files without extension', () => {
      const imageData = new Uint8Array([1, 2, 3]);
      const result = validateWriteFileData(imageData, 'noextension');

      expect(result.isValid).toBe(true);
      if (result.isValid) {
        expect(result.fileExtension).toBe('png');
        expect(result.mimeType).toBe('image/png');
      }
    });

    it('should default to png for files with only extension dot', () => {
      const imageData = new Uint8Array([1, 2, 3]);
      const result = validateWriteFileData(imageData, 'file.');

      expect(result.isValid).toBe(true);
      if (result.isValid) {
        expect(result.fileExtension).toBe('png');
        expect(result.mimeType).toBe('image/png');
      }
    });

    it('should handle uppercase extensions', () => {
      const imageData = new Uint8Array([1, 2, 3]);
      const result = validateWriteFileData(imageData, 'IMAGE.PNG');

      expect(result.isValid).toBe(true);
      if (result.isValid) {
        expect(result.fileExtension).toBe('png');
        expect(result.mimeType).toBe('image/png');
      }
    });

    it('should handle mixed case extensions', () => {
      const imageData = new Uint8Array([1, 2, 3]);
      const result = validateWriteFileData(imageData, 'Image.PnG');

      expect(result.isValid).toBe(true);
      if (result.isValid) {
        expect(result.fileExtension).toBe('png');
        expect(result.mimeType).toBe('image/png');
      }
    });

    it('should handle file names with multiple dots', () => {
      const imageData = new Uint8Array([1, 2, 3]);
      const result = validateWriteFileData(imageData, 'my.image.file.png');

      expect(result.isValid).toBe(true);
      if (result.isValid) {
        expect(result.fileExtension).toBe('png');
        expect(result.mimeType).toBe('image/png');
      }
    });

    it('should handle empty Uint8Array as valid', () => {
      const imageData = new Uint8Array([]);
      const result = validateWriteFileData(imageData, 'empty.png');

      // Empty array is still a valid Uint8Array
      expect(result.isValid).toBe(true);
    });
  });

  describe('invalid image data', () => {
    it('should return error for null image data', () => {
      const result = validateWriteFileData(null, 'image.png');

      expect(result.isValid).toBe(false);
      if (!result.isValid) {
        expect(result.error).toBe('Invalid image data: expected Uint8Array');
      }
    });

    it('should return error for undefined image data', () => {
      const result = validateWriteFileData(undefined, 'image.png');

      expect(result.isValid).toBe(false);
      if (!result.isValid) {
        expect(result.error).toBe('Invalid image data: expected Uint8Array');
      }
    });

    it('should return error for ArrayBuffer instead of Uint8Array', () => {
      const buffer = new ArrayBuffer(4);
      const result = validateWriteFileData(buffer, 'image.png');

      expect(result.isValid).toBe(false);
      if (!result.isValid) {
        expect(result.error).toBe('Invalid image data: expected Uint8Array');
      }
    });

    it('should return error for Blob instead of Uint8Array', () => {
      const blob = new Blob(['data']);
      const result = validateWriteFileData(blob, 'image.png');

      expect(result.isValid).toBe(false);
      if (!result.isValid) {
        expect(result.error).toBe('Invalid image data: expected Uint8Array');
      }
    });

    it('should return error for string instead of Uint8Array', () => {
      const result = validateWriteFileData('image data', 'image.png');

      expect(result.isValid).toBe(false);
      if (!result.isValid) {
        expect(result.error).toBe('Invalid image data: expected Uint8Array');
      }
    });

    it('should return error for plain object instead of Uint8Array', () => {
      const result = validateWriteFileData({ data: [1, 2, 3] }, 'image.png');

      expect(result.isValid).toBe(false);
      if (!result.isValid) {
        expect(result.error).toBe('Invalid image data: expected Uint8Array');
      }
    });

    it('should return error for number instead of Uint8Array', () => {
      const result = validateWriteFileData(123, 'image.png');

      expect(result.isValid).toBe(false);
      if (!result.isValid) {
        expect(result.error).toBe('Invalid image data: expected Uint8Array');
      }
    });
  });

  describe('invalid file name', () => {
    it('should return error for null file name', () => {
      const imageData = new Uint8Array([1, 2, 3]);
      const result = validateWriteFileData(imageData, null);

      expect(result.isValid).toBe(false);
      if (!result.isValid) {
        expect(result.error).toBe('Invalid file name');
      }
    });

    it('should return error for undefined file name', () => {
      const imageData = new Uint8Array([1, 2, 3]);
      const result = validateWriteFileData(imageData, undefined);

      expect(result.isValid).toBe(false);
      if (!result.isValid) {
        expect(result.error).toBe('Invalid file name');
      }
    });

    it('should return error for empty string file name', () => {
      const imageData = new Uint8Array([1, 2, 3]);
      const result = validateWriteFileData(imageData, '');

      expect(result.isValid).toBe(false);
      if (!result.isValid) {
        expect(result.error).toBe('Invalid file name');
      }
    });

    it('should return error for number file name', () => {
      const imageData = new Uint8Array([1, 2, 3]);
      const result = validateWriteFileData(imageData, 123);

      expect(result.isValid).toBe(false);
      if (!result.isValid) {
        expect(result.error).toBe('Invalid file name');
      }
    });

    it('should return error for object file name', () => {
      const imageData = new Uint8Array([1, 2, 3]);
      const result = validateWriteFileData(imageData, { name: 'image.png' });

      expect(result.isValid).toBe(false);
      if (!result.isValid) {
        expect(result.error).toBe('Invalid file name');
      }
    });
  });

  describe('both invalid', () => {
    it('should return error for image data when both are invalid', () => {
      const result = validateWriteFileData(null, '');

      // Image data is checked first
      expect(result.isValid).toBe(false);
      if (!result.isValid) {
        expect(result.error).toBe('Invalid image data: expected Uint8Array');
      }
    });
  });
});

describe('createMediaUrlKey', () => {
  it('should create media URL key for simple file name', () => {
    expect(createMediaUrlKey('image.png')).toBe('media/image.png');
  });

  it('should create media URL key for file with path characters', () => {
    // The function just prepends 'media/', it doesn't validate or sanitize
    expect(createMediaUrlKey('folder/image.png')).toBe('media/folder/image.png');
  });

  it('should handle file names with spaces', () => {
    expect(createMediaUrlKey('my image.png')).toBe('media/my image.png');
  });

  it('should handle file names with special characters', () => {
    expect(createMediaUrlKey('image-123_test.png')).toBe('media/image-123_test.png');
  });

  it('should handle file names with unicode characters', () => {
    expect(createMediaUrlKey('图片.png')).toBe('media/图片.png');
  });

  it('should handle file names without extension', () => {
    expect(createMediaUrlKey('noextension')).toBe('media/noextension');
  });

  it('should handle empty string', () => {
    expect(createMediaUrlKey('')).toBe('media/');
  });
});

describe('isValidUint8Array', () => {
  describe('valid Uint8Array', () => {
    it('should return true for non-empty Uint8Array', () => {
      expect(isValidUint8Array(new Uint8Array([1, 2, 3]))).toBe(true);
    });

    it('should return true for single-element Uint8Array', () => {
      expect(isValidUint8Array(new Uint8Array([0]))).toBe(true);
    });

    it('should return true for Uint8Array with max values', () => {
      expect(isValidUint8Array(new Uint8Array([255, 255, 255]))).toBe(true);
    });

    it('should return true for large Uint8Array', () => {
      const largeArray = new Uint8Array(10000);
      expect(isValidUint8Array(largeArray)).toBe(true);
    });
  });

  describe('invalid Uint8Array', () => {
    it('should return false for empty Uint8Array', () => {
      expect(isValidUint8Array(new Uint8Array([]))).toBe(false);
    });

    it('should return false for null', () => {
      expect(isValidUint8Array(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isValidUint8Array(undefined)).toBe(false);
    });

    it('should return false for ArrayBuffer', () => {
      expect(isValidUint8Array(new ArrayBuffer(4))).toBe(false);
    });

    it('should return false for Int8Array', () => {
      expect(isValidUint8Array(new Int8Array([1, 2, 3]))).toBe(false);
    });

    it('should return false for Uint16Array', () => {
      expect(isValidUint8Array(new Uint16Array([1, 2, 3]))).toBe(false);
    });

    it('should return false for regular Array', () => {
      expect(isValidUint8Array([1, 2, 3])).toBe(false);
    });

    it('should return false for string', () => {
      expect(isValidUint8Array('data')).toBe(false);
    });

    it('should return false for number', () => {
      expect(isValidUint8Array(123)).toBe(false);
    });

    it('should return false for plain object', () => {
      expect(isValidUint8Array({ length: 3 })).toBe(false);
    });
  });

  describe('type guard behavior', () => {
    it('should narrow type when used in condition', () => {
      const value: unknown = new Uint8Array([1, 2, 3]);

      if (isValidUint8Array(value)) {
        // TypeScript should know value is Uint8Array here
        const length: number = value.length;
        expect(length).toBe(3);
      }
    });
  });
});

describe('isValidFileName', () => {
  describe('valid file names', () => {
    it('should return true for simple file name', () => {
      expect(isValidFileName('image.png')).toBe(true);
    });

    it('should return true for file name without extension', () => {
      expect(isValidFileName('noextension')).toBe(true);
    });

    it('should return true for file name with spaces', () => {
      expect(isValidFileName('my image.png')).toBe(true);
    });

    it('should return true for file name with unicode characters', () => {
      expect(isValidFileName('文档.docx')).toBe(true);
    });

    it('should return true for file name with special characters', () => {
      expect(isValidFileName('file-123_test.xlsx')).toBe(true);
    });

    it('should return true for single character file name', () => {
      expect(isValidFileName('a')).toBe(true);
    });
  });

  describe('invalid file names', () => {
    it('should return false for empty string', () => {
      expect(isValidFileName('')).toBe(false);
    });

    it('should return false for null', () => {
      expect(isValidFileName(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isValidFileName(undefined)).toBe(false);
    });

    it('should return false for number', () => {
      expect(isValidFileName(123)).toBe(false);
    });

    it('should return false for object', () => {
      expect(isValidFileName({ name: 'file.png' })).toBe(false);
    });

    it('should return false for array', () => {
      expect(isValidFileName(['file.png'])).toBe(false);
    });

    it('should return false for boolean', () => {
      expect(isValidFileName(true)).toBe(false);
    });
  });

  describe('type guard behavior', () => {
    it('should narrow type when used in condition', () => {
      const value: unknown = 'document.docx';

      if (isValidFileName(value)) {
        // TypeScript should know value is string here
        const upper: string = value.toUpperCase();
        expect(upper).toBe('DOCUMENT.DOCX');
      }
    });
  });
});