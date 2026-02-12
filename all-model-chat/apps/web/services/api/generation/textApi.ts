import type {
    SuggestionsRequest,
    SuggestionsResponse,
    TitleRequest,
    TitleResponse,
    TranslateRequest,
    TranslateResponse,
} from '@all-model-chat/shared-api';
import { fetchBffJson } from '../bffApi';
import { logService } from "../../logService";

export const translateTextApi = async (apiKey: string, text: string, targetLanguage: string = 'English'): Promise<string> => {
    void apiKey;
    logService.info(`Translating text to ${targetLanguage}...`);

    try {
        const requestPayload: TranslateRequest = {
            text,
            targetLanguage,
        };
        const response = await fetchBffJson<TranslateResponse>(
            '/api/generation/translate',
            {
                method: 'POST',
                headers: {
                    'content-type': 'application/json',
                },
                body: JSON.stringify(requestPayload),
            }
        );

        if (response.text) {
            return response.text;
        } else {
            throw new Error("Translation failed. The model returned an empty response.");
        }
    } catch (error) {
        logService.error("Error during text translation:", error);
        throw error;
    }
};

export const generateSuggestionsApi = async (apiKey: string, userContent: string, modelContent: string, language: 'en' | 'zh'): Promise<string[]> => {
    void apiKey;
    logService.info(`Generating suggestions in ${language}...`);

    try {
        const requestPayload: SuggestionsRequest = {
            userContent,
            modelContent,
            language,
        };
        const response = await fetchBffJson<SuggestionsResponse>(
            '/api/generation/suggestions',
            {
                method: 'POST',
                headers: {
                    'content-type': 'application/json',
                },
                body: JSON.stringify(requestPayload),
            }
        );

        return (response.suggestions || []).slice(0, 3);
    } catch (error) {
        logService.error("Error during suggestions generation:", error);
        return []; // Return empty array on failure
    }
};

export const generateTitleApi = async (apiKey: string, userContent: string, modelContent: string, language: 'en' | 'zh'): Promise<string> => {
    void apiKey;
    logService.info(`Generating title in ${language}...`);

    try {
        const requestPayload: TitleRequest = {
            userContent,
            modelContent,
            language,
        };
        const response = await fetchBffJson<TitleResponse>(
            '/api/generation/title',
            {
                method: 'POST',
                headers: {
                    'content-type': 'application/json',
                },
                body: JSON.stringify(requestPayload),
            }
        );

        if (response.title) {
            return response.title;
        } else {
            throw new Error("Title generation failed. The model returned an empty response.");
        }
    } catch (error) {
        logService.error("Error during title generation:", error);
        throw error;
    }
};
