import { getConfiguredApiClient } from '../baseApi';
import { logService } from "../../logService";
import { Part } from "@google/genai";

export const countTokensApi = async (apiKey: string, modelId: string, parts: Part[]): Promise<number> => {
    logService.info(`Counting tokens for model ${modelId}...`);
    try {
        const ai = await getConfiguredApiClient(apiKey);
        const response = await ai.models.countTokens({
            model: modelId,
            contents: [{ role: 'user', parts }]
        });
        return response.totalTokens || 0;
    } catch (error) {
        logService.error("Error counting tokens:", error);
        throw error;
    }
};
