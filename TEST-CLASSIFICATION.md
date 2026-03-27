# Test Suite Classification

This document classifies all 59 test files in `lib/__tests__/` and `store/__tests__/` into three tiers based on their value for release validation.

## Summary

| Tier | Description | Files | Tests | Recommendation |
|------|-------------|-------|-------|----------------|
| **Tier 1** | Release-critical, pure utility coverage | 21 | ~800 | Keep - 100% coverage target |
| **Tier 2** | Integration smoke tests | 7 | ~260 | Keep - validates cross-module workflows |
| **Tier 3** | Synthetic/redundant tests | 31 | ~1666 | **Remove** - no new coverage signal |

---

## Tier 1 — Release-Critical (Pure Utility Coverage)

These tests directly exercise utility modules with 100% coverage targets. They test actual module exports with meaningful assertions.

| File | Module(s) | Tests | Coverage Target | Notes |
|------|-----------|-------|-----------------|-------|
| `url-utils.test.ts` | `lib/url-utils.ts` | 165 | 100% | Core URL/filename parsing, Content-Disposition extraction |
| `file-types.test.ts` | `lib/file-types.ts` | 30 | 100% | File type constants (oAscFileType, c_oAscFileType2) |
| `error-utils.test.ts` | `lib/error-utils.ts` | 88 | 100% | Error formatting, context creation, type guards |
| `type-guards.test.ts` | `lib/type-guards.ts` | 50 | 100% | Data validation (isValidRenderOfficeData, isValidFile, etc.) |
| `byte-utils.test.ts` | `lib/byte-utils.ts` | 57 | 100% | Byte encoding/decoding (encodeToBytes, decodeBytes, concatBytes) |
| `document-utils.test.ts` | `lib/document-utils.ts` | 44 | 100% | Document type detection (getDocumentType, DOCUMENT_TYPE_MAP) |
| `conversion-utils.test.ts` | `lib/conversion-utils.ts` | 26 | 100% | XML escaping, conversion param creation |
| `conversion-paths.test.ts` | `lib/conversion-paths.ts` | 33 | 100% | Path creation, working directory management |
| `i18n-messages.test.ts` | `lib/i18n-messages.ts` | 24 | 100% | Internationalization message functions |
| `i18n.test.ts` | `lib/i18n.ts` | 20 | 100% | Language normalization |
| `document-template.test.ts` | `lib/document-template.ts` | 19 | 100% | New document template generation |
| `editor-config.test.ts` | `lib/editor-config.ts` | 69 | 100% | Editor configuration creation, permissions |
| `editor-utils.test.ts` | `lib/editor-utils.ts` | 18 | 100% | Editor utilities, delay management |
| `render-workflow.test.ts` | `lib/render-workflow.ts` | 16 | 100% | Chunk state management, sorting |
| `save-format.test.ts` | `lib/save-format.ts` | 22 | 100% | Save format determination |
| `operation-queue.test.ts` | `lib/operation-queue.ts` | 33 | 100% | Queue operations, timeout handling |
| `file-picker.test.ts` | `lib/file-picker.ts` | 40 | 100% | File picker options creation |
| `media-url.test.ts` | `lib/media-url.ts` | 61 | 100% | Media URL validation, file data handling |
| `store/index.test.ts` | `store/index.ts` | 10 | 100% | Core store state management |
| `store/advanced.test.ts` | `store/index.ts` | 20 | 100% | Store data integrity, workflow simulation |
| `store/extended.test.ts` | `store/index.ts` | 15 | 100% | Store state transitions, type safety |

**Total Tier 1: 21 files, ~800 tests**

---

## Tier 2 — Integration Smoke (Cross-Module Workflows)

These tests validate that multiple modules work together correctly. They test realistic user workflows without browser dependencies.

| File | Purpose | Tests | Notes |
|------|---------|-------|-------|
| `e2e-workflow.test.ts` | End-to-end document workflow simulation | 38 | Tests URL→filename→type→conversion→save flow |
| `integration-scenarios.test.ts` | Realistic document processing workflows | 27 | User upload/download scenarios |
| `integration-deep.test.ts` | Deep integration testing | 24 | Phase 75 - comprehensive integration |
| `workflow-integration.test.ts` | Workflow component integration | 25 | Component interaction testing |
| `workflow-pipeline.test.ts` | Advanced workflow pipeline | 40 | Phase 91 - complex workflow orchestration |
| `contract-tests.test.ts` | Module contract verification | 76 | Interface contract consistency |
| `cross-module.test.ts` | Cross-module consistency | 309 | Extension/MIME round-trips, module interactions |

**Total Tier 2: 7 files, ~539 tests**

