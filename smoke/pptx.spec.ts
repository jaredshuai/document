import { test, expect } from '@playwright/test';

/**
 * Smoke test for remote PPTX file opening and OnlyOffice editor initialization.
 * VAL-SMOKE-003: Remote PPTX opens and editor initializes
 * VAL-SMOKE-007: Download produces output file for PPTX
 */
test.describe('PPTX Smoke Tests', () => {
  const PPTX_URL = 'https://raw.githubusercontent.com/sunn-e/awesome-dummy-sample-files/main/sample.pptx';

  test('opens remote PPTX and editor initializes with #iframe present', async ({ page }) => {
    // Navigate to the app with PPTX URL as src parameter
    await page.goto(`/?src=${encodeURIComponent(PPTX_URL)}`);

    // Collect console errors
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Wait for the OnlyOffice editor iframe to appear
    await page.waitForSelector('#iframe', { timeout: 30000 });

    // Give the editor a moment to initialize
    await page.waitForTimeout(3000);

    // Verify no Error-level console entries (filter non-critical)
    const criticalErrors = consoleErrors.filter(
      (err) => !err.includes('favicon') && !err.includes('404')
    );
    expect(criticalErrors).toHaveLength(0);
  });

  test('download produces PPTX file with non-zero size', async ({ page }) => {
    // Navigate to the app with PPTX URL as src parameter
    await page.goto(`/?src=${encodeURIComponent(PPTX_URL)}`);

    // Wait for editor to fully initialize
    await page.waitForSelector('#iframe', { timeout: 30000 });
    await page.waitForTimeout(5000);

    // Set up download detection
    const downloadPromise = page.waitForEvent('download', { timeout: 30000 });

    // Trigger download
    const downloadButton = page.locator('button:has-text("Download"), button:has-text("download"), [data-action="download"]');
    
    if (await downloadButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await downloadButton.click();
    } else {
      // Fallback: Use Ctrl+S
      await page.keyboard.press('Control+s');
      await page.waitForTimeout(1000);
    }

    // Wait for download
    const download = await downloadPromise;

    // Verify downloaded file
    expect(download.suggestedFilename()).toMatch(/\.pptx$/i);
    const path = await download.path();
    expect(path).toBeDefined();
    
    const fs = await import('fs');
    const fileSize = fs.statSync(path!).size;
    expect(fileSize).toBeGreaterThan(0);
  });
});
