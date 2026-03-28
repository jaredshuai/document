import { createObjectURL, scriptOnLoad } from 'ranuts/utils';
import 'ranui/message';
import { t } from './i18n';
import type { BinConversionResult, ConversionResult, DocumentType, EmscriptenModule } from './document-types';
import { BASE_PATH, getDocumentType } from './document-utils';
import { extractFileType, sanitizeFileName } from './url-utils';
import { createConversionParams } from './conversion-utils';
import { hasUtf8Bom, decodeBytes, concatBytes, UTF8_BOM, encodeToBytes } from './byte-utils';
import { createSavePickerOptions } from './file-picker';
import {
  WORKING_DIRS,
  createConversionPaths,
  getParamsPath,
  getWorkingPath,
  createOutputFileName,
} from './conversion-paths';

type XlsxModule = typeof import('xlsx');

export class X2TConverter {
  private x2tModule: EmscriptenModule | null = null;
  private isReady = false;
  private initPromise: Promise<EmscriptenModule> | null = null;
  private hasScriptLoaded = false;
  private xlsxModulePromise: Promise<XlsxModule> | null = null;

  private readonly SCRIPT_PATH = `${BASE_PATH}wasm/x2t/x2t.js`;
  private readonly INIT_TIMEOUT = 300000;

  /**
   * Load X2T script file (using ranuts scriptOnLoad utility)
   */
  async loadScript(): Promise<void> {
    if (this.hasScriptLoaded) return;

    try {
      // scriptOnLoad accepts an array of URLs
      await scriptOnLoad([this.SCRIPT_PATH]);
      this.hasScriptLoaded = true;
      console.log('X2T WASM script loaded successfully');
    } catch (error) {
      const errorMsg = 'Failed to load X2T WASM script';
      console.error(errorMsg, error);
      throw new Error(errorMsg);
    }
  }

  /**
   * Initialize X2T module
   */
  async initialize(): Promise<EmscriptenModule> {
    if (this.isReady && this.x2tModule) {
      return this.x2tModule;
    }

    // Prevent duplicate initialization
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this.doInitialize();
    return this.initPromise;
  }

  private async doInitialize(): Promise<EmscriptenModule> {
    try {
      await this.loadScript();
      return new Promise((resolve, reject) => {
        const x2t = window.Module;
        if (!x2t) {
          reject(new Error('X2T module not found after script loading'));
          return;
        }

        // Set timeout handling
        const timeoutId = setTimeout(() => {
          if (!this.isReady) {
            reject(new Error(`X2T initialization timeout after ${this.INIT_TIMEOUT}ms`));
          }
        }, this.INIT_TIMEOUT);

        x2t.onRuntimeInitialized = () => {
          try {
            clearTimeout(timeoutId);
            this.createWorkingDirectories(x2t);
            this.x2tModule = x2t;
            this.isReady = true;
            console.log('X2T module initialized successfully');
            resolve(x2t);
          } catch (error) {
            reject(error);
          }
        };
      });
    } catch (error) {
      this.initPromise = null; // Reset to allow retry
      throw error;
    }
  }

  /**
   * Create working directories
   */
  private createWorkingDirectories(x2t: EmscriptenModule): void {
    WORKING_DIRS.forEach((dir) => {
      try {
        x2t.FS.mkdir(dir);
      } catch (error) {
        // Directory may already exist, ignore error
        console.warn(`Directory ${dir} may already exist:`, error);
      }
    });
  }

  /**
   * Execute document conversion
   */
  private executeConversion(paramsPath: string): void {
    if (!this.x2tModule) {
      throw new Error('X2T module not initialized');
    }

    const result = this.x2tModule.ccall('main1', 'number', ['string'], [paramsPath]);
    if (result !== 0) {
      // Read the params XML for debugging
      try {
        const paramsContent = this.x2tModule.FS.readFile(paramsPath, { encoding: 'binary' });
        // Convert binary to string for logging
        if (paramsContent instanceof Uint8Array) {
          const paramsText = new TextDecoder('utf-8').decode(paramsContent);
          console.error('Conversion failed. Parameters XML:', paramsText);
        } else {
          console.error('Conversion failed. Parameters XML:', paramsContent);
        }
      } catch (e) {
        console.error('Conversion failed. Parameters XML:', e);
        // Ignore if we can't read the params file
      }
      throw new Error(`Conversion failed with code: ${result}`);
    }
  }

