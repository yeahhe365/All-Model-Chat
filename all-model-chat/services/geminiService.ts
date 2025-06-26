
import { GoogleGenAI, Chat, Part, Content, GenerateContentResponse, File as GeminiFile, UploadFileConfig, FileState } from "@google/genai";
import { GeminiService, ChatHistoryItem, ThoughtSupportingPart, ModelOption, ContentPart } from '../types';

const POLLING_INTERVAL_MS = 2000; // 2 seconds
const MAX_POLLING_DURATION_MS = 10 * 60 * 1000; // 10 minutes

class GeminiServiceImpl implements GeminiService {
    private ai: GoogleGenAI | null = null;
    private currentApiKey: string | null = null;
    private currentApiUrl: string | null = null; // Stored for future use if SDK supports custom endpoints or for proxies

    constructor() {
        // Initial attempt to use environment variable if no user setting is immediately available.
        // App.tsx will call updateApiKeyAndUrl with stored/default settings on load.
        const envApiKey = process.env.API_KEY;
        if (envApiKey) {
            this.initializeClient(envApiKey);
        } else {
            console.warn(
              "No API_KEY found in environment. Gemini API will be unavailable until configured in settings."
            );
        }
    }

    private initializeClient(apiKey: string): void {
        try {
            this.ai = new GoogleGenAI({ apiKey });
            this.currentApiKey = apiKey;
            console.log("Gemini API client initialized/updated.");
        } catch (error) {
            console.error("Failed to initialize GoogleGenAI client:", error);
            this.ai = null; // Ensure client is null on error
            this.currentApiKey = null;
            // Optionally, re-throw or handle more gracefully depending on app requirements
        }
    }

    public updateApiKeyAndUrl(newApiKey: string | null, newApiUrl: string | null): void {
        const effectiveApiKey = newApiKey || process.env.API_KEY;

        if (effectiveApiKey) {
            if (!this.ai || this.currentApiKey !== effectiveApiKey) {
                const source = newApiKey ? "User Settings" : "Environment Variable";
                console.log(`Initializing/Updating Gemini client. API Key source: ${source}`);
                this.initializeClient(effectiveApiKey);
            }
        } else {
            console.warn("No API Key provided in settings or environment. Gemini API will be unavailable.");
            this.ai = null; // Invalidate client if no key
            this.currentApiKey = null;
        }
        this.currentApiUrl = newApiUrl;
        if (newApiUrl) {
            console.log(`Custom API URL set to: ${newApiUrl}. Note: The current SDK version may not use this directly for standard calls.`);
        }
    }

