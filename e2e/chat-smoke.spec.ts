import { expect, test } from '@playwright/test';
import { installMockPyodideWorker, seedAppState } from './helpers/appHarness';

const SESSION_ID = 'e2e-pyodide-session';

test.beforeEach(async ({ page }) => {
  await installMockPyodideWorker(page);
});

test('loads the chat shell and executes a python code block through the browser UI', async ({ page }) => {
  await seedAppState(page, {
    session: {
      id: SESSION_ID,
      title: 'E2E Pyodide Session',
      messages: [
        {
          id: 'msg-python',
          role: 'model',
          content: '```python\nprint("hello from mocked pyodide")\n```',
        },
      ],
      settings: {
        modelId: 'gemini-2.5-flash',
        temperature: 1,
        topP: 0.95,
        topK: 64,
        showThoughts: true,
        systemInstruction: '',
        ttsVoice: 'Aoede',
        thinkingBudget: 0,
        thinkingLevel: 'HIGH',
        lockedApiKey: null,
        isGoogleSearchEnabled: false,
        isCodeExecutionEnabled: false,
        isUrlContextEnabled: false,
        isDeepSearchEnabled: false,
        isRawModeEnabled: false,
        hideThinkingInContext: false,
        safetySettings: [],
        mediaResolution: 'MEDIA_RESOLUTION_UNSPECIFIED',
      },
    },
  });

  await page.goto(`/chat/${SESSION_ID}`);
  await expect(page.getByText('E2E Pyodide Session')).toBeVisible();

  await expect(page.getByLabel('Chat message input')).toBeVisible();

  const runButton = page.getByTitle('Run Python Code');
  await expect(runButton).toBeVisible();
  await runButton.click();

  const outputConsole = page.getByText('Local Python Output').locator('..').locator('..');
  await expect(outputConsole.getByText('Local Python Output')).toBeVisible();
  await expect(outputConsole.getByText('hello from mocked pyodide', { exact: true })).toBeVisible();
});
