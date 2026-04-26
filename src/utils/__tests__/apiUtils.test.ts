import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_APP_SETTINGS } from '../../constants/appConstants';
import { ChatSettings } from '../../types';
import {
  getKeyForRequest,
  isServerManagedApiEnabledForProxyRequests,
  SERVER_MANAGED_API_KEY,
} from '../apiUtils';
import { logService } from '../../services/logService';

vi.mock('../../services/logService', () => ({
  logService: {
    recordApiKeyUsage: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('getKeyForRequest', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const chatSettings: ChatSettings = {
    modelId: 'gemini-2.5-flash-preview-09-2025',
    temperature: 1,
    topP: 0.95,
    topK: 64,
    showThoughts: false,
    systemInstruction: '',
    ttsVoice: 'Puck',
    thinkingBudget: 0,
  };

  it('returns server-managed marker key when using proxy custom config with no browser key', () => {
    const result = getKeyForRequest(
      {
        ...DEFAULT_APP_SETTINGS,
        serverManagedApi: true,
        useCustomApiConfig: true,
        useApiProxy: true,
        apiProxyUrl: 'https://proxy.example.com/v1beta',
        apiKey: null,
      },
      chatSettings
    );

    expect(result).toEqual({
      key: SERVER_MANAGED_API_KEY,
      isNewKey: false,
    });
  });

  it('keeps legacy API key missing error when server-managed flow is not enabled', () => {
    const result = getKeyForRequest(
      {
        ...DEFAULT_APP_SETTINGS,
        serverManagedApi: false,
        useCustomApiConfig: true,
        useApiProxy: true,
        apiProxyUrl: 'https://proxy.example.com/v1beta',
        apiKey: null,
      },
      chatSettings
    );

    expect(result).toEqual({ error: 'API Key not configured.' });
  });

  it('uses real configured API key when server-managed mode is enabled but key exists', () => {
    const result = getKeyForRequest(
      {
        ...DEFAULT_APP_SETTINGS,
        serverManagedApi: true,
        useCustomApiConfig: true,
        useApiProxy: true,
        apiProxyUrl: 'https://proxy.example.com/v1beta',
        apiKey: 'real-browser-key',
      },
      chatSettings
    );

    expect(result).toEqual({
      key: 'real-browser-key',
      isNewKey: true,
    });
  });

  it('can select a key without recording usage for Live token setup', () => {
    const result = getKeyForRequest(
      {
        ...DEFAULT_APP_SETTINGS,
        useCustomApiConfig: true,
        apiKey: 'real-browser-key',
      },
      chatSettings,
      { skipIncrement: true, skipUsageLogging: true },
    );

    expect(result).toEqual({
      key: 'real-browser-key',
      isNewKey: true,
    });
    expect(logService.recordApiKeyUsage).not.toHaveBeenCalled();
  });
});

describe('isServerManagedApiEnabledForProxyRequests', () => {
  it('returns true only when all required server-managed proxy conditions are met', () => {
    expect(
      isServerManagedApiEnabledForProxyRequests({
        ...DEFAULT_APP_SETTINGS,
        serverManagedApi: true,
        useCustomApiConfig: true,
        useApiProxy: true,
        apiProxyUrl: 'https://proxy.example.com/v1beta',
      })
    ).toBe(true);

    expect(
      isServerManagedApiEnabledForProxyRequests({
        ...DEFAULT_APP_SETTINGS,
        serverManagedApi: true,
        useCustomApiConfig: true,
        useApiProxy: true,
        apiProxyUrl: '   ',
      })
    ).toBe(false);
  });
});
