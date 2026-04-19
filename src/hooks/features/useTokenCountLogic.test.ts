import { describe, expect, it } from 'vitest';
import { DEFAULT_APP_SETTINGS } from '../../constants/appConstants';
import type { AppSettings } from '../../types';
import { mergeTokenCountAppSettings, resolveTokenCountRequestKey } from './useTokenCountLogic';

describe('mergeTokenCountAppSettings', () => {
  it('prefers the latest stored API config fields when modal props are stale', () => {
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

    expect(mergeTokenCountAppSettings(modalAppSettings, latestStoredSettings)).toMatchObject({
      apiKey: 'stored-key',
      apiProxyUrl: 'https://proxy.example.com/gemini',
      useApiProxy: false,
      useCustomApiConfig: true,
      systemInstruction: 'session override',
      isGoogleSearchEnabled: true,
    });
  });
});

describe('resolveTokenCountRequestKey', () => {
  it('uses the first custom API key directly instead of chat rotation state', () => {
    expect(
      resolveTokenCountRequestKey(
        {
          ...DEFAULT_APP_SETTINGS,
          useCustomApiConfig: true,
          apiKey: 'valid-key\nstale-key',
        },
        'gemini-3-flash-preview',
      ),
    ).toEqual({ key: 'valid-key' });
  });
});
