import { create } from 'zustand';
import { getModelCapabilities } from '../utils/modelHelpers';

export type ModelCapabilities = ReturnType<typeof getModelCapabilities>;

interface ModelCapabilitiesState {
  capabilitiesByModelId: Record<string, ModelCapabilities>;
}

interface ModelCapabilitiesActions {
  getCapabilities: (modelId: string | null | undefined) => ModelCapabilities;
}

const getCapabilityCacheKey = (modelId: string | null | undefined): string => {
  const normalized = modelId?.trim();
  return normalized || '__empty__';
};

export const useModelCapabilitiesStore = create<ModelCapabilitiesState & ModelCapabilitiesActions>((set, get) => ({
  capabilitiesByModelId: {},

  getCapabilities: (modelId) => {
    const cacheKey = getCapabilityCacheKey(modelId);
    const cached = get().capabilitiesByModelId[cacheKey];

    if (cached) {
      return cached;
    }

    const capabilities = getModelCapabilities(modelId ?? '');
    set((state) => ({
      capabilitiesByModelId: {
        ...state.capabilitiesByModelId,
        [cacheKey]: capabilities,
      },
    }));

    return capabilities;
  },
}));

export const getCachedModelCapabilities = (modelId: string | null | undefined): ModelCapabilities =>
  useModelCapabilitiesStore.getState().getCapabilities(modelId);
