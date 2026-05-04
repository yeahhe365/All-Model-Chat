import { ModelOption } from '../types';
import {
  GEMINI_3_RO_MODELS,
  THINKING_BUDGET_RANGES,
  MODELS_MANDATORY_THINKING,
  MODELS_SUPPORTING_RAW_MODE,
} from '../constants/appConstants';
import { MediaResolution } from '../types/settings';
import type { UsageMetadata } from '@google/genai';

// --- Model Sorting & Defaults ---

export const sanitizeModelOptions = (models: ModelOption[]): ModelOption[] => {
  const seenIds = new Set<string>();

  return models.reduce<ModelOption[]>((sanitized, model) => {
    const normalizedId = model.id.trim();

    if (!normalizedId || seenIds.has(normalizedId)) {
      return sanitized;
    }

    seenIds.add(normalizedId);
    sanitized.push({
      ...model,
      id: normalizedId,
      name: model.name.trim() || normalizedId,
    });

    return sanitized;
  }, []);
};

export const resolveSupportedModelId = (modelId: string | null | undefined, fallback: string): string =>
  modelId || fallback;

const isNativeAudioModel = (modelId: string): boolean => {
  const lowerId = modelId.toLowerCase();
  return lowerId.includes('native-audio') || lowerId.includes('-live-');
};

const isGemini31FlashLiveModel = (modelId: string): boolean => modelId.toLowerCase().includes('gemini-3.1-flash-live');

const isGemini31FlashImageModel = (modelId: string): boolean =>
  modelId.toLowerCase().includes('gemini-3.1-flash-image');

export const isGemmaModel = (modelId: string): boolean => !!modelId && modelId.toLowerCase().includes('gemma');

export const isGeminiRoboticsModel = (modelId: string): boolean =>
  !!modelId && modelId.toLowerCase().includes('gemini-robotics-er');

const isTtsModel = (modelId: string): boolean => modelId.toLowerCase().includes('tts');

const supportsThinkingLevel = (modelId: string): boolean =>
  !isTtsModel(modelId) && (isGemini3Model(modelId) || isGeminiRoboticsModel(modelId));

const isGemini3ImageModel = (modelId: string): boolean =>
  modelId === 'gemini-3-pro-image-preview' || modelId === 'gemini-3.1-flash-image-preview';

const isFlashImageModel = (modelId: string): boolean => modelId.toLowerCase().includes('gemini-2.5-flash-image');

const isRealImagenModel = (modelId: string): boolean => modelId.toLowerCase().includes('imagen');

export const isImageModel = (modelId: string): boolean =>
  isRealImagenModel(modelId) ||
  isFlashImageModel(modelId) ||
  isGemini3ImageModel(modelId) ||
  (modelId.toLowerCase().includes('image') && !modelId.toLowerCase().includes('imagen'));

export const sortModels = (models: ModelOption[]): ModelOption[] => {
  const pinnedPriorityOrder: Record<string, number> = {
    'gemini-3.1-pro-preview': 0,
    'gemini-3-flash-preview': 1,
    'gemini-3.1-flash-lite-preview': 2,
  };

  const getCategoryWeight = (id: string) => {
    if (isTtsModel(id)) return 3;
    if (isRealImagenModel(id)) return 5;
    if (isImageModel(id)) return 4;
    if (isNativeAudioModel(id)) return 2;
    return 1;
  };

  return [...models].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;

    if (a.isPinned && b.isPinned) {
      const weightA = getCategoryWeight(a.id);
      const weightB = getCategoryWeight(b.id);
      if (weightA !== weightB) return weightA - weightB;

      const pinnedPriorityA = pinnedPriorityOrder[a.id];
      const pinnedPriorityB = pinnedPriorityOrder[b.id];
      if (pinnedPriorityA !== undefined || pinnedPriorityB !== undefined) {
        if (pinnedPriorityA === undefined) return 1;
        if (pinnedPriorityB === undefined) return -1;
        if (pinnedPriorityA !== pinnedPriorityB) return pinnedPriorityA - pinnedPriorityB;
      }

      const isA3 = a.id.includes('gemini-3');
      const isB3 = b.id.includes('gemini-3');
      if (isA3 && !isB3) return -1;
      if (!isA3 && isB3) return 1;
    }

    return a.name.localeCompare(b.name);
  });
};

// --- Helper for Model Capabilities ---
export const isGemini3Model = (modelId: string): boolean => {
  if (!modelId) return false;
  const lowerId = modelId.toLowerCase();
  return (
    GEMINI_3_RO_MODELS.some((m) => lowerId.includes(m)) ||
    lowerId.includes('gemini-3-pro') ||
    lowerId.includes('gemini-3.1-flash')
  );
};

