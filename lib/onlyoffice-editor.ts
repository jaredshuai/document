import 'ranui/message';
import { createObjectURL } from 'ranuts/utils';
import { getDocmentObj } from '../store';
import { getOnlyOfficeLang, t } from './i18n';
import type { SaveEvent } from './document-types';
import { determineSaveFormat } from './save-format';
import { getEditorCleanupDelay } from './editor-utils';
import { createEditorConfig } from './editor-config';
import { createOperationQueue } from './operation-queue';
import { validateWriteFileData, createMediaUrlKey } from './media-url';
import { emitHostEvent } from './host-bridge';

// Import converter function to avoid circular dependency
let convertBinToDocumentAndDownloadFn:
  | ((bin: Uint8Array, fileName: string, targetExt?: string) => Promise<any>)
  | null = null;

export function setConverterCallback(
  callback: (bin: Uint8Array, fileName: string, targetExt?: string) => Promise<any>,
): void {
  convertBinToDocumentAndDownloadFn = callback;
}

// Global media mapping object
const media: Record<string, string> = {};

// Editor operation queue to prevent concurrent operations
// Uses the extracted operation queue utility with:
// - 30 second timeout for waiting on previous operations
// - Warning log when timeout occurs
const queueEditorOperation = createOperationQueue({
  timeout: 30000,
  onTimeout: () => console.warn('Editor operation queue timeout, proceeding anyway'),
});

/**
 * Handle file write request (mainly for handling pasted images)
 * @param event - OnlyOffice editor file write event
 */
async function handleWriteFile(event: any) {
  try {
    console.log('Write file event:', event);

    const { data: eventData } = event;
    if (!eventData) {
      console.warn('No data provided in writeFile event');
      return;
    }

    const {
      data: imageData, // Uint8Array image data
      file: fileName, // File name, e.g., "display8image-174799443357-0.png"
      _target, // Target object containing frameOrigin and other info
    } = eventData;

    // Validate data using extracted helper
    const validation = validateWriteFileData(imageData, fileName);
    if (!validation.isValid) {
      throw new Error(validation.error);
    }

    // Create Blob object with validated MIME type
    const blob = new Blob([imageData as unknown as BlobPart], { type: validation.mimeType });

    // Create object URL
    const objectUrl = await createObjectURL(blob);
    // Add image URL to media mapping using extracted key helper
    media[createMediaUrlKey(fileName)] = objectUrl;
    window.editor?.sendCommand({
      command: 'asc_setImageUrls',
      data: {
        urls: media,
      },
    });

    window.editor?.sendCommand({
      command: 'asc_writeFileCallback',
      data: {
        // Image base64
        path: objectUrl,
        imgName: fileName,
      },
    });
    console.log(`Successfully processed image: ${fileName}, URL: ${media}`);
  } catch (error: any) {
    console.error('Error handling writeFile:', error);

    // Notify editor that file processing failed
    if (window.editor && typeof window.editor.sendCommand === 'function') {
      window.editor.sendCommand({
        command: 'asc_writeFileCallback',
        data: {
          success: false,
          error: error.message,
        },
      });
    }

    if (event.callback && typeof event.callback === 'function') {
      event.callback({
        success: false,
        error: error.message,
      });
    }
  }
}

async function handleSaveDocument(event: SaveEvent) {
  console.log('Save document event:', event);

  if (event.data && event.data.data) {
    const { data, option } = event.data;
    const { fileName } = getDocmentObj() || {};

    // Determine target format using extracted helper
    const targetFormat = determineSaveFormat(option.outputformat, fileName);
    console.log(`Saving as ${targetFormat} format (original file: ${fileName})`);

    // Create download
    if (convertBinToDocumentAndDownloadFn) {
      await convertBinToDocumentAndDownloadFn(data.data, fileName, targetFormat);
    } else {
      throw new Error('Converter callback not set');
    }
  }

  // Notify editor that save is complete
  window.editor?.sendCommand({
    command: 'asc_onSaveCallback',
    data: { err_code: 0 },
  });
}

// Public editor creation method
export function createEditorInstance(config: {
  fileName: string;
  fileType: string;
  binData: ArrayBuffer | string;
  media?: any;
}): Promise<void> {
  return queueEditorOperation(async () => {
    const { fileName, fileType, binData, media: mediaUrls } = config;

    // Ensure the OnlyOffice API is available regardless of how the page was loaded.
    await loadEditorApi();

    // Check if there's an existing editor that needs cleanup
    const hasExistingEditor = !!window.editor;

    // Clean up old editor instance properly
    if (window.editor) {
      try {
        console.log('Destroying previous editor instance...');
        window.editor.destroyEditor();

        // When switching between document types, especially from/to PPT,
        // we need more time for cleanup. PPT editors are particularly resource-intensive.
        const destroyDelay = getEditorCleanupDelay(fileType, true);

        // Wait a bit for destroy to complete
        await new Promise((resolve) => setTimeout(resolve, destroyDelay));
      } catch (error) {
        console.warn('Error destroying previous editor:', error);
      }
      window.editor = undefined;
    }

    // Clean up iframe container to ensure clean state
    const iframeContainer = document.getElementById('iframe');
    if (iframeContainer) {
      // Remove all child elements
      while (iframeContainer.firstChild) {
        iframeContainer.removeChild(iframeContainer.firstChild);
      }
    }

    // Additional delay to ensure cleanup completes before creating new editor
    // This is especially important when switching between different document types
    const cleanupDelay = getEditorCleanupDelay(fileType, hasExistingEditor);
    await new Promise((resolve) => setTimeout(resolve, cleanupDelay));

    const editorLang = getOnlyOfficeLang();
    console.log('Creating new editor instance for:', fileName, 'type:', fileType);

    // Define event handlers
    const eventHandlers = {
      onAppReady: () => {
        // Set media resources
        if (mediaUrls) {
          window.editor?.sendCommand({
            command: 'asc_setImageUrls',
            data: { urls: mediaUrls },
          });
        }

        // Load document content
        window.editor?.sendCommand({
          command: 'asc_openDocument',
          // @ts-expect-error binData type is handled by the editor
          data: { buf: binData },
        });
      },
      onDocumentReady: () => {
        console.log(`${t('documentLoaded')}${fileName}`);
        emitHostEvent('DOCUMENT_READY', {
          fileName,
          fileType,
        });
        // Note: For CSV files, the save dialog may show XLSX format,
        // but the actual save will be forced to CSV format in handleSaveDocument
      },
      onSave: handleSaveDocument,
      writeFile: handleWriteFile,
    };

    // Create editor configuration using extracted helper
    const editorConfig = createEditorConfig({
      fileName,
      fileType,
      lang: editorLang,
      events: eventHandlers,
    });

    try {
      window.editor = new window.DocsAPI.DocEditor('iframe', editorConfig);
    } catch (error) {
      console.error('Error creating editor instance:', error);
      throw error;
    }
  });
}

export function loadEditorApi(): Promise<void> {
  return new Promise((resolve, reject) => {
    // Check if already loaded
    if (window.DocsAPI) {
      resolve();
      return;
    }

    // Load editor API
    const script = document.createElement('script');
    script.src = './web-apps/apps/api/documents/api.js';
    script.onload = () => resolve();
    script.onerror = (error) => {
      console.error('Failed to load OnlyOffice API:', error);
      alert(t('failedToLoadEditor'));
      reject(error);
    };
    document.head.appendChild(script);
  });
}
