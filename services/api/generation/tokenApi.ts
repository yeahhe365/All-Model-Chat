
import { getConfiguredApiClient } from '../baseApi';
import { logService } from "../../logService";
import { Part } from "@google/genai";

export const countTokensApi = async (apiKey: string, modelId: string, parts: Part[]): Promise<number> => {
    logService.info(`Counting tokens for model ${modelId}...`);
    try {
        const ai = await getConfiguredApiClient(apiKey);
        
        // Sanitize parts to remove custom internal properties.
        // We MUST retain mediaResolution and videoMetadata as they significantly affect token counts
        // for Gemini 3.0 models (resolution) and video inputs (cropping).
        const sanitizedParts = parts.map(p => {
            // Create a shallow copy to avoid mutating the original array elements
            // Only exclude internal app fields like thoughtSignature
            const { thoughtSignature, ...rest } = p as any;
            return rest as Part;
        });

        const response = await ai.models.countTokens({
            model: modelId,
            contents: [{ role: 'user', parts: sanitizedParts }]
        });
        return response.totalTokens || 0;
    } catch (error) {
        logService.error("Error counting tokens:", error);
        throw error;
    }
};
