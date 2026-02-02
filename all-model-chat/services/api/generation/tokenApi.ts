
import { getConfiguredApiClient } from '../baseApi';
import { logService } from "../../logService";
import { Part } from "@google/genai";

export const countTokensApi = async (apiKey: string, modelId: string, parts: Part[]): Promise<number> => {
    logService.info(`Counting tokens for model ${modelId}...`);
    try {
        const ai = await getConfiguredApiClient(apiKey);
        
        // Sanitize parts to remove custom properties that might cause API errors in countTokens.
        // Properties like mediaResolution, videoMetadata, or thoughtSignature might not be supported in the countTokens endpoint payload 
        // or strictly validated, causing 400 errors.
        const sanitizedParts = parts.map(p => {
            // Create a shallow copy to avoid mutating the original array elements
            // Explicitly exclude known custom extended fields
            const { mediaResolution, videoMetadata, thoughtSignature, ...rest } = p as any;
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
