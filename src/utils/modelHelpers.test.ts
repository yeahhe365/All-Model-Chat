import { beforeEach, describe, it, expect } from 'vitest';
import { MODELS_SUPPORTING_RAW_MODE } from './../constants/appConstants';
import {
  sortModels,
  isGemini3Model,
  getModelCapabilities,
  shouldStripThinkingFromContext,
  sanitizeModelOptions,
  resolveSupportedModelId,
  calculateTokenStats,
  resolveModelSwitchSettings,
} from './modelHelpers';
import { ModelOption } from './../types';
import type { UsageMetadata } from '@google/genai';
import { MediaResolution } from '../types/settings';
import { useModelPreferencesStore } from '../stores/modelPreferencesStore';

type LegacyUsageMetadata = UsageMetadata & {
  candidatesTokenCount?: number;
};

const createUsageMetadata = (overrides: LegacyUsageMetadata): UsageMetadata => overrides;

beforeEach(() => {
  localStorage.clear();
  useModelPreferencesStore.setState({
    customModels: null,
    modelSettingsCache: {},
    legacyModelPreferencesHydrated: false,
  });
});

const resolveModelSwitchForTarget = (
  targetModelId: string,
  overrides: Partial<{
    thinkingBudget: number;
    thinkingLevel: 'MINIMAL' | 'LOW' | 'MEDIUM' | 'HIGH';
  }> = {},
) =>
  resolveModelSwitchSettings({
    currentSettings: {
      mediaResolution: undefined,
      thinkingBudget: overrides.thinkingBudget ?? 4096,
      thinkingLevel: overrides.thinkingLevel ?? 'HIGH',
    },
    sourceSettings: {
      mediaResolution: undefined,
      thinkingBudget: overrides.thinkingBudget ?? 4096,
      thinkingLevel: overrides.thinkingLevel ?? 'HIGH',
    },
    targetModelId,
  });

describe('raw mode support', () => {
  it('includes Gemini Robotics-ER 1.6', () => {
    expect(MODELS_SUPPORTING_RAW_MODE).toContain('gemini-robotics-er-1.6-preview');
  });
});

