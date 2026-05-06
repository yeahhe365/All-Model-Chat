import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getClient, getApiClient, getConfiguredApiClient } from './apiClient';
import { appendFunctionDeclarationsToTools, buildGenerationConfig, toCountTokensConfig } from './generationConfig';
import { getLiveApiClient } from './liveApiAuth';
import { MediaResolution } from '../../types/settings';

type MockGoogleGenAIConfig = {
  apiKey: string;
  httpOptions?: {
    apiVersion?: 'v1alpha';
    baseUrl?: string;
  };
};

type StoredAppSettings = NonNullable<Awaited<ReturnType<typeof import('@/services/db/dbService').dbService.getAppSettings>>>;

// Mock @google/genai - must use function syntax for constructor mock
vi.mock('@google/genai', () => ({
  GoogleGenAI: vi.fn(function (this: { config: MockGoogleGenAIConfig }, config: MockGoogleGenAIConfig) {
    this.config = config;
  }),
}));

vi.mock('@/services/db/dbService', async () => {
  const { createDbServiceMockModule } = await import('../../test/moduleMockDoubles');

  return createDbServiceMockModule();
});

vi.mock('../logService', async () => {
  const { createLogServiceMockModule } = await import('../../test/moduleMockDoubles');

  return createLogServiceMockModule();
});

// Mock model classifiers while preserving normalization helpers.
vi.mock('../../utils/modelHelpers', async () => {
  const actual = await vi.importActual<typeof import('../../utils/modelHelpers')>('../../utils/modelHelpers');

  return {
    ...actual,
    isGemini3Model: vi.fn((id: string) => id?.includes('gemini-3')),
    isGeminiRoboticsModel: vi.fn((id: string) => id?.includes('gemini-robotics-er')),
    isGemmaModel: vi.fn((id: string) => id?.toLowerCase().includes('gemma')),
  };
});

import { GoogleGenAI } from '@google/genai';
import { dbService } from '@/services/db/dbService';

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

// ── buildGenerationConfig ──

