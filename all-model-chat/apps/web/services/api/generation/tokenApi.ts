
import { fetchBffJson } from '../bffApi';
import { logService } from "../../logService";
import { Part } from "@google/genai";
import type { CountTokensRequest, CountTokensResponse } from '@all-model-chat/shared-api';

export const countTokensApi = async (apiKey: string, modelId: string, parts: Part[]): Promise<number> => {
    void apiKey;
    logService.info(`Counting tokens for model ${modelId}...`);
    try {
        const requestPayload: CountTokensRequest = {
            model: modelId,
            parts,
        };
        const response = await fetchBffJson<CountTokensResponse>(
            '/api/generation/count-tokens',
            {
                method: 'POST',
                headers: {
                    'content-type': 'application/json',
                },
                body: JSON.stringify(requestPayload),
            }
        );
        return response.totalTokens || 0;
    } catch (error) {
        logService.error("Error counting tokens:", error);
        throw error;
    }
};
