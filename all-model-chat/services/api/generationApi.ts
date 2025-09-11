import { getApiClient } from './baseApi';
import { Part, GenerateContentResponse, Type } from "@google/genai";
import { logService } from "../logService";
import { fileToBase64 } from "../../utils/appUtils";
import { dbService } from '../../utils/db';

export const generateImagesApi = async (apiKey: string, modelId: string, prompt: string, aspectRatio: string, abortSignal: AbortSignal): Promise<string[]> => {
    logService.info(`Generating image with model ${modelId}`, { prompt, aspectRatio });
    // Get proxy URL from localStorage if available
    const storedSettings = await dbService.getAppSettings();
    const apiProxyUrl = storedSettings ? storedSettings.apiProxyUrl : null;
    const ai = getApiClient(apiKey, apiProxyUrl);
    if (!prompt.trim()) {
        throw new Error("Image generation prompt cannot be empty.");
    }

    if (abortSignal.aborted) {
        const abortError = new Error("Image generation cancelled by user before starting.");
        abortError.name = "AbortError";
        throw abortError;
    }

    try {
        const response = await ai.models.generateImages({
            model: modelId,
            prompt: prompt,
            config: { numberOfImages: 1, outputMimeType: 'image/jpeg', aspectRatio: aspectRatio },
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

export const generateSpeechApi = async (apiKey: string, modelId: string, text: string, voice: string, abortSignal: AbortSignal): Promise<string> => {
    logService.info(`Generating speech with model ${modelId}`, { textLength: text.length, voice });
    // Get proxy URL from localStorage if available
    const storedSettings = await dbService.getAppSettings();
    const apiProxyUrl = storedSettings ? storedSettings.apiProxyUrl : null;
    const ai = getApiClient(apiKey, apiProxyUrl);
    if (!text.trim()) {
        throw new Error("TTS input text cannot be empty.");
    }

    try {
        const response = await ai.models.generateContent({
            model: modelId,
            contents: text,
            config: {
                responseModalities: ['AUDIO'],
                speechConfig: {
                    voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } },
                },
            },
        });

        if (abortSignal.aborted) {
            const abortError = new Error("Speech generation cancelled by user.");
            abortError.name = "AbortError";
            throw abortError;
        }

        const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

        if (typeof audioData === 'string' && audioData.length > 0) {
            return audioData;
        }
        
        logService.error("TTS response did not contain expected audio data structure:", { response });

        const textError = response.text;
        if (textError) {
            throw new Error(`TTS generation failed: ${textError}`);
        }

        throw new Error('No audio data found in TTS response.');

    } catch (error) {
        logService.error(`Failed to generate speech with model ${modelId}:`, error);
        throw error;
    }
};

export const transcribeAudioApi = async (apiKey: string, audioFile: File, modelId: string, options: { isThinkingEnabled: boolean }): Promise<string> => {
    const { isThinkingEnabled } = options;
    logService.info(`Transcribing audio with model ${modelId}`, { fileName: audioFile.name, size: audioFile.size, thinking: isThinkingEnabled });
    // Get proxy URL from localStorage if available
    const storedSettings = await dbService.getAppSettings();
    const apiProxyUrl = storedSettings ? storedSettings.apiProxyUrl : null;
    const ai = getApiClient(apiKey, apiProxyUrl);

    const audioBase64 = await fileToBase64(audioFile);

    const audioPart: Part = {
        inlineData: {
            mimeType: audioFile.type,
            data: audioBase64,
        },
    };

    const textPart: Part = {
        text: "Transcribe this audio to text. Only return the transcribed text, do not answer questions in the audio.",
    };
    
    const config = {
      systemInstruction: "You are a helpful assistant that transcribes the provided audio file verbatim, without any omissions or modifications.",
      thinkingConfig: {
        thinkingBudget: isThinkingEnabled ? -1 : 0,
      },
    };

    try {
        const response = await ai.models.generateContent({
            model: modelId,
            contents: { parts: [textPart, audioPart] },
            config,
        });

        if (response.text) {
            return response.text;
        } else {
            const safetyFeedback = response.candidates?.[0]?.finishReason;
            if (safetyFeedback && safetyFeedback !== 'STOP') {
                 throw new Error(`Transcription failed due to safety settings: ${safetyFeedback}`);
            }
            throw new Error("Transcription failed. The model returned an empty response.");
        }
    } catch (error) {
        logService.error("Error during audio transcription:", error);
        throw error;
    }
};

export const translateTextApi = async (apiKey: string, text: string): Promise<string> => {
    logService.info(`Translating text...`);
    // Get proxy URL from localStorage if available
    const storedSettings = await dbService.getAppSettings();
    const apiProxyUrl = storedSettings ? storedSettings.apiProxyUrl : null;
    const ai = getApiClient(apiKey, apiProxyUrl);
    const prompt = `Translate the following text to English. Only return the translated text, without any additional explanation or formatting.\n\nText to translate:\n"""\n${text}\n"""`;

    try {
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
    // Get proxy URL from localStorage if available
    const storedSettings = await dbService.getAppSettings();
    const apiProxyUrl = storedSettings ? storedSettings.apiProxyUrl : null;
    const ai = getApiClient(apiKey, apiProxyUrl);
    const prompt = language === 'zh'
        ? `基于以下最近的对话交流，为用户生成三条可以发送给语言模型的建议回复。这些回复应该是简短、相关且多样化的，旨在继续对话。\n\n用户: "${userContent}"\n助手: "${modelContent}"`
        : `Based on the last conversation turn below, generate three short, relevant, and diverse suggested replies or follow-up questions that a user might click to continue the conversation.\n\nUSER: "${userContent}"\nASSISTANT: "${modelContent}"`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
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
            const fallbackPrompt = `${prompt}\n\nReturn the three suggestions as a numbered list, one per line. Do not include any other text or formatting.`;
             const fallbackResponse = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
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
    // Get proxy URL from localStorage if available
    const storedSettings = await dbService.getAppSettings();
    const apiProxyUrl = storedSettings ? storedSettings.apiProxyUrl : null;
    const ai = getApiClient(apiKey, apiProxyUrl);
    const prompt = language === 'zh'
        ? `根据以下对话，创建一个非常简短、简洁的标题（最多4-6个词）。不要使用引号或任何其他格式。只返回标题的文本。\n\n用户: "${userContent}"\n助手: "${modelContent}"\n\n标题:`
        : `Based on this conversation, create a very short, concise title (4-6 words max). Do not use quotes or any other formatting. Just return the text of the title.\n\nUSER: "${userContent}"\nASSISTANT: "${modelContent}"\n\nTITLE:`;

    try {
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