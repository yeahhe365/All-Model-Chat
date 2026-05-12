import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GoogleGenAI } from '@google/genai';
import { getLiveApiClient } from './liveApiAuth';

type MockGoogleGenAIConfig = {
  apiKey: string;
  httpOptions?: {
    apiVersion?: 'v1alpha';
    baseUrl?: string;
  };
};

vi.mock('@google/genai', () => ({
  GoogleGenAI: vi.fn(function (this: { config: MockGoogleGenAIConfig }, config: MockGoogleGenAIConfig) {
    this.config = config;
  }),
}));

vi.mock('@/services/logService', async () => {
  const { createLogServiceMockModule } = await import('@/test/moduleMockDoubles');

  return createLogServiceMockModule();
});

describe('getLiveApiClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws a configuration error when no browser API key is available for Live', async () => {
    await expect(
      getLiveApiClient(
        {
          useCustomApiConfig: false,
          useApiProxy: false,
          apiProxyUrl: null,
        },
        { apiVersion: 'v1alpha' },
        null,
      ),
    ).rejects.toMatchObject({
      name: 'LiveApiAuthConfigurationError',
      code: 'MISSING_API_KEY',
    });
  });

  it('creates the Live client directly with the browser API key', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await getLiveApiClient(
      {
        useCustomApiConfig: false,
        useApiProxy: false,
        apiProxyUrl: null,
      },
      { apiVersion: 'v1alpha' },
      'browser-key',
    );

    expect(fetchMock).not.toHaveBeenCalled();
    expect(GoogleGenAI).toHaveBeenCalledWith({
      apiKey: 'browser-key',
      httpOptions: { apiVersion: 'v1alpha' },
    });

    vi.unstubAllGlobals();
  });

  it('applies an absolute proxy baseUrl to the browser-direct Live client when proxying is enabled', async () => {
    await getLiveApiClient(
      {
        useCustomApiConfig: true,
        useApiProxy: true,
        apiProxyUrl: 'https://proxy.example.com/v1beta/',
      },
      { apiVersion: 'v1alpha' },
      'browser-key',
    );

    expect(GoogleGenAI).toHaveBeenCalledWith({
      apiKey: 'browser-key',
      httpOptions: {
        apiVersion: 'v1alpha',
        baseUrl: 'https://proxy.example.com',
      },
    });
  });

  it('does not apply a relative frontend proxy path to the browser-direct Live client', async () => {
    await getLiveApiClient(
      {
        useCustomApiConfig: true,
        useApiProxy: true,
        apiProxyUrl: '/api/gemini',
      },
      { apiVersion: 'v1alpha' },
      'browser-key',
    );

    expect(GoogleGenAI).toHaveBeenCalledWith({
      apiKey: 'browser-key',
      httpOptions: { apiVersion: 'v1alpha' },
    });
  });

  it('trims the browser API key before creating the Live client', async () => {
    await getLiveApiClient(
      {
        useCustomApiConfig: false,
        useApiProxy: false,
        apiProxyUrl: null,
      },
      { apiVersion: 'v1alpha' },
      '  browser-key  ',
    );

    expect(GoogleGenAI).toHaveBeenCalledWith({
      apiKey: 'browser-key',
      httpOptions: { apiVersion: 'v1alpha' },
    });
  });
});
