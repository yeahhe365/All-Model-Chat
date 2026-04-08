import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildGenerationConfig } from '../baseApi';
import { HarmBlockThreshold, HarmCategory, MediaResolution } from '../../../types/settings';

// Mock @google/genai - must use function syntax for constructor mock
vi.mock('@google/genai', () => ({
  GoogleGenAI: vi.fn(function(this: any, config: any) { this.config = config; }),
  Modality: { IMAGE: 'IMAGE', TEXT: 'TEXT' },
}));

// Mock dbService
vi.mock('../../../utils/db', () => ({
  dbService: {
    getAppSettings: vi.fn(),
  },
}));

// Mock logService
vi.mock('../../logService', () => ({
  logService: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

// Mock appUtils for isGemini3Model
vi.mock('../../../utils/appUtils', () => ({
  isGemini3Model: vi.fn((id: string) => id?.includes('gemini-3')),
}));

import { GoogleGenAI } from '@google/genai';
import { getClient, getApiClient, getConfiguredApiClient } from '../baseApi';
import { dbService } from '../../../utils/db';

// ── getClient ──

describe('getClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a GoogleGenAI client with API key', () => {
    getClient('test-key');
    expect(GoogleGenAI).toHaveBeenCalledWith({ apiKey: 'test-key' });
  });

  it('sanitizes smart quotes and dashes in API key', () => {
    getClient("test\u2019s-key\u2014value");
    expect(GoogleGenAI).toHaveBeenCalledWith({ apiKey: "test's-key-value" });
  });

  it('passes baseUrl when provided', () => {
    getClient('key', 'https://proxy.example.com/');
    expect(GoogleGenAI).toHaveBeenCalledWith({ apiKey: 'key', baseUrl: 'https://proxy.example.com' });
  });

  it('strips trailing slash from baseUrl', () => {
    getClient('key', 'https://proxy.example.com/');
    expect(GoogleGenAI).toHaveBeenCalledWith(expect.objectContaining({
      baseUrl: 'https://proxy.example.com',
    }));
  });

  it('throws on invalid initialization', () => {
    vi.mocked(GoogleGenAI).mockImplementationOnce(() => { throw new Error('bad'); });
    expect(() => getClient('key')).toThrow('bad');
  });
});

// ── getApiClient ──

describe('getApiClient', () => {
  it('throws SilentError when no API key', () => {
    try {
      getApiClient(null);
      expect.unreachable('Should have thrown');
    } catch (e: any) {
      expect(e.name).toBe('SilentError');
      expect(e.message).toContain('API key');
    }
  });

  it('returns client when API key is provided', () => {
    const client = getApiClient('my-key');
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
    } as any);
    await getConfiguredApiClient('key');
    expect(GoogleGenAI).toHaveBeenCalledWith(expect.objectContaining({
      baseUrl: 'https://proxy.example.com',
    }));
  });

  it('skips proxy when useApiProxy is false', async () => {
    vi.mocked(dbService.getAppSettings).mockResolvedValue({
      useCustomApiConfig: true,
      useApiProxy: false,
      apiProxyUrl: 'https://proxy.example.com',
    } as any);
    await getConfiguredApiClient('key');
    expect(GoogleGenAI).toHaveBeenCalledWith(expect.objectContaining({
      apiKey: 'key',
    }));
    // baseUrl should not be in the config
    const callArgs = vi.mocked(GoogleGenAI).mock.calls[0][0] as any;
    expect(callArgs.baseUrl).toBeUndefined();
  });
});

// ── buildGenerationConfig ──

