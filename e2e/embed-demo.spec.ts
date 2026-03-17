import { expect, test } from '@playwright/test';

/**
 * Encode a bridge payload to the base64 format expected by the editor host bridge.
 */
function encodeBridgeMessage(data: unknown): string {
  return Buffer.from(JSON.stringify(data), 'utf8').toString('base64');
}

test.describe('embed host integration', () => {
  test('host SDK opens a new Word document inside the iframe', async ({ page }) => {
    await page.goto('/embed-demo.html');

    await expect(page.getByText('Editor bridge is ready for postMessage commands.')).toBeVisible();

    await page.getByRole('button', { name: 'New Word' }).click();

    await expect(page.getByText('Editor accepted CREATE_NEW for .docx.')).toBeVisible();
    await expect(page.getByText('Latest host event: DOCUMENT_READY (New_Document.docx)')).toBeVisible({
      timeout: 60000,
    });

    const editorBodyText = await page
      .frameLocator('#editor-frame')
      .locator('body')
      .textContent({ timeout: 60000 });

    expect(editorBodyText ?? '').toContain('Menu');
  });

  test('disallowed hostOrigin blocks bridge responses', async ({ page }) => {
    await page.goto('/?hostOrigin=https%3A%2F%2Fblocked.example.com');

    const responded = await page.evaluate(async (encoded) => {
      return await new Promise<boolean>((resolve) => {
        let didRespond = false;

        const handleMessage = (event: MessageEvent) => {
          if (typeof event.data !== 'string') {
            return;
          }

          try {
            const decoded = JSON.parse(atob(event.data));
            if (decoded?.isResponse && decoded?.id === 'blocked-test') {
              didRespond = true;
              window.removeEventListener('message', handleMessage);
              resolve(true);
            }
          } catch {
            // Ignore unrelated bridge-unaware messages.
          }
        };

        window.addEventListener('message', handleMessage);
        window.postMessage(encoded, window.location.origin);

        window.setTimeout(() => {
          window.removeEventListener('message', handleMessage);
          resolve(didRespond);
        }, 600);
      });
    }, encodeBridgeMessage({ id: 'blocked-test', type: 'PING', payload: {} }));

    expect(responded).toBe(false);
  });
});
