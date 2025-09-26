import { GoogleGenAI, Modality } from "@google/genai";
import { logService } from "../logService";
import { dbService } from '../../utils/db';


const POLLING_INTERVAL_MS = 2000; // 2 seconds
const MAX_POLLING_DURATION_MS = 10 * 60 * 1000; // 10 minutes

export { POLLING_INTERVAL_MS, MAX_POLLING_DURATION_MS };

export const getClient = (apiKey: string, baseUrl?: string): GoogleGenAI => {
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
      if (baseUrl) {
          // 尝试多种可能的配置参数名
          config.baseURL = baseUrl;  // 注意大写 URL
          config.baseUrl = baseUrl;   // 小写版本
          config.endpoint = baseUrl;  // 可能的替代参数
          logService.info(`Using custom base URL: ${baseUrl}`);
      }
      
      return new GoogleGenAI(config);
  } catch (error) {
      logService.error("Failed to initialize GoogleGenAI client:", error);
      // Re-throw to be caught by the calling function
      throw error;
  }
};

export const getApiClient = (apiKey?: string | null, baseUrl?: string): GoogleGenAI => {
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
): any => {
    if (modelId === 'gemini-2.5-flash-image-preview') {
        // This model has specific requirements and doesn't support other configs.
        return {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
        };
    }
    
    const generationConfig: any = {
        ...config,
        systemInstruction: systemInstruction || undefined,
    };
    if (!generationConfig.systemInstruction) {
        delete generationConfig.systemInstruction;
    }

    const modelSupportsThinking = [
        'models/gemini-flash-lite-latest',
        'gemini-2.5-pro',
        'models/gemini-flash-latest'
    ].includes(modelId);

    if (modelSupportsThinking) {
        // Decouple thinking budget from showing thoughts.
        // `thinkingBudget` controls if and how much the model thinks.
        // `showThoughts` controls if the `thought` field is returned in the stream.
        generationConfig.thinkingConfig = {
            thinkingBudget: thinkingBudget,
            includeThoughts: showThoughts,
        };
    }

    const tools = [];
    if (isGoogleSearchEnabled) {
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