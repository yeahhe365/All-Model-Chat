import { expect, test } from '@playwright/test';
import { mockGeminiTextResponses, seedAppState } from './helpers/appHarness';

test('sends a non-streaming chat prompt and renders markdown from a mocked API response', async ({ page }) => {
  await mockGeminiTextResponses(page, {
    nonStreamText: '## Mocked heading\n\n**Bold reply**',
  });

  await seedAppState(page, {
    appSettings: {
      useCustomApiConfig: true,
      apiKey: 'e2e-key',
      isStreamingEnabled: false,
      language: 'en',
    },
  });

  await page.goto('/');

  const input = page.getByLabel('Chat message input');
  await expect(input).toBeVisible();
  await input.fill('Explain the test plan');

  await page.getByLabel('Send message').click();

  const messageList = page.locator('[data-testid="virtuoso-item-list"]');

  await expect(messageList.getByText('Explain the test plan')).toBeVisible();
  await expect(page.locator('h2', { hasText: 'Mocked heading' })).toBeVisible();
  await expect(page.locator('strong', { hasText: 'Bold reply' })).toBeVisible();
});

test('renders a streamed chat response from intercepted API chunks', async ({ page }) => {
  await mockGeminiTextResponses(page, {
    streamedChunks: ['Streamed ', '**markdown** ', 'reply'],
  });

  await seedAppState(page, {
    appSettings: {
      useCustomApiConfig: true,
      apiKey: 'e2e-key',
      isStreamingEnabled: true,
      language: 'en',
    },
  });

  await page.goto('/');

  const input = page.getByLabel('Chat message input');
  await expect(input).toBeVisible();
  await input.fill('Stream this answer');

  await page.getByLabel('Send message').click();
  await page.waitForURL(/\/chat\//);

  const messageList = page.locator('[data-testid="virtuoso-item-list"]');
  await expect(messageList).toBeVisible();

  await expect(page.getByRole('link', { name: 'Stream this answer', exact: true })).toBeVisible();
  await expect(messageList.getByText('Streamed markdown reply')).toBeVisible();
  await expect(page.locator('strong', { hasText: 'markdown' })).toBeVisible();
});
