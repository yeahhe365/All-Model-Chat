
import { getConfiguredApiClient, getHttpOptionsForContents } from '../baseApi';
import { logService } from "../../logService";
import type { Part } from "@google/genai";

export const countTokensApi = async (apiKey: string, modelId: string, parts: Part[]): Promise<number> => {
    logService.info(`Counting tokens for model ${modelId}...`);
    try {
        // Sanitize parts to remove custom internal properties.
        // We MUST retain mediaResolution and videoMetadata as they significantly affect token counts
        // for Gemini 3.0 models (resolution) and video inputs (cropping).
        const sanitizedParts = parts.map(p => {
            const sanitized = { ...(p as Record<string, unknown>) };
            delete (sanitized as { thoughtSignature?: unknown }).thoughtSignature;
            return sanitized as Part;
        });
        const contents = [{ role: 'user', parts: sanitizedParts }];
        const ai = await getConfiguredApiClient(apiKey, getHttpOptionsForContents(contents));

        const response = await ai.models.countTokens({
            model: modelId,
            contents
        });
        return response.totalTokens || 0;
    } catch (error) {
        logService.error("Error counting tokens:", error);
        throw error;
    }
};