  /**
   * Read media files
   */
  private async readMediaFiles(): Promise<Record<string, string>> {
    if (!this.x2tModule) return {};

    const media: Record<string, string> = {};

    try {
      const files = this.x2tModule.FS.readdir('/working/media/');

      // Use Promise.all to handle async createObjectURL
      const mediaPromises = files
        .filter((file) => file !== '.' && file !== '..')
        .map(async (file) => {
          try {
            const fileData = this.x2tModule!.FS.readFile(`/working/media/${file}`, {
              encoding: 'binary',
            }) as BlobPart;

            const blob = new Blob([fileData]);
            const mediaUrl = await createObjectURL(blob);
            return { key: `media/${file}`, url: mediaUrl };
          } catch (error) {
            console.warn(`Failed to read media file ${file}:`, error);
            return null;
          }
        });

      const results = await Promise.all(mediaPromises);
      results.forEach((result) => {
        if (result) {
          media[result.key] = result.url;
        }
      });
    } catch (error) {
      console.warn('Failed to read media directory:', error);
    }

    return media;
  }

  /**
   * Load the npm xlsx module.
   *
   * The previously vendored browser build produced XLSX files that opened
   * inconsistently after CSV conversion. Using the same npm package output
   * in both Node and browser paths gives us deterministic workbooks.
   */
  private async loadXlsxLibrary(): Promise<XlsxModule> {
    if (!this.xlsxModulePromise) {
      this.xlsxModulePromise = import('xlsx');
    }
    return this.xlsxModulePromise;
  }

