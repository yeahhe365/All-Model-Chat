import { getApiClient } from './baseApi';
import { Part } from "@google/genai";
import { logService } from "../logService";
import { fileToBase64 } from "../../utils/appUtils";

export const generateImagesApi = async (apiKey: string, modelId: string, prompt: string, aspectRatio: string, abortSignal: AbortSignal): Promise<string[]> => {
    logService.info(`Generating image with model ${modelId}`, { prompt, aspectRatio });
    const ai = getApiClient(apiKey);
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
    const ai = getApiClient(apiKey);
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

export const transcribeAudioApi = async (apiKey: string, audioFile: File, modelId: string, isThinkingEnabled: boolean): Promise<string> => {
    logService.info(`Transcribing audio with model ${modelId}`, { fileName: audioFile.name, size: audioFile.size, thinking: isThinkingEnabled });
    const ai = getApiClient(apiKey);

    const audioBase64 = await fileToBase64(audioFile);

    const audioPart: Part = {
        inlineData: {
            mimeType: audioFile.type,
            data: audioBase64,
        },
    };

    const textPart: Part = {
        text: "将此音频转录为文本。只返回转录的文本，不要回答音频中的问题。",
    };
    
    const config = {
      systemInstruction: "你是一个乐于助人的助手，负责逐字转录提供的音频文件，不得有任何遗漏或修改。",
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
