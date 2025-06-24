

import { GoogleGenAI, Chat, Part, Model, Content, GenerateContentResponse } from "@google/genai";
import { GeminiService, ChatHistoryItem, ThoughtSupportingPart, ModelOption, ContentPart } from '../types';

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  console.warn(
    "Gemini API Key is not configured. Please set the API_KEY environment variable. App may not function correctly."
  );
}

const ai = new GoogleGenAI({ apiKey: API_KEY! });

const geminiServiceImpl: GeminiService = {
  getAvailableModels: async (): Promise<ModelOption[]> => {
    if (!API_KEY) {
        console.warn("Cannot fetch models: API_KEY is not set.");
        // Return a minimal predefined list if API key is not set, to allow UI to show something
        return [{ id: 'gemini-2.5-flash-preview-04-17', name: 'Gemini 2.5 Flash (Default)' }];
    }

    const predefinedModelsOnError: ModelOption[] = [
      { id: 'gemini-2.5-flash-preview-04-17', name: 'Gemini 2.5 Flash (Fallback)' },
    ];

    try {
      const modelPager = await ai.models.list(); 
      const availableModels: ModelOption[] = [];
      for await (const model of modelPager) {
        // Check if the model supports 'generateContent' action
        // Some SDKs might use `model.supportedGenerationMethods` or similar
        // For @google/genai, checking for a common action like 'generateContent' in supportedActions
        // or just including all listed models if the property is not consistently available.
        // For simplicity, let's assume all listed models are usable or filter if specific criteria are known.
        // Example: if (model.supportedGenerationMethods && model.supportedGenerationMethods.includes("generateContent"))
        // Or if 'supportedActions' is available:
         if (model.supportedActions && model.supportedActions.includes('generateContent')) {
            availableModels.push({
                id: model.name, // e.g., "models/gemini-2.5-flash-preview-04-17"
                name: model.displayName || model.name.split('/').pop() || model.name,
                isPinned: false, // No models are pinned by default
            });
        } else if (!model.supportedActions) { // If supportedActions is not present, cautiously add
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
  },

  initializeChat: async (
    modelId: string,
    systemInstruction: string,
    config: { temperature?: number; topP?: number },
    showThoughts: boolean,
    history?: ChatHistoryItem[] 
  ): Promise<Chat | null> => {
    if (!API_KEY) {
        console.error("Cannot initialize chat: API_KEY is not set.");
        throw new Error("API Key not configured. Cannot initialize chat.");
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

      // Apply thinkingConfig based on model and showThoughts preference
      if (modelId.includes('gemini-2.5-flash-preview-04-17')) { 
        if (showThoughts) {
          // For flash models, omitting thinkingConfig defaults to enabled with thoughts.
          // No explicit thinkingConfig needed here if that's the desired default.
        } else {
          chatConfig.thinkingConfig = { thinkingBudget: 0 }; // Disable thinking
        }
      } else if (showThoughts) { 
         // For other models that might support includeThoughts explicitly (if any in the future)
         chatConfig.thinkingConfig = { includeThoughts: true };
      }
      
      // Clean up empty thinkingConfig object
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
      throw error; // Re-throw to be caught by App.tsx
    }
  },

  sendMessageStream: async (
    chat: Chat,
    modelId: string, 
    promptParts: ContentPart[], 
    abortSignal: AbortSignal,
    onChunk: (chunk: string) => void,
    onThoughtChunk: (chunk: string) => void,
    onError: (error: Error) => void,
    onComplete: () => void
  ): Promise<void> => {
    try {
      const result = await chat.sendMessageStream({ message: promptParts as Part[] });

      for await (const chunkResponse of result) {
        if (abortSignal.aborted) {
          console.log("Streaming aborted by signal.");
          break;
        }

        if (chunkResponse.candidates &&
            chunkResponse.candidates[0]?.content?.parts &&
            chunkResponse.candidates[0].content.parts.length > 0) {
          for (const part of chunkResponse.candidates[0].content.parts) { // part is SDK's Part
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
      if (error instanceof Error) {
        onError(error);
      } else {
        onError(new Error(String(error) || "Unknown error during streaming."));
      }
    } finally {
      onComplete();
    }
  },

  sendMessageNonStream: async (
    chat: Chat,
    modelId: string,
    promptParts: ContentPart[],
    abortSignal: AbortSignal,
    onError: (error: Error) => void,
    onComplete: (fullText: string, thoughtsText?: string) => void
  ): Promise<void> => {
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
      if (error instanceof Error) {
        onError(error);
      } else {
        onError(new Error(String(error) || "Unknown error during non-streaming call."));
      }
    }
  },
};

export const geminiServiceInstance: GeminiService = geminiServiceImpl;