describe('sortModels', () => {
  it('sorts pinned models before unpinned', () => {
    const models: ModelOption[] = [
      { id: 'model-b', name: 'B' },
      { id: 'model-a', name: 'A', isPinned: true },
    ];
    const result = sortModels(models);
    expect(result[0].id).toBe('model-a');
  });

  it('sorts by name when both are unpinned', () => {
    const models: ModelOption[] = [
      { id: 'z-model', name: 'Z Model' },
      { id: 'a-model', name: 'A Model' },
    ];
    const result = sortModels(models);
    expect(result[0].name).toBe('A Model');
  });

  it('sorts pinned by category weight: standard < native-audio < tts < image < imagen', () => {
    const models: ModelOption[] = [
      { id: 'gemini-tts', name: 'TTS', isPinned: true },
      { id: 'gemini-imagen', name: 'Imagen', isPinned: true },
      { id: 'gemini-flash', name: 'Flash', isPinned: true },
      { id: 'gemini-image', name: 'Image', isPinned: true },
      { id: 'gemini-native-audio', name: 'Audio', isPinned: true },
    ];
    const result = sortModels(models);
    expect(result.map((m) => m.id)).toEqual([
      'gemini-flash',
      'gemini-native-audio',
      'gemini-tts',
      'gemini-image',
      'gemini-imagen',
    ]);
  });

  it('prioritizes gemini-3 among pinned models of same category', () => {
    const models: ModelOption[] = [
      { id: 'gemini-2.5-flash', name: '2.5 Flash', isPinned: true },
      { id: 'gemini-3-flash', name: '3 Flash', isPinned: true },
    ];
    const result = sortModels(models);
    expect(result[0].id).toBe('gemini-3-flash');
  });

  it('keeps the preferred pinned Gemini text model order for the model picker', () => {
    const models: ModelOption[] = [
      { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash Preview', isPinned: true },
      { id: 'gemini-3.1-flash-lite-preview', name: 'Gemini 3.1 Flash Lite Preview', isPinned: true },
      { id: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro Preview', isPinned: true },
    ];

    const result = sortModels(models);

    expect(result.map((model) => model.id)).toEqual([
      'gemini-3.1-pro-preview',
      'gemini-3-flash-preview',
      'gemini-3.1-flash-lite-preview',
    ]);
  });

  it('does not mutate original array', () => {
    const models: ModelOption[] = [
      { id: 'b', name: 'B' },
      { id: 'a', name: 'A' },
    ];
    sortModels(models);
    expect(models[0].id).toBe('b');
  });
});

describe('isGemini3Model', () => {
  it('returns false for empty string', () => {
    expect(isGemini3Model('')).toBe(false);
  });

  it('returns true for gemini-3-flash-preview', () => {
    expect(isGemini3Model('gemini-3-flash-preview')).toBe(true);
  });

  it('returns true for gemini-3-pro', () => {
    expect(isGemini3Model('gemini-3-pro-image-preview')).toBe(true);
  });

  it('returns true for gemini-3.1-flash', () => {
    expect(isGemini3Model('gemini-3.1-flash-lite-preview')).toBe(true);
  });

  it('returns true for models/ prefixed IDs', () => {
    expect(isGemini3Model('models/gemini-3-flash-preview')).toBe(true);
  });

  it('returns false for gemini-2.5-flash', () => {
    expect(isGemini3Model('gemini-2.5-flash')).toBe(false);
  });

  it('is case insensitive', () => {
    expect(isGemini3Model('Gemini-3-Flash-Preview')).toBe(true);
  });
});

describe('getModelCapabilities', () => {
  it('treats flash live preview models as live audio models', () => {
    expect(getModelCapabilities('gemini-3.1-flash-live-preview').isNativeAudioModel).toBe(true);
  });

  it('does not mark Gemini 3.1 Flash TTS Preview as supporting thinking', () => {
    const capabilities = getModelCapabilities('gemini-3.1-flash-tts-preview');

    expect(capabilities.isTtsModel).toBe(true);
    expect(capabilities.supportsThinkingLevel).toBe(false);
  });

  it('marks Gemini Robotics-ER 1.6 as supporting thinking levels', () => {
    const capabilities = getModelCapabilities('gemini-robotics-er-1.6-preview');

    expect(capabilities.supportsThinkingLevel).toBe(true);
    expect(capabilities.isGemini3).toBe(false);
  });

  it('exposes raw reasoning prefill support as a model capability', () => {
    expect(getModelCapabilities('gemini-3-flash-preview').supportsRawReasoningPrefill).toBe(true);
    expect(getModelCapabilities('gemini-2.5-flash').supportsRawReasoningPrefill).toBe(false);
  });

  it('exposes interaction permissions so UI code does not branch on model families', () => {
    const textCapabilities = getModelCapabilities('gemini-3.1-pro-preview');
    const ttsCapabilities = getModelCapabilities('gemini-3.1-flash-tts-preview');
    const liveCapabilities = getModelCapabilities('gemini-3.1-flash-live-preview');
    const geminiImageCapabilities = getModelCapabilities('gemini-3.1-flash-image-preview');
    const imagenCapabilities = getModelCapabilities('imagen-4.0-generate-preview');

    expect(textCapabilities.permissions).toMatchObject({
      canAcceptAttachments: true,
      canUseCodeExecution: true,
      canUseUrlContext: true,
      canGenerateSuggestions: true,
      requiresTextPrompt: false,
    });
    expect(ttsCapabilities.permissions).toMatchObject({
      canAcceptAttachments: false,
      canUseTools: false,
      canGenerateSuggestions: false,
      requiresTextPrompt: true,
    });
    expect(liveCapabilities.permissions).toMatchObject({
      canAcceptAttachments: false,
      canUseGoogleSearch: true,
      canUseLocalPython: true,
      canUseCodeExecution: false,
      canGenerateSuggestions: false,
      requiresTextPrompt: false,
    });
    expect(geminiImageCapabilities.permissions).toMatchObject({
      canAcceptAttachments: true,
      canUseGoogleSearch: true,
      canUseCodeExecution: false,
      canGenerateSuggestions: false,
      requiresTextPrompt: true,
    });
    expect(imagenCapabilities.permissions).toMatchObject({
      canAcceptAttachments: false,
      canUseGoogleSearch: false,
      canUseTokenCount: true,
      requiresTextPrompt: true,
    });
  });

  it('exposes the latest Gemini 3.1 Flash Image ratios and sizes', () => {
    const capabilities = getModelCapabilities('gemini-3.1-flash-image-preview');

    expect(capabilities.supportedAspectRatios).toEqual(expect.arrayContaining(['1:4', '4:1', '1:8', '8:1']));
    expect(capabilities.supportedImageSizes).toEqual(expect.arrayContaining(['512', '1K', '2K', '4K']));
  });
});

describe('getDefaultThinkingLevelForModel', () => {
  it('defaults Gemini 3.1 Flash Live to MINIMAL', () => {
    expect(resolveModelSwitchForTarget('gemini-3.1-flash-live-preview').thinkingLevel).toBe('MINIMAL');
  });

  it('defaults Gemini 3.1 Flash Image to MINIMAL', () => {
    expect(resolveModelSwitchForTarget('gemini-3.1-flash-image-preview').thinkingLevel).toBe('MINIMAL');
  });

  it('keeps fallback thinking level for non-special models', () => {
    expect(resolveModelSwitchForTarget('gemini-2.5-flash', { thinkingLevel: 'HIGH' }).thinkingLevel).toBe('HIGH');
  });
});

describe('shouldStripThinkingFromContext', () => {
  it('defaults Gemma conversations to stripping thoughts from follow-up context', () => {
    expect(shouldStripThinkingFromContext('gemma-4-31b-it', false)).toBe(true);
  });

  it('keeps non-Gemma models unchanged when the user has not enabled stripping', () => {
    expect(shouldStripThinkingFromContext('gemini-3-flash-preview', false)).toBe(false);
  });

  it('honors the explicit strip toggle for non-Gemma models', () => {
    expect(shouldStripThinkingFromContext('gemini-3-flash-preview', true)).toBe(true);
  });
});

describe('supported model sanitization', () => {
  it('keeps legacy Gemini 2.5 preview and TTS ids in custom model lists', () => {
    const models: ModelOption[] = [
      { id: 'gemini-2.5-flash-preview-09-2025', name: 'Old Flash' },
      { id: 'gemini-2.5-flash-preview-tts', name: 'Removed Flash TTS' },
      { id: 'gemini-2.5-pro-preview-tts', name: 'Removed Pro TTS' },
      { id: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro' },
    ];

    expect(sanitizeModelOptions(models).map((model) => model.id)).toEqual([
      'gemini-2.5-flash-preview-09-2025',
      'gemini-2.5-flash-preview-tts',
      'gemini-2.5-pro-preview-tts',
      'gemini-3.1-pro-preview',
    ]);
  });

  it('does not auto-fallback legacy preview and TTS ids', () => {
    expect(resolveSupportedModelId('gemini-2.5-flash-preview-09-2025', 'gemini-3-flash-preview')).toBe(
      'gemini-2.5-flash-preview-09-2025',
    );
    expect(resolveSupportedModelId('gemini-2.5-flash-preview-tts', 'gemini-3.1-flash-tts-preview')).toBe(
      'gemini-2.5-flash-preview-tts',
    );
    expect(resolveSupportedModelId('gemini-2.5-pro-preview-tts', 'gemini-3.1-flash-tts-preview')).toBe(
      'gemini-2.5-pro-preview-tts',
    );
  });
});

describe('calculateTokenStats', () => {
  it('returns zeros for undefined metadata', () => {
    expect(calculateTokenStats(undefined)).toEqual({
      promptTokens: 0,
      cachedPromptTokens: 0,
      uncachedPromptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      thoughtTokens: 0,
      toolUsePromptTokens: 0,
      inputTokens: 0,
      outputTokens: 0,
    });
  });

  it('extracts token counts from metadata', () => {
    const result = calculateTokenStats(
      createUsageMetadata({
        totalTokenCount: 100,
        promptTokenCount: 30,
        candidatesTokenCount: 70,
      }),
    );
    expect(result).toEqual({
      promptTokens: 30,
      uncachedPromptTokens: 30,
      completionTokens: 70,
      totalTokens: 100,
      thoughtTokens: 0,
      cachedPromptTokens: 0,
      toolUsePromptTokens: 0,
      inputTokens: 30,
      outputTokens: 70,
    });
  });

  it('calculates completionTokens as total - prompt when candidatesTokenCount is missing', () => {
    const result = calculateTokenStats(
      createUsageMetadata({
        totalTokenCount: 100,
        promptTokenCount: 40,
      }),
    );
    expect(result.completionTokens).toBe(60);
  });

  it('extracts thought tokens', () => {
    const result = calculateTokenStats(
      createUsageMetadata({
        totalTokenCount: 200,
        promptTokenCount: 50,
        candidatesTokenCount: 150,
        thoughtsTokenCount: 40,
      }),
    );
    expect(result.thoughtTokens).toBe(40);
    expect(result.outputTokens).toBe(190);
  });

  it('extracts cached prompt tokens when usage metadata includes cache hits', () => {
    const result = calculateTokenStats(
      createUsageMetadata({
        totalTokenCount: 120,
        promptTokenCount: 80,
        candidatesTokenCount: 40,
        cachedContentTokenCount: 32,
      }),
    );

    expect(result.cachedPromptTokens).toBe(32);
    expect(result.uncachedPromptTokens).toBe(48);
    expect(result.inputTokens).toBe(48);
    expect(result.totalTokens).toBe(120);
  });

  it('supports responseTokenCount and tool-use prompt buckets from newer SDK responses', () => {
    const result = calculateTokenStats(
      createUsageMetadata({
        promptTokenCount: 27,
        responseTokenCount: 45,
        thoughtsTokenCount: 31,
        toolUsePromptTokenCount: 10309,
        totalTokenCount: 10412,
      }),
    );

    expect(result).toEqual({
      promptTokens: 27,
      cachedPromptTokens: 0,
      uncachedPromptTokens: 27,
      completionTokens: 45,
      thoughtTokens: 31,
      toolUsePromptTokens: 10309,
      inputTokens: 10336,
      outputTokens: 76,
      totalTokens: 10412,
    });
  });

  it('does not infer completion from total when thought or tool-use buckets are present but response tokens are missing', () => {
    const result = calculateTokenStats(
      createUsageMetadata({
        promptTokenCount: 20,
        thoughtsTokenCount: 5,
        toolUsePromptTokenCount: 11,
        totalTokenCount: 100,
      }),
    );

    expect(result.completionTokens).toBe(0);
    expect(result.totalTokens).toBe(36);
  });
});

describe('adjustThinkingBudget', () => {
  it('clamps to max when budget exceeds range', () => {
    expect(
      resolveModelSwitchForTarget('gemini-2.5-flash-native-audio-preview-12-2025', { thinkingBudget: 50000 })
        .thinkingBudget,
    ).toBe(50000);
  });

  it('clamps Gemini Robotics-ER 1.6 budgets to the documented max', () => {
    expect(resolveModelSwitchForTarget('gemini-robotics-er-1.6-preview', { thinkingBudget: 50000 }).thinkingBudget).toBe(
      24576,
    );
  });

  it('clamps to min when budget is below range', () => {
    expect(resolveModelSwitchForTarget('gemini-3.1-pro-preview', { thinkingBudget: 10 }).thinkingBudget).toBe(128);
  });

  it('returns budget unchanged for unknown models', () => {
    expect(resolveModelSwitchForTarget('unknown-model', { thinkingBudget: 5000 }).thinkingBudget).toBe(5000);
  });

  it('converts auto (-1) to max for non-Gemini-3 models', () => {
    expect(
      resolveModelSwitchForTarget('gemini-2.5-flash-native-audio-preview-12-2025', { thinkingBudget: -1 })
        .thinkingBudget,
    ).toBe(-1);
  });

  it('keeps auto (-1) for Gemini Robotics-ER 1.6', () => {
    expect(resolveModelSwitchForTarget('gemini-robotics-er-1.6-preview', { thinkingBudget: -1 }).thinkingBudget).toBe(
      -1,
    );
  });

  it('keeps auto (-1) for Gemini 3 models', () => {
    expect(resolveModelSwitchForTarget('gemini-3-flash-preview', { thinkingBudget: -1 }).thinkingBudget).toBe(-1);
  });

  it('forces mandatory thinking models with 0 budget to -1 (G3)', () => {
    // gemini-3-flash-preview is G3 and mandatory
    expect(resolveModelSwitchForTarget('gemini-3-flash-preview', { thinkingBudget: 0 }).thinkingBudget).toBe(-1);
  });

  it('keeps valid budget within range', () => {
    expect(
      resolveModelSwitchForTarget('gemini-2.5-flash-native-audio-preview-12-2025', { thinkingBudget: 1000 })
        .thinkingBudget,
    ).toBe(1000);
  });
});

describe('resolveModelSwitchSettings', () => {
  it('caches the current model settings and restores clamped settings for the target model', () => {
    localStorage.setItem(
      'model_settings_cache',
      JSON.stringify({
        'gemini-3.1-pro-preview': {
          mediaResolution: MediaResolution.MEDIA_RESOLUTION_HIGH,
          thinkingBudget: 50000,
          thinkingLevel: 'MEDIUM',
        },
      }),
    );

    const result = resolveModelSwitchSettings({
      currentSettings: {
        modelId: 'gemini-2.5-flash',
        mediaResolution: MediaResolution.MEDIA_RESOLUTION_LOW,
        thinkingBudget: 2048,
        thinkingLevel: 'LOW',
      },
      sourceSettings: {
        mediaResolution: MediaResolution.MEDIA_RESOLUTION_MEDIUM,
        thinkingBudget: 4096,
        thinkingLevel: 'HIGH',
      },
      targetModelId: 'gemini-3.1-pro-preview',
    });

    expect(result).toEqual({
      modelId: 'gemini-3.1-pro-preview',
      mediaResolution: MediaResolution.MEDIA_RESOLUTION_HIGH,
      thinkingBudget: 32768,
      thinkingLevel: 'MEDIUM',
    });
    expect(useModelPreferencesStore.getState().modelSettingsCache).toEqual(
      expect.objectContaining({
        'gemini-2.5-flash': {
          mediaResolution: MediaResolution.MEDIA_RESOLUTION_LOW,
          thinkingBudget: 2048,
          thinkingLevel: 'LOW',
        },
      }),
    );
  });

  it('uses source settings and model-specific thinking defaults when no target cache exists', () => {
    const result = resolveModelSwitchSettings({
      currentSettings: {
        modelId: 'gemini-3-flash-preview',
        mediaResolution: undefined,
        thinkingBudget: 0,
        thinkingLevel: 'HIGH',
      },
      sourceSettings: {
        mediaResolution: undefined,
        thinkingBudget: 0,
        thinkingLevel: 'HIGH',
      },
      targetModelId: 'gemini-3.1-flash-image-preview',
    });

    expect(result).toEqual({
      modelId: 'gemini-3.1-flash-image-preview',
      mediaResolution: MediaResolution.MEDIA_RESOLUTION_UNSPECIFIED,
      thinkingBudget: 0,
      thinkingLevel: 'MINIMAL',
    });
  });
});
