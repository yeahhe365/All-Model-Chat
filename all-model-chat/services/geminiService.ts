import { GoogleGenAI, Chat, Part, Content, GenerateContentResponse, File as GeminiFile, UploadFileConfig, FileState, UsageMetadata } from "@google/genai";
import { GeminiService, ChatHistoryItem, ThoughtSupportingPart, ModelOption, ContentPart } from '../types';
import { TAB_CYCLE_MODELS } from "../constants/appConstants";

const POLLING_INTERVAL_MS = 2000; // 2 seconds
const MAX_POLLING_DURATION_MS = 10 * 60 * 1000; // 10 minutes

const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            const result = reader.result as string;
            const base64Data = result.split(',')[1];
            if (base64Data) {
                resolve(base64Data);
            } else {
                reject(new Error("Failed to extract base64 data from file."));
            }
        };
        reader.onerror = error => reject(error);
    });
};

class GeminiServiceImpl implements GeminiService {
    private apiKeyString: string | null = null;
    private currentApiUrl: string | null = null; // Stored for future use if SDK supports custom endpoints or for proxies
    private isCustomConfigEnabled: boolean = false;

    constructor() {
        // The service is now primarily configured via the updateApiKeyAndUrl method,
        // which is called by the useAppSettings hook on app initialization.
        // This ensures settings from localStorage are applied correctly from the start.
        console.log("GeminiService created. Awaiting configuration from settings.");
    }
    
    private _getClient(): GoogleGenAI | null {
        if (!this.apiKeyString) {
            console.warn("Cannot get Gemini client: API Key not configured.");
            return null;
        }
        
        const keys = this.apiKeyString.split('\n').map(k => k.trim()).filter(Boolean);
        if (keys.length === 0) {
            console.warn("Cannot get Gemini client: No valid API keys found in configuration string.");
            return null;
        }

        const randomKey = keys[Math.floor(Math.random() * keys.length)];
        
        try {
            return new GoogleGenAI({ apiKey: randomKey });
        } catch (error) {
            console.error("Failed to initialize GoogleGenAI client with a randomly selected key:", error);
            return null;
        }
    }

    private _getApiClientOrThrow(): GoogleGenAI {
        const ai = this._getClient();
        if (!ai) {
            if (this.isCustomConfigEnabled) {
                const silentError = new Error("API key is not configured in custom settings.");
                silentError.name = "SilentError";
                throw silentError;
            }
            throw new Error("API client not initialized. Configure API Key in settings.");
        }
        return ai;
    }

    public updateApiKeyAndUrl(newApiKey: string | null, newApiUrl: string | null, useCustomApiConfig: boolean): void {
        this.isCustomConfigEnabled = useCustomApiConfig;
        // The effective key is the user-provided key, or falls back to the environment variable.
        this.apiKeyString = newApiKey ?? process.env.API_KEY ?? null;
        this.currentApiUrl = newApiUrl;

        if (this.apiKeyString) {
            const source = newApiKey !== null ? "User Settings" : "Environment Variable";
            const keyCount = this.apiKeyString.split('\n').map(k => k.trim()).filter(Boolean).length;
            console.log(`Gemini service API keys updated. Source: ${source}. Found ${keyCount} key(s).`);
        } else {
             console.warn("Gemini Service Update: No API Key provided in settings or environment. API will be unavailable.");
        }

        if (newApiUrl) {
            console.log(`Custom API URL set to: ${newApiUrl}. Note: The current SDK version may not use this directly for standard calls.`);
        }
    }

