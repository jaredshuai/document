import { MessageCodec, createObjectURL } from 'ranuts/utils';
import type { MessageHandler } from 'ranuts/utils';
import { getDocmentObj, setDocmentObj } from '../store';
import { onCreateNew, openDocumentFromUrl } from './document';
import { emitHostEvent, initHostBridgeTracking, isAllowedHostOrigin } from './host-bridge';
import { showLoading } from './loading';
import { updateRenderChunkState } from './render-workflow';
import { isValidRenderOfficeData } from './type-guards';

// UI callbacks to avoid circular dependency
let hideControlPanelFn: (() => void) | null = null;
let showMenuGuideFn: (() => void) | null = null;
let converterModulePromise: Promise<typeof import('./converter')> | null = null;

/**
 * Lazily load the converter module so bridge events do not inflate homepage bundle size.
 */
async function getConverterModule(): Promise<typeof import('./converter')> {
  if (!converterModulePromise) {
    converterModulePromise = import('./converter');
  }

  return converterModulePromise;
}

export function setEventUICallbacks(callbacks: { hideControlPanel: () => void; showMenuGuide: () => void }): void {
  hideControlPanelFn = callbacks.hideControlPanel;
  showMenuGuideFn = callbacks.showMenuGuide;
}

export interface RenderOfficeData {
  chunkIndex: number;
  data: string;
  lastModified: number;
  name: string;
  size: number;
  totalChunks: number;
  type: string;
}

let fileChunks: RenderOfficeData[] = [];

/**
 * Validate that a postMessage payload requests a supported new document extension.
 */
function isCreateNewPayload(payload: unknown): payload is { ext: string } {
  return (
    typeof payload === 'object' &&
    payload !== null &&
    'ext' in payload &&
    typeof (payload as { ext: unknown }).ext === 'string'
  );
}

/**
 * Validate that a postMessage payload contains a remote document URL.
 */
function isOpenDocumentUrlPayload(payload: unknown): payload is { url: string; fileName?: string } {
  return (
    typeof payload === 'object' &&
    payload !== null &&
    'url' in payload &&
    typeof (payload as { url: unknown }).url === 'string' &&
    (!('fileName' in payload) || typeof (payload as { fileName?: unknown }).fileName === 'string')
  );
}

export const events: Record<string, MessageHandler<any, unknown>> = {
  PING: async () => {
    return { ok: true };
  },
  CREATE_NEW: async (payload: unknown) => {
    if (!isCreateNewPayload(payload)) {
      throw new Error('Invalid CREATE_NEW payload');
    }

    void onCreateNew(payload.ext).catch((error) => {
      console.error('CREATE_NEW command failed:', error);
    });
    return { ok: true, accepted: true };
  },
  OPEN_DOCUMENT_URL: async (payload: unknown) => {
    if (!isOpenDocumentUrlPayload(payload)) {
      throw new Error('Invalid OPEN_DOCUMENT_URL payload');
    }

    void openDocumentFromUrl(payload.url, payload.fileName, { rethrow: true }).catch((error) => {
      console.error('OPEN_DOCUMENT_URL command failed:', error);
    });
    return { ok: true, accepted: true };
  },
  RENDER_OFFICE: async (data: RenderOfficeData) => {
    // Validate incoming data from external source
    if (!isValidRenderOfficeData(data)) {
      console.error('Invalid RenderOfficeData received:', data);
      return;
    }

    // Hide the control panel when rendering office
    if (hideControlPanelFn) {
      hideControlPanelFn();
    }

    const chunkState = updateRenderChunkState(fileChunks, data);
    fileChunks = chunkState.chunks;

    if (chunkState.status === 'reset') {
      console.error('Invalid render chunk workflow received:', chunkState.reason);
      return;
    }

    if (chunkState.status !== 'ready') {
      return;
    }

    const { removeLoading } = showLoading();
    try {
      const converter = await getConverterModule();
      const file = await MessageCodec.decodeFileChunked(chunkState.chunks);
      setDocmentObj({
        fileName: file.name,
        file: file,
        url: await createObjectURL(file),
      });
      await converter.initX2T();
      const { fileName, file: fileBlob } = getDocmentObj();
      await converter.handleDocumentOperation({ file: fileBlob, fileName, isNew: !fileBlob });
      // Show menu guide after document is loaded
      if (showMenuGuideFn) {
        setTimeout(() => {
          showMenuGuideFn!();
        }, 1000);
      }
    } catch (error) {
      console.error('Error rendering office document:', error);
    } finally {
      fileChunks = [];
      // Always remove loading, even if there's an error
      removeLoading();
    }
  },
  CLOSE_EDITOR: () => {
    fileChunks = [];
    if (window.editor && typeof window.editor.destroyEditor === 'function') {
      window.editor.destroyEditor();
    }
    emitHostEvent('EDITOR_CLOSED');
  },
};

/**
 * Post a bridge response back to the original message source.
 */
function postBridgeResponse(target: MessageEventSource | null, encodedData: string, origin: string): void {
  if (!target) {
    return;
  }

  if (target instanceof Window) {
    target.postMessage(encodedData, origin);
    return;
  }

  target.postMessage(encodedData);
}

export function initEvents(): void {
  initHostBridgeTracking();
  const initBridge = async (event: MessageEvent) => {
    if (typeof event.data !== 'string' || !isAllowedHostOrigin(event.origin)) {
      return;
    }

    const decodedData = MessageCodec.decode(String(event.data));
    if (!decodedData) {
      return;
    }

    const { type, payload, id } = decodedData;
    const handler = events[type];
    if (typeof handler !== 'function') {
      return;
    }

    try {
      const result = await handler(payload);
      const encodedData = MessageCodec.encode({ type, payload: result, id, isResponse: true });
      postBridgeResponse(event.source, encodedData, event.origin);
    } catch (error) {
      const encodedData = MessageCodec.encode({
        type,
        payload: {
          ok: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        id,
        isResponse: true,
        isError: true,
      });
      postBridgeResponse(event.source, encodedData, event.origin);
    }
  };

  window.removeEventListener('message', initBridge);
  window.addEventListener('message', initBridge);
  queueMicrotask(() => {
    emitHostEvent('BRIDGE_READY');
  });
}
