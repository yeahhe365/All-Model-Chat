import { useMemo } from 'react';
import { getModelCapabilities } from '../platform/genai/modelCatalog';

export const useModelCapabilities = (modelId: string) => {
    return useMemo(() => getModelCapabilities(modelId), [modelId]);
};