  /**
   * Convert CSV to XLSX format using SheetJS library
   * This is a workaround since x2t may not support CSV directly
   */
  private async convertCsvToXlsx(csvData: Uint8Array, fileName: string): Promise<File> {
    try {
      // Load xlsx library
      const XLSX = await this.loadXlsxLibrary();

      // Decode CSV data, handling UTF-8 BOM if present
      const csvText = decodeBytes(csvData);

      // Build the workbook explicitly instead of round-tripping through
      // SheetJS CSV auto-detection. This yields a more predictable XLSX
      // structure for x2t/OnlyOffice consumption.
      const rows = csvText
        .split(/\r?\n/)
        .filter((line) => line.length > 0)
        .map((line) => line.split(','));
      const worksheet = XLSX.utils.aoa_to_sheet(rows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');

      // Convert to XLSX binary format
      const xlsxBuffer = XLSX.write(workbook, {
        type: 'array',
        bookType: 'xlsx',
        bookSST: true,
      });

      // Create File object
      const xlsxFileName = fileName.replace(/\.csv$/i, '.xlsx');
      return new File([xlsxBuffer], xlsxFileName, {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
    } catch (error) {
      throw new Error(
        `Failed to convert CSV to XLSX: ${error instanceof Error ? error.message : 'Unknown error'}. ` +
          'Please convert your CSV file to XLSX format manually and try again.',
      );
    }
  }

  /**
   * Convert document to bin format
   */
  async convertDocument(file: File): Promise<ConversionResult> {
    await this.initialize();

    const fileName = file.name;
    const fileExt = extractFileType(file?.type, fileName);
    const documentType = getDocumentType(fileExt);
    if (!documentType) {
      throw new Error(`Unsupported file format: ${fileExt}`);
    }

    try {
      // Read file content
      const arrayBuffer = await file.arrayBuffer();
      const data = new Uint8Array(arrayBuffer);

      // Handle CSV files - x2t may not support them directly, so convert to XLSX first
      if (fileExt.toLowerCase() === 'csv') {
        if (data.length === 0) {
          throw new Error('CSV file is empty');
        }
        console.log('CSV file detected. Converting to XLSX format...');
        console.log('CSV file size:', data.length, 'bytes');

        // Convert CSV to XLSX first
        try {
          const xlsxFile = await this.convertCsvToXlsx(data, fileName);
          console.log('CSV converted to XLSX, now converting with x2t...');

          // Now convert the XLSX file using x2t
          const xlsxArrayBuffer = await xlsxFile.arrayBuffer();
          const xlsxData = new Uint8Array(xlsxArrayBuffer);

          // Use the XLSX file for conversion
          const sanitizedName = sanitizeFileName(xlsxFile.name);
          const { inputPath, outputPath } = createConversionPaths(sanitizedName);

          // Write XLSX file to virtual file system
          this.x2tModule!.FS.writeFile(inputPath, xlsxData);

          // Create conversion parameters - no special params needed for XLSX
          const params = createConversionParams(inputPath, outputPath, '');
          this.x2tModule!.FS.writeFile(getParamsPath(), params);

          // Execute conversion
          this.executeConversion(getParamsPath());

          // Read conversion result
          const result = this.x2tModule!.FS.readFile(outputPath);
          const media = await this.readMediaFiles();

          // Return original CSV fileName, not the XLSX one
          return {
            fileName: sanitizeFileName(fileName), // Keep original CSV filename
            type: documentType,
            bin: result,
            media,
          };
        } catch (conversionError: any) {
          // If conversion fails, provide helpful error message
          throw new Error(
            `Failed to convert CSV file: ${conversionError?.message || 'Unknown error'}. ` +
              'Please ensure your CSV file is properly formatted and try again.',
          );
        }
      }

      // For all other file types, use standard conversion
      const sanitizedName = sanitizeFileName(fileName);
      const { inputPath, outputPath } = createConversionPaths(sanitizedName);

      // Write file to virtual file system
      this.x2tModule!.FS.writeFile(inputPath, data);

      // Create conversion parameters - no special params needed for non-CSV files
      const params = createConversionParams(inputPath, outputPath, '');
      this.x2tModule!.FS.writeFile(getParamsPath(), params);

      // Execute conversion
      this.executeConversion(getParamsPath());

      // Read conversion result
      const result = this.x2tModule!.FS.readFile(outputPath);
      const media = await this.readMediaFiles();

      return {
        fileName: sanitizedName,
        type: documentType,
        bin: result,
        media,
      };
    } catch (error) {
      throw new Error(`Document conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Attempt to convert CSV directly using x2t (may fail)
   */
  private async convertCsvDirectly(
    _file: File,
    data: Uint8Array,
    fileName: string,
    documentType: DocumentType,
  ): Promise<ConversionResult> {
    // Ensure UTF-8 BOM is present for CSV files
    const fileData = hasUtf8Bom(data) ? data : concatBytes(UTF8_BOM, data);

    const sanitizedName = sanitizeFileName(fileName);
    const { inputPath, outputPath } = createConversionPaths(sanitizedName);

    // Write file to virtual file system
    this.x2tModule!.FS.writeFile(inputPath, fileData);

    // Try with format specification
    const additionalParams = '<m_nFormatFrom>260</m_nFormatFrom>';
    const params = createConversionParams(inputPath, outputPath, additionalParams);
    this.x2tModule!.FS.writeFile(getParamsPath(), params);

    // Execute conversion - this will likely fail with error 89
    this.executeConversion(getParamsPath());

    // If we get here, conversion succeeded (unlikely for CSV)
    const result = this.x2tModule!.FS.readFile(outputPath);
    const media = await this.readMediaFiles();

    return {
      fileName: sanitizedName,
      type: documentType,
      bin: result,
      media,
    };
  }

  /**
   * Convert bin format to specified format and download
   */
  async convertBinToDocumentAndDownload(
    bin: Uint8Array,
    originalFileName: string,
    targetExt = 'DOCX',
  ): Promise<BinConversionResult> {
    await this.initialize();

    const sanitizedBase = sanitizeFileName(originalFileName).replace(/\.[^/.]+$/, '');
    const binFileName = `${sanitizedBase}.bin`;
    const outputFileName = createOutputFileName(sanitizedBase, targetExt);

    try {
      // Handle CSV files specially - need to convert bin -> XLSX -> CSV
      if (targetExt.toUpperCase() === 'CSV') {
        // First convert bin to XLSX
        const xlsxFileName = `${sanitizedBase}.xlsx`;
        this.x2tModule!.FS.writeFile(getWorkingPath(binFileName), bin);

        const params = createConversionParams(getWorkingPath(binFileName), getWorkingPath(xlsxFileName), '');

        this.x2tModule!.FS.writeFile(getParamsPath(), params);
        this.executeConversion(getParamsPath());

        // Read XLSX file
        const xlsxResult = this.x2tModule!.FS.readFile(getWorkingPath(xlsxFileName));
        const xlsxArray = xlsxResult instanceof Uint8Array ? xlsxResult : new Uint8Array(xlsxResult as ArrayBuffer);

        // Convert XLSX to CSV using SheetJS
        const XLSX = await this.loadXlsxLibrary();
        const workbook = XLSX.read(xlsxArray, { type: 'array' });

        // Get the first sheet
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        // Convert to CSV
        const csvText = XLSX.utils.sheet_to_csv(worksheet);

        // Convert CSV text to UTF-8 bytes with BOM for better compatibility
        const csvArray = encodeToBytes(csvText, true);

        // Save CSV file
        await this.saveWithFileSystemAPI(csvArray, outputFileName);

        return {
          fileName: outputFileName,
          data: csvArray as BlobPart,
        };
      }

      // For all other file types, use standard conversion
      // Write bin file
      this.x2tModule!.FS.writeFile(getWorkingPath(binFileName), bin);

      // Create conversion parameters
      let additionalParams = '';
      if (targetExt === 'PDF') {
        additionalParams = '<m_sFontDir>/working/fonts/</m_sFontDir>';
      }

      const params = createConversionParams(
        getWorkingPath(binFileName),
        getWorkingPath(outputFileName),
        additionalParams,
      );

      this.x2tModule!.FS.writeFile(getParamsPath(), params);

      // Execute conversion
      this.executeConversion(getParamsPath());

      // Read generated document
      const result = this.x2tModule!.FS.readFile(getWorkingPath(outputFileName));

      // Ensure result is Uint8Array type
      const resultArray = result instanceof Uint8Array ? result : new Uint8Array(result as ArrayBuffer);

      // Download file
      // TODO: Improve print functionality
      await this.saveWithFileSystemAPI(resultArray, outputFileName);

      return {
        fileName: outputFileName,
        data: result,
      };
    } catch (error) {
      throw new Error(`Bin to document conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Download file
   */
  private async downloadFile(data: Uint8Array, fileName: string): Promise<void> {
    const blob = new Blob([data as BlobPart]);
    const url = await createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = fileName;
    link.style.display = 'none';

    document.body.appendChild(link);
    link.click();

    // Clean up resources
    setTimeout(() => {
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    }, 100);
  }

  /**
   * Save file using modern File System API
   */
  private async saveWithFileSystemAPI(data: Uint8Array, fileName: string, mimeType?: string): Promise<void> {
    if (!(window as any).showSaveFilePicker) {
      await this.downloadFile(data, fileName);
      return;
    }
    try {
      // Create file picker options using extracted helper
      const pickerOptions = createSavePickerOptions(fileName, mimeType);

      // Show file save dialog
      const fileHandle = await (window as any).showSaveFilePicker(pickerOptions);

      // Create writable stream and write data
      const writable = await fileHandle.createWritable();
      await writable.write(data);
      await writable.close();
      window?.message?.success?.(`${t('fileSavedSuccess')}${fileName}`);
      console.log('File saved successfully:', fileName);
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        console.log('User cancelled the save operation');
        return;
      }
      throw error;
    }
  }

  /**
   * Destroy instance and clean up resources
   */
  destroy(): void {
    this.x2tModule = null;
    this.isReady = false;
    this.initPromise = null;
    console.log('X2T converter destroyed');
  }
}
