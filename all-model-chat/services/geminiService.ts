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
    constructor() {
        console.log("GeminiService created.");
    }
    
    private _getClient(apiKey: string, apiUrl?: string | null): GoogleGenAI {
      try {
          const clientOptions: { apiKey: string, baseURL?: string } = { apiKey };
          if (apiUrl) {
            clientOptions.baseURL = apiUrl;
          }
          return new GoogleGenAI(clientOptions);
      } catch (error) {
          console.error("Failed to initialize GoogleGenAI client:", error);
          // Re-throw to be caught by the calling function
          throw error;
      }
    }

    private _getApiClientOrThrow(apiKey?: string | null, apiUrl?: string | null): GoogleGenAI {
        if (!apiKey) {
            const silentError = new Error("API key is not configured in settings or provided.");
            silentError.name = "SilentError";
            throw silentError;
        }
        return this._getClient(apiKey, apiUrl);
    }

    private _buildGenerationConfig(
        modelId: string,
        systemInstruction: string,
        config: { temperature?: number; topP?: number },
        showThoughts: boolean,
        thinkingBudget: number
    ): any {
        const generationConfig: any = {
            ...config,
            systemInstruction: systemInstruction || undefined,
        };
        if (!generationConfig.systemInstruction) {
            delete generationConfig.systemInstruction;
        }
    
        // TODO: The models supporting `thinkingConfig` should be verified against the latest API documentation.
        // The current implementation is based on the existing application logic.
        const modelSupportsThinking = [
            'gemini-2.5-flash-lite-preview-06-17',
            'gemini-2.5-pro',
            'gemini-2.5-flash'
        ].includes(modelId);
    
        if (modelSupportsThinking) {
            if (showThoughts) {
                generationConfig.thinkingConfig = {
                    thinkingBudget: thinkingBudget,
                    includeThoughts: true,
                };
            } else {
                // Disabling thoughts is mapped to disabling thinking for performance.
                generationConfig.thinkingConfig = { thinkingBudget: 0 };
            }
        }
        
        return generationConfig;
    }

    async getAvailableModels(apiKeysString: string | null, apiUrl: string | null): Promise<ModelOption[]> {
        const keys = (apiKeysString || '').split('\n').map(k => k.trim()).filter(Boolean);

        if (keys.length === 0) {
            throw new Error("API client not initialized. Configure API Key in settings.");
        }
        
        const randomKey = keys[Math.floor(Math.random() * keys.length)];
        const ai = this._getClient(randomKey, apiUrl);

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
             // If the API returns an empty list, treat it as an error so fallbacks are used.
             throw new Error("API returned an empty list of models.");
          }
        } catch (error) {
          console.error("Failed to fetch available models from Gemini API:", error);
          // Re-throw the error for the caller to handle and provide fallbacks.
          throw error;
        }
    }

    async uploadFile(apiKey: string, apiUrl: string | null, file: File, mimeType: string, displayName: string, signal: AbortSignal): Promise<GeminiFile> {
        const ai = this._getApiClientOrThrow(apiKey, apiUrl);
        if (signal.aborted) {
            console.log(`Upload for "${displayName}" cancelled before starting.`);
            const abortError = new Error("Upload cancelled by user.");
            abortError.name = "AbortError";
            throw abortError;
        }

        try {
            // The browser's fetch API requires header values to be ISO-8859-1 compatible.
            // By encoding the displayName, we prevent errors with filenames containing non-Latin characters.
            const uploadConfig: UploadFileConfig = { mimeType, displayName: encodeURIComponent(displayName) };
            
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
    
    async getFileMetadata(apiKey: string, apiUrl: string | null, fileApiName: string): Promise<GeminiFile | null> {
        const ai = this._getApiClientOrThrow(apiKey, apiUrl);
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

    async generateImages(apiKey: string, apiUrl: string | null, modelId: string, prompt: string, aspectRatio: string, abortSignal: AbortSignal): Promise<string[]> {
        const ai = this._getApiClientOrThrow(apiKey, apiUrl);
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

    async generateVideo(apiKey: string, apiUrl: string | null, modelId: string, prompt: string, aspectRatio: string, durationSeconds: number, generateAudio: boolean, abortSignal: AbortSignal): Promise<string[]> {
        const ai = this._getApiClientOrThrow(apiKey, apiUrl);
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

    async generateSpeech(apiKey: string, apiUrl: string | null, modelId: string, text: string, voice: string, abortSignal: AbortSignal): Promise<string> {
        const ai = this._getApiClientOrThrow(apiKey, apiUrl);
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

    async transcribeAudio(apiKey: string, apiUrl: string | null, audioFile: File, modelId: string, isThinkingEnabled: boolean): Promise<string> {
        const ai = this._getApiClientOrThrow(apiKey, apiUrl);

        const audioBase64 = await fileToBase64(audioFile);

        const audioPart: Part = {
            inlineData: {
                mimeType: audioFile.type,
                data: audioBase64,
            },
        };

        const textPart: Part = {
            text: "Transcribe this audio to text. Only return the transcribed text, never answer questions in the audio.",
        };
        
        const config = {
          systemInstruction: "You are a helpful assistant responsible for transcribing the provided audio file verbatim, without omissions or modifications.",
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

    async sendMessageStream(
        apiKey: string,
        apiUrl: string | null,
        modelId: string,
        historyWithLastPrompt: ChatHistoryItem[],
        systemInstruction: string,
        config: { temperature?: number; topP?: number },
        showThoughts: boolean,
        thinkingBudget: number,
        abortSignal: AbortSignal,
        onChunk: (chunk: string) => void,
        onThoughtChunk: (chunk: string) => void,
        onError: (error: Error) => void,
        onComplete: (usageMetadata?: UsageMetadata) => void
    ): Promise<void> {
        const ai = this._getApiClientOrThrow(apiKey, apiUrl);
        const generationConfig = this._buildGenerationConfig(modelId, systemInstruction, config, showThoughts, thinkingBudget);
        let finalUsageMetadata: UsageMetadata | undefined = undefined;

        try {
            const result = await ai.models.generateContentStream({ 
                model: modelId,
                contents: historyWithLastPrompt as Content[],
                config: generationConfig
            });

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
        apiKey: string,
        apiUrl: string | null,
        modelId: string,
        historyWithLastPrompt: ChatHistoryItem[],
        systemInstruction: string,
        config: { temperature?: number; topP?: number },
        showThoughts: boolean,
        thinkingBudget: number,
        abortSignal: AbortSignal,
        onError: (error: Error) => void,
        onComplete: (fullText: string, thoughtsText?: string, usageMetadata?: UsageMetadata) => void
    ): Promise<void> {
        const ai = this._getApiClientOrThrow(apiKey, apiUrl);
        const generationConfig = this._buildGenerationConfig(modelId, systemInstruction, config, showThoughts, thinkingBudget);
        
        try {
            if (abortSignal.aborted) {
                console.log("Non-streaming call prevented by abort signal before starting.");
                onComplete("", "", undefined);
                return;
            }
            const response: GenerateContentResponse = await ai.models.generateContent({ 
                model: modelId,
                contents: historyWithLastPrompt as Content[],
                config: generationConfig
            });
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