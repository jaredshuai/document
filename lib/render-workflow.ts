import type { RenderOfficeData } from './events';
import { isValidChunkSequence } from './type-guards';

export type RenderChunkResetReason = 'invalid-sequence' | 'metadata-mismatch';

export type RenderChunkUpdateResult =
  | {
      status: 'waiting';
      chunks: RenderOfficeData[];
      expectedChunks: number;
      receivedChunks: number;
    }
  | {
      status: 'ready';
      chunks: RenderOfficeData[];
      expectedChunks: number;
      receivedChunks: number;
    }
  | {
      status: 'reset';
      chunks: RenderOfficeData[];
      expectedChunks: number;
      receivedChunks: number;
      reason: RenderChunkResetReason;
    };

/**
 * Checks whether two chunks belong to the same render workflow payload.
 */
export function hasMatchingRenderChunkMetadata(
  firstChunk: RenderOfficeData,
  nextChunk: RenderOfficeData,
): boolean {
  return (
    firstChunk.lastModified === nextChunk.lastModified &&
    firstChunk.name === nextChunk.name &&
    firstChunk.size === nextChunk.size &&
    firstChunk.totalChunks === nextChunk.totalChunks &&
    firstChunk.type === nextChunk.type
  );
}

/**
 * Returns a new chunk array sorted by chunk index without mutating the input.
 */
export function sortRenderChunks(chunks: RenderOfficeData[]): RenderOfficeData[] {
  return [...chunks].sort((left, right) => left.chunkIndex - right.chunkIndex);
}

/**
 * Advances chunk accumulation state for the message-driven render workflow.
 *
 * - Matching chunks are accumulated until the declared total is reached.
 * - A new chunk zero for a different file restarts accumulation cleanly.
 * - Mismatched metadata on a non-initial chunk resets state.
 * - Completed chunk sets are validated and returned in decode-safe order.
 */
export function updateRenderChunkState(
  currentChunks: RenderOfficeData[],
  nextChunk: RenderOfficeData,
): RenderChunkUpdateResult {
  let accumulatedChunks: RenderOfficeData[];

  if (currentChunks.length === 0) {
    accumulatedChunks = [nextChunk];
  } else if (hasMatchingRenderChunkMetadata(currentChunks[0], nextChunk)) {
    accumulatedChunks = [...currentChunks, nextChunk];
  } else if (nextChunk.chunkIndex === 0) {
    accumulatedChunks = [nextChunk];
  } else {
    return {
      status: 'reset',
      chunks: [],
      expectedChunks: nextChunk.totalChunks,
      receivedChunks: 0,
      reason: 'metadata-mismatch',
    };
  }

  const expectedChunks = accumulatedChunks[0].totalChunks;
  if (accumulatedChunks.length < expectedChunks) {
    return {
      status: 'waiting',
      chunks: accumulatedChunks,
      expectedChunks,
      receivedChunks: accumulatedChunks.length,
    };
  }

  if (!isValidChunkSequence(accumulatedChunks)) {
    return {
      status: 'reset',
      chunks: [],
      expectedChunks,
      receivedChunks: 0,
      reason: 'invalid-sequence',
    };
  }

  return {
    status: 'ready',
    chunks: sortRenderChunks(accumulatedChunks),
    expectedChunks,
    receivedChunks: expectedChunks,
  };
}
