import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildGenerationConfig } from '../baseApi';
import { MediaResolution } from '../../../types/settings';

type MockGoogleGenAIConfig = {
  apiKey: string;
  httpOptions?: {
    apiVersion?: 'v1alpha';
    baseUrl?: string;
  };
};

type StoredAppSettings = NonNullable<Awaited<ReturnType<typeof import('../../../utils/db').dbService.getAppSettings>>>;

// Mock @google/genai - must use function syntax for constructor mock
vi.mock('@google/genai', () => ({
  GoogleGenAI: vi.fn(function(this: { config: MockGoogleGenAIConfig }, config: MockGoogleGenAIConfig) {
    this.config = config;
  }),
}));

// Mock dbService
vi.mock('../../../utils/db', () => ({
  dbService: {
    getAppSettings: vi.fn(),
  },
}));

// Mock logService
vi.mock('../../logService', () => ({
  logService: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn(), recordTokenUsage: vi.fn() },
}));

// Mock appUtils for isGemini3Model
vi.mock('../../../utils/appUtils', () => ({
  isGemini3Model: vi.fn((id: string) => id?.includes('gemini-3')),
}));

import { GoogleGenAI } from '@google/genai';
import {
  getClient,
  getApiClient,
  getConfiguredApiClient,
  getLiveApiClient,
} from '../baseApi';
import { dbService } from '../../../utils/db';

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
    await getClient("test\u2019s-key\u2014value");
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
    expect(GoogleGenAI).toHaveBeenCalledWith(expect.objectContaining({
      httpOptions: { baseUrl: 'https://proxy.example.com' },
    }));
  });

  it('normalizes version-suffixed proxy baseUrls before passing them to the SDK', async () => {
    await getClient('key', 'https://proxy.example.com/gemini/v1beta/');
    expect(GoogleGenAI).toHaveBeenCalledWith(expect.objectContaining({
      httpOptions: { baseUrl: 'https://proxy.example.com/gemini' },
    }));
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
    vi.mocked(GoogleGenAI).mockImplementationOnce(() => { throw new Error('bad'); });
    await expect(getClient('key')).rejects.toThrow('bad');
  });
});

// ── getApiClient ──

describe('getApiClient', () => {
  it('throws SilentError when no API key', async () => {
    await expect(getApiClient(null)).rejects.toMatchObject({
      name: 'SilentError',
    });
  });

  it('returns client when API key is provided', async () => {
    const client = await getApiClient('my-key');
    expect(client).toBeDefined();
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
    expect(GoogleGenAI).toHaveBeenCalledWith(expect.objectContaining({
      httpOptions: { baseUrl: 'https://proxy.example.com' },
    }));
  });

  it('skips proxy when useApiProxy is false', async () => {
    vi.mocked(dbService.getAppSettings).mockResolvedValue({
      useCustomApiConfig: true,
      useApiProxy: false,
      apiProxyUrl: 'https://proxy.example.com',
    } as StoredAppSettings);
    await getConfiguredApiClient('key');
    expect(GoogleGenAI).toHaveBeenCalledWith(expect.objectContaining({
      apiKey: 'key',
    }));
    // baseUrl should not be in the config
    const callArgs = vi.mocked(GoogleGenAI).mock.calls[0][0] as MockGoogleGenAIConfig;
    expect(callArgs.httpOptions?.baseUrl).toBeUndefined();
  });
});

