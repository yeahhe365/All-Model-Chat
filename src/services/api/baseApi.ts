


import { GoogleGenAI, Modality } from "@google/genai";
import { logService } from "../logService";
import { dbService } from '../../utils/db';
import { DEEP_SEARCH_SYSTEM_PROMPT, LOCAL_PYTHON_SYSTEM_PROMPT } from "../../constants/promptConstants";
import { HarmBlockThreshold, HarmCategory, SafetySetting, MediaResolution } from "../../types/settings";
import { isGemini3Model } from "../../utils/appUtils";
import { getModelDescriptor, normalizeModelId, type ThinkingLevel } from "../../platform/genai/modelCatalog";


const POLLING_INTERVAL_MS = 2000; // 2 seconds
const MAX_POLLING_DURATION_MS = 10 * 60 * 1000; // 10 minutes

export { POLLING_INTERVAL_MS, MAX_POLLING_DURATION_MS };

const REQUEST_SAFETY_CATEGORY_ORDER: HarmCategory[] = [
    HarmCategory.HARM_CATEGORY_HARASSMENT,
    HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
];

const LEGACY_DEFAULT_SAFETY_CATEGORY_ORDER: HarmCategory[] = [
    ...REQUEST_SAFETY_CATEGORY_ORDER,
    HarmCategory.HARM_CATEGORY_CIVIC_INTEGRITY,
];

const LEGACY_DEFAULT_SAFETY_SETTINGS: SafetySetting[] = LEGACY_DEFAULT_SAFETY_CATEGORY_ORDER.map((category) => ({
    category,
    threshold: HarmBlockThreshold.BLOCK_NONE,
}));

const sortSafetySettingsByOrder = (
    safetySettings: SafetySetting[],
    order: HarmCategory[]
): SafetySetting[] => {
    const latestByCategory = new Map<HarmCategory, HarmBlockThreshold>();

    for (const setting of safetySettings) {
        latestByCategory.set(setting.category, setting.threshold);
    }

    return order
        .filter((category) => latestByCategory.has(category))
        .map((category) => ({
            category,
            threshold: latestByCategory.get(category)!,
        }));
};

const areSafetySettingsEqual = (left: SafetySetting[], right: SafetySetting[]) =>
    left.length === right.length &&
    left.every((setting, index) => (
        setting.category === right[index]?.category &&
        setting.threshold === right[index]?.threshold
    ));

const isLegacyDefaultSafetySettings = (safetySettings?: SafetySetting[]) => {
    if (!safetySettings?.length) {
        return false;
    }

    const normalized = sortSafetySettingsByOrder(safetySettings, LEGACY_DEFAULT_SAFETY_CATEGORY_ORDER);
    return areSafetySettingsEqual(normalized, LEGACY_DEFAULT_SAFETY_SETTINGS);
};

const buildRequestSafetySettings = (safetySettings?: SafetySetting[]) => {
    if (!safetySettings?.length || isLegacyDefaultSafetySettings(safetySettings)) {
        return undefined;
    }

    const normalized = sortSafetySettingsByOrder(
        safetySettings.filter((setting) =>
            REQUEST_SAFETY_CATEGORY_ORDER.includes(setting.category) &&
            setting.threshold !== HarmBlockThreshold.OFF
        ),
        REQUEST_SAFETY_CATEGORY_ORDER
    );

    return normalized.length > 0 ? normalized : undefined;
};

export const getClient = (apiKey: string, baseUrl?: string | null, httpOptions?: any): GoogleGenAI => {
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

      if (httpOptions) {
          config.httpOptions = httpOptions;
      }
      
      return new GoogleGenAI(config);
  } catch (error) {
      logService.error("Failed to initialize GoogleGenAI client:", error);
      // Re-throw to be caught by the calling function
      throw error;
  }
};

export const getApiClient = (apiKey?: string | null, baseUrl?: string | null, httpOptions?: any): GoogleGenAI => {
    if (!apiKey) {
        const silentError = new Error("API key is not configured in settings or provided.");
        silentError.name = "SilentError";
        throw silentError;
    }
    return getClient(apiKey, baseUrl, httpOptions);
};

/**
 * Async helper to get an API client with settings (proxy, etc) loaded from DB.
 * Respects the `useApiProxy` toggle.
 */
