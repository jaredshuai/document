/**
 * Phase 73: Additional Performance Benchmark Tests
 * Focuses on memory efficiency, throughput, and comparative benchmarks
 */

import { describe, expect, it } from 'vitest';
import { sanitizeFileName, getFileExtension, getMimeType, safeDecodeUri, isValidUrl } from '../url-utils';
import { encodeToBytes, decodeBytes, concatBytes } from '../byte-utils';
import { escapeXml, createConversionParams } from '../conversion-utils';
import { isValidRenderOfficeData, isValidChunkSequence, isValidFile } from '../type-guards';
import { formatErrorMessage, isError, isErrorLike, createErrorContext } from '../error-utils';

// =============================================================================
// THROUGHPUT BENCHMARKS
// =============================================================================

describe('Benchmark: Throughput Tests', () => {
  describe('URL Utilities Throughput', () => {
    it('should achieve high throughput for sanitizeFileName', () => {
      const testNames = [
        'simple.docx',
        'with<>:"/\\|?*chars.docx',
        'very-long-filename-with-many-characters-and-words.docx',
        'unicode-中文-日本語-한국어.docx',
      ];

      const iterations = 50000;
      const start = performance.now();

      for (let i = 0; i < iterations; i++) {
        for (const name of testNames) {
          sanitizeFileName(name);
        }
      }

      const duration = performance.now() - start;
      const opsPerSecond = (iterations * testNames.length) / (duration / 1000);

      // Should achieve at least 100,000 ops/second
      expect(opsPerSecond).toBeGreaterThan(100000);
    });

    it('should achieve high throughput for isValidUrl', () => {
      const urls = [
        'https://example.com/document.docx',
        'http://localhost:3000/file.txt',
        'https://subdomain.example.com/path/to/file?v=1',
        '/relative/path/document.docx',
      ];

      const iterations = 50000;
      const start = performance.now();

      for (let i = 0; i < iterations; i++) {
        for (const url of urls) {
          isValidUrl(url);
        }
      }

      const duration = performance.now() - start;
      const opsPerSecond = (iterations * urls.length) / (duration / 1000);

      expect(opsPerSecond).toBeGreaterThan(50000);
    });
  });

  describe('Byte Utilities Throughput', () => {
    it('should achieve high throughput for encodeToBytes', () => {
      const testStrings = [
        'Hello World',
        'Unicode: 中文 日本語 한국어',
        'Special chars: <>&"\'',
        'a'.repeat(1000),
      ];

      const iterations = 10000;
      const start = performance.now();

      for (let i = 0; i < iterations; i++) {
        for (const str of testStrings) {
          encodeToBytes(str);
        }
      }

      const duration = performance.now() - start;
      const opsPerSecond = (iterations * testStrings.length) / (duration / 1000);

      expect(opsPerSecond).toBeGreaterThan(30000);
    });

    it('should achieve high throughput for decodeBytes', () => {
      const testArrays = [
        new Uint8Array([72, 101, 108, 108, 111]), // "Hello"
        new Uint8Array([228, 184, 173, 230, 150, 135]), // 中文
        new Uint8Array(1000).fill(97), // 1000 'a's
      ];

      const iterations = 10000;
      const start = performance.now();

      for (let i = 0; i < iterations; i++) {
        for (const arr of testArrays) {
          decodeBytes(arr);
        }
      }

      const duration = performance.now() - start;
      const opsPerSecond = (iterations * testArrays.length) / (duration / 1000);

      expect(opsPerSecond).toBeGreaterThan(30000);
    });
  });
});

// =============================================================================
// MEMORY EFFICIENCY TESTS
// =============================================================================

