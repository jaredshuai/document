import { requireNewDocumentTemplate } from './document-template';
import { t } from './i18n';
import { X2TConverter } from './document-converter';
import { createEditorInstance, loadEditorApi, setConverterCallback } from './onlyoffice-editor';
import { getDocumentType } from './document-utils';
import { extractFileType } from './url-utils';
import type { BinConversionResult, ConversionResult, EmscriptenModule } from './document-types';

// Export types
export type {
  ConversionResult,
  BinConversionResult,
  EmscriptenModule,
  DocumentType,
  SaveEvent,
} from './document-types';

// Export constants
export { oAscFileType, c_oAscFileType2 } from './file-types';

// Export utilities
export { getDocumentType, getBasePath, BASE_PATH, DOCUMENT_TYPE_MAP } from './document-utils';

// Singleton instance
const x2tConverter = new X2TConverter();

// Export converter methods
export const loadScript = (): Promise<void> => x2tConverter.loadScript();
export const initX2T = (): Promise<EmscriptenModule> => x2tConverter.initialize();
export const convertDocument = (file: File): Promise<ConversionResult> => x2tConverter.convertDocument(file);
export const convertBinToDocumentAndDownload = (
  bin: Uint8Array,
  fileName: string,
  targetExt?: string,
): Promise<BinConversionResult> => x2tConverter.convertBinToDocumentAndDownload(bin, fileName, targetExt);

// Export editor functions
export { createEditorInstance, loadEditorApi };

// Set up converter callback for editor
setConverterCallback(convertBinToDocumentAndDownload);

// Merged file operation method
export async function handleDocumentOperation(options: {
  isNew: boolean;
  fileName: string;
  file?: File;
}): Promise<void> {
  try {
    const { isNew, fileName, file } = options;
    const fileType = extractFileType(file?.type, fileName);
    const _docType = getDocumentType(fileType);

    // Get document content
    let documentData: {
      bin: ArrayBuffer | string;
      media?: any;
    };

    if (isNew) {
      // New document uses empty template
      try {
        const emptyBin = requireNewDocumentTemplate(fileType);
        documentData = { bin: emptyBin };
      } catch {
        throw new Error(`${t('unsupportedFileType')}${fileType}`);
      }
    } else {
      // Opening existing document requires conversion
      if (!file) throw new Error(t('invalidFileObject'));
      // @ts-expect-error convertDocument handles the file type conversion
      documentData = await convertDocument(file);
    }

    // Create editor instance (now returns a Promise, uses queue internally)
    await createEditorInstance({
      fileName,
      fileType,
      binData: documentData.bin,
      media: documentData.media,
    });
  } catch (error: any) {
    console.error(`${t('documentOperationFailed')}`, error);
    alert(`${t('documentOperationFailed')}${error.message}`);
    throw error;
  }
}
