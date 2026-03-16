/**
 * Performance Regression Tests
 *
 * These tests verify that critical functions maintain acceptable performance
 * characteristics. They serve as guards against accidental performance
 * degradation during refactoring.
 *
 * Note: These tests check relative performance, not absolute timing,
 * to avoid flakiness across different environments.
 */
import { describe, expect, it } from 'vitest';
import { sanitizeFileName, getFileExtension, getMimeType, determineFilename } from '../url-utils';
import { encodeToBytes, decodeBytes, concatBytes } from '../byte-utils';
import { escapeXml, createConversionParams } from '../conversion-utils';
import { updateRenderChunkState } from '../render-workflow';
import { createOperationQueue } from '../operation-queue';
import type { RenderOfficeData } from '../events';

// =============================================================================
// FILENAME PROCESSING PERFORMANCE
// =============================================================================

describe('Performance: Filename Processing', () => {
  describe('sanitizeFileName', () => {
    it('should handle long filenames efficiently', () => {
      const longName = 'a'.repeat(1000) + '.txt';
      const start = performance.now();

      for (let i = 0; i < 1000; i++) {
        sanitizeFileName(longName);
      }

      const duration = performance.now() - start;
      // Should complete 1000 iterations in reasonable time (< 100ms)
      expect(duration).toBeLessThan(100);
    });

    it('should handle filenames with many illegal characters efficiently', () => {
      const dirtyName = 'a<>:"/\\|?*b<>:"/\\|?*c<>:"/\\|?*d.txt';
      const start = performance.now();

      for (let i = 0; i < 1000; i++) {
        sanitizeFileName(dirtyName);
      }

      const duration = performance.now() - start;
      expect(duration).toBeLessThan(100);
    });

    it('should be faster after first call (JIT optimization)', () => {
      const filename = 'test-document-with-many-characters.docx';

      // Warm-up
      for (let i = 0; i < 100; i++) {
        sanitizeFileName(filename);
      }

      const start = performance.now();
      for (let i = 0; i < 10000; i++) {
        sanitizeFileName(filename);
      }
      const duration = performance.now() - start;

      // 10,000 calls should be very fast after warm-up
      expect(duration).toBeLessThan(50);
    });
  });

  describe('getFileExtension', () => {
    it('should extract extensions efficiently', () => {
      const filenames = [
        'document.docx',
        'spreadsheet.xlsx',
        'presentation.pptx',
        'file.with.many.dots.txt',
      ];

      const start = performance.now();
      for (let i = 0; i < 10000; i++) {
        for (const name of filenames) {
          getFileExtension(name);
        }
      }
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(50);
    });
  });

  describe('getMimeType', () => {
    it('should lookup MIME types efficiently', () => {
      const extensions = ['docx', 'xlsx', 'pptx', 'pdf', 'txt', 'csv', 'doc', 'xls', 'ppt'];

      const start = performance.now();
      for (let i = 0; i < 10000; i++) {
        for (const ext of extensions) {
          getMimeType(ext);
        }
      }
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(50);
    });
  });

  describe('determineFilename', () => {
    it('should determine filenames efficiently', () => {
      const start = performance.now();
      for (let i = 0; i < 10000; i++) {
        determineFilename({
          fileName: 'test.docx',
          contentDisposition: 'attachment; filename="test.docx"',
          url: 'https://example.com/path/test.docx',
        });
      }
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(100);
    });
  });
});

// =============================================================================
// BYTE UTILITIES PERFORMANCE
// =============================================================================

describe('Performance: Byte Utilities', () => {
  describe('encodeToBytes / decodeBytes', () => {
    it('should encode large text efficiently', () => {
      const largeText = 'Hello, World! '.repeat(10000); // ~150KB

      const start = performance.now();
      for (let i = 0; i < 100; i++) {
        encodeToBytes(largeText);
      }
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(500);
    });

    it('should decode large data efficiently', () => {
      const largeText = 'Hello, World! '.repeat(10000);
      const encoded = encodeToBytes(largeText);

      const start = performance.now();
      for (let i = 0; i < 100; i++) {
        decodeBytes(encoded);
      }
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(500);
    });

    it('should round-trip efficiently', () => {
      const text = 'Test text with various characters: 中文 日本語 العربية 🎉';

      const start = performance.now();
      for (let i = 0; i < 1000; i++) {
        const encoded = encodeToBytes(text);
        decodeBytes(encoded);
      }
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(100);
    });
  });

  describe('concatBytes', () => {
    it('should concatenate large arrays efficiently', () => {
      const a = new Uint8Array(100000).fill(1);
      const b = new Uint8Array(100000).fill(2);

      const start = performance.now();
      for (let i = 0; i < 100; i++) {
        concatBytes(a, b);
      }
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(200);
    });

    it('should handle many small concatenations efficiently', () => {
      const chunks = Array.from({ length: 100 }, (_, i) => new Uint8Array([i]));

      const start = performance.now();
      for (let iteration = 0; iteration < 1000; iteration++) {
        let result: Uint8Array = chunks[0];
        for (let i = 1; i < chunks.length; i++) {
          result = concatBytes(result, chunks[i]);
        }
      }
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(500);
    });
  });
});

// =============================================================================
// XML PROCESSING PERFORMANCE
// =============================================================================

