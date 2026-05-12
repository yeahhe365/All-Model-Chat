import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GoogleGenAI } from '@google/genai';
import { getClient, getConfiguredApiClient } from './apiClient';
import { dbService } from '@/services/db/dbService';

type MockGoogleGenAIConfig = {
  apiKey: string;
  httpOptions?: {
    apiVersion?: 'v1alpha';
    baseUrl?: string;
  };
};

type StoredAppSettings = NonNullable<
  Awaited<ReturnType<typeof import('@/services/db/dbService').dbService.getAppSettings>>
>;

vi.mock('@google/genai', () => ({
  GoogleGenAI: vi.fn(function (this: { config: MockGoogleGenAIConfig }, config: MockGoogleGenAIConfig) {
    this.config = config;
  }),
}));

vi.mock('@/services/db/dbService', async () => {
  const { createDbServiceMockModule } = await import('@/test/moduleMockDoubles');

  return createDbServiceMockModule();
});

vi.mock('@/services/logService', async () => {
  const { createLogServiceMockModule } = await import('@/test/moduleMockDoubles');

  return createLogServiceMockModule();
});

// ── getClient ──

describe('getClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a GoogleGenAI client with API key', async () => {
    await getClient('test-key');
    expect(GoogleGenAI).toHaveBeenCalledWith({ apiKey: 'test-key' });
  });

  it('sanitizes smart quotes and dashes in API key', async () => {
    await getClient('test\u2019s-key\u2014value');
    expect(GoogleGenAI).toHaveBeenCalledWith({ apiKey: "test's-key-value" });
  });

  it('passes proxy baseUrl via httpOptions when provided', async () => {
    await getClient('key', 'https://proxy.example.com/');
    expect(GoogleGenAI).toHaveBeenCalledWith({
      apiKey: 'key',
      httpOptions: { baseUrl: 'https://proxy.example.com' },
    });
  });

  it('strips trailing slash from proxy baseUrl', async () => {
    await getClient('key', 'https://proxy.example.com/');
    expect(GoogleGenAI).toHaveBeenCalledWith(
      expect.objectContaining({
        httpOptions: { baseUrl: 'https://proxy.example.com' },
      }),
    );
  });

  it('normalizes version-suffixed proxy baseUrls before passing them to the SDK', async () => {
    await getClient('key', 'https://proxy.example.com/gemini/v1beta/');
    expect(GoogleGenAI).toHaveBeenCalledWith(
      expect.objectContaining({
        httpOptions: { baseUrl: 'https://proxy.example.com/gemini' },
      }),
    );
  });

  it('merges proxy baseUrl into existing httpOptions', async () => {
    await getClient('key', 'https://proxy.example.com/', { apiVersion: 'v1alpha' });
    expect(GoogleGenAI).toHaveBeenCalledWith({
      apiKey: 'key',
      httpOptions: {
        apiVersion: 'v1alpha',
        baseUrl: 'https://proxy.example.com',
      },
    });
  });

  it('throws on invalid initialization', async () => {
    vi.mocked(GoogleGenAI).mockImplementationOnce(() => {
      throw new Error('bad');
    });
    await expect(getClient('key')).rejects.toThrow('bad');
  });
});

// ── getConfiguredApiClient ──

describe('getConfiguredApiClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses proxy when both useCustomApiConfig and useApiProxy are true', async () => {
    vi.mocked(dbService.getAppSettings).mockResolvedValue({
      useCustomApiConfig: true,
      useApiProxy: true,
      apiProxyUrl: 'https://proxy.example.com',
    } as StoredAppSettings);
    await getConfiguredApiClient('key');
    expect(GoogleGenAI).toHaveBeenCalledWith(
      expect.objectContaining({
        httpOptions: { baseUrl: 'https://proxy.example.com' },
      }),
    );
  });

  it('skips proxy when useApiProxy is false', async () => {
    vi.mocked(dbService.getAppSettings).mockResolvedValue({
      useCustomApiConfig: true,
      useApiProxy: false,
      apiProxyUrl: 'https://proxy.example.com',
    } as StoredAppSettings);
    await getConfiguredApiClient('key');
    expect(GoogleGenAI).toHaveBeenCalledWith(
      expect.objectContaining({
        apiKey: 'key',
      }),
    );
    // baseUrl should not be in the config
    const callArgs = vi.mocked(GoogleGenAI).mock.calls[0][0] as MockGoogleGenAIConfig;
    expect(callArgs.httpOptions?.baseUrl).toBeUndefined();
  });
});
