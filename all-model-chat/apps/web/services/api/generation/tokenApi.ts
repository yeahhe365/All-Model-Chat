
import { fetchBffJson } from '../bffApi';
import { logService } from "../../logService";
import { Part } from "@google/genai";

export const countTokensApi = async (apiKey: string, modelId: string, parts: Part[]): Promise<number> => {
    void apiKey;
    logService.info(`Counting tokens for model ${modelId}...`);
    try {
        const response = await fetchBffJson<{ totalTokens: number }>(
            '/api/generation/count-tokens',
            {
                method: 'POST',
                headers: {
                    'content-type': 'application/json',
                },
                body: JSON.stringify({
                    model: modelId,
                    parts,
                }),
            }
        );
        return response.totalTokens || 0;
    } catch (error) {
        logService.error("Error counting tokens:", error);
        throw error;
    }
};
