import { test, expect } from '@playwright/test';

/**
 * Smoke test for remote XLSX file opening and OnlyOffice editor initialization.
 * VAL-SMOKE-002: Remote XLSX opens and editor initializes
 * VAL-SMOKE-006: Download produces output file for XLSX
 */
test.describe('XLSX Smoke Tests', () => {
  const XLSX_URL = 'http://cdn.githubraw.com/sunn-e/awesome-dummy-sample-files/main/sample.xlsx';

  test('opens remote XLSX and editor initializes with iframe present', async ({ page }) => {
    // Navigate to the app with XLSX URL as src parameter
    await page.goto(`http://localhost:8080/?src=${encodeURIComponent(XLSX_URL)}`);

    // Collect console errors
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Wait for the OnlyOffice editor iframe to appear
    // Use waitForSelector('iframe') to detect the actual OnlyOffice iframe (not the placeholder div)
    // Use state: 'attached' because the iframe may not be immediately visible
    await page.waitForSelector('iframe', { timeout: 30000, state: 'attached' });

    // Give the editor a moment to initialize
    await page.waitForTimeout(3000);

    // Verify no Error-level console entries (filter non-critical)
    // Filter out font loading errors OnlyOffice generates in headless: 'file:///C:/Windows/Fonts/...'
    const criticalErrors = consoleErrors.filter(
      (err) => !err.includes('favicon') && !err.includes('404') && !err.includes('font') && !err.includes('Fonts')
    );
    expect(criticalErrors).toHaveLength(0);
  });

  test('download produces XLSX file with non-zero size', async ({ page }) => {
    // Navigate to the app with XLSX URL as src parameter
    await page.goto(`http://localhost:8080/?src=${encodeURIComponent(XLSX_URL)}`);

    // Wait for the OnlyOffice editor iframe to appear
    await page.waitForSelector('iframe', { timeout: 30000, state: 'attached' });
    await page.waitForTimeout(5000);

    // Set up download detection with increased timeout
    const downloadPromise = page.waitForEvent('download', { timeout: 60000 });

    // Use Ctrl+S as primary trigger for download
    await page.keyboard.press('Control+s');
    await page.waitForTimeout(2000);

    // Wait for download
    const download = await downloadPromise;

    // Verify downloaded file
    expect(download.suggestedFilename()).toMatch(/\.xlsx$/i);
    const path = await download.path();
    expect(path).toBeDefined();
    
    const fs = await import('fs');
    const fileSize = fs.statSync(path!).size;
    expect(fileSize).toBeGreaterThan(0);
  });
});
