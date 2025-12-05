
import { GoogleGenAI, Modality } from "@google/genai";
import { logService } from "../logService";
import { dbService } from '../../utils/db';
import { GEMINI_3_RO_MODELS } from "../../constants/modelConstants";
import { DEEP_SEARCH_SYSTEM_PROMPT } from "../../constants/promptConstants";
import { SafetySetting } from "../../types/settings";


const POLLING_INTERVAL_MS = 2000; // 2 seconds
const MAX_POLLING_DURATION_MS = 10 * 60 * 1000; // 10 minutes

export { POLLING_INTERVAL_MS, MAX_POLLING_DURATION_MS };

export const getClient = (apiKey: string, baseUrl?: string | null): GoogleGenAI => {
  try {
      // Sanitize the API key to replace common non-ASCII characters that might
      // be introduced by copy-pasting from rich text editors. This prevents
      // "Failed to execute 'append' on 'Headers': Invalid character" errors.
      const sanitizedApiKey = apiKey
          .replace(/[\u2013\u2014]/g, '-') // en-dash, em-dash to hyphen
          .replace(/[\u2018\u2019]/g, "'") // smart single quotes to apostrophe
          .replace(/[\u201C\u201D]/g, '"') // smart double quotes to quote
          .replace(/[\u00A0]/g, ' '); // non-breaking space to regular space
          
      if (apiKey !== sanitizedApiKey) {
          logService.warn("API key was sanitized. Non-ASCII characters were replaced.");
      }
      
      const config: any = { apiKey: sanitizedApiKey };
      
      // Use the SDK's native baseUrl support if provided.
      // This is more robust than the network interceptor for SDK-generated requests.
      if (baseUrl && baseUrl.trim().length > 0) {
          // Remove trailing slash for consistency
          config.baseUrl = baseUrl.trim().replace(/\/$/, '');
      }
      
      return new GoogleGenAI(config);
  } catch (error) {
      logService.error("Failed to initialize GoogleGenAI client:", error);
      // Re-throw to be caught by the calling function
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

/**
 * Async helper to get an API client with settings (proxy, etc) loaded from DB.
 * Respects the `useApiProxy` toggle.
 */
export const getConfiguredApiClient = async (apiKey: string): Promise<GoogleGenAI> => {
    const settings = await dbService.getAppSettings();
    
    // Only use the proxy URL if Custom Config AND Use Proxy are both enabled
    // Explicitly check for truthiness to handle undefined/null
    const shouldUseProxy = !!(settings?.useCustomApiConfig && settings?.useApiProxy);
    const apiProxyUrl = shouldUseProxy ? settings?.apiProxyUrl : null;
    
    if (settings?.useCustomApiConfig && !shouldUseProxy) {
        // Debugging aid: if user expects proxy but it's not active
        if (settings?.apiProxyUrl && !settings?.useApiProxy) {
             logService.debug("[API Config] Proxy URL present but 'Use API Proxy' toggle is OFF.");
        }
    }
    
    return getClient(apiKey, apiProxyUrl);
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
        const imageConfig: any = {};
        if (aspectRatio && aspectRatio !== 'Auto') imageConfig.aspectRatio = aspectRatio;
        
        const config: any = {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
        };
        if (Object.keys(imageConfig).length > 0) {
            config.imageConfig = imageConfig;
        }
        return config;
    }

    if (modelId === 'gemini-3-pro-image-preview') {
         const imageConfig: any = {
            imageSize: imageSize || '1K',
         };
         if (aspectRatio && aspectRatio !== 'Auto') {
            imageConfig.aspectRatio = aspectRatio;
         }
         
         const config: any = {
            responseModalities: ['IMAGE', 'TEXT'],
            imageConfig,
         };
         
         // Add tools if enabled
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

    // Robust check for Gemini 3
    if (GEMINI_3_RO_MODELS.includes(modelId) || modelId.includes('gemini-3-pro')) {
        // Gemini 3.0 supports both thinkingLevel and thinkingBudget.
        // We prioritize budget if it's explicitly set (>0).
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
            // Decouple thinking budget from showing thoughts.
            // `thinkingBudget` controls if and how much the model thinks.
            // `showThoughts` controls if the `thought` field is returned in the stream.
            generationConfig.thinkingConfig = {
                thinkingBudget: thinkingBudget,
                includeThoughts: showThoughts,
            };
        }
    }

    const tools = [];
    // Deep Search requires Google Search tool
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
        // When using tools, these should not be set
        delete generationConfig.responseMimeType;
        delete generationConfig.responseSchema;
    }
    
    return generationConfig;
};
