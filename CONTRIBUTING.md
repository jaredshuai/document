# Contributing to Document Editor

Thank you for your interest in contributing to this project! This document provides guidelines and instructions for contributing.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Testing Guidelines](#testing-guidelines)
- [Code Style](#code-style)
- [Pull Request Process](#pull-request-process)

## Code of Conduct

Be respectful and inclusive. We welcome contributions from everyone.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/document.git`
3. Create a feature branch: `git checkout -b feature/your-feature-name`

## Development Setup

### Prerequisites

- Node.js 22+
- pnpm (recommended package manager)

### Installation

```bash
pnpm install
```

### Running the Development Server

```bash
pnpm run dev
```

### Building

```bash
pnpm build
```

## Project Structure

```
├── lib/                    # Core library code
│   ├── __tests__/          # Test files
│   ├── byte-utils.ts       # UTF-8 BOM handling utilities
│   ├── conversion-paths.ts # X2T virtual file system path utilities
│   ├── conversion-utils.ts # Document conversion utilities
│   ├── document-template.ts # New document template utilities
│   ├── document-utils.ts   # Document type detection
│   ├── editor-config.ts    # Editor configuration helpers
│   ├── editor-utils.ts     # Editor delay utilities
│   ├── error-utils.ts      # Error handling utilities
│   ├── file-picker.ts      # File System API picker utilities
│   ├── file-types.ts       # File type constants
│   ├── i18n-messages.ts    # Internationalization messages
│   ├── language-types.ts   # Language code types
│   ├── media-url.ts        # Media URL utilities for editor
│   ├── operation-queue.ts  # Sequential async operation queue
│   ├── render-workflow.ts  # Chunked document loading workflow
│   ├── save-format.ts      # Save format determination utilities
│   ├── type-guards.ts      # Runtime type validation
│   └── url-utils.ts        # URL/filename parsing utilities
├── store/                  # State management
│   └── index.ts            # Document state store
├── public/                 # Static assets
├── .github/workflows/      # CI configuration
└── vitest.config.ts        # Test configuration
```

## Testing Guidelines

### Running Tests

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:coverage
```

### Test Coverage

The project maintains high test coverage on pure utility functions. Coverage thresholds are enforced in CI.

| Module | Coverage | Focus |
|--------|----------|-------|
| `lib/file-types.ts` | 100% | File type constants and mapping |
| `lib/url-utils.ts` | 100% | URL/filename parsing, sanitization |
| `lib/language-types.ts` | 100% | Language code utilities |
| `lib/conversion-utils.ts` | 100% | XML parameter generation |
| `lib/conversion-paths.ts` | 100% | X2T virtual file system paths |
| `lib/i18n-messages.ts` | 100% | I18n message validation |
| `lib/type-guards.ts` | 100% | Runtime type validation |
| `lib/error-utils.ts` | 100% | Error handling utilities |
| `lib/byte-utils.ts` | 100% | UTF-8 BOM handling |
| `lib/empty_bin.ts` | 100% | Empty document templates |
| `lib/document-utils.ts` | 100% | Document type detection |
| `lib/render-workflow.ts` | 100% | Chunked document loading |
| `lib/document-template.ts` | 100% | New document templates |
| `lib/save-format.ts` | 100% | Save format determination |
| `lib/editor-utils.ts` | 100% | Editor delay utilities |
| `lib/editor-config.ts` | 100% | Editor configuration |
| `lib/operation-queue.ts` | 100% | Sequential async operations |
| `lib/file-picker.ts` | 100% | File System API utilities |
| `lib/media-url.ts` | 100% | Media URL utilities |
| `store/index.ts` | 100% | State management |

### Writing Tests

1. **Test pure functions first**: Focus on utility modules that don't have browser dependencies
2. **Use descriptive test names**: Tests should read like documentation
3. **Cover edge cases**: Test boundary conditions, empty inputs, special characters
4. **Avoid mocking browser APIs**: Extract pure logic instead of mocking DOM

Example test structure:

```typescript
describe('functionName', () => {
  it('should handle normal input', () => {
    expect(functionName('input')).toBe('expected');
  });

  it('should handle empty input', () => {
    expect(functionName('')).toBe('default');
  });

  it('should handle edge cases', () => {
    expect(functionName(null)).toBe('fallback');
  });
});
```

### Testability Patterns

When adding new code, prefer pure functions that can be tested:

```typescript
// Good: Pure function, easily testable
export function sanitizeFileName(input: string): string {
  return input.replace(/[<>:"/\\|?*]/g, '');
}

// Avoid: Browser-dependent code that's hard to test
export function getDocumentUrl(): string {
  return window.location.href; // Can't test without DOM
}
```

### Extracting Testable Helpers

If you need to add logic to a browser-dependent module, extract it to a pure function:

```typescript
// In lib/url-utils.ts (testable)
export function determineFilename(contentDisposition: string | null, url: string): string {
  // Pure logic here
}

// In lib/document.ts (browser-dependent)
import { determineFilename } from './url-utils';
// Use extracted function
```

## Code Style

### Linting

```bash
# Run oxlint and TypeScript checks
pnpm run lint:ts
```

### Guidelines

1. **TypeScript strict mode**: All code should pass TypeScript strict checks
2. **Prefer `const` over `let`**: Use immutable variables when possible
3. **Document public APIs**: Add JSDoc comments for exported functions
4. **Keep functions small**: Prefer small, focused functions over large ones

### Import Organization

```typescript
// External imports first
import { something } from 'external-package';

// Internal imports second
import { helper } from './utils';

// Types last
import type { MyType } from './types';
```

## Pull Request Process

### Before Submitting

1. Run tests: `pnpm test`
2. Run linting: `pnpm run lint:ts`
3. Build successfully: `pnpm build`
4. Update documentation if needed

### PR Checklist

- [ ] Tests pass locally
- [ ] New code has test coverage
- [ ] Linting passes
- [ ] Build succeeds
- [ ] Documentation updated (if applicable)

### Commit Messages

Write clear, descriptive commit messages:

```
feat: add filename sanitization for special characters

- Remove illegal characters from filenames
- Handle unicode characters correctly
- Add tests for edge cases
```

### CI Requirements

All pull requests must pass:
1. **Lint job**: oxlint and TypeScript checks
2. **Test job**: All tests pass with coverage
3. **Build job**: Application builds successfully

## Questions?

If you have questions, feel free to open an issue for discussion.