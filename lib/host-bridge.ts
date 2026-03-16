import { MessageCodec } from 'ranuts/utils';

const HOST_COMMAND_TYPES = new Set(['PING', 'CREATE_NEW', 'OPEN_DOCUMENT_URL', 'CLOSE_EDITOR', 'RENDER_OFFICE']);

let hostMessageSource: MessageEventSource | null = null;
let hostMessageOrigin: string | null = null;
let isTrackingInitialized = false;

/**
 * Remember the most recent host window/origin that sent a supported bridge command.
 */
function trackHostConnection(event: MessageEvent): void {
  if (typeof event.data !== 'string') {
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

  const targetOrigin = hostMessageOrigin ?? window.location.origin;
  target.postMessage(encoded, targetOrigin);
}
