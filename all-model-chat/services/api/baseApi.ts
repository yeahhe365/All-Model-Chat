
import { GoogleGenAI, Modality } from "@google/genai";
import { logService } from "../logService";
import { GEMINI_3_RO_MODELS } from "../../constants/modelConstants";
import { DEEP_SEARCH_SYSTEM_PROMPT } from "../../constants/promptConstants";
import { SafetySetting } from "../../types/settings";


const POLLING_INTERVAL_MS = 2000; // 2 seconds
const MAX_POLLING_DURATION_MS = 10 * 60 * 1000; // 10 minutes

export { POLLING_INTERVAL_MS, MAX_POLLING_DURATION_MS };

export const getClient = (apiKey: string, baseUrl?: string | null): GoogleGenAI => {
  try {
      // Sanitize the API key
      const sanitizedApiKey = apiKey
          .replace(/[\u2013\u2014]/g, '-')
          .replace(/[\u2018\u2019]/g, "'")
          .replace(/[\u201C\u201D]/g, '"')
          .replace(/[\u00A0]/g, ' ');
          
      if (apiKey !== sanitizedApiKey) {
          logService.warn("API key was sanitized. Non-ASCII characters were replaced.");
      }
      
      const config: any = { apiKey: sanitizedApiKey };
      if (baseUrl) {
          // Robustly clean the URL: remove trailing slashes AND version suffixes (v1, v1beta)
          // The SDK appends the version automatically, so doubling it causes 404s.
          const cleanBaseUrl = baseUrl.replace(/\/+$/, '').replace(/\/v1(beta)?$/, '');
          config.baseUrl = cleanBaseUrl;
          logService.info(`Using custom base URL: ${cleanBaseUrl}`);
      }
      
      return new GoogleGenAI(config);
  } catch (error) {
      logService.error("Failed to initialize GoogleGenAI client:", error);
      throw error;
  }
};

export const getApiClient = (apiKey?: string | null, baseUrl?: string | null): GoogleGenAI => {
    if (!apiKey) {
        const silentError = new Error("API key is not configured in settings or provided.");
        silentError.name = "SilentError";
        throw silentError;
    }
    return getClient(apiKey, baseUrl);
};

export const buildGenerationConfig = (
    modelId: string,
    systemInstruction: string,
    config: { temperature?: number; topP?: number },
    showThoughts: boolean,
    thinkingBudget: number,
    isGoogleSearchEnabled?: boolean,
    isCodeExecutionEnabled?: boolean,
    isUrlContextEnabled?: boolean,
    thinkingLevel?: 'LOW' | 'HIGH',
    aspectRatio?: string,
    isDeepSearchEnabled?: boolean,
    imageSize?: string,
    safetySettings?: SafetySetting[]
): any => {
    if (modelId === 'gemini-2.5-flash-image-preview' || modelId === 'gemini-2.5-flash-image') {
        return {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
            imageConfig: {
                aspectRatio: aspectRatio || '1:1',
            }
        };
    }

    if (modelId === 'gemini-3-pro-image-preview') {
         const config: any = {
            responseModalities: ['IMAGE', 'TEXT'],
            imageConfig: {
                aspectRatio: aspectRatio || '1:1',
                imageSize: imageSize || '1K',
            }
         };
         
         const tools = [];
         if (isGoogleSearchEnabled || isDeepSearchEnabled) tools.push({ googleSearch: {} });
         if (tools.length > 0) config.tools = tools;
         
         if (systemInstruction) config.systemInstruction = systemInstruction;
         
         return config;
    }
    
    let finalSystemInstruction = systemInstruction;
    if (isDeepSearchEnabled) {
        finalSystemInstruction = finalSystemInstruction 
            ? `${finalSystemInstruction}\n\n${DEEP_SEARCH_SYSTEM_PROMPT}`
            : DEEP_SEARCH_SYSTEM_PROMPT;
    }

    const generationConfig: any = {
        ...config,
        systemInstruction: finalSystemInstruction || undefined,
        safetySettings: safetySettings || undefined,
    };
    if (!generationConfig.systemInstruction) {
        delete generationConfig.systemInstruction;
    }

    if (GEMINI_3_RO_MODELS.includes(modelId) || modelId.includes('gemini-3-pro')) {
        generationConfig.thinkingConfig = {
            includeThoughts: showThoughts,
        };

        if (thinkingBudget > 0) {
            generationConfig.thinkingConfig.thinkingBudget = thinkingBudget;
        } else {
            generationConfig.thinkingConfig.thinkingLevel = thinkingLevel || 'HIGH';
        }
    } else {
        const modelSupportsThinking = [
            'models/gemini-flash-lite-latest',
            'gemini-2.5-pro',
            'models/gemini-flash-latest'
        ].includes(modelId) || modelId.includes('gemini-2.5');

        if (modelSupportsThinking) {
            generationConfig.thinkingConfig = {
                thinkingBudget: thinkingBudget,
                includeThoughts: showThoughts,
            };
        }
    }

    const tools = [];
    if (isGoogleSearchEnabled || isDeepSearchEnabled) {
        tools.push({ googleSearch: {} });
    }
    if (isCodeExecutionEnabled) {
        tools.push({ codeExecution: {} });
    }
    if (isUrlContextEnabled) {
        tools.push({ urlContext: {} });
    }

    if (tools.length > 0) {
        generationConfig.tools = tools;
        delete generationConfig.responseMimeType;
        delete generationConfig.responseSchema;
    }
    
    return generationConfig;
};