**Note:** `cross-module.test.ts` is borderline Tier 3. With 309 tests and 4332 lines, it overlaps significantly with Tier 1 tests. However, it does test cross-module interactions that Tier 1 tests don't cover (e.g., url-utils + document-utils + file-types together). Recommend keeping but monitor for redundancy.

---

## Tier 3 — Synthetic/Redundant (Candidates for Removal)

These test files exhibit one or more "synthetic" characteristics:
- **Phase N naming**: Comment header indicates artificially generated test (e.g., "Phase 66: Additional Test Coverage")
- **Overlap**: Tests the same functions as Tier 1 files without adding new assertions
- **Coverage theater**: Tests exist only to inflate coverage numbers without new signal
- **Flaky**: Contains performance benchmarks that fail intermittently

| File | Phase | Tests | Issue | Recommendation |
|------|-------|-------|-------|----------------|
| `additional-coverage.test.ts` | 66 | 37 | Overlaps with editor-config, editor-utils tests | **REMOVE** |
| `additional-coverage-deep.test.ts` | 78 | 52 | Duplicates byte-utils, type-guards coverage | **REMOVE** |
| `additional-modules.test.ts` | 71 | 19 | Redundant module tests | **REMOVE** |
| `async-retry-patterns.test.ts` | 81 | 36 | Synthetic retry logic tests | **REMOVE** |
| `boundary-fuzz.test.ts` | N/A | 76 | Overlaps with type-guards edge cases | **REMOVE** |
| `byte-utils-edge-cases.test.ts` | N/A | 41 | Duplicates byte-utils.test.ts | **REMOVE** |
| `configuration-validation.test.ts` | 94 | 53 | Redundant with editor-config tests | **REMOVE** |
| `docs-examples.test.ts` | 79 | 33 | Duplicates documentation-examples.test.ts | **REMOVE** |
| `document-state-machine.test.ts` | 93 | 33 | Synthetic state machine tests | **REMOVE** |
| `documentation-examples.test.ts` | 67 | 29 | Coverage theater - same functions tested | **REMOVE** |
| `edge-cases-comprehensive.test.ts` | 77 | 58 | Overlaps with type-guards, error-utils | **REMOVE** |
| `error-chain-recovery.test.ts` | N/A | 40 | Redundant with error-utils tests | **REMOVE** |
| `error-handling-edge-cases.test.ts` | N/A | 49 | Duplicates error-utils edge case coverage | **REMOVE** |
| `error-paths.test.ts` | 71 | 59 | Redundant with error-utils coverage | **REMOVE** |
| `error-recovery-scenarios.test.ts` | 92 | 26 | Synthetic error recovery tests | **REMOVE** |
| `final-coverage.test.ts` | 80 | 53 | Coverage expansion without new assertions | **REMOVE** |
| `format-detection-edge-cases.test.ts` | N/A | 49 | Duplicates file-types.test.ts coverage | **REMOVE** |
| `fuzz-testing.test.ts` | 74 | 35 | Synthetic fuzz tests | **REMOVE** |
| `golden-master.test.ts` | 60 | 31 | Snapshot tests without clear value | **REMOVE** |
| `helper-functions.test.ts` | 65 | 22 | Vague helper function tests | **REMOVE** |
| `invariant-metamorphic.test.ts` | 59 | 60 | Synthetic invariant tests | **REMOVE** |
| `parameter-validation.test.ts` | 63 | 68 | Duplicates type-guards validation coverage | **REMOVE** |
| `performance-bench.test.ts` | 73 | 18 | **FLAKY** - JIT optimization test fails | **REMOVE** |
| `performance.test.ts` | N/A | 24 | Performance tests without CI value | **REMOVE** |
| `regex-pattern.test.ts` | 64 | 36 | Tests regex patterns already covered | **REMOVE** |
| `serialization.test.ts` | N/A | 55 | Redundant with type-guards coverage | **REMOVE** |
| `state-machine.test.ts` | N/A | 48 | Duplicates document-state-machine.test.ts | **REMOVE** |
| `stress-reliability.test.ts` | 70 | 26 | Synthetic stress tests | **REMOVE** |
| `type-guard-advanced.test.ts` | 72 | 60 | Overlaps with type-guards.test.ts | **REMOVE** |
| `unicode-encoding.test.ts` | 69 | 36 | Duplicates byte-utils encoding coverage | **REMOVE** |
| `validation-pipeline.test.ts` | N/A | 65 | Redundant validation tests | **REMOVE** |

**Total Tier 3: 31 files, ~1253 tests**

---

## Detailed Analysis

### Phase N Pattern

The vast majority of Tier 3 files contain header comments like:
```
/**
 * Phase 66: Additional Test Coverage
 *
 * Additional tests to cover more edge cases and scenarios
 */
```

This pattern indicates these tests were artificially generated with sequential phase numbers (ranging from 49 to 94). The "Additional" and "Extended" naming further suggests synthetic generation rather than organic test growth based on requirements.

