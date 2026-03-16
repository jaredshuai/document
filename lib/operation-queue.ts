/**
 * Operation Queue Utilities
 *
 * Pure promise queue management for sequential async operations.
 * Extracted from onlyoffice-editor.ts for testability.
 */

/**
 * Configuration options for the operation queue
 */
export interface OperationQueueOptions {
  /** Timeout in milliseconds before giving up on waiting for previous operations */
  timeout?: number;
  /** Callback for timeout warnings */
  onTimeout?: () => void;
}

/**
 * Default timeout for waiting on previous operations (30 seconds)
 */
export const DEFAULT_QUEUE_TIMEOUT = 30000;

/**
 * Creates a promise queue function for sequential async operations.
 *
 * The returned function ensures operations run sequentially, preventing
 * concurrent execution of operations that may conflict (e.g., editor
 * creation/destruction).
 *
 * @param options - Configuration options for the queue
 * @returns A function that wraps async operations to run them sequentially
 *
 * @example
 * ```ts
 * const queue = createOperationQueue({ timeout: 30000 });
 *
 * // These will run sequentially even if called concurrently
 * await queue(() => createEditor());
 * await queue(() => destroyEditor());
 * ```
 */
export function createOperationQueue(options: OperationQueueOptions = {}): <T>(operation: () => Promise<T>) => Promise<T> {
  const { timeout = DEFAULT_QUEUE_TIMEOUT, onTimeout } = options;

  // The queue is a promise chain - each operation waits for the previous one
  // We store it as a promise that never rejects (we catch errors internally)
  let queue: Promise<void> = Promise.resolve();

  return async <T>(operation: () => Promise<T>): Promise<T> => {
    // Store reference to current queue before we update it
    const previousQueue = queue;

    // Create a new promise for this operation's completion
    let resolveOperation: () => void;
    let rejectOperation: (error: unknown) => void;
    const operationPromise = new Promise<void>((resolve, reject) => {
      resolveOperation = resolve;
      rejectOperation = reject;
    });

    // Attach a catch handler immediately to prevent unhandled rejection warnings
    // This handler does nothing - it just prevents the unhandled rejection warning
    // The actual error handling is done by the caller and the next operation
    const queuedPromise = operationPromise.catch(() => {});

    // Update the queue immediately (before waiting for previous)
    queue = queuedPromise;

    // Wait for previous operations to complete, with timeout protection
    try {
      await Promise.race([
        previousQueue, // Previous is already caught, so won't reject
        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error('Operation queue timeout')),
            timeout,
          ),
        ),
      ]);
    } catch {
      // The only error that can be caught here is the timeout error
      // since previousQueue has a catch handler that swallows errors
      onTimeout?.();
    }

    try {
      const result = await operation();
      resolveOperation!();
      return result;
    } catch (error) {
      // Reject the operation promise - the catch handler we attached will handle it
      rejectOperation!(error);
      // Re-throw the error for the caller
      throw error;
    }
  };
}

/**
 * Checks if an error is a queue timeout error
 */
export function isQueueTimeoutError(error: unknown): boolean {
  return error instanceof Error && error.message === 'Operation queue timeout';
}