interface ModelInteractionPermissions {
  canAcceptAttachments: boolean;
  canUseTools: boolean;
  canUseGoogleSearch: boolean;
  canUseDeepSearch: boolean;
  canUseCodeExecution: boolean;
  canUseLocalPython: boolean;
  canUseUrlContext: boolean;
  canUseTokenCount: boolean;
  canUseYouTubeUrl: boolean;
  canGenerateSuggestions: boolean;
  canUseVoiceInput: boolean;
  canUseLiveControls: boolean;
  requiresTextPrompt: boolean;
}

export const getModelCapabilities = (modelId: string) => {
  const isGemini3 = isGemini3Model(modelId);
  const supportsThinkingLevelSelection = supportsThinkingLevel(modelId);
  const gemini3ImageModel = isGemini3ImageModel(modelId);
  const flashImageModel = isFlashImageModel(modelId);
  const realImagenModel = isRealImagenModel(modelId);
  const ttsModel = isTtsModel(modelId);
  const nativeAudioModel = isNativeAudioModel(modelId);
  const imageModel = realImagenModel || flashImageModel || gemini3ImageModel;
  const canUseTextChatTools = !nativeAudioModel && !imageModel && !ttsModel;
  const canUseBuiltInCustomToolCombination = isGemini3;
  const permissions: ModelInteractionPermissions = {
    canAcceptAttachments: !realImagenModel && !ttsModel && !nativeAudioModel,
    canUseTools: canUseTextChatTools || nativeAudioModel || gemini3ImageModel || imageModel,
    canUseGoogleSearch: canUseTextChatTools || nativeAudioModel || gemini3ImageModel,
    canUseDeepSearch: canUseTextChatTools,
    canUseCodeExecution: canUseTextChatTools && !isGemmaModel(modelId),
    canUseLocalPython: canUseTextChatTools || nativeAudioModel,
    canUseUrlContext: canUseTextChatTools && !isGemmaModel(modelId),
    canUseTokenCount: !nativeAudioModel,
    canUseYouTubeUrl: canUseTextChatTools,
    canGenerateSuggestions: canUseTextChatTools,
    canUseVoiceInput: !nativeAudioModel && !imageModel && !ttsModel,
    canUseLiveControls: nativeAudioModel,
    requiresTextPrompt: ttsModel || imageModel,
  };

  let supportedAspectRatios: string[] | undefined;
  if (realImagenModel) {
    supportedAspectRatios = ['1:1', '16:9', '9:16', '4:3', '3:4'];
  } else if (isGemini31FlashImageModel(modelId)) {
    supportedAspectRatios = [
      'Auto',
      '1:1',
      '1:4',
      '1:8',
      '16:9',
      '9:16',
      '4:1',
      '4:3',
      '3:4',
      '3:2',
      '2:3',
      '4:5',
      '5:4',
      '8:1',
      '21:9',
    ];
  } else if (gemini3ImageModel || flashImageModel) {
    supportedAspectRatios = ['Auto', '1:1', '16:9', '9:16', '4:3', '3:4', '3:2', '2:3', '4:5', '5:4', '21:9'];
  }

  let supportedImageSizes: string[] | undefined;
  if (isGemini31FlashImageModel(modelId)) {
    supportedImageSizes = ['512', '1K', '2K', '4K'];
  } else if (gemini3ImageModel) {
    supportedImageSizes = ['1K', '2K', '4K'];
  } else if (realImagenModel && !modelId.toLowerCase().includes('fast')) {
    supportedImageSizes = ['1K', '2K'];
  }

  return {
    isGemini3,
    supportsRawReasoningPrefill: MODELS_SUPPORTING_RAW_MODE.some((model) => modelId.includes(model)),
    supportsThinkingLevel: supportsThinkingLevelSelection,
    isGemmaModel: isGemmaModel(modelId),
    isGemini3ImageModel: gemini3ImageModel,
    isFlashImageModel: flashImageModel,
    isRealImagenModel: realImagenModel,
    isImagenModel: imageModel,
    isTtsModel: ttsModel,
    isNativeAudioModel: nativeAudioModel,
    supportsBuiltInCustomToolCombination: canUseBuiltInCustomToolCombination,
    permissions,
    supportedAspectRatios,
    supportedImageSizes,
  };
};

export const normalizeAspectRatioForModel = (modelId: string, aspectRatio?: string): string | undefined => {
  const supportedAspectRatios = getModelCapabilities(modelId).supportedAspectRatios;

  if (!supportedAspectRatios || supportedAspectRatios.length === 0) {
    return aspectRatio;
  }

  if (aspectRatio && supportedAspectRatios.includes(aspectRatio)) {
    return aspectRatio;
  }

  return supportedAspectRatios[0];
};

export const normalizeImageSizeForModel = (modelId: string, imageSize?: string): string | undefined => {
  const supportedImageSizes = getModelCapabilities(modelId).supportedImageSizes;

  if (!supportedImageSizes || supportedImageSizes.length === 0) {
    return undefined;
  }

  if (imageSize && supportedImageSizes.includes(imageSize)) {
    return imageSize;
  }

  return supportedImageSizes[0];
};

