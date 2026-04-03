import { getConfiguredApiClient } from '../baseApi';
import { logService } from "../../logService";
import { Type } from "@google/genai";

export const translateTextApi = async (apiKey: string, text: string, targetLanguage: string = 'English'): Promise<string> => {
    logService.info(`Translating text to ${targetLanguage}...`);
    const prompt = `Translate the following text to ${targetLanguage}. Only return the translated text, without any additional explanation or formatting.\n\nText to translate:\n"""\n${text}\n"""`;

    try {
        const ai = await getConfiguredApiClient(apiKey);
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-lite',
            contents: prompt,
            config: {
                temperature: 0.1,
                topP: 0.95,
                thinkingConfig: { thinkingBudget: -1 },
            }
        });

        if (response.text) {
            return response.text.trim();
        } else {
            throw new Error("Translation failed. The model returned an empty response.");
        }
    } catch (error) {
        logService.error("Error during text translation:", error);
        throw error;
    }
};

export const generateSuggestionsApi = async (apiKey: string, userContent: string, modelContent: string, language: 'en' | 'zh'): Promise<string[]> => {
    logService.info(`Generating suggestions in ${language}...`);
    
    const prompt = language === 'zh'
        ? `作为对话专家，请基于以下上下文，预测用户接下来最可能发送的 3 条简短回复。

规则：
1. 如果助手最后在提问，建议必须是针对该问题的回答。
2. 建议应简练（20字以内），涵盖不同角度（如：追问细节、请求示例、或提出质疑）。
3. 语气自然，符合人类对话习惯。

对话上下文：
用户: "${userContent}"
助手: "${modelContent}"`
        : `As a conversation expert, predict the 3 most likely short follow-up messages the USER would send based on the context below.

Context:
USER: "${userContent}"
ASSISTANT: "${modelContent}"`;

    try {
        const ai = await getConfiguredApiClient(apiKey);
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-lite',
            contents: prompt,
            config: {
                thinkingConfig: { thinkingBudget: -1 }, // auto
                temperature: 0.8,
                topP: 0.95,
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        suggestions: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.STRING,
                                description: "A short, relevant suggested reply or follow-up question."
                            },
                            description: "An array of exactly three suggested replies."
                        }
                    }
                }
            }
        });

        const jsonStr = response.text.trim();
        const parsed = JSON.parse(jsonStr);
        if (parsed.suggestions && Array.isArray(parsed.suggestions) && parsed.suggestions.every((s: any) => typeof s === 'string')) {
            return parsed.suggestions.slice(0, 3); // Ensure only 3
        } else {
            throw new Error("Suggestions generation returned an invalid format.");
        }
    } catch (error) {
        logService.error("Error during suggestions generation:", error);
        // Fallback to a non-JSON approach in case the model struggles with the schema
        try {
            const ai = await getConfiguredApiClient(apiKey); // Re-get client
            const fallbackPrompt = `${prompt}\n\nReturn the three suggestions as a numbered list, one per line. Do not include any other text or formatting.`;
             const fallbackResponse = await ai.models.generateContent({
                model: 'gemini-2.5-flash-lite',
                contents: fallbackPrompt,
                config: {
                    thinkingConfig: { thinkingBudget: -1 },
                    temperature: 0.8,
                    topP: 0.95,
                }
            });
            if (fallbackResponse.text) {
                return fallbackResponse.text.trim().split('\n').map(s => s.replace(/^\d+\.\s*/, '').trim()).filter(Boolean).slice(0, 3);
            }
        } catch (fallbackError) {
             logService.error("Fallback suggestions generation also failed:", fallbackError);
        }
        return []; // Return empty array on failure
    }
};

export const generateTitleApi = async (apiKey: string, userContent: string, modelContent: string, language: 'en' | 'zh'): Promise<string> => {
    logService.info(`Generating title in ${language}...`);
    const prompt = language === 'zh'
        ? `根据以下对话，创建一个非常简短、简洁的标题（最多4-6个词）。不要使用引号或任何其他格式。只返回标题的文本。\n\n用户: "${userContent}"\n助手: "${modelContent}"\n\n标题:`
        : `Based on this conversation, create a very short, concise title (4-6 words max). Do not use quotes or any other formatting. Just return the text of the title.\n\nUSER: "${userContent}"\nASSISTANT: "${modelContent}"\n\nTITLE:`;

    try {
        const ai = await getConfiguredApiClient(apiKey);
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-lite',
            contents: prompt,
            config: {
                thinkingConfig: { thinkingBudget: -1 },
                temperature: 0.3,
                topP: 0.9,
            }
        });

        if (response.text) {
            // Clean up the title: remove quotes, trim whitespace
            let title = response.text.trim();
            if ((title.startsWith('"') && title.endsWith('"')) || (title.startsWith("'") && title.endsWith("'"))) {
                title = title.substring(1, title.length - 1);
            }
            return title;
        } else {
            throw new Error("Title generation failed. The model returned an empty response.");
        }
    } catch (error) {
        logService.error("Error during title generation:", error);
        throw error;
    }
};
