import { getConfiguredApiClient } from '../baseApi';
import { logService } from "../../logService";

export const generateImagesApi = async (apiKey: string, modelId: string, prompt: string, aspectRatio: string, imageSize: string | undefined, abortSignal: AbortSignal): Promise<string[]> => {
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
        const config: any = { 
            numberOfImages: 1, 
            outputMimeType: 'image/png', 
            aspectRatio: aspectRatio 
        };

        if (imageSize) {
            config.imageSize = imageSize;
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

        const images = response.generatedImages?.map(img => img.image.imageBytes) ?? [];
        if (images.length === 0) {
            throw new Error("No images generated. The prompt may have been blocked or the model failed to respond.");
        }
        
        return images;

    } catch (error) {
        logService.error(`Failed to generate images with model ${modelId}:`, error);
        throw error;
    }
};