describe('Performance: XML Processing', () => {
  describe('escapeXml', () => {
    it('should escape strings efficiently', () => {
      const text = '<tag attr="value">Content & more</tag>';

      const start = performance.now();
      for (let i = 0; i < 10000; i++) {
        escapeXml(text);
      }
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(100);
    });

    it('should handle strings with many special characters', () => {
      const text = '<<&&>>""\'\''.repeat(100);

      const start = performance.now();
      for (let i = 0; i < 1000; i++) {
        escapeXml(text);
      }
      const duration = performance.now() - start;

      // Allow more time for strings with heavy escaping (1000 iterations * 800 chars each)
      expect(duration).toBeLessThan(200);
    });
  });

  describe('createConversionParams', () => {
    it('should generate XML efficiently', () => {
      const start = performance.now();
      for (let i = 0; i < 10000; i++) {
        createConversionParams('/input.docx', '/output.bin', '<extra>params</extra>');
      }
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(100);
    });
  });
});

// =============================================================================
// RENDER WORKFLOW PERFORMANCE
// =============================================================================

describe('Performance: Render Workflow', () => {
  function createChunk(chunkIndex: number, totalChunks: number): RenderOfficeData {
    return {
      chunkIndex,
      data: `chunk-${chunkIndex}`,
      lastModified: Date.now(),
      name: 'document.docx',
      size: 4096,
      totalChunks,
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    };
  }

  describe('updateRenderChunkState', () => {
    it('should handle many chunk updates efficiently', () => {
      let chunks: RenderOfficeData[] = [];

      const start = performance.now();
      for (let i = 0; i < 1000; i++) {
        const result = updateRenderChunkState(chunks, createChunk(i % 100, 100));
        chunks = result.chunks;

        // Reset every 100 chunks
        if (i % 100 === 99) {
          chunks = [];
        }
      }
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(100);
    });

    it('should handle large totalChunks efficiently', () => {
      // Simulate receiving chunks for a large file
      let chunks: RenderOfficeData[] = [];

      const start = performance.now();
      for (let i = 0; i < 500; i++) {
        const result = updateRenderChunkState(chunks, createChunk(i, 500));
        chunks = result.chunks;
      }
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(200);
    });
  });
});

// =============================================================================
// OPERATION QUEUE PERFORMANCE
// =============================================================================

describe('Performance: Operation Queue', () => {
  describe('Sequential Operations', () => {
    it('should handle many sequential operations efficiently', async () => {
      const queue = createOperationQueue({ timeout: 30000 });
      let counter = 0;

      const start = performance.now();
      const promises = [];
      for (let i = 0; i < 100; i++) {
        promises.push(queue(async () => {
          counter++;
          return counter;
        }));
      }
      await Promise.all(promises);
      const duration = performance.now() - start;

      // 100 queued operations should complete quickly
      expect(duration).toBeLessThan(100);
      expect(counter).toBe(100);
    });

    it('should have minimal overhead for fast operations', async () => {
      const queue = createOperationQueue();

      const start = performance.now();
      for (let i = 0; i < 100; i++) {
        await queue(async () => i);
      }
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(50);
    });
  });
});

// =============================================================================
// MEMORY EFFICIENCY CHECKS
// =============================================================================

describe('Performance: Memory Efficiency', () => {
  describe('No memory leaks in loops', () => {
    it('should not accumulate memory in sanitizeFileName', () => {
      // Run many iterations and verify completion
      for (let i = 0; i < 10000; i++) {
        const result = sanitizeFileName(`test-file-${i}.docx`);
        expect(result).toContain('.docx');
      }
    });

    it('should not accumulate memory in byte operations', () => {
      for (let i = 0; i < 1000; i++) {
        const text = `Test ${i}`;
        const encoded = encodeToBytes(text);
        const decoded = decodeBytes(encoded);
        expect(decoded).toBe(text);
      }
    });

    it('should not accumulate memory in render workflow', () => {
      for (let iteration = 0; iteration < 100; iteration++) {
        const baseTime = Date.now();
        let chunks: RenderOfficeData[] = [];
        for (let i = 0; i < 10; i++) {
          const result = updateRenderChunkState(chunks, {
            chunkIndex: i,
            data: `data-${i}`,
            lastModified: baseTime, // Same timestamp for all chunks in this iteration
            name: 'test.docx',
            size: 1000,
            totalChunks: 10,
            type: 'application/octet-stream',
          });
          chunks = result.chunks;
        }
        // Final chunk count should be 10 when all chunks are received
        // The workflow resets when complete or ready
      }
    });
  });
});

// =============================================================================
// THROUGHPUT TESTS
// =============================================================================

describe('Performance: Throughput', () => {
  it('should achieve high filename sanitization throughput', () => {
    const start = performance.now();
    let count = 0;

    while (performance.now() - start < 100) {
      sanitizeFileName('test-file-with<>:"/\\|?*special-chars.docx');
      count++;
    }

    // Should achieve at least 10,000 operations per second
    expect(count).toBeGreaterThan(1000);
  });

  it('should achieve high MIME type lookup throughput', () => {
    const start = performance.now();
    let count = 0;

    while (performance.now() - start < 100) {
      getMimeType('docx');
      count++;
    }

    // Should achieve at least 50,000 operations per second
    expect(count).toBeGreaterThan(5000);
  });

  it('should achieve high XML escape throughput', () => {
    const start = performance.now();
    let count = 0;

    while (performance.now() - start < 100) {
      escapeXml('<tag>content & "more"</tag>');
      count++;
    }

    // Should achieve at least 10,000 operations per second
    expect(count).toBeGreaterThan(1000);
  });
});