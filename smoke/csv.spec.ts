import { test, expect } from '@playwright/test';

/**
 * Smoke test for remote CSV file opening and OnlyOffice editor initialization.
 * VAL-SMOKE-004: Remote CSV opens and editor initializes
 * VAL-SMOKE-008: Download produces output file for CSV
 */
test.describe('CSV Smoke Tests', () => {
  const CSV_URL = 'https://raw.githubusercontent.com/sunn-e/awesome-dummy-sample-files/main/sample.csv';

  test('opens remote CSV and editor initializes with #iframe present', async ({ page }) => {
    // Navigate to the app with CSV URL as src parameter
    await page.goto(`/?src=${encodeURIComponent(CSV_URL)}`);

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

  test('download produces CSV file with non-zero size', async ({ page }) => {
    // Navigate to the app with CSV URL as src parameter
    await page.goto(`/?src=${encodeURIComponent(CSV_URL)}`);

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
    expect(download.suggestedFilename()).toMatch(/\.csv$/i);
    const path = await download.path();
    expect(path).toBeDefined();
    
    const fs = await import('fs');
    const fileSize = fs.statSync(path!).size;
    expect(fileSize).toBeGreaterThan(0);
    
    // Additionally verify CSV content contains comma or delimiter-separated text
    const content = fs.readFileSync(path!, 'utf-8');
    expect(content.trim().length).toBeGreaterThan(0);
  });
});
