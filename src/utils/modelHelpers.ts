import { ModelOption } from '../types';
import { GEMINI_3_RO_MODELS, STATIC_TTS_MODELS, STATIC_IMAGEN_MODELS, INITIAL_PINNED_MODELS, THINKING_BUDGET_RANGES, MODELS_MANDATORY_THINKING } from '../constants/appConstants';
import { MediaResolution } from '../types/settings';
import { UsageMetadata } from '@google/genai';
import {
    getModelDescriptor,
    getModelDisplayName,
    getModelSortWeight,
    getThinkingBudgetRange,
    type ThinkingLevel,
} from '../platform/genai/modelCatalog';

// --- Model Sorting & Defaults ---

export const isLiveAudioModel = (modelId: string): boolean => {
    if (!modelId) return false;
    const lowerId = modelId.toLowerCase();
    return lowerId.includes('native-audio') || lowerId.includes('flash-live-preview') || lowerId.includes('gemini-live');
};

export const sortModels = (models: ModelOption[]): ModelOption[] => {
    const getCategoryWeight = (id: string) => {
        const lower = id.toLowerCase();
        if (lower.includes('tts')) return 5;
        if (lower.includes('imagen')) return 4;
        if (lower.includes('image')) return 3;
        if (isLiveAudioModel(id)) return 2;
        return 1;
    };

    return [...models].sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        
        if (a.isPinned && b.isPinned) {
            const weightA = getModelSortWeight(a.id);
            const weightB = getModelSortWeight(b.id);
            if (weightA !== weightB) return weightA - weightB;

            const isA3 = isGemini3Model(a.id);
            const isB3 = isGemini3Model(b.id);
            if (isA3 && !isB3) return -1;
            if (!isA3 && isB3) return 1;
        }

        return a.name.localeCompare(b.name);
    });
};

export const getDefaultModelOptions = (): ModelOption[] => {
    const pinnedInternalModels: ModelOption[] = INITIAL_PINNED_MODELS.map(id => {
        let name;
        if (id === 'gemini-2.5-flash-preview-09-2025') {
            name = 'Gemini 2.5 Flash';
        } else if (id === 'gemini-3.1-flash-live-preview') {
            name = 'Gemini 3.1 Flash Live';
        } else if (id === 'gemini-2.5-flash-native-audio-preview-12-2025') {
            name = 'Gemini 2.5 Flash Native Audio';
        } else if (id.toLowerCase().includes('gemma')) {
             // Beautify Gemma names: gemma-4-31b-it -> Gemma 4 31B IT
             name = id.replace(/-/g, ' ')
                      .replace(/\b\w/g, l => l.toUpperCase())
                      .replace(/\bIt\b/, 'IT')
                      .replace(/\bA4b\b/, 'A4B')
                      .replace(/(\d)B\b/g, '$1B'); // Ensure parameter B is uppercase
        } else {
             name = id.includes('/') 
                ? `Gemini ${id.split('/')[1]}`.replace('gemini-','').replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
                : `Gemini ${id.replace('gemini-','').replace(/-/g, ' ')}`.replace(/\b\w/g, l => l.toUpperCase());
        }
        return { id, name, isPinned: true };
    });
    return sortModels([...pinnedInternalModels, ...STATIC_TTS_MODELS, ...STATIC_IMAGEN_MODELS]);
};

// --- Helper for Model Capabilities ---
export const isGemini3Model = (modelId: string): boolean => {
    return getModelDescriptor(modelId)?.family === 'gemini-3';
};

// --- Model Settings Cache ---
const MODEL_SETTINGS_CACHE_KEY = 'model_settings_cache';

export interface CachedModelSettings {
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
        return { promptTokens: 0, completionTokens: 0, totalTokens: 0, thoughtTokens: 0 };
    }

    const usage = usageMetadata as UsageMetadata & {
        candidatesTokenCount?: number;
        thoughtsTokenCount?: number;
    };
    const totalTokens = usageMetadata.totalTokenCount || 0;
    const promptTokens = usageMetadata.promptTokenCount || 0;
    // SDK field names drifted; keep compatibility with older/newer shapes.
    const metadataWithCandidateCount = usageMetadata as UsageMetadata & { candidatesTokenCount?: number };
    let completionTokens = metadataWithCandidateCount.candidatesTokenCount || 0;
    
    if (!completionTokens && totalTokens > 0 && promptTokens > 0) {
        completionTokens = totalTokens - promptTokens;
    }

    const metadataWithThoughtCount = usageMetadata as UsageMetadata & { thoughtsTokenCount?: number };
    const thoughtTokens = metadataWithThoughtCount.thoughtsTokenCount || 0;

    return { promptTokens, completionTokens, totalTokens, thoughtTokens };
};

// --- Thinking Budget Logic Extraction ---
export const adjustThinkingBudget = (modelId: string, currentBudget: number): number => {
    const descriptor = getModelDescriptor(modelId);
    const range = getThinkingBudgetRange(modelId);
    let newBudget = currentBudget;

    if (range) {
        const isGemini3 = descriptor?.family === 'gemini-3';
        const isMandatory = descriptor?.mandatoryThinking ?? false;

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
