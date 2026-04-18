
import { ModelOption } from '../types';
import { GEMINI_3_RO_MODELS, THINKING_BUDGET_RANGES, MODELS_MANDATORY_THINKING } from '../constants/appConstants';
import { MediaResolution } from '../types/settings';
import type { UsageMetadata } from '@google/genai';

// --- Model Sorting & Defaults ---

const REMOVED_MODEL_IDS = [
    'gemini-2.5-flash-preview-09-2025',
    'gemini-2.5-flash-lite-preview-09-2025',
] as const;

const isRemovedModelId = (modelId: string | null | undefined): boolean =>
    !!modelId && REMOVED_MODEL_IDS.includes(modelId as (typeof REMOVED_MODEL_IDS)[number]);

export const sanitizeModelOptions = (models: ModelOption[]): ModelOption[] =>
    models.filter((model) => !isRemovedModelId(model.id));

export const resolveSupportedModelId = (modelId: string | null | undefined, fallback: string): string =>
    isRemovedModelId(modelId) ? fallback : (modelId || fallback);

const isNativeAudioModel = (modelId: string): boolean => {
    const lowerId = modelId.toLowerCase();
    return lowerId.includes('native-audio') || lowerId.includes('-live-');
};

const isGemini31FlashLiveModel = (modelId: string): boolean =>
    modelId.toLowerCase().includes('gemini-3.1-flash-live');

const isGemini31FlashImageModel = (modelId: string): boolean =>
    modelId.toLowerCase().includes('gemini-3.1-flash-image');

const isTtsModel = (modelId: string): boolean => modelId.toLowerCase().includes('tts');

const isGemini3ImageModel = (modelId: string): boolean => (
    modelId === 'gemini-3-pro-image-preview' || modelId === 'gemini-3.1-flash-image-preview'
);

const isFlashImageModel = (modelId: string): boolean => modelId.toLowerCase().includes('gemini-2.5-flash-image');

const isRealImagenModel = (modelId: string): boolean => modelId.toLowerCase().includes('imagen');

export const isImageModel = (modelId: string): boolean => (
    isRealImagenModel(modelId)
    || isFlashImageModel(modelId)
    || isGemini3ImageModel(modelId)
    || (modelId.toLowerCase().includes('image') && !modelId.toLowerCase().includes('imagen'))
);

export const sortModels = (models: ModelOption[]): ModelOption[] => {
    const getCategoryWeight = (id: string) => {
        if (isTtsModel(id)) return 5;
        if (isRealImagenModel(id)) return 4;
        if (isImageModel(id)) return 3;
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
    return GEMINI_3_RO_MODELS.some(m => lowerId.includes(m)) || lowerId.includes('gemini-3-pro') || lowerId.includes('gemini-3.1-flash');
};

export const getModelCapabilities = (modelId: string) => {
    const isGemini3 = isGemini3Model(modelId);
    const gemini3ImageModel = isGemini3ImageModel(modelId);
    const flashImageModel = isFlashImageModel(modelId);
    const realImagenModel = isRealImagenModel(modelId);
    const ttsModel = isTtsModel(modelId);
    const nativeAudioModel = isNativeAudioModel(modelId);
    const imageModel = realImagenModel || flashImageModel || gemini3ImageModel;

    let supportedAspectRatios: string[] | undefined;
    if (realImagenModel) {
        supportedAspectRatios = ['1:1', '16:9', '9:16', '4:3', '3:4'];
    } else if (isGemini31FlashImageModel(modelId)) {
        supportedAspectRatios = ['Auto', '1:1', '1:4', '1:8', '16:9', '9:16', '4:1', '4:3', '3:4', '3:2', '2:3', '4:5', '5:4', '8:1', '21:9'];
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
        isGemini3ImageModel: gemini3ImageModel,
        isFlashImageModel: flashImageModel,
        isRealImagenModel: realImagenModel,
        isImagenModel: imageModel,
        isTtsModel: ttsModel,
        isNativeAudioModel: nativeAudioModel,
        supportedAspectRatios,
        supportedImageSizes,
    };
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
        console.error("Failed to cache model settings", e);
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
    let completionTokens = usageWithResponseCount.responseTokenCount
        || usageWithResponseCount.candidatesTokenCount
        || 0;

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
        const isGemini3 = modelId.includes('gemini-3');
        const isMandatory = MODELS_MANDATORY_THINKING.includes(modelId);

        // Case A: Mandatory Thinking Check
        if (isMandatory && newBudget === 0) {
            newBudget = isGemini3 ? -1 : range.max;
        }

        // Case B: Auto (-1) Compatibility for non-G3 models
        if (!isGemini3 && newBudget === -1) {
            newBudget = range.max;
        }

        // Case C: Range Clamping for concrete budgets
        if (newBudget > 0) {
            if (newBudget > range.max) newBudget = range.max;
            if (newBudget < range.min) newBudget = range.min;
        }
    }
    return newBudget;
};