    async getAvailableModels(): Promise<ModelOption[]> {
        const ai = this._getClient();
        if (!ai) {
             console.warn("Cannot fetch models: API client not initialized. Configure API Key.");
             return [{ id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash (Default - API Key Needed)' }];
        }

        const predefinedModelsOnError: ModelOption[] = TAB_CYCLE_MODELS.map(id => ({
            id: id,
            name: `Gemini ${id.replace('gemini-','').replace(/-/g, ' ')} (Fallback)`.replace(/\b\w/g, l => l.toUpperCase()),
        }));

        try {
          const modelPager = await ai.models.list(); 
          const availableModels: ModelOption[] = [];
          for await (const model of modelPager) {
             const supported = model.supportedActions;
             if (!supported || supported.includes('generateContent') || supported.includes('generateImages')) {
                availableModels.push({
                    id: model.name, 
                    name: model.displayName || model.name.split('/').pop() || model.name,
                    isPinned: false, 
                });
             }
          }

          if (availableModels.length > 0) {
            return availableModels.sort((a,b) => a.name.localeCompare(b.name));
          } else {
             console.warn("API model listing returned no models. Using predefined fallback list.");
             return predefinedModelsOnError;
          }
        } catch (error) {
          console.error("Failed to fetch available models from Gemini API:", error);
          console.warn("Using predefined fallback model list due to API error.");
          return predefinedModelsOnError;
        }
    }

    async uploadFile(file: File, mimeType: string, displayName: string, signal: AbortSignal): Promise<GeminiFile> {
        const ai = this._getApiClientOrThrow();
        if (signal.aborted) {
            console.log(`Upload for "${displayName}" cancelled before starting.`);
            const abortError = new Error("Upload cancelled by user.");
            abortError.name = "AbortError";
            throw abortError;
        }

        try {
            const uploadConfig: UploadFileConfig = { mimeType, displayName };
            // Note: The SDK's uploadFile doesn't directly take a signal for the HTTP request itself.
            // Cancellation here primarily affects the polling loop.
            let uploadedFile = await ai.files.upload({
                file: file,
                config: uploadConfig,
            });

            const startTime = Date.now();
            while (uploadedFile.state === 'PROCESSING' && (Date.now() - startTime) < MAX_POLLING_DURATION_MS) {
                if (signal.aborted) {
                    console.log(`Polling for "${displayName}" cancelled by user.`);
                    // Even if cancelled, the file *might* still become active on the backend.
                    // However, from the client's perspective, we are stopping.
                    // We'll throw an error that the App.tsx can catch to mark as 'cancelled'.
                    const abortError = new Error("Upload polling cancelled by user.");
                    abortError.name = "AbortError";
                    throw abortError;
                }
                console.log(`File "${displayName}" is PROCESSING. Polling again in ${POLLING_INTERVAL_MS / 1000}s...`);
                await new Promise(resolve => setTimeout(resolve, POLLING_INTERVAL_MS));
                
                if (signal.aborted) { // Check again after timeout
                     const abortError = new Error("Upload polling cancelled by user after timeout.");
                     abortError.name = "AbortError";
                     throw abortError;
                }

                try {
                    uploadedFile = await ai.files.get({ name: uploadedFile.name });
                } catch (pollError) {
                    console.error(`Error polling for file status "${displayName}":`, pollError);
                    throw new Error(`Polling failed for file ${displayName}. Original error: ${pollError instanceof Error ? pollError.message : String(pollError)}`);
                }
            }

            if (uploadedFile.state === 'PROCESSING') {
                console.warn(`File "${displayName}" is still PROCESSING after ${MAX_POLLING_DURATION_MS / 1000}s. Returning current state.`);
            }
            
            return uploadedFile;
        } catch (error) {
            console.error(`Failed to upload and process file "${displayName}" to Gemini API:`, error);
            // Re-throw to be handled by App.tsx
            throw error;
        }
    }
    
    async getFileMetadata(fileApiName: string): Promise<GeminiFile | null> {
        const ai = this._getApiClientOrThrow();
        if (!fileApiName || !fileApiName.startsWith('files/')) {
            console.error(`Invalid fileApiName format: ${fileApiName}. Must start with "files/".`);
            throw new Error('Invalid file ID format. Expected "files/your_file_id".');
        }
        try {
            const file = await ai.files.get({ name: fileApiName });
            return file;
        } catch (error) {
            console.error(`Failed to get metadata for file "${fileApiName}" from Gemini API:`, error);
            // Check for specific error types, e.g., not found
            if (error instanceof Error && (error.message.includes('NOT_FOUND') || error.message.includes('404'))) {
                return null; // File not found is a valid outcome we want to handle
            }
            throw error; // Re-throw other errors
        }
    }

    async generateImages(modelId: string, prompt: string, aspectRatio: string, abortSignal: AbortSignal): Promise<string[]> {
        const ai = this._getApiClientOrThrow();
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
            console.error(`Failed to generate images with model ${modelId}:`, error);
            throw error;
        }
    }

    async generateVideo(modelId: string, prompt: string, aspectRatio: string, durationSeconds: number, generateAudio: boolean, abortSignal: AbortSignal): Promise<string[]> {
        const ai = this._getApiClientOrThrow();
        if (abortSignal.aborted) {
            const abortError = new Error("Video generation cancelled before starting.");
            abortError.name = "AbortError";
            throw abortError;
        }
    
        const config: any = {
            aspectRatio,
            durationSeconds,
        };
        if (modelId.includes('veo-2')) {
            config.personGeneration = 'dont_allow'; // Per python example
        }
    
        // This is a hypothetical implementation based on the user's Python snippet
        // and the need for long-polling. The JS SDK may not have these methods yet.
        // @ts-ignore
        let operation = await ai.models.generateVideos({
            model: modelId,
            prompt,
            config,
        });
    
        const startTime = Date.now();
        // @ts-ignore
        while (operation && !operation.done && (Date.now() - startTime) < MAX_POLLING_DURATION_MS) {
            if (abortSignal.aborted) {
                // Cannot guarantee cancellation on the backend, but we stop waiting.
                const abortError = new Error("Video generation polling cancelled by user.");
                abortError.name = "AbortError";
                throw abortError;
            }
            await new Promise(resolve => setTimeout(resolve, POLLING_INTERVAL_MS * 2.5)); // 5s polling for video
            
            try {
                // @ts-ignore - this is the most speculative part, assumes an operations client
                operation = await ai.operations.get(operation);
            } catch (pollError) {
                console.error(`Error polling for video generation status:`, pollError);
                throw new Error(`Polling failed for video generation.`);
            }
        }
    
        // @ts-ignore
        if (!operation || !operation.done) {
             throw new Error("Video generation timed out.");
        }
    
        // @ts-ignore
        const videoUris = operation.response?.generatedVideos?.map(v => v.video.uri) ?? [];
        if (videoUris.length === 0) {
             throw new Error("No videos generated. The prompt may have been blocked or the model failed to respond.");
        }
        return videoUris;
    }

    async generateSpeech(modelId: string, text: string, voice: string, abortSignal: AbortSignal): Promise<string> {
        const ai = this._getApiClientOrThrow();
        if (!text.trim()) {
            throw new Error("TTS input text cannot be empty.");
        }

        try {
            // The modelId should now come with the 'models/' prefix from useChat.ts
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
            
            console.error("TTS response did not contain expected audio data structure:", JSON.stringify(response, null, 2));

            const textError = response.text;
            if (textError) {
                throw new Error(`TTS generation failed: ${textError}`);
            }

            throw new Error('No audio data found in TTS response.');

        } catch (error) {
            console.error(`Failed to generate speech with model ${modelId}:`, error);
            throw error;
        }
    }

    async transcribeAudio(audioFile: File, modelId: string, isThinkingEnabled: boolean): Promise<string> {
        const ai = this._getApiClientOrThrow();

        const audioBase64 = await fileToBase64(audioFile);

        const audioPart: Part = {
            inlineData: {
                mimeType: audioFile.type,
                data: audioBase64,
            },
        };

        const textPart: Part = {
            text: "将提供的音频文件，逐字、无遗漏、无修改地转录为纯文本。永远不要回答音频中的内容。",
        };
        
        const config = {
          systemInstruction: "你是一个乐于助人的助手，负责将音频转录成文字。",
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
            console.error("Error during audio transcription:", error);
            throw error;
        }
    }


    async initializeChat(
        modelId: string,
        systemInstruction: string,
        config: { temperature?: number; topP?: number },
        showThoughts: boolean,
        thinkingBudget: number,
        history?: ChatHistoryItem[]
    ): Promise<Chat | null> {
        const ai = this._getApiClientOrThrow();
        if (!modelId) {
            console.error("Cannot initialize chat: modelId is not provided.");
            throw new Error("Model ID not provided. Cannot initialize chat.");
        }
        try {
            const typedHistory = history as Content[] | undefined;
            const chatConfig: {
                systemInstruction?: string;
                temperature?: number;
                topP?: number;
                thinkingConfig?: { includeThoughts?: boolean; thinkingBudget?: number };
            } = {
                systemInstruction: systemInstruction || undefined,
            };

            if (config.temperature !== undefined) chatConfig.temperature = config.temperature;
            if (config.topP !== undefined) chatConfig.topP = config.topP;
            if (chatConfig.systemInstruction === undefined) delete chatConfig.systemInstruction;
            
            const modelSupportsThinking = [
                'gemini-2.5-flash-lite-preview-06-17',
                'gemini-2.5-pro',
                'gemini-2.5-flash'
            ].includes(modelId);

            if (modelSupportsThinking) {
                if (showThoughts) {
                    chatConfig.thinkingConfig = {
                        thinkingBudget: thinkingBudget,
                        includeThoughts: true
                    };
                } else {
                    chatConfig.thinkingConfig = { thinkingBudget: 0 };
                }
            }
            
            if (chatConfig.thinkingConfig && Object.keys(chatConfig.thinkingConfig).length === 0) {
                delete chatConfig.thinkingConfig;
            }

            const chat: Chat = ai.chats.create({
                model: modelId,
                config: chatConfig,
                history: typedHistory,
            });
            return chat;
        } catch (error) {
            console.error(`Failed to initialize Gemini chat with model ${modelId}:`, error);
            throw error;
        }
    }

    async sendMessageStream(
        chat: Chat,
        modelId: string,
        promptParts: ContentPart[],
        abortSignal: AbortSignal,
        onChunk: (chunk: string) => void,
        onThoughtChunk: (chunk: string) => void,
        onError: (error: Error) => void,
        onComplete: (usageMetadata?: UsageMetadata) => void
    ): Promise<void> {
        // This method uses the passed-in chat object, which is already tied to a specific
        // client instance with a specific (randomly chosen) API key. No client needed here.
        let finalUsageMetadata: UsageMetadata | undefined = undefined;
        try {
            const result = await chat.sendMessageStream({ message: promptParts as Part[] });
            for await (const chunkResponse of result) {
                if (abortSignal.aborted) {
                    console.log("Streaming aborted by signal.");
                    break;
                }
                if (chunkResponse.usageMetadata) {
                    finalUsageMetadata = chunkResponse.usageMetadata;
                }
                if (chunkResponse.candidates && chunkResponse.candidates[0]?.content?.parts?.length > 0) {
                    for (const part of chunkResponse.candidates[0].content.parts) {
                        if ('text' in part && typeof part.text === 'string' && part.text.length > 0) {
                            const pAsThoughtSupporting = part as ThoughtSupportingPart;
                            if (pAsThoughtSupporting.thought) {
                                onThoughtChunk(part.text);
                            } else {
                                onChunk(part.text);
                            }
                        }
                    }
                } else if (typeof chunkResponse.text === 'string' && chunkResponse.text.length > 0) {
                   onChunk(chunkResponse.text);
                }
            }
        } catch (error) {
            console.error("Error sending message to Gemini (stream):", error);
            onError(error instanceof Error ? error : new Error(String(error) || "Unknown error during streaming."));
        } finally {
            onComplete(finalUsageMetadata);
        }
    }

    async sendMessageNonStream(
        chat: Chat,
        modelId: string,
        promptParts: ContentPart[],
        abortSignal: AbortSignal,
        onError: (error: Error) => void,
        onComplete: (fullText: string, thoughtsText?: string, usageMetadata?: UsageMetadata) => void
    ): Promise<void> {
        // This method also operates on the passed-in chat object. No client needed.
        try {
            if (abortSignal.aborted) {
                console.log("Non-streaming call prevented by abort signal before starting.");
                onComplete("", "", undefined);
                return;
            }
            const response: GenerateContentResponse = await chat.sendMessage({ message: promptParts as Part[] });
            if (abortSignal.aborted) {
                console.log("Non-streaming call completed, but aborted by signal before processing response.");
                onComplete("", "", undefined);
                return;
            }
            let fullText = "";
            let thoughtsText = "";
            if (response.candidates && response.candidates[0]?.content?.parts) {
                for (const part of response.candidates[0].content.parts) {
                    if ('text' in part && typeof part.text === 'string' && part.text.length > 0) {
                        const pAsThoughtSupporting = part as ThoughtSupportingPart;
                        if (pAsThoughtSupporting.thought) {
                            thoughtsText += part.text;
                        } else {
                            fullText += part.text;
                        }
                    }
                }
            }
            if (!fullText && response.text) {
                fullText = response.text;
            }
            onComplete(fullText, thoughtsText || undefined, response.usageMetadata);
        } catch (error) {
            console.error("Error sending message to Gemini (non-stream):", error);
            onError(error instanceof Error ? error : new Error(String(error) || "Unknown error during non-streaming call."));
        }
    }
}

export const geminiServiceInstance: GeminiService = new GeminiServiceImpl();