### Test Overlap Examples

1. **byte-utils coverage**:
   - `byte-utils.test.ts` (Tier 1): 57 tests for encodeToBytes, decodeBytes, concatBytes, hasUtf8Bom
   - `additional-coverage-deep.test.ts`: 52 tests for the same functions
   - `byte-utils-edge-cases.test.ts`: 41 more tests for the same functions
   - **Total: 150 tests for 4 functions = coverage theater**

2. **type-guards coverage**:
   - `type-guards.test.ts` (Tier 1): 50 tests for isValidRenderOfficeData, isValidFile, etc.
   - `type-guard-advanced.test.ts`: 60 tests for the same functions
   - `edge-cases-comprehensive.test.ts`: 58 more validation tests
   - **Total: 168 tests for type guards = significant overlap**

3. **error-utils coverage**:
   - `error-utils.test.ts` (Tier 1): 88 tests for error handling functions
   - `error-handling-edge-cases.test.ts`: 49 tests for the same functions
   - `error-paths.test.ts`: 59 more tests
   - `error-chain-recovery.test.ts`: 40 more tests
   - `error-recovery-scenarios.test.ts`: 26 more tests
   - **Total: 262 tests for error utilities = substantial redundancy**

### Flaky Test

`performance-bench.test.ts` contains a JIT optimization benchmark that fails intermittently:
```
FAIL lib/__tests__/performance-bench.test.ts > Benchmark: Warm-up Effects > JIT Optimization > should show JIT optimization benefit for escapeXml
AssertionError: expected 0.8166000000001077 to be less than or equal to 0.5446500000000469
```

This test makes performance assertions based on microsecond timings which are inherently flaky.

---

## Recommended Actions

### Immediate (Phase 1)

1. **Remove all 31 Tier 3 files** - no coverage regression expected since Tier 1 modules will maintain 100% coverage
2. **Keep all Tier 1 and Tier 2 files** - these provide genuine value
3. **Verify** that after removal:
   - `pnpm test` still passes (may need to adjust coverage thresholds)
   - Tier 1 modules still at 100% coverage

### Files to Remove

```
lib/__tests__/additional-coverage.test.ts
lib/__tests__/additional-coverage-deep.test.ts
lib/__tests__/additional-modules.test.ts
lib/__tests__/async-retry-patterns.test.ts
lib/__tests__/boundary-fuzz.test.ts
lib/__tests__/byte-utils-edge-cases.test.ts
lib/__tests__/configuration-validation.test.ts
lib/__tests__/docs-examples.test.ts
lib/__tests__/document-state-machine.test.ts
lib/__tests__/documentation-examples.test.ts
lib/__tests__/edge-cases-comprehensive.test.ts
lib/__tests__/error-chain-recovery.test.ts
lib/__tests__/error-handling-edge-cases.test.ts
lib/__tests__/error-paths.test.ts
lib/__tests__/error-recovery-scenarios.test.ts
lib/__tests__/final-coverage.test.ts
lib/__tests__/format-detection-edge-cases.test.ts
lib/__tests__/fuzz-testing.test.ts
lib/__tests__/golden-master.test.ts
lib/__tests__/helper-functions.test.ts
lib/__tests__/invariant-metamorphic.test.ts
lib/__tests__/parameter-validation.test.ts
lib/__tests__/performance-bench.test.ts
lib/__tests__/performance.test.ts
lib/__tests__/regex-pattern.test.ts
lib/__tests__/serialization.test.ts
lib/__tests__/state-machine.test.ts
lib/__tests__/stress-reliability.test.ts
lib/__tests__/type-guard-advanced.test.ts
lib/__tests__/unicode-encoding.test.ts
lib/__tests__/validation-pipeline.test.ts
```

### Post-Removal Verification

Expected result after removal:
- **Test files**: 59 → 28 files
- **Test count**: ~2726 → ~1339 tests
- **Coverage**: All Tier 1 modules should remain at 100%
- **CI time**: Should decrease significantly

---

## Classification Criteria Used

### Tier 1 Indicators
- Tests a single module directly (1:1 mapping)
- Uses actual module exports
- No "Phase N" or "Additional" in filename/header
- Tests have meaningful assertions (not just coverage)
- Module has 100% coverage target in vitest.config.ts

### Tier 2 Indicators
- Tests multiple modules working together
- Simulates realistic user workflows
- No "Phase N" synthetic generation pattern
- Tests cross-module contracts
- Often has "integration", "workflow", "e2e" in filename

### Tier 3 Indicators
- "Phase N" comment header (N = 49-94)
- Filename contains "additional", "extended", "deep", "edge", "fuzz"
- Tests overlap significantly with Tier 1
- Performance/benchmark tests
- Tests that only exist for coverage numbers