describe('buildGenerationConfig', () => {
  const baseConfig = {
    temperature: 1,
    topP: 0.95,
    topK: 64,
  };

  const legacyDefaultSafetySettings = [
    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_CIVIC_INTEGRITY, threshold: HarmBlockThreshold.BLOCK_NONE },
  ];

  it('returns image config for gemini-2.5-flash-image-preview', () => {
    const config = buildGenerationConfig(
      'gemini-2.5-flash-image-preview', 'sys', baseConfig, false, 0,
      false, false, false, undefined, '1:1', false
    );
    expect(config.responseModalities).toEqual(['IMAGE', 'TEXT']);
  });

  it('returns image config with imageSize for gemini-3-pro-image-preview', () => {
    const config = buildGenerationConfig(
      'gemini-3-pro-image-preview', 'sys', baseConfig, false, 0,
      false, false, false, undefined, '1:1', false, '2K'
    );
    expect(config.responseModalities).toEqual(['IMAGE', 'TEXT']);
    expect(config.imageConfig.imageSize).toBe('2K');
  });

  it('defaults imageSize to 1K for gemini-3-pro-image-preview', () => {
    const config = buildGenerationConfig(
      'gemini-3-pro-image-preview', 'sys', baseConfig, false, 0,
    );
    expect(config.imageConfig.imageSize).toBe('1K');
  });

  it('includes thinkingConfig for Gemini 3 models', () => {
    const config = buildGenerationConfig(
      'gemini-3-flash-preview', 'sys', baseConfig, false, 0,
    );
    expect(config.thinkingConfig).toBeDefined();
    expect(config.thinkingConfig.includeThoughts).toBe(true);
  });

  it('uses thinkingBudget when > 0 for Gemini 3', () => {
    const config = buildGenerationConfig(
      'gemini-3-flash-preview', 'sys', baseConfig, false, 8000,
    );
    expect(config.thinkingConfig.thinkingBudget).toBe(8000);
  });

  it('uses thinkingLevel when budget is 0 for Gemini 3', () => {
    const config = buildGenerationConfig(
      'gemini-3-flash-preview', 'sys', baseConfig, false, 0,
      false, false, false, 'LOW'
    );
    expect(config.thinkingConfig.thinkingLevel).toBe('LOW');
  });

  it('defaults thinkingLevel to HIGH for Gemini 3', () => {
    const config = buildGenerationConfig(
      'gemini-3-flash-preview', 'sys', baseConfig, false, 0,
    );
    expect(config.thinkingConfig.thinkingLevel).toBe('HIGH');
  });

  it('includes thinkingConfig for gemini-2.5 models', () => {
    const config = buildGenerationConfig(
      'gemini-2.5-pro', 'sys', baseConfig, false, 8000,
    );
    expect(config.thinkingConfig.thinkingBudget).toBe(8000);
    expect(config.thinkingConfig.includeThoughts).toBe(true);
  });

  it('adds googleSearch tool when enabled', () => {
    const config = buildGenerationConfig(
      'gemini-3-flash-preview', 'sys', baseConfig, false, 0,
      true
    );
    expect(config.tools).toContainEqual({ googleSearch: {} });
  });

  it('adds googleSearch tool when deepSearch is enabled', () => {
    const config = buildGenerationConfig(
      'gemini-3-flash-preview', 'sys', baseConfig, false, 0,
      false, false, false, undefined, undefined, true
    );
    expect(config.tools).toContainEqual({ googleSearch: {} });
  });

  it('adds codeExecution tool when enabled and localPython not passed', () => {
    const config = buildGenerationConfig(
      'gemini-2.5-pro', 'sys', baseConfig, false, 0,
      false, true
    );
    expect(config.tools).toContainEqual({ codeExecution: {} });
  });

  it('skips codeExecution for non-image models when localPython is explicitly enabled', () => {
    // gemini-2.5-pro is a non-G3 model that hits the standard path
    // isCodeExecutionEnabled=true at param 6, isLocalPythonEnabled=true at param 14
    const config = buildGenerationConfig(
      'gemini-2.5-flash-preview-09-2025', 'sys', baseConfig, false, 0,
      false, true, false, undefined, undefined, false, undefined, undefined, undefined, true
    );
    const hasCodeExec = config.tools?.some((t: any) => t.codeExecution);
    expect(hasCodeExec).toBeFalsy();
  });

  it('adds urlContext tool when enabled', () => {
    const config = buildGenerationConfig(
      'gemini-3-flash-preview', 'sys', baseConfig, false, 0,
      false, false, true
    );
    expect(config.tools).toContainEqual({ urlContext: {} });
  });

  it('omits legacy default safety settings so Gemini request defaults remain active', () => {
    const config = buildGenerationConfig(
      'gemini-3-flash-preview', 'sys', baseConfig, false, 0,
      false, false, false, undefined, undefined, false, undefined, legacyDefaultSafetySettings
    );

    expect(config.safetySettings).toBeUndefined();
  });

  it('filters unsupported civic integrity safety settings from explicit overrides', () => {
    const config = buildGenerationConfig(
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
      [
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
        { category: HarmCategory.HARM_CATEGORY_CIVIC_INTEGRITY, threshold: HarmBlockThreshold.BLOCK_NONE },
      ]
    );

    expect(config.safetySettings).toEqual([
      { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE },
      { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
    ]);
  });

  it('appends deep search prompt to systemInstruction', () => {
    const config = buildGenerationConfig(
      'gemini-3-flash-preview', 'Original', baseConfig, false, 0,
      false, false, false, undefined, undefined, true
    );
    expect(config.systemInstruction).toContain('Original');
    expect(config.systemInstruction).not.toBe('Original');
  });

  it('injects <|think|> token for Gemma models with showThoughts', () => {
    const config = buildGenerationConfig(
      'gemma-4-31b-it', 'sys', baseConfig, true, 0,
    );
    expect(config.systemInstruction).toContain('<|think|>');
  });

  it('sets systemInstruction to undefined when empty', () => {
    const config = buildGenerationConfig(
      'gemini-3-flash-preview', '', baseConfig, false, 0,
    );
    expect(config.systemInstruction).toBeUndefined();
  });

  it('applies global mediaResolution for non-Gemini-3 non-Gemma models', () => {
    const config = buildGenerationConfig(
      'gemini-2.5-pro', 'sys', baseConfig, false, 0,
      false, false, false, undefined, undefined, false, undefined, undefined, MediaResolution.MEDIA_RESOLUTION_HIGH,
    );
    expect(config.mediaResolution).toBe(MediaResolution.MEDIA_RESOLUTION_HIGH);
  });

  it('does not set global mediaResolution for Gemini 3 models', () => {
    const config = buildGenerationConfig(
      'gemini-3-flash-preview', 'sys', baseConfig, false, 0,
      false, false, false, undefined, undefined, false, undefined, undefined, MediaResolution.MEDIA_RESOLUTION_HIGH,
    );
    expect(config.mediaResolution).toBeUndefined();
  });

  it('deletes responseMimeType when tools are present', () => {
    const config = buildGenerationConfig(
      'gemini-3-flash-preview', 'sys', baseConfig, false, 0,
      true
    );
    expect(config.responseMimeType).toBeUndefined();
    expect(config.responseSchema).toBeUndefined();
  });
});
