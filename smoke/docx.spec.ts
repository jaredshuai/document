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

    // Use Ctrl+S as primary trigger for download
    await page.keyboard.press('Control+s');
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