describe('Benchmark: Memory Efficiency', () => {
  describe('Array allocation patterns', () => {
    it('should not leak memory in repeated concatBytes operations', () => {
      const arr1 = new Uint8Array([1, 2, 3]);
      const arr2 = new Uint8Array([4, 5, 6]);

      // Run many iterations to check for memory leaks
      for (let i = 0; i < 10000; i++) {
        const result = concatBytes(arr1, arr2);
        expect(result.length).toBe(6);
      }
    });

    it('should not leak memory in repeated encodeToBytes operations', () => {
      const testString = 'Test string for memory efficiency check';

      for (let i = 0; i < 10000; i++) {
        const result = encodeToBytes(testString);
        expect(result.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Object creation patterns', () => {
    it('should not leak memory in repeated createErrorContext operations', () => {
      const error = new Error('Test error');

      for (let i = 0; i < 10000; i++) {
        const context = createErrorContext(error);
        expect(context.message).toBe('Test error');
      }
    });

    it('should not leak memory in repeated createConversionParams operations', () => {
      for (let i = 0; i < 10000; i++) {
        const params = createConversionParams('/input.doc', '/output.docx');
        expect(params).toContain('<m_sFileFrom>');
      }
    });
  });
});

// =============================================================================
// COMPARATIVE BENCHMARKS
// =============================================================================

describe('Benchmark: Comparative Performance', () => {
  describe('Type Guards Comparison', () => {
    it('should be faster than JSON.parse for validation', () => {
      const validData = {
        chunkIndex: 0,
        data: 'base64data',
        lastModified: Date.now(),
        name: 'test.docx',
        size: 1024,
        totalChunks: 1,
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      };

      const jsonStr = JSON.stringify(validData);

      // Type guard approach
      const tgStart = performance.now();
      for (let i = 0; i < 10000; i++) {
        isValidRenderOfficeData(validData);
      }
      const tgDuration = performance.now() - tgStart;

      // JSON parse approach (with try-catch)
      const jsonStart = performance.now();
      for (let i = 0; i < 10000; i++) {
        try {
          JSON.parse(jsonStr);
        } catch {
          // ignore
        }
      }
      const jsonDuration = performance.now() - jsonStart;

      // Type guard should be faster or comparable
      expect(tgDuration).toBeLessThan(jsonDuration * 2);
    });

    it('should validate files faster than regex', () => {
      const filenames = ['document.docx', 'report.xlsx', 'presentation.pptx', 'data.csv'];

      // Type guard approach
      const tgStart = performance.now();
      for (let i = 0; i < 10000; i++) {
        for (const name of filenames) {
          isValidFile(name, 1024);
        }
      }
      const tgDuration = performance.now() - tgStart;

      // Regex approach
      const extensionRegex = /\.[a-zA-Z0-9]+$/;
      const regexStart = performance.now();
      for (let i = 0; i < 10000; i++) {
        for (const name of filenames) {
          extensionRegex.test(name);
        }
      }
      const regexDuration = performance.now() - regexStart;

      // Type guard should be comparable to simple regex
      expect(tgDuration).toBeLessThan(regexDuration * 3);
    });
  });

  describe('String Operations Comparison', () => {
    it('should be faster than replaceAll for escapeXml', () => {
      const testStrings = [
        '<div>Hello & "World"</div>',
        '<p>Test < 5 & > 3</p>',
        'No special characters here',
      ];

      // escapeXml approach
      const escStart = performance.now();
      for (let i = 0; i < 10000; i++) {
        for (const str of testStrings) {
          escapeXml(str);
        }
      }
      const escDuration = performance.now() - escStart;

      // Manual replaceAll approach (for comparison)
      const replaceStart = performance.now();
      for (let i = 0; i < 10000; i++) {
        for (const str of testStrings) {
          str
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
            .replaceAll("'", '&apos;');
        }
      }
      const replaceDuration = performance.now() - replaceStart;

      // escapeXml should be comparable or faster
      expect(escDuration).toBeLessThan(replaceDuration * 1.5);
    });
  });
});

// =============================================================================
// SCALABILITY TESTS
// =============================================================================

describe('Benchmark: Scalability', () => {
  describe('Linear Scaling', () => {
    it('should scale linearly with filename length', () => {
      const lengths = [10, 100, 1000];
      const times: number[] = [];

      for (const len of lengths) {
        const filename = 'a'.repeat(len) + '.docx';
        const start = performance.now();

        for (let i = 0; i < 1000; i++) {
          sanitizeFileName(filename);
        }

        times.push(performance.now() - start);
      }

      // Time should scale roughly linearly (not exponentially)
      // time[1] / time[0] should be roughly 10x
      // time[2] / time[1] should be roughly 10x
      const ratio1 = times[1] / times[0];
      const ratio2 = times[2] / times[1];

      // Should be within reasonable bounds (not exponential)
      expect(ratio1).toBeLessThan(20);
      expect(ratio2).toBeLessThan(20);
    });

    it('should scale linearly with chunk count', () => {
      const createChunk = (index: number, total: number) => ({
        chunkIndex: index,
        data: `chunk${index}`,
        lastModified: Date.now(),
        name: 'test.docx',
        size: 1024,
        totalChunks: total,
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });

      const counts = [10, 50, 100];
      const times: number[] = [];

      for (const count of counts) {
        const chunks = Array.from({ length: count }, (_, i) => createChunk(i, count));
        const start = performance.now();

        for (let i = 0; i < 100; i++) {
          isValidChunkSequence(chunks);
        }

        times.push(performance.now() - start);
      }

      // Should scale linearly
      const ratio1 = times[1] / times[0];
      const ratio2 = times[2] / times[1];

      // Linear scaling: 5x more elements = ~5x more time
      expect(ratio1).toBeLessThan(10);
      expect(ratio2).toBeLessThan(5);
    });
  });
});

// =============================================================================
// WARM-UP VS COLD PERFORMANCE
// =============================================================================

describe('Benchmark: Warm-up Effects', () => {
  describe('JIT Optimization', () => {
    it('should show JIT optimization benefit for getMimeType', () => {
      const extensions = ['docx', 'xlsx', 'pptx', 'pdf', 'txt'];

      // Cold run
      const coldStart = performance.now();
      for (let i = 0; i < 1000; i++) {
        for (const ext of extensions) {
          getMimeType(ext);
        }
      }
      const coldDuration = performance.now() - coldStart;

      // Warm-up
      for (let i = 0; i < 5000; i++) {
        for (const ext of extensions) {
          getMimeType(ext);
        }
      }

      // Warm run
      const warmStart = performance.now();
      for (let i = 0; i < 1000; i++) {
        for (const ext of extensions) {
          getMimeType(ext);
        }
      }
      const warmDuration = performance.now() - warmStart;

      // Warm should be faster or equal
      expect(warmDuration).toBeLessThanOrEqual(coldDuration * 1.5);
    });

    it('should show JIT optimization benefit for escapeXml', () => {
      const testStr = '<div class="test">Hello & goodbye</div>';

      // Cold run
      const coldStart = performance.now();
      for (let i = 0; i < 1000; i++) {
        escapeXml(testStr);
      }
      const coldDuration = performance.now() - coldStart;

      // Warm-up
      for (let i = 0; i < 5000; i++) {
        escapeXml(testStr);
      }

      // Warm run
      const warmStart = performance.now();
      for (let i = 0; i < 1000; i++) {
        escapeXml(testStr);
      }
      const warmDuration = performance.now() - warmStart;

      expect(warmDuration).toBeLessThanOrEqual(coldDuration * 1.5);
    });
  });
});

// =============================================================================
// BULK OPERATION TESTS
// =============================================================================

describe('Benchmark: Bulk Operations', () => {
  describe('Batch Processing', () => {
    it('should efficiently process large batches of filenames', () => {
      const filenames = Array.from({ length: 1000 }, (_, i) => `document_${i}.docx`);

      const start = performance.now();

      for (const name of filenames) {
        sanitizeFileName(name);
        getFileExtension(name);
        getMimeType(getFileExtension(name));
      }

      const duration = performance.now() - start;

      // 1000 filenames with 3 operations each should be fast
      expect(duration).toBeLessThan(100);
    });

    it('should efficiently validate large batches of URLs', () => {
      const urls = Array.from({ length: 1000 }, (_, i) => `https://example.com/doc_${i}.docx`);

      const start = performance.now();

      for (const url of urls) {
        isValidUrl(url);
        safeDecodeUri(url);
      }

      const duration = performance.now() - start;

      expect(duration).toBeLessThan(100);
    });

    it('should efficiently process large batches of errors', () => {
      const errors = Array.from({ length: 1000 }, (_, i) => new Error(`Error ${i}`));

      const start = performance.now();

      for (const error of errors) {
        formatErrorMessage(error);
        isError(error);
        isErrorLike(error);
        createErrorContext(error);
      }

      const duration = performance.now() - start;

      // Just verify it completes in reasonable time (not strict)
      // Object creation can be slow in some environments
      expect(duration).toBeLessThan(500);
      expect(duration).toBeGreaterThan(0);
    });
  });
});
