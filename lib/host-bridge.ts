import { MessageCodec } from 'ranuts/utils';

const HOST_COMMAND_TYPES = new Set(['PING', 'CREATE_NEW', 'OPEN_DOCUMENT_URL', 'CLOSE_EDITOR', 'RENDER_OFFICE']);
const HOST_ORIGIN_QUERY_KEY = 'hostOrigin';

let hostMessageSource: MessageEventSource | null = null;
let hostMessageOrigin: string | null = null;
let isTrackingInitialized = false;

/**
 * Normalize a host origin string and drop invalid values.
 */
function normalizeHostOrigin(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  if (trimmed === '*') {
    return trimmed;
  }

  try {
    return new URL(trimmed).origin;
  } catch {
    return null;
  }
}

/**
 * Read the allowed host origins from the current iframe URL.
 */
export function getAllowedHostOrigins(): string[] {
  const params = new URLSearchParams(window.location.search);
  const configuredOrigins = params
    .getAll(HOST_ORIGIN_QUERY_KEY)
    .flatMap((value) => value.split(','))
    .map(normalizeHostOrigin)
    .filter((value): value is string => Boolean(value));

  if (configuredOrigins.length > 0) {
    return Array.from(new Set(configuredOrigins));
  }

  return [window.location.origin];
}

/**
 * Check whether a postMessage event origin is allowed to control the editor.
 */
export function isAllowedHostOrigin(origin: string): boolean {
  const allowedOrigins = getAllowedHostOrigins();
  if (allowedOrigins.includes('*')) {
    return true;
  }

  return allowedOrigins.includes(origin);
}

/**
 * Remember the most recent host window/origin that sent a supported bridge command.
 */
function trackHostConnection(event: MessageEvent): void {
  if (typeof event.data !== 'string' || !isAllowedHostOrigin(event.origin)) {
    return;
  }

  const decoded = MessageCodec.decode(event.data);
  if (!decoded?.type || !HOST_COMMAND_TYPES.has(decoded.type)) {
    return;
  }

  hostMessageSource = event.source;
  hostMessageOrigin = event.origin || null;
}

/**
 * Initialize passive tracking for the host message bridge.
 */
export function initHostBridgeTracking(): void {
  if (isTrackingInitialized) {
    return;
  }

  window.addEventListener('message', trackHostConnection);
  isTrackingInitialized = true;
}

/**
 * Emit a bridge event to the parent host page if one is available.
 */
export function emitHostEvent(event: string, data?: Record<string, unknown>): void {
  const target = hostMessageSource ?? (window.parent !== window ? window.parent : null);
  if (!target || !('postMessage' in target)) {
    return;
  }

  const encoded = MessageCodec.encode({
    type: 'HOST_EVENT',
    payload: {
      event,
      data: data ?? {},
    },
  });

  if (target instanceof Window) {
    const allowedOrigins = hostMessageOrigin ? [hostMessageOrigin] : getAllowedHostOrigins();
    for (const allowedOrigin of allowedOrigins) {
      target.postMessage(encoded, allowedOrigin);
    }
    return;
  }

  target.postMessage(encoded);
}
