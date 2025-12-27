import { useMemo } from 'react';
import { isGemini3Model } from '../utils/appUtils';

export const useModelCapabilities = (modelId: string) => {
    return useMemo(() => {
        const isGemini3ImageModel = modelId === 'gemini-3-pro-image-preview';
        const isFlashImageModel = modelId.includes('gemini-2.5-flash-image');
        const isRealImagen = modelId.includes('imagen');
        const isGemini3 = isGemini3Model(modelId);

        let supportedAspectRatios: string[] | undefined;

        if (isRealImagen) {
            supportedAspectRatios = ['1:1', '16:9', '9:16', '4:3', '3:4'];
        } else if (isGemini3ImageModel || isFlashImageModel) {
            supportedAspectRatios = ['Auto', '1:1', '16:9', '9:16', '4:3', '3:4', '3:2', '2:3', '4:5', '5:4', '21:9'];
        }

        let supportedImageSizes: string[] | undefined;
        if (isGemini3ImageModel) {
            supportedImageSizes = ['1K', '2K', '4K'];
        } else if (isRealImagen && !modelId.includes('fast')) {
            supportedImageSizes = ['1K', '2K'];
        }

        return {
            isImagenModel: isRealImagen || isFlashImageModel || isGemini3ImageModel,
            isGemini3ImageModel,
            isGemini3,
            supportedAspectRatios,
            supportedImageSizes
        };
    }, [modelId]);
};
