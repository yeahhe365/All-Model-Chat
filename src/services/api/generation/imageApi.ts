import type { GenerateImagesConfig } from '@google/genai';
import type { GenerateImagesRequestOptions } from '../../../types';
import { getConfiguredApiClient } from '../baseApi';
import { logService } from "../../logService";
import { buildExactImageGenerationPricing } from '../../../utils/usagePricingTelemetry';
import { normalizeAspectRatioForModel, normalizeImageSizeForModel } from '../../../utils/modelHelpers';

export const generateImagesApi = async (
    apiKey: string,
    modelId: string,
    prompt: string,
    aspectRatio: string,
    imageSize: string | undefined,
    abortSignal: AbortSignal,
    options: GenerateImagesRequestOptions = {},
): Promise<string[]> => {
    logService.info(`Generating image with model ${modelId}`, { prompt, aspectRatio, imageSize });
    
    if (!prompt.trim()) {
        throw new Error("Image generation prompt cannot be empty.");
    }

    if (abortSignal.aborted) {
        const abortError = new Error("Image generation cancelled by user before starting.");
        abortError.name = "AbortError";
        throw abortError;
    }

    try {
        const ai = await getConfiguredApiClient(apiKey);
        const normalizedAspectRatio = normalizeAspectRatioForModel(modelId, aspectRatio) || '1:1';
        const normalizedImageSize = normalizeImageSizeForModel(modelId, imageSize);
        const config: GenerateImagesConfig = { 
            abortSignal,
            numberOfImages: options.numberOfImages ?? 1, 
            outputMimeType: 'image/png', 
            aspectRatio: normalizedAspectRatio,
        };

        if (normalizedImageSize) {
            config.imageSize = normalizedImageSize;
        }

        if (options.personGeneration) {
            config.personGeneration = options.personGeneration as GenerateImagesConfig['personGeneration'];
        }

        const response = await ai.models.generateImages({
            model: modelId,
            prompt: prompt,
            config: config,
        });

        if (abortSignal.aborted) {
            const abortError = new Error("Image generation cancelled by user.");
            abortError.name = "AbortError";
            throw abortError;
        }

        const images = response.generatedImages
            ?.map(img => img.image?.imageBytes)
            .filter((imageBytes): imageBytes is string => typeof imageBytes === 'string' && imageBytes.length > 0) ?? [];
        if (images.length === 0) {
            throw new Error("No images generated. The prompt may have been blocked or the model failed to respond.");
        }

        logService.recordTokenUsage(
            modelId,
            {
                promptTokens: 0,
                completionTokens: 0,
                totalTokens: 0,
            },
            buildExactImageGenerationPricing(images.length),
        );
        
        return images;

    } catch (error) {
        logService.error(`Failed to generate images with model ${modelId}:`, error);
        throw error;
    }
};
