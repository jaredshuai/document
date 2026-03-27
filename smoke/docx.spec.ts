import { test, expect } from '@playwright/test';

/**
 * Smoke test for remote DOCX file opening and OnlyOffice editor initialization.
 * VAL-SMOKE-001: Remote DOCX opens and editor initializes
 * VAL-SMOKE-005: Download produces output file for DOCX
 */
test.describe('DOCX Smoke Tests', () => {
  const DOCX_URL = 'http://cdn.githubraw.com/sunn-e/awesome-dummy-sample-files/main/sample.docx';

  test('opens remote DOCX and editor initializes with iframe present', async ({ page }) => {
    // Navigate to the app with DOCX URL as src parameter
    await page.goto(`http://localhost:8080/?src=${encodeURIComponent(DOCX_URL)}`);

    // Collect console errors
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Wait for the OnlyOffice editor iframe to appear
    // The #iframe placeholder div gets replaced by an iframe when OnlyOffice initializes
    // Use waitForSelector('iframe') to detect the actual OnlyOffice iframe (not the placeholder div)
    await page.waitForSelector('iframe', { timeout: 30000, state: 'attached' });

    // Give the editor a moment to initialize
    await page.waitForTimeout(3000);

    // Verify no Error-level console entries
    // Filter out known non-critical errors (favicon, 404, font loading)
    // OnlyOffice generates font loading errors like 'file:///C:/Windows/Fonts/...' in headless
    const criticalErrors = consoleErrors.filter(
      (err) => !err.includes('favicon') && !err.includes('404') && !err.includes('font') && !err.includes('Fonts')
    );
    expect(criticalErrors).toHaveLength(0);
  });

  test('download produces DOCX file with non-zero size', async ({ page }) => {
    // Navigate to the app with DOCX URL as src parameter
    await page.goto(`http://localhost:8080/?src=${encodeURIComponent(DOCX_URL)}`);

    // Wait for the OnlyOffice editor iframe to appear
    await page.waitForSelector('iframe', { timeout: 30000, state: 'attached' });
    await page.waitForTimeout(5000); // Allow OnlyOffice to fully load

    // Set up download detection with increased timeout
    const downloadPromise = page.waitForEvent('download', { timeout: 60000 });

    // Use OnlyOffice internal API to trigger save/download
    // OnlyOffice doesn't respond to Ctrl+S in headless mode, so we call the internal save command directly
    await page.evaluate(() => {
      const iframe = document.querySelector('iframe');
      if (iframe && iframe.contentWindow) {
        const contentWindow = iframe.contentWindow as any;
        // Try calling the internal save command on the DocsAPI DocEditor instance
        if (contentWindow.DocsAPI?.DocEditor?.prototype?.asc_callSaveCommand) {
          contentWindow.DocsAPI.DocEditor.prototype.asc_callSaveCommand();
        } else if (contentWindow.asc_frames?.length > 0) {
          // Alternative: access through asc_frames
          const editorWindow = contentWindow.asc_frames[0];
          if (editorWindow?.Asc?.scope) {
            editorWindow.Asc.scope.asc_callSaveCommand();
          }
        }
      }
      // Also try calling on the window.editor if available
      const w = window as any;
      if (w.editor?.asc_callSaveCommand) {
        w.editor.asc_callSaveCommand();
      }
    });
    await page.waitForTimeout(3000);

    // Wait for download to complete
    const download = await downloadPromise;

    // Verify downloaded file exists and has non-zero size
    expect(download.suggestedFilename()).toMatch(/\.docx$/i);
    const path = await download.path();
    expect(path).toBeDefined();
    
    // Read file size
    const fs = await import('fs');
    const fileSize = fs.statSync(path!).size;
    expect(fileSize).toBeGreaterThan(0);
  });
});