    async getAvailableModels(): Promise<ModelOption[]> {
        if (!this.ai) {
             console.warn("Cannot fetch models: API client not initialized. Configure API Key.");
             return [{ id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash (Default - API Key Needed)' }];
        }

        const predefinedModelsOnError: ModelOption[] = [
          { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash (Fallback)' },
        ];

        try {
          const modelPager = await this.ai.models.list(); 
          const availableModels: ModelOption[] = [];
          for await (const model of modelPager) {
             if (model.supportedActions && model.supportedActions.includes('generateContent')) {
                availableModels.push({
                    id: model.name, 
                    name: model.displayName || model.name.split('/').pop() || model.name,
                    isPinned: false, 
                });
            } else if (!model.supportedActions) { 
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

    async uploadFile(file: File, mimeType: string, displayName: string): Promise<GeminiFile> {
        if (!this.ai) {
            console.error("Cannot upload file: API client not initialized.");
            throw new Error("API client not initialized. Configure API Key in settings.");
        }
        try {
            const uploadConfig: UploadFileConfig = { mimeType, displayName };
            let uploadedFile = await this.ai.files.upload({
                file: file,
                config: uploadConfig,
            });

            const startTime = Date.now();
            while (uploadedFile.state === 'PROCESSING' && (Date.now() - startTime) < MAX_POLLING_DURATION_MS) {
                console.log(`File "${displayName}" is PROCESSING. Polling again in ${POLLING_INTERVAL_MS / 1000}s...`);
                await new Promise(resolve => setTimeout(resolve, POLLING_INTERVAL_MS));
                try {
                    uploadedFile = await this.ai.files.get({ name: uploadedFile.name });
                } catch (pollError) {
                    console.error(`Error polling for file status "${displayName}":`, pollError);
                    // If polling fails catastrophically, re-throw or return the file in its last known state (PROCESSING),
                    // which might lead to it being treated as failed by the UI or stuck in processing.
                    // For now, let's assume the upload failed if polling breaks.
                    throw new Error(`Polling failed for file ${displayName}. Original error: ${pollError instanceof Error ? pollError.message : String(pollError)}`);
                }
            }

            if (uploadedFile.state === 'PROCESSING') {
                console.warn(`File "${displayName}" is still PROCESSING after ${MAX_POLLING_DURATION_MS / 1000}s. Returning current state.`);
                // You might want to throw an error or handle this as a timeout/failure.
                // For now, it will be treated as 'processing_api' by App.tsx, and the button won't show.
            }
            
            return uploadedFile;
        } catch (error) {
            console.error(`Failed to upload and process file "${displayName}" to Gemini API:`, error);
            throw error;
        }
    }
    
    async getFileMetadata(fileApiName: string): Promise<GeminiFile | null> {
        if (!this.ai) {
            console.error("Cannot get file metadata: API client not initialized.");
            throw new Error("API client not initialized. Configure API Key in settings.");
        }
        if (!fileApiName || !fileApiName.startsWith('files/')) {
            console.error(`Invalid fileApiName format: ${fileApiName}. Must start with "files/".`);
            throw new Error('Invalid file ID format. Expected "files/your_file_id".');
        }
        try {
            const file = await this.ai.files.get({ name: fileApiName });
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


    async initializeChat(
        modelId: string,
        systemInstruction: string,
        config: { temperature?: number; topP?: number },
        showThoughts: boolean,
        history?: ChatHistoryItem[]
    ): Promise<Chat | null> {
        if (!this.ai) {
            console.error("Cannot initialize chat: API client not initialized.");
            throw new Error("API client not initialized. Configure API Key in settings.");
        }
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
            
            if (modelId === 'gemini-2.5-flash-lite-preview-06-17') {
                chatConfig.thinkingConfig = { thinkingBudget: 24576, includeThoughts: true };
            } else if (modelId === 'gemini-2.5-pro') {
                chatConfig.thinkingConfig = { thinkingBudget: 32768 };
                if (showThoughts) chatConfig.thinkingConfig.includeThoughts = true;
            } else if (modelId === 'gemini-2.5-flash') {
                if (showThoughts) {
                    chatConfig.thinkingConfig = { thinkingBudget: 24576, includeThoughts: true };
                } else {
                    chatConfig.thinkingConfig = { thinkingBudget: 0 };
                }
            }
            
            if (chatConfig.thinkingConfig && Object.keys(chatConfig.thinkingConfig).length === 0) {
                delete chatConfig.thinkingConfig;
            }

            const chat: Chat = this.ai.chats.create({
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
        onComplete: () => void
    ): Promise<void> {
        if (!this.ai) {
             onError(new Error("API client not initialized. Cannot send message."));
             onComplete();
             return;
        }
        try {
            const result = await chat.sendMessageStream({ message: promptParts as Part[] });
            for await (const chunkResponse of result) {
                if (abortSignal.aborted) {
                    console.log("Streaming aborted by signal.");
                    break;
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
            onComplete();
        }
    }

    async sendMessageNonStream(
        chat: Chat,
        modelId: string,
        promptParts: ContentPart[],
        abortSignal: AbortSignal,
        onError: (error: Error) => void,
        onComplete: (fullText: string, thoughtsText?: string) => void
    ): Promise<void> {
         if (!this.ai) {
             onError(new Error("API client not initialized. Cannot send message."));
             onComplete("", "");
             return;
        }
        try {
            if (abortSignal.aborted) {
                console.log("Non-streaming call prevented by abort signal before starting.");
                onComplete("", "");
                return;
            }
            const response: GenerateContentResponse = await chat.sendMessage({ message: promptParts as Part[] });
            if (abortSignal.aborted) {
                console.log("Non-streaming call completed, but aborted by signal before processing response.");
                onComplete("", "");
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
            onComplete(fullText, thoughtsText || undefined);
        } catch (error) {
            console.error("Error sending message to Gemini (non-stream):", error);
            onError(error instanceof Error ? error : new Error(String(error) || "Unknown error during non-streaming call."));
        }
    }
}

export const geminiServiceInstance: GeminiService = new GeminiServiceImpl();
