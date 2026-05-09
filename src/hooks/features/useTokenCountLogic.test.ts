import { waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_APP_SETTINGS } from '../../constants/appConstants';
import { useSettingsStore } from '../../stores/settingsStore';
import type { AppSettings, UploadedFile } from '../../types';
import { createAppSettings } from '../../test/factories';
import { renderHook } from '../../test/testUtils';

const { countTokensApiMock } = vi.hoisted(() => ({
  countTokensApiMock: vi.fn(),
}));

vi.mock('../../services/api/generation/tokenApi', () => ({
  countTokensApi: countTokensApiMock,
}));

import { useTokenCountLogic } from './useTokenCountLogic';

const renderTokenCountLogic = (appSettings: AppSettings, latestStoredSettings: AppSettings) => {
  useSettingsStore.setState({ appSettings: latestStoredSettings });
  const initialFiles: UploadedFile[] = [];

  return renderHook(() =>
    useTokenCountLogic({
      isOpen: true,
      initialText: 'hello',
      initialFiles,
      appSettings,
      currentModelId: 'gemini-3-flash-preview',
    }),
  );
};

describe('useTokenCountLogic API key resolution', () => {
  beforeEach(() => {
    countTokensApiMock.mockReset();
    countTokensApiMock.mockResolvedValue(42);
    useSettingsStore.setState({ appSettings: createAppSettings() });
  });

  it('prefers the latest stored API config fields when modal props are stale', async () => {
    const modalAppSettings: AppSettings = {
      ...DEFAULT_APP_SETTINGS,
      useCustomApiConfig: true,
      apiKey: null,
      apiProxyUrl: null,
      useApiProxy: false,
      systemInstruction: 'session override',
      isGoogleSearchEnabled: true,
    };

    const latestStoredSettings: AppSettings = {
      ...DEFAULT_APP_SETTINGS,
      useCustomApiConfig: true,
      apiKey: 'stored-key',
      apiProxyUrl: 'https://proxy.example.com/gemini',
      useApiProxy: true,
      systemInstruction: 'global instruction',
      isGoogleSearchEnabled: false,
    };

    const { unmount } = renderTokenCountLogic(modalAppSettings, latestStoredSettings);

    await waitFor(() => expect(countTokensApiMock).toHaveBeenCalled());
    expect(countTokensApiMock.mock.calls.at(-1)?.[0]).toBe('stored-key');
    unmount();
  });

  it('uses the first custom API key directly instead of chat rotation state', async () => {
    const appSettings = createAppSettings({
      useCustomApiConfig: true,
      apiKey: 'valid-key\nstale-key',
    });

    const { unmount } = renderTokenCountLogic(appSettings, appSettings);

    await waitFor(() => expect(countTokensApiMock).toHaveBeenCalled());
    expect(countTokensApiMock.mock.calls.at(-1)?.[0]).toBe('valid-key');
    unmount();
  });

  it('includes the token API failure detail in the visible error', async () => {
    countTokensApiMock.mockRejectedValueOnce(new Error('quota exhausted'));
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const appSettings = createAppSettings({
      useCustomApiConfig: true,
      apiKey: 'valid-key',
    });

    try {
      const { result, unmount } = renderTokenCountLogic(appSettings, appSettings);

      await waitFor(() => expect(result.current.error).toBe('Failed to count tokens: quota exhausted'));
      unmount();
    } finally {
      consoleError.mockRestore();
    }
  });
});