export const getConfiguredApiClient = async (apiKey: string, httpOptions?: any): Promise<GoogleGenAI> => {
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
    
    return getClient(apiKey, apiProxyUrl, httpOptions);
};

export const buildGenerationConfig = (
    modelId: string,
    systemInstruction: string,
    config: { temperature?: number; topP?: number; topK?: number },
    showThoughts: boolean,
    thinkingBudget: number,
    isGoogleSearchEnabled?: boolean,
    isCodeExecutionEnabled?: boolean,
    isUrlContextEnabled?: boolean,
    thinkingLevel?: ThinkingLevel,
    aspectRatio?: string,
    isDeepSearchEnabled?: boolean,
    imageSize?: string,
    safetySettings?: SafetySetting[],
    mediaResolution?: MediaResolution,
    isLocalPythonEnabled?: boolean
): any => {
    const normalizedModelId = normalizeModelId(modelId);
    const descriptor = getModelDescriptor(normalizedModelId);
    const isGemini25FlashImageModel =
        normalizedModelId === 'gemini-2.5-flash-image-preview' ||
        normalizedModelId === 'gemini-2.5-flash-image';
    const isGemini3ImageModel = descriptor?.family === 'gemini-3' && descriptor.mode === 'image';

    if (isGemini25FlashImageModel) {
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

    if (isGemini3ImageModel) {
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

    if (isLocalPythonEnabled) {
        finalSystemInstruction = finalSystemInstruction
            ? `${finalSystemInstruction}\n\n${LOCAL_PYTHON_SYSTEM_PROMPT}`
            : LOCAL_PYTHON_SYSTEM_PROMPT;
    }

    // Gemma 4 thinking mode: inject <|think|> token into system prompt when enabled
    const isGemma = descriptor?.family === 'gemma-4' || normalizedModelId.includes('gemma');
    if (isGemma && showThoughts) {
        finalSystemInstruction = finalSystemInstruction
            ? `<|think|>\n${finalSystemInstruction}`
            : '<|think|>';
    }

    const generationConfig: any = {
        ...config,
        systemInstruction: finalSystemInstruction || undefined,
        safetySettings: buildRequestSafetySettings(safetySettings),
    };

    // Check if model is Gemini 3. If so, prefer per-part media resolution (handled in content construction),
    // but we can omit the global config to avoid conflict, or set it if per-part isn't used.
    // However, if we are NOT Gemini 3, we MUST use global config.
    const isGemini3 = isGemini3Model(modelId);
    if (!isGemini3 && !isGemma && mediaResolution) {
        // For non-Gemini 3 models (and not Gemma), apply global resolution if specified
        generationConfig.mediaResolution = mediaResolution;
    } 
    // Note: For Gemini 3, we don't set global mediaResolution here because we inject it into parts in `buildContentParts`.
    // The API documentation says per-part overrides global, but to be clean/explicit as requested ("become Per-part"), 
    // we skip global for G3.

    if (!generationConfig.systemInstruction) {
        delete generationConfig.systemInstruction;
    }

    // Robust check for Gemini 3
    if (isGemini3) {
        // Gemini 3.0 supports both thinkingLevel and thinkingBudget.
        // We prioritize budget if it's explicitly set (>0).
        generationConfig.thinkingConfig = {
            includeThoughts: true, // Always capture thoughts in data; UI toggles visibility
        };

        if (thinkingBudget > 0) {
            generationConfig.thinkingConfig.thinkingBudget = thinkingBudget;
        } else {
            generationConfig.thinkingConfig.thinkingLevel = thinkingLevel || 'HIGH';
        }
    } else {
        const modelSupportsThinking = [
            'gemini-2.5-pro',
        ].includes(modelId) || modelId.includes('gemini-2.5');

        if (modelSupportsThinking) {
            // Decouple thinking budget from showing thoughts.
            // `thinkingBudget` controls if and how much the model thinks.
            // `includeThoughts` controls if the `thought` field is returned in the stream.
            generationConfig.thinkingConfig = {
                thinkingBudget: thinkingBudget,
                includeThoughts: true, // Always capture thoughts in data; UI toggles visibility
            };
        }
    }

    const tools = [];
    // Deep Search requires Google Search tool
    if (isGoogleSearchEnabled || isDeepSearchEnabled) {
        tools.push({ googleSearch: {} });
    }
    // Only allow server code execution if local python is DISABLED
    if (isCodeExecutionEnabled && !isLocalPythonEnabled) {
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