describe('getLiveApiClient', () => {
  it('throws a configuration error when the ephemeral token endpoint is missing', async () => {
    await expect(
      getLiveApiClient(
        {
          liveApiEphemeralTokenEndpoint: null,
          useCustomApiConfig: false,
          useApiProxy: false,
          apiProxyUrl: null,
        },
        { apiVersion: 'v1alpha' },
      ),
    ).rejects.toMatchObject({
      name: 'LiveApiAuthConfigurationError',
      code: 'MISSING_EPHEMERAL_TOKEN_ENDPOINT',
    });
  });

  it('assigns a stable error code when the token endpoint returns invalid JSON', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => {
        throw new Error('bad json');
      },
    });

    vi.stubGlobal('fetch', fetchMock);

    await expect(
      getLiveApiClient(
        {
          liveApiEphemeralTokenEndpoint: 'https://example.test/live-token',
          useCustomApiConfig: false,
          useApiProxy: false,
          apiProxyUrl: null,
        },
        { apiVersion: 'v1alpha' },
      ),
    ).rejects.toMatchObject({
      name: 'LiveApiAuthConfigurationError',
      code: 'INVALID_EPHEMERAL_TOKEN_RESPONSE',
    });

    vi.unstubAllGlobals();
  });

  it('creates a client with an ephemeral token from the configured endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ name: 'ephemeral-token-name' }),
    });

    vi.stubGlobal('fetch', fetchMock);

    await getLiveApiClient(
      {
        liveApiEphemeralTokenEndpoint: 'https://example.test/live-token',
        useCustomApiConfig: false,
        useApiProxy: false,
        apiProxyUrl: null,
      },
      { apiVersion: 'v1alpha' },
    );

    expect(fetchMock).toHaveBeenCalledWith('https://example.test/live-token');
    expect(GoogleGenAI).toHaveBeenCalledWith({
      apiKey: 'ephemeral-token-name',
      httpOptions: { apiVersion: 'v1alpha' },
    });

    vi.unstubAllGlobals();
  });

  it('applies proxy baseUrl to the live client when proxying is enabled', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ token: 'ephemeral-token-name' }),
    });

    vi.stubGlobal('fetch', fetchMock);

    await getLiveApiClient(
      {
        liveApiEphemeralTokenEndpoint: 'https://example.test/live-token',
        useCustomApiConfig: true,
        useApiProxy: true,
        apiProxyUrl: 'https://proxy.example.com/v1beta/',
      },
      { apiVersion: 'v1alpha' },
    );

    expect(GoogleGenAI).toHaveBeenCalledWith({
      apiKey: 'ephemeral-token-name',
      httpOptions: {
        apiVersion: 'v1alpha',
        baseUrl: 'https://proxy.example.com',
      },
    });

    vi.unstubAllGlobals();
  });
});

// ── buildGenerationConfig ──

