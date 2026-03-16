import { MessageCodec, Platform, createObjectURL } from 'ranuts/utils';
import type { MessageHandler } from 'ranuts/utils';
import { getDocmentObj, setDocmentObj } from '../store';
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

export const events: Record<string, MessageHandler<any, unknown>> = {
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
  },
};

export function initEvents(): void {
  Platform.init(events);
}
