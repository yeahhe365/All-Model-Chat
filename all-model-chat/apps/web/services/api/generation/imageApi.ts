import { ChatHistoryItem, Part } from '@google/genai';
import type {
    EditImageRequest,
    EditImageResponse,
    ImageGenerationRequest,
    ImageGenerationResponse,
} from '@all-model-chat/shared-api';
import { fetchBffJson } from '../bffApi';
import { logService } from "../../logService";

export const generateImagesApi = async (apiKey: string, modelId: string, prompt: string, aspectRatio: string, imageSize: string | undefined, abortSignal: AbortSignal): Promise<string[]> => {
    void apiKey;
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
        const requestPayload: ImageGenerationRequest = {
            model: modelId,
            prompt,
            aspectRatio,
            imageSize,
        };

        const response = await fetchBffJson<ImageGenerationResponse>(
            '/api/generation/images',
            {
                method: 'POST',
                headers: {
                    'content-type': 'application/json',
                },
                body: JSON.stringify(requestPayload),
            },
            abortSignal
        );

        if (abortSignal.aborted) {
            const abortError = new Error("Image generation cancelled by user.");
            abortError.name = "AbortError";
            throw abortError;
        }

        const images = response.images || [];
        if (images.length === 0) {
            throw new Error("No images generated. The prompt may have been blocked or the model failed to respond.");
        }
        
        return images;

    } catch (error) {
        logService.error(`Failed to generate images with model ${modelId}:`, error);
        throw error;
    }
};

export const editImageApi = async (
    apiKey: string,
    modelId: string,
    history: ChatHistoryItem[],
    parts: Part[],
    abortSignal: AbortSignal,
    aspectRatio?: string,
    imageSize?: string
): Promise<Part[]> => {
    void apiKey;

    const requestPayload: EditImageRequest = {
        model: modelId,
        history,
        parts,
        aspectRatio,
        imageSize,
    };

    const response = await fetchBffJson<EditImageResponse>(
        '/api/generation/edit-image',
        {
            method: 'POST',
            headers: {
                'content-type': 'application/json',
            },
            body: JSON.stringify(requestPayload),
        },
        abortSignal
    );

    return response.parts || [];
};