describe('buildGenerationConfig', () => {
  const baseConfig = {
    temperature: 1,
    topP: 0.95,
    topK: 64,
  };

  it('returns image config for gemini-2.5-flash-image-preview', async () => {
    const config = await buildGenerationConfig(
      'gemini-2.5-flash-image-preview', 'sys', baseConfig, false, 0,
      false, false, false, undefined, '1:1', false
    );
    expect(config.responseModalities).toEqual(['IMAGE', 'TEXT']);
  });

  it('returns image config with imageSize for gemini-3-pro-image-preview', async () => {
    const config = await buildGenerationConfig(
      'gemini-3-pro-image-preview', 'sys', baseConfig, false, 0,
      false, false, false, undefined, '1:1', false, '2K'
    );
    expect(config.responseModalities).toEqual(['IMAGE', 'TEXT']);
    expect(config.imageConfig!.imageSize).toBe('2K');
  });

  it('defaults imageSize to 1K for gemini-3-pro-image-preview', async () => {
    const config = await buildGenerationConfig(
      'gemini-3-pro-image-preview', 'sys', baseConfig, false, 0,
    );
    expect(config.imageConfig!.imageSize).toBe('1K');
  });

  it('includes thinkingConfig for gemini-3.1-flash-image-preview', async () => {
    const config = await buildGenerationConfig(
      'gemini-3.1-flash-image-preview', 'sys', baseConfig, false, 0,
      false, false, false, 'HIGH', '1:1', false, '2K'
    );
    expect(config.thinkingConfig).toEqual({
      includeThoughts: true,
      thinkingLevel: 'HIGH',
    });
  });

  it('defaults gemini-3.1-flash-image-preview to MINIMAL thinking', async () => {
    const config = await buildGenerationConfig(
      'gemini-3.1-flash-image-preview', 'sys', baseConfig, false, 0,
      false, false, false, undefined, '1:1', false, '2K'
    );
    expect(config.thinkingConfig).toEqual({
      includeThoughts: true,
      thinkingLevel: 'MINIMAL',
    });
  });

  it('uses image search grounding for gemini-3.1-flash-image-preview when search is enabled', async () => {
    const config = await buildGenerationConfig(
      'gemini-3.1-flash-image-preview', 'sys', baseConfig, false, 0,
      true, false, false, undefined, '1:1', false, '2K'
    );

    expect(config.tools).toEqual([
      {
        googleSearch: {
          searchTypes: {
            webSearch: {},
            imageSearch: {},
          },
        },
      },
    ]);
  });

  it('does not enable search for Gemini image models when only deep search is enabled', async () => {
    const config = await buildGenerationConfig(
      'gemini-3.1-flash-image-preview', 'sys', baseConfig, false, 0,
      false, false, false, undefined, '1:1', true, '2K'
    );

    expect(config.tools).toBeUndefined();
  });

  it('includes thinkingConfig for Gemini 3 models', async () => {
    const config = await buildGenerationConfig(
      'gemini-3-flash-preview', 'sys', baseConfig, false, 0,
    );
    expect(config.thinkingConfig).toBeDefined();
    expect(config.thinkingConfig!.includeThoughts).toBe(true);
  });

  it('uses thinkingBudget when > 0 for Gemini 3', async () => {
    const config = await buildGenerationConfig(
      'gemini-3-flash-preview', 'sys', baseConfig, false, 8000,
    );
    expect(config.thinkingConfig!.thinkingBudget).toBe(8000);
  });

  it('uses thinkingLevel when budget is 0 for Gemini 3', async () => {
    const config = await buildGenerationConfig(
      'gemini-3-flash-preview', 'sys', baseConfig, false, 0,
      false, false, false, 'LOW'
    );
    expect(config.thinkingConfig!.thinkingLevel).toBe('LOW');
  });

  it('defaults thinkingLevel to HIGH for Gemini 3', async () => {
    const config = await buildGenerationConfig(
      'gemini-3-flash-preview', 'sys', baseConfig, false, 0,
    );
    expect(config.thinkingConfig!.thinkingLevel).toBe('HIGH');
  });

  it('downgrades ULTRA_HIGH to HIGH for non-Gemini 3 global media resolution', async () => {
    const config = await buildGenerationConfig(
      'gemini-2.5-flash',
      'sys',
      baseConfig,
      false,
      0,
      false,
      false,
      false,
      undefined,
      undefined,
      false,
      undefined,
      undefined,
      MediaResolution.MEDIA_RESOLUTION_ULTRA_HIGH,
    );

    expect(config.mediaResolution).toBe(MediaResolution.MEDIA_RESOLUTION_HIGH);
  });

  it('includes thinkingConfig for gemini-2.5 models', async () => {
    const config = await buildGenerationConfig(
      'gemini-2.5-flash', 'sys', baseConfig, false, 8000,
    );
    expect(config.thinkingConfig!.thinkingBudget).toBe(8000);
    expect(config.thinkingConfig!.includeThoughts).toBe(true);
  });

  it('adds googleSearch tool when enabled', async () => {
    const config = await buildGenerationConfig(
      'gemini-3-flash-preview', 'sys', baseConfig, false, 0,
      true
    );
    expect(config.tools).toContainEqual({ googleSearch: {} });
  });

  it('adds googleSearch tool when deepSearch is enabled', async () => {
    const config = await buildGenerationConfig(
      'gemini-3-flash-preview', 'sys', baseConfig, false, 0,
      false, false, false, undefined, undefined, true
    );
    expect(config.tools).toContainEqual({ googleSearch: {} });
  });

  it('adds codeExecution tool when enabled and localPython not passed', async () => {
    const config = await buildGenerationConfig(
      'gemini-2.5-flash', 'sys', baseConfig, false, 0,
      false, true
    );
    expect(config.tools).toContainEqual({ codeExecution: {} });
  });

  it('skips codeExecution for non-image models when localPython is explicitly enabled', async () => {
    // gemini-2.5-flash is a non-G3 model that hits the standard path
    // isCodeExecutionEnabled=true at param 6, isLocalPythonEnabled=true at param 14
    const config = await buildGenerationConfig(
      'gemini-2.5-flash', 'sys', baseConfig, false, 0,
      false, true, false, undefined, undefined, false, undefined, undefined, undefined, true
    );
    const hasCodeExec = config.tools?.some((tool) => 'codeExecution' in tool);
    expect(hasCodeExec).toBeFalsy();
  });

  it('adds urlContext tool when enabled', async () => {
    const config = await buildGenerationConfig(
      'gemini-3-flash-preview', 'sys', baseConfig, false, 0,
      false, false, true
    );
    expect(config.tools).toContainEqual({ urlContext: {} });
  });

  it('appends deep search prompt to systemInstruction', async () => {
    const config = await buildGenerationConfig(
      'gemini-3-flash-preview', 'Original', baseConfig, false, 0,
      false, false, false, undefined, undefined, true
    );
    expect(config.systemInstruction).toContain('Original');
    expect(config.systemInstruction).not.toBe('Original');
  });

  it('appends local python prompt to systemInstruction when enabled', async () => {
    const config = await buildGenerationConfig(
      'gemini-3-flash-preview', 'Original', baseConfig, false, 0,
      false, false, false, undefined, undefined, false, undefined, undefined, undefined, true
    );
    expect(config.systemInstruction).toContain('Original');
    expect(config.systemInstruction).toContain('Return ONLY a single fenced Python code block');
    expect(config.systemInstruction).toContain('plt.savefig("chart.png")');
  });

  it('uses HIGH thinkingConfig instead of prompt token injection for Gemma models', async () => {
    const config = await buildGenerationConfig(
      'gemma-4-31b-it', 'sys', baseConfig, true, 0,
    );
    expect(config.systemInstruction).toBe('sys');
    expect(config.thinkingConfig).toEqual({
      includeThoughts: true,
      thinkingLevel: 'HIGH',
    });
  });

  it('leaves Gemma thinking disabled when showThoughts is off', async () => {
    const config = await buildGenerationConfig(
      'gemma-4-31b-it', 'sys', baseConfig, false, 0,
    );
    expect(config.systemInstruction).toBe('sys');
    expect(config.thinkingConfig).toBeUndefined();
  });

  it('sets systemInstruction to undefined when empty', async () => {
    const config = await buildGenerationConfig(
      'gemini-3-flash-preview', '', baseConfig, false, 0,
    );
    expect(config.systemInstruction).toBeUndefined();
  });

  it('applies global mediaResolution for non-Gemini-3 non-Gemma models', async () => {
    const config = await buildGenerationConfig(
      'gemini-2.5-flash', 'sys', baseConfig, false, 0,
      false, false, false, undefined, undefined, false, undefined, undefined, MediaResolution.MEDIA_RESOLUTION_HIGH,
    );
    expect(config.mediaResolution).toBe(MediaResolution.MEDIA_RESOLUTION_HIGH);
  });

  it('does not set global mediaResolution for Gemini 3 models', async () => {
    const config = await buildGenerationConfig(
      'gemini-3-flash-preview', 'sys', baseConfig, false, 0,
      false, false, false, undefined, undefined, false, undefined, undefined, MediaResolution.MEDIA_RESOLUTION_HIGH,
    );
    expect(config.mediaResolution).toBeUndefined();
  });

  it('preserves structured output config when tools are present', async () => {
    const config = await buildGenerationConfig(
      'gemini-3-flash-preview',
      'sys',
      {
        ...baseConfig,
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: {
            winner: { type: 'STRING' },
          },
        },
      },
      false,
      0,
      true
    );
    expect(config.responseMimeType).toBe('application/json');
    expect(config.responseSchema).toEqual({
      type: 'OBJECT',
      properties: {
        winner: { type: 'STRING' },
      },
    });
  });
});
