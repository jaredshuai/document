import { createObjectURL } from 'ranuts/utils';
import { getDocmentObj, setDocmentObj } from '../store';
import { showLoading } from './loading';
import { determineFilename } from './url-utils';
import { formatErrorMessage } from './error-utils';
import { getFileInputAccept } from './file-picker';

// Import UI functions with type-only to avoid circular dependency
// These will be passed as callbacks or called after document operations
let hideControlPanelFn: (() => void) | null = null;
let showControlPanelFn: (() => void) | null = null;
let showMenuGuideFn: (() => void) | null = null;
let converterModulePromise: Promise<typeof import('./converter')> | null = null;

/**
 * Lazily load the converter module so homepage startup can stay lightweight.
 */
async function getConverterModule(): Promise<typeof import('./converter')> {
  if (!converterModulePromise) {
    converterModulePromise = import('./converter');
  }

  return converterModulePromise;
}

export function setUICallbacks(callbacks: {
  hideControlPanel: () => void;
  showControlPanel: () => void;
  showMenuGuide: () => void;
}): void {
  hideControlPanelFn = callbacks.hideControlPanel;
  showControlPanelFn = callbacks.showControlPanel;
  showMenuGuideFn = callbacks.showMenuGuide;
}

// Create a single file input element
const fileInput = document.createElement('input');
fileInput.type = 'file';
fileInput.accept = getFileInputAccept();
fileInput.style.setProperty('visibility', 'hidden');
document.body.appendChild(fileInput);

export const onCreateNew = async (ext: string): Promise<void> => {
  // Note: Loading is now shown in the menu button click handler
  // This function should not show loading again to avoid double loading indicators
  try {
    const converter = await getConverterModule();
    // Always hide control panel and ensure FAB is visible when creating new document
    if (hideControlPanelFn) {
      hideControlPanelFn();
    }
    setDocmentObj({
      fileName: 'New_Document' + ext,
      file: undefined,
    });
    await converter.loadScript();
    await converter.loadEditorApi();
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
    console.error('Error creating new document:', error);
    // Ensure control panel is shown on error
    if (showControlPanelFn) {
      showControlPanelFn();
    }
    throw error; // Re-throw to let the menu button handler catch it
  }
};

export const onOpenDocument = (): void => {
  // Clear previous event handler and value
  fileInput.onchange = null;
  fileInput.value = '';

  // Define the change handler
  const handleChange = async (event: Event) => {
    const file = (event.target as HTMLInputElement).files?.[0];

    // Clear the handler to prevent multiple triggers
    fileInput.onchange = null;

    // Only process if a file was actually selected
    // If user cancelled, onchange won't fire, nothing happens
    if (file) {
      const { removeLoading } = showLoading();
      try {
        const converter = await getConverterModule();
        if (hideControlPanelFn) {
          hideControlPanelFn();
        }
        setDocmentObj({
          fileName: file.name,
          file: file,
          url: await createObjectURL(file),
        });
        await converter.initX2T();
        const { fileName, file: fileBlob } = getDocmentObj();
        await converter.handleDocumentOperation({ file: fileBlob, fileName, isNew: !fileBlob });
        // Clear file selection so the same file can be selected again
        fileInput.value = '';
        // Show menu guide after document is loaded
        if (showMenuGuideFn) {
          setTimeout(() => {
            showMenuGuideFn!();
          }, 1000);
        }
      } catch (error) {
        console.error('Error opening document:', error);
        // Ensure control panel is shown on error
        if (showControlPanelFn) {
          showControlPanelFn();
        }
      } finally {
        // Always remove loading, even if there's an error
        removeLoading();
      }
    }
    // If no file selected, nothing happens (user cancelled)
  };

  // Set the change handler
  fileInput.onchange = handleChange;

  // Trigger file picker click event
  fileInput.click();
};

/**
 * Open a remote document URL inside the editor, optionally rethrowing failures to the caller.
 */
export const openDocumentFromUrl = async (
  url: string,
  fileName?: string,
  options?: { rethrow?: boolean },
): Promise<void> => {
  const { removeLoading } = showLoading();
  try {
    const converter = await getConverterModule();
    if (hideControlPanelFn) {
      hideControlPanelFn();
    }

    // Fetch the file from URL
    console.log('Fetching document from URL:', url);
    // eslint-disable-next-line n/no-unsupported-features/node-builtins
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch document: ${response.status} ${response.statusText}`);
    }

    // Get file name from URL or Content-Disposition header, or use provided name
    const contentDisposition = response.headers.get('Content-Disposition');
    const finalFileName = determineFilename({
      fileName,
      contentDisposition,
      url,
    });

    // Get file blob
    const blob = await response.blob();
    const file = new File([blob], finalFileName, { type: blob.type });

    // Set document object
    setDocmentObj({
      fileName: finalFileName,
      file: file,
      url: await createObjectURL(file),
    });

    // Initialize and open document
    await converter.initX2T();
    const { fileName: docFileName, file: fileBlob } = getDocmentObj();
    await converter.handleDocumentOperation({ file: fileBlob, fileName: docFileName, isNew: !fileBlob });

    // Show menu guide after document is loaded
    if (showMenuGuideFn) {
      setTimeout(() => {
        showMenuGuideFn!();
      }, 1000);
    }
  } catch (error) {
    console.error('Error opening document from URL:', error);
    alert(`Failed to open document: ${formatErrorMessage(error)}`);
    if (showControlPanelFn) {
      showControlPanelFn();
    }
    if (options?.rethrow) {
      throw error;
    }
  } finally {
    removeLoading();
  }
};
