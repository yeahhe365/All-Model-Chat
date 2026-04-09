import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getActiveApiConfig } from '../apiUtils';

describe('getActiveApiConfig', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns the custom API key when custom config is enabled', () => {
    const result = getActiveApiConfig({
      useCustomApiConfig: true,
      apiKey: 'custom-key',
    } as any);

    expect(result.apiKeysString).toBe('custom-key');
  });

  it('prefers VITE_GEMINI_API_KEY in browser env mode', () => {
    vi.stubEnv('VITE_GEMINI_API_KEY', 'vite-key');
    vi.stubEnv('GEMINI_API_KEY', 'gemini-key');
    vi.stubEnv('GOOGLE_API_KEY', 'google-key');

    const result = getActiveApiConfig({
      useCustomApiConfig: false,
      apiKey: null,
    } as any);

    expect(result.apiKeysString).toBe('vite-key');
  });

  it('falls back to GEMINI_API_KEY when VITE_GEMINI_API_KEY is absent', () => {
    vi.stubEnv('GEMINI_API_KEY', 'gemini-key');

    const result = getActiveApiConfig({
      useCustomApiConfig: false,
      apiKey: null,
    } as any);

    expect(result.apiKeysString).toBe('gemini-key');
  });

  it('falls back to GOOGLE_API_KEY when other env keys are absent', () => {
    vi.stubEnv('GOOGLE_API_KEY', 'google-key');

    const result = getActiveApiConfig({
      useCustomApiConfig: false,
      apiKey: null,
    } as any);

    expect(result.apiKeysString).toBe('google-key');
  });
});