describe('buildGenerationConfig', () => {
  const baseConfig = {
    temperature: 1,
    topP: 0.95,
    topK: 64,
  };

  it('accepts object options for generation config construction', async () => {
    const config = await buildGenerationConfig({
      modelId: 'gemini-3-flash-preview',
      systemInstruction: 'sys',
      config: baseConfig,
      showThoughts: true,
      thinkingBudget: 0,
      isGoogleSearchEnabled: true,
      isCodeExecutionEnabled: false,
      isUrlContextEnabled: true,
      thinkingLevel: 'LOW',
    });

    expect(config).toEqual(
      expect.objectContaining({
        temperature: 1,
        topP: 0.95,
        topK: 64,
        systemInstruction: 'sys',
        thinkingConfig: { includeThoughts: true, thinkingLevel: 'LOW' },
        tools: [{ googleSearch: {} }, { urlContext: {} }],
      }),
    );
  });

  it('returns image config for gemini-2.5-flash-image-preview', async () => {
    const config = await buildGenerationConfig(
      'gemini-2.5-flash-image-preview',
      'sys',
      baseConfig,
      false,
      0,
      false,
      false,
      false,
      undefined,
      '1:1',
      false,
    );
    expect(config.responseModalities).toEqual(['IMAGE', 'TEXT']);
  });

  it('returns image config with imageSize for gemini-3-pro-image-preview', async () => {
    const config = await buildGenerationConfig(
      'gemini-3-pro-image-preview',
      'sys',
      baseConfig,
      false,
      0,
      false,
      false,
      false,
      undefined,
      '1:1',
      false,
      '2K',
    );
    expect(config.responseModalities).toEqual(['IMAGE', 'TEXT']);
    expect(config.imageConfig!.imageSize).toBe('2K');
  });

  it('normalizes stale imageSize values for gemini-3-pro-image-preview', async () => {
    const config = await buildGenerationConfig(
      'gemini-3-pro-image-preview',
      'sys',
      baseConfig,
      false,
      0,
      false,
      false,
      false,
      undefined,
      '1:1',
      false,
      '512',
    );

    expect(config.imageConfig!.imageSize).toBe('1K');
  });

  it('defaults imageSize to 1K for gemini-3-pro-image-preview', async () => {
    const config = await buildGenerationConfig('gemini-3-pro-image-preview', 'sys', baseConfig, false, 0);
    expect(config.imageConfig!.imageSize).toBe('1K');
  });

  it('includes thinkingConfig for gemini-3.1-flash-image-preview', async () => {
    const config = await buildGenerationConfig(
      'gemini-3.1-flash-image-preview',
      'sys',
      baseConfig,
      false,
      0,
      false,
      false,
      false,
      'HIGH',
      '1:1',
      false,
      '2K',
    );
    expect(config.thinkingConfig).toEqual({
      includeThoughts: true,
      thinkingLevel: 'HIGH',
    });
  });

  it('defaults gemini-3.1-flash-image-preview to MINIMAL thinking', async () => {
    const config = await buildGenerationConfig(
      'gemini-3.1-flash-image-preview',
      'sys',
      baseConfig,
      false,
      0,
      false,
      false,
      false,
      undefined,
      '1:1',
      false,
      '2K',
    );
    expect(config.thinkingConfig).toEqual({
      includeThoughts: true,
      thinkingLevel: 'MINIMAL',
    });
  });

  it('uses image search grounding for gemini-3.1-flash-image-preview when search is enabled', async () => {
    const config = await buildGenerationConfig(
      'gemini-3.1-flash-image-preview',
      'sys',
      baseConfig,
      false,
      0,
      true,
      false,
      false,
      undefined,
      '1:1',
      false,
      '2K',
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
      'gemini-3.1-flash-image-preview',
      'sys',
      baseConfig,
      false,
      0,
      false,
      false,
      false,
      undefined,
      '1:1',
      true,
      '2K',
    );

    expect(config.tools).toBeUndefined();
  });

  it('supports image-only output mode for Gemini image models', async () => {
    const config = await (
      buildGenerationConfig as unknown as (
        modelId: string,
        systemInstruction: string,
        config: typeof baseConfig,
        showThoughts: boolean,
        thinkingBudget: number,
        isGoogleSearchEnabled?: boolean,
        isCodeExecutionEnabled?: boolean,
        isUrlContextEnabled?: boolean,
        thinkingLevel?: 'MINIMAL' | 'LOW' | 'MEDIUM' | 'HIGH',
        aspectRatio?: string,
        isDeepSearchEnabled?: boolean,
        imageSize?: string,
        safetySettings?: unknown,
        mediaResolution?: unknown,
        isLocalPythonEnabled?: boolean,
        imageOutputMode?: string,
        personGeneration?: string,
      ) => Promise<any>
    )(
      'gemini-3.1-flash-image-preview',
      'sys',
      baseConfig,
      false,
      0,
      false,
      false,
      false,
      undefined,
      '1:1',
      false,
      '2K',
      undefined,
      undefined,
      false,
      'IMAGE_ONLY',
      'ALLOW_ADULT',
    );

    expect(config.responseModalities).toEqual(['IMAGE']);
    expect(config.imageConfig).toEqual({
      aspectRatio: '1:1',
      imageSize: '2K',
    });
  });

  it('drops unsupported panoramic ratios for gemini-3-pro-image-preview', async () => {
    const config = await buildGenerationConfig(
      'gemini-3-pro-image-preview',
      'sys',
      baseConfig,
      false,
      0,
      false,
      false,
      false,
      undefined,
      '1:4',
    );

    expect(config.imageConfig).not.toHaveProperty('aspectRatio');
    expect(config.imageConfig!.imageSize).toBe('1K');
  });

  it('omits unsupported personGeneration for Gemini 2.5 image config', async () => {
    const config = await (
      buildGenerationConfig as unknown as (
        modelId: string,
        systemInstruction: string,
        config: typeof baseConfig,
        showThoughts: boolean,
        thinkingBudget: number,
        isGoogleSearchEnabled?: boolean,
        isCodeExecutionEnabled?: boolean,
        isUrlContextEnabled?: boolean,
        thinkingLevel?: 'MINIMAL' | 'LOW' | 'MEDIUM' | 'HIGH',
        aspectRatio?: string,
        isDeepSearchEnabled?: boolean,
        imageSize?: string,
        safetySettings?: unknown,
        mediaResolution?: unknown,
        isLocalPythonEnabled?: boolean,
        imageOutputMode?: string,
        personGeneration?: string,
      ) => Promise<any>
    )(
      'gemini-2.5-flash-image',
      'sys',
      baseConfig,
      false,
      0,
      false,
      false,
      false,
      undefined,
      '16:9',
      false,
      undefined,
      undefined,
      undefined,
      false,
      'IMAGE_TEXT',
      'DONT_ALLOW',
    );

    expect(config.responseModalities).toEqual(['IMAGE', 'TEXT']);
    expect(config.imageConfig).toEqual({
      aspectRatio: '16:9',
    });
  });

  it('includes thinkingConfig for Gemini 3 models', async () => {
    const config = await buildGenerationConfig('gemini-3-flash-preview', 'sys', baseConfig, false, 0);
    expect(config.thinkingConfig).toBeDefined();
    expect(config.thinkingConfig!.includeThoughts).toBe(true);
  });

  it('uses thinkingBudget when > 0 for Gemini 3', async () => {
    const config = await buildGenerationConfig('gemini-3-flash-preview', 'sys', baseConfig, false, 8000);
    expect(config.thinkingConfig!.thinkingBudget).toBe(8000);
  });

  it('uses thinkingLevel when budget is 0 for Gemini 3', async () => {
    const config = await buildGenerationConfig(
      'gemini-3-flash-preview',
      'sys',
      baseConfig,
      false,
      0,
      false,
      false,
      false,
      'LOW',
    );
    expect(config.thinkingConfig!.thinkingLevel).toBe('LOW');
  });

  it('defaults thinkingLevel to HIGH for Gemini 3', async () => {
    const config = await buildGenerationConfig('gemini-3-flash-preview', 'sys', baseConfig, false, 0);
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
    const config = await buildGenerationConfig('gemini-2.5-flash', 'sys', baseConfig, false, 8000);
    expect(config.thinkingConfig!.thinkingBudget).toBe(8000);
    expect(config.thinkingConfig!.includeThoughts).toBe(true);
  });

  it('includes thinkingBudget config for Gemini Robotics-ER 1.6', async () => {
    const config = await buildGenerationConfig('gemini-robotics-er-1.6-preview', 'sys', baseConfig, false, 1024);
    expect(config.thinkingConfig).toEqual({
      thinkingBudget: 1024,
      includeThoughts: true,
    });
  });

  it('preserves auto thinking for Gemini Robotics-ER 1.6', async () => {
    const config = await buildGenerationConfig('gemini-robotics-er-1.6-preview', 'sys', baseConfig, false, -1);
    expect(config.thinkingConfig).toEqual({
      includeThoughts: true,
      thinkingLevel: 'HIGH',
    });
  });

  it('uses thinkingLevel when budget is 0 for Gemini Robotics-ER 1.6', async () => {
    const config = await buildGenerationConfig(
      'gemini-robotics-er-1.6-preview',
      'sys',
      baseConfig,
      false,
      0,
      false,
      false,
      false,
      'LOW',
    );
    expect(config.thinkingConfig).toEqual({
      includeThoughts: true,
      thinkingLevel: 'LOW',
    });
  });

  it('adds googleSearch tool when enabled', async () => {
    const config = await buildGenerationConfig('gemini-3-flash-preview', 'sys', baseConfig, false, 0, true);
    expect(config.tools).toContainEqual({ googleSearch: {} });
  });

  it('adds googleSearch tool when deepSearch is enabled', async () => {
    const config = await buildGenerationConfig(
      'gemini-3-flash-preview',
      'sys',
      baseConfig,
      false,
      0,
      false,
      false,
      false,
      undefined,
      undefined,
      true,
    );
    expect(config.tools).toContainEqual({ googleSearch: {} });
  });

  it('adds codeExecution tool when enabled and localPython not passed', async () => {
    const config = await buildGenerationConfig('gemini-2.5-flash', 'sys', baseConfig, false, 0, false, true);
    expect(config.tools).toContainEqual({ codeExecution: {} });
  });

  it('does not add codeExecution tool for Gemini image-generation models when enabled', async () => {
    const config = await buildGenerationConfig(
      'gemini-3.1-flash-image-preview',
      'sys',
      baseConfig,
      true,
      0,
      false,
      true,
      false,
      'HIGH',
    );

    expect(config.tools?.some((tool) => 'codeExecution' in tool)).toBeFalsy();
    expect(config.thinkingConfig).toEqual({
      includeThoughts: true,
      thinkingLevel: 'HIGH',
    });
  });

  it('skips codeExecution for non-image models when localPython is explicitly enabled', async () => {
    // gemini-2.5-flash is a non-G3 model that hits the standard path
    // isCodeExecutionEnabled=true at param 6, isLocalPythonEnabled=true at param 14
    const config = await buildGenerationConfig(
      'gemini-2.5-flash',
      'sys',
      baseConfig,
      false,
      0,
      false,
      true,
      false,
      undefined,
      undefined,
      false,
      undefined,
      undefined,
      undefined,
      true,
    );
    const hasCodeExec = config.tools?.some((tool) => 'codeExecution' in tool);
    expect(hasCodeExec).toBeFalsy();
  });

  it('adds urlContext tool when enabled', async () => {
    const config = await buildGenerationConfig(
      'gemini-3-flash-preview',
      'sys',
      baseConfig,
      false,
      0,
      false,
      false,
      true,
    );
    expect(config.tools).toContainEqual({ urlContext: {} });
  });

  it('appends deep search prompt to systemInstruction', async () => {
    const config = await buildGenerationConfig(
      'gemini-3-flash-preview',
      'Original',
      baseConfig,
      false,
      0,
      false,
      false,
      false,
      undefined,
      undefined,
      true,
    );
    expect(config.systemInstruction).toContain('Original');
    expect(config.systemInstruction).not.toBe('Original');
  });

  it('appends local python prompt to systemInstruction when enabled', async () => {
    const config = await buildGenerationConfig(
      'gemini-3-flash-preview',
      'Original',
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
      undefined,
      true,
    );
    expect(config.systemInstruction).toContain('Original');
    expect(config.systemInstruction).toContain('Call the `run_local_python` tool');
    expect(config.systemInstruction).toContain('plt.savefig("chart.png")');
  });

  it('uses HIGH thinking level for Gemma reasoning mode', async () => {
    const config = await buildGenerationConfig('gemma-4-31b-it', 'sys', baseConfig, true, 0);
    expect(config.systemInstruction).toBe('sys');
    expect(config.thinkingConfig).toEqual({
      includeThoughts: true,
      thinkingLevel: 'HIGH',
    });
  });

  it('uses MINIMAL thinking level for Gemma fast mode', async () => {
    const config = await buildGenerationConfig('gemma-4-31b-it', 'sys', baseConfig, false, 0);
    expect(config.systemInstruction).toBe('sys');
    expect(config.thinkingConfig).toEqual({
      includeThoughts: true,
      thinkingLevel: 'MINIMAL',
    });
  });

  it('applies global mediaResolution for Gemma multimodal requests', async () => {
    const config = await buildGenerationConfig(
      'gemma-4-31b-it',
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
      MediaResolution.MEDIA_RESOLUTION_HIGH,
    );

    expect(config.mediaResolution).toBe(MediaResolution.MEDIA_RESOLUTION_HIGH);
  });

  it('does not add codeExecution for Gemma models', async () => {
    const config = await buildGenerationConfig('gemma-4-31b-it', 'sys', baseConfig, false, 0, false, true, false);

    const hasCodeExec = config.tools?.some((tool) => 'codeExecution' in tool);
    expect(hasCodeExec).toBeFalsy();
  });

  it('does not add urlContext for Gemma models', async () => {
    const config = await buildGenerationConfig('gemma-4-31b-it', 'sys', baseConfig, false, 0, false, false, true);

    const hasUrlContext = config.tools?.some((tool) => 'urlContext' in tool);
    expect(hasUrlContext).toBeFalsy();
  });

  it('sets systemInstruction to undefined when empty', async () => {
    const config = await buildGenerationConfig('gemini-3-flash-preview', '', baseConfig, false, 0);
    expect(config.systemInstruction).toBeUndefined();
  });

  it('applies global mediaResolution for non-Gemini-3 non-Gemma models', async () => {
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
      MediaResolution.MEDIA_RESOLUTION_HIGH,
    );
    expect(config.mediaResolution).toBe(MediaResolution.MEDIA_RESOLUTION_HIGH);
  });

  it('does not set global mediaResolution for Gemini 3 models', async () => {
    const config = await buildGenerationConfig(
      'gemini-3-flash-preview',
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
      MediaResolution.MEDIA_RESOLUTION_HIGH,
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
      true,
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

describe('toCountTokensConfig', () => {
  it('keeps system instructions and tools but drops generationConfig for Gemini Developer API token counting', () => {
    expect(
      toCountTokensConfig({
        systemInstruction: 'You are concise.',
        tools: [{ googleSearch: {} }],
        thinkingConfig: {
          includeThoughts: true,
          thinkingBudget: 256,
        },
        temperature: 0.2,
      }),
    ).toEqual({
      systemInstruction: 'You are concise.',
      tools: [{ googleSearch: {} }],
    });
  });
});

describe('appendFunctionDeclarationsToTools', () => {
  it('enables server-side tool invocation circulation for built-in-only Gemini 3 configs', () => {
    const config = appendFunctionDeclarationsToTools(
      'gemini-3-flash-preview',
      { tools: [{ googleSearch: {} }, { codeExecution: {} }] },
      [],
    );

    expect(config.toolConfig).toEqual({
      includeServerSideToolInvocations: true,
    });
  });

  it('keeps custom function declarations alongside built-in tools for Gemini 3 models', () => {
    const config = appendFunctionDeclarationsToTools('gemini-3-flash-preview', { tools: [{ googleSearch: {} }] }, [
      {
        name: 'run_local_python',
        description: 'Execute Python locally.',
      },
    ]);

    expect(config.tools).toEqual([
      { googleSearch: {} },
      {
        functionDeclarations: [
          {
            name: 'run_local_python',
            description: 'Execute Python locally.',
          },
        ],
      },
    ]);
    expect(config.toolConfig).toEqual({
      includeServerSideToolInvocations: true,
    });
  });

  it('keeps custom function declarations alongside built-in tools for Gemini Robotics models', () => {
    const config = appendFunctionDeclarationsToTools(
      'gemini-robotics-er-1.6-preview',
      { tools: [{ googleSearch: {} }] },
      [
        {
          name: 'run_local_python',
          description: 'Execute Python locally.',
        },
      ],
    );

    expect(config.tools).toEqual([
      { googleSearch: {} },
      {
        functionDeclarations: [
          {
            name: 'run_local_python',
            description: 'Execute Python locally.',
          },
        ],
      },
    ]);
    expect(config.toolConfig).toEqual({
      includeServerSideToolInvocations: true,
    });
  });

  it('does not enable server-side tool invocation circulation for function-only Gemini 3 configs', () => {
    const config = appendFunctionDeclarationsToTools('gemini-3-flash-preview', {}, [
      {
        name: 'run_local_python',
        description: 'Execute Python locally.',
      },
    ]);

    expect(config.tools).toEqual([
      {
        functionDeclarations: [
          {
            name: 'run_local_python',
            description: 'Execute Python locally.',
          },
        ],
      },
    ]);
    expect(config.toolConfig).toBeUndefined();
  });
});
