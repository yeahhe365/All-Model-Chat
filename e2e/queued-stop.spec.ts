import { expect, test } from '@playwright/test';
import { seedAppState } from './helpers/appHarness';

test('stopping generation with a queued draft does not crash or repeatedly flush the queue', async ({ page }) => {
  const pageErrors: string[] = [];
  const consoleErrors: string[] = [];
  let generateRequestCount = 0;

  page.on('pageerror', (error) => {
    pageErrors.push(error.message);
  });

  page.on('console', (message) => {
    const text = message.text();
    if (message.type() === 'error' || text.includes('ErrorBoundary')) {
      consoleErrors.push(text);
    }
  });

  await page.route('**/*', async (route) => {
    const normalizedUrl = route.request().url().toLowerCase();

    if (!normalizedUrl.includes('generatecontent')) {
      await route.continue();
      return;
    }

    generateRequestCount += 1;

    if (generateRequestCount === 1) {
      await new Promise(() => {});
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'text/event-stream',
      body:
        'data: {"candidates":[{"content":{"parts":[{"text":"queued reply"}]}}]}\n\n' +
        'data: {"candidates":[{"content":{"parts":[]}}],"usageMetadata":{"promptTokenCount":1,"candidatesTokenCount":1,"totalTokenCount":2}}\n\n',
      headers: {
        'access-control-allow-origin': '*',
        'cache-control': 'no-cache',
      },
    });
  });

  await seedAppState(page, {
    appSettings: {
      useCustomApiConfig: true,
      apiKey: 'e2e-key',
      isStreamingEnabled: true,
      language: 'en',
      isAutoTitleEnabled: false,
      isSuggestionsEnabled: false,
      showWelcomeSuggestions: false,
    },
  });

  await page.goto('/');

  const input = page.getByLabel('Chat message input');
  await input.fill('First message');
  await page.getByLabel('Send message').click();
  await page.waitForURL(/\/chat\//);

  await input.fill('Queued message');
  await page.getByLabel('Queue next message').click();
  await expect(page.locator('[data-queued-submission-card="composer-strip"]')).toBeVisible();

  await page.getByLabel('Stop generating response').click();
  await page.waitForTimeout(1_000);

  expect(pageErrors).toEqual([]);
  expect(consoleErrors.filter((message) => message.includes('Maximum update depth'))).toEqual([]);
  expect(generateRequestCount).toBeLessThanOrEqual(2);
  await expect(page.getByText('Something went wrong')).toHaveCount(0);
});