export const getDefaultThinkingLevelForModel = (
  modelId: string,
  fallback: 'MINIMAL' | 'LOW' | 'MEDIUM' | 'HIGH' = 'HIGH',
): 'MINIMAL' | 'LOW' | 'MEDIUM' | 'HIGH' => {
  if (isGemini31FlashLiveModel(modelId) || isGemini31FlashImageModel(modelId)) {
    return 'MINIMAL';
  }

  return fallback;
};

export const shouldStripThinkingFromContext = (modelId: string, hideThinkingInContext?: boolean): boolean => {
  if (hideThinkingInContext) {
    return true;
  }

  return isGemmaModel(modelId);
};

// --- Model Settings Cache ---
const MODEL_SETTINGS_CACHE_KEY = 'model_settings_cache';

interface CachedModelSettings {
  mediaResolution?: MediaResolution;
  thinkingBudget?: number;
  thinkingLevel?: 'MINIMAL' | 'LOW' | 'MEDIUM' | 'HIGH';
}

export const getCachedModelSettings = (modelId: string): CachedModelSettings | undefined => {
  try {
    const cache = JSON.parse(localStorage.getItem(MODEL_SETTINGS_CACHE_KEY) || '{}');
    return cache[modelId];
  } catch {
    return undefined;
  }
};

export const cacheModelSettings = (modelId: string, settings: CachedModelSettings) => {
  if (!modelId) return;
  try {
    const cache = JSON.parse(localStorage.getItem(MODEL_SETTINGS_CACHE_KEY) || '{}');
    cache[modelId] = { ...cache[modelId], ...settings };
    localStorage.setItem(MODEL_SETTINGS_CACHE_KEY, JSON.stringify(cache));
  } catch (e) {
    console.error('Failed to cache model settings', e);
  }
};

// --- Token Logic Extraction ---
export const calculateTokenStats = (usageMetadata?: UsageMetadata) => {
  if (!usageMetadata) {
    return {
      promptTokens: 0,
      cachedPromptTokens: 0,
      uncachedPromptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      thoughtTokens: 0,
      toolUsePromptTokens: 0,
      inputTokens: 0,
      outputTokens: 0,
    };
  }

  const promptTokens = usageMetadata.promptTokenCount || 0;
  const usageWithCachedCount = usageMetadata as UsageMetadata & { cachedContentTokenCount?: number };
  const cachedPromptTokens = usageWithCachedCount.cachedContentTokenCount || 0;
  const uncachedPromptTokens = Math.max(promptTokens - cachedPromptTokens, 0);
  const usageWithThoughtCount = usageMetadata as UsageMetadata & { thoughtsTokenCount?: number };
  const thoughtTokens = usageWithThoughtCount.thoughtsTokenCount || 0;
  const usageWithToolUseCount = usageMetadata as UsageMetadata & { toolUsePromptTokenCount?: number };
  const toolUsePromptTokens = usageWithToolUseCount.toolUsePromptTokenCount || 0;
  const usageWithResponseCount = usageMetadata as UsageMetadata & {
    candidatesTokenCount?: number;
    responseTokenCount?: number;
  };
  let completionTokens = usageWithResponseCount.responseTokenCount || usageWithResponseCount.candidatesTokenCount || 0;

  if (!completionTokens && !thoughtTokens && !toolUsePromptTokens) {
    const totalTokenCount = usageMetadata.totalTokenCount || 0;
    if (totalTokenCount > 0 && promptTokens > 0) {
      completionTokens = Math.max(totalTokenCount - promptTokens, 0);
    }
  }

  const inputTokens = uncachedPromptTokens + toolUsePromptTokens;
  const outputTokens = completionTokens + thoughtTokens;
  const totalTokens = inputTokens + cachedPromptTokens + outputTokens || usageMetadata.totalTokenCount || 0;

  return {
    promptTokens,
    cachedPromptTokens,
    uncachedPromptTokens,
    completionTokens,
    totalTokens,
    thoughtTokens,
    toolUsePromptTokens,
    inputTokens,
    outputTokens,
  };
};

// --- Thinking Budget Logic Extraction ---
export const adjustThinkingBudget = (modelId: string, currentBudget: number): number => {
  const range = THINKING_BUDGET_RANGES[modelId];
  let newBudget = currentBudget;

  if (range) {
    const isGemini3 = isGemini3Model(modelId);
    const isMandatory = MODELS_MANDATORY_THINKING.includes(modelId);

    // Case A: Mandatory Thinking Check
    if (isMandatory && newBudget === 0) {
      newBudget = isGemini3 ? -1 : range.max;
    }

    // Case B: Range Clamping for concrete budgets
    if (newBudget > 0) {
      if (newBudget > range.max) newBudget = range.max;
      if (newBudget < range.min) newBudget = range.min;
    }
  }
  return newBudget;
};
