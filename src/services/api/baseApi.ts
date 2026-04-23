
import type { CountTokensConfig, FunctionDeclaration, GoogleGenAI, Part } from "@google/genai";
import { logService } from "../logService";
import { dbService } from '../../utils/db';
import type { AppSettings } from '../../types';
import { ImageOutputMode, ImagePersonGeneration, SafetySetting, MediaResolution } from "../../types/settings";
import { isGemini3Model, isGeminiRoboticsModel, isGemmaModel } from '../../utils/modelHelpers';
import { DEFAULT_GEMINI_API_BASE_URL, normalizeGeminiApiBaseUrl } from "../../utils/apiProxyUrl";
import { loadDeepSearchSystemPrompt, loadLocalPythonSystemPrompt } from "../../constants/promptHelpers";


const POLLING_INTERVAL_MS = 2000; // 2 seconds
const MAX_POLLING_DURATION_MS = 10 * 60 * 1000; // 10 minutes
const IMAGE_TEXT_MODALITIES = ['IMAGE', 'TEXT'] as const;
const IMAGE_ONLY_MODALITIES = ['IMAGE'] as const;
const toGeminiPersonGeneration = (personGeneration: ImagePersonGeneration): 'ALLOW_ADULT' | 'ALLOW_ALL' | 'ALLOW_NONE' =>
  personGeneration === 'DONT_ALLOW' ? 'ALLOW_NONE' : personGeneration;

export { POLLING_INTERVAL_MS, MAX_POLLING_DURATION_MS };

type ClientHttpOptions = {
  apiVersion?: 'v1alpha';
  baseUrl?: string;
};

type ClientConfig = {
  apiKey: string;
  httpOptions?: ClientHttpOptions;
};

type GenerationConfig = {
  responseModalities?: ReadonlyArray<'IMAGE' | 'TEXT'>;
  responseMimeType?: string;
  responseSchema?: Record<string, unknown>;
  imageConfig?: {
    aspectRatio?: string;
    imageSize?: string;
    personGeneration?: 'ALLOW_ADULT' | 'ALLOW_ALL' | 'ALLOW_NONE';
  };
  thinkingConfig?: {
    includeThoughts: boolean;
    thinkingLevel?: 'MINIMAL' | 'LOW' | 'MEDIUM' | 'HIGH';
    thinkingBudget?: number;
  };
  tools?: Array<
    | {
        googleSearch: {
          searchTypes?: {
            webSearch?: Record<string, never>;
            imageSearch?: Record<string, never>;
          };
        };
      }
    | { functionDeclarations: FunctionDeclaration[] }
    | { codeExecution: Record<string, never> }
    | { urlContext: Record<string, never> }
  >;
  toolConfig?: {
    includeServerSideToolInvocations?: boolean;
  };
  temperature?: number;
  topP?: number;
  topK?: number;
  systemInstruction?: string;
  safetySettings?: SafetySetting[];
  mediaResolution?: MediaResolution;
  abortSignal?: AbortSignal;
};

type BuildGenerationConfigInput = Pick<
  GenerationConfig,
  'temperature' | 'topP' | 'topK' | 'responseMimeType' | 'responseSchema'
>;

export class LiveApiAuthConfigurationError extends Error {
  code:
    | 'MISSING_EPHEMERAL_TOKEN_ENDPOINT'
    | 'FAILED_TO_FETCH_EPHEMERAL_TOKEN'
    | 'FAILED_TO_FETCH_EPHEMERAL_TOKEN_HTTP'
    | 'INVALID_EPHEMERAL_TOKEN_RESPONSE'
    | 'MISSING_EPHEMERAL_TOKEN';

  constructor(
    code:
      | 'MISSING_EPHEMERAL_TOKEN_ENDPOINT'
      | 'FAILED_TO_FETCH_EPHEMERAL_TOKEN'
      | 'FAILED_TO_FETCH_EPHEMERAL_TOKEN_HTTP'
      | 'INVALID_EPHEMERAL_TOKEN_RESPONSE'
      | 'MISSING_EPHEMERAL_TOKEN',
    message: string,
  ) {
    super(message);
    this.name = 'LiveApiAuthConfigurationError';
    this.code = code;
  }
}

const loadGoogleGenAI = async () => {
  const { GoogleGenAI } = await import('@google/genai');
  return GoogleGenAI;
};

export const getClient = async (
  apiKey: string,
  baseUrl?: string | null,
  httpOptions?: ClientHttpOptions,
): Promise<GoogleGenAI> => {
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
      
      const config: ClientConfig = { apiKey: sanitizedApiKey };
      const mergedHttpOptions = httpOptions ? { ...httpOptions } : undefined;

      // Route proxy traffic through the SDK-supported HTTP options path.
      if (baseUrl && baseUrl.trim().length > 0) {
          const sanitizedBaseUrl = normalizeGeminiApiBaseUrl(baseUrl);
          if (mergedHttpOptions) {
              mergedHttpOptions.baseUrl = sanitizedBaseUrl;
          } else {
              config.httpOptions = { baseUrl: sanitizedBaseUrl };
          }
      }

      if (mergedHttpOptions) {
          config.httpOptions = mergedHttpOptions;
      }

      const GoogleGenAIConstructor = await loadGoogleGenAI();
      return new GoogleGenAIConstructor(config);
  } catch (error) {
      logService.error("Failed to initialize GoogleGenAI client:", error);
      // Re-throw to be caught by the calling function
      throw error;
  }
};

export const getApiClient = async (
  apiKey?: string | null,
  baseUrl?: string | null,
  httpOptions?: ClientHttpOptions,
): Promise<GoogleGenAI> => {
    if (!apiKey) {
        const silentError = new Error("API key is not configured in settings or provided.");
        silentError.name = "SilentError";
        throw silentError;
    }
    return await getClient(apiKey, baseUrl, httpOptions);
};

/**
 * Async helper to get an API client with settings (proxy, etc) loaded from DB.
 * Respects the `useApiProxy` toggle.
 */
export const getConfiguredApiClient = async (
  apiKey: string,
  httpOptions?: ClientHttpOptions,
): Promise<GoogleGenAI> => {
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
    
    return await getClient(apiKey, apiProxyUrl, httpOptions);
};

const resolveConfiguredBaseUrl = (
    appSettings: Pick<AppSettings, 'useCustomApiConfig' | 'useApiProxy' | 'apiProxyUrl'>,
): string | null => {
    const shouldUseProxy = !!(appSettings.useCustomApiConfig && appSettings.useApiProxy);
    return shouldUseProxy ? (appSettings.apiProxyUrl ?? null) : null;
};

export const getConfiguredApiBaseUrl = async (): Promise<string> => {
    const settings = await dbService.getAppSettings();
    const configuredBaseUrl = settings
        ? resolveConfiguredBaseUrl(settings)
        : null;

    return normalizeGeminiApiBaseUrl(configuredBaseUrl ?? DEFAULT_GEMINI_API_BASE_URL);
};

export const getConfiguredProxyBaseUrl = async (): Promise<string | null> => {
    const settings = await dbService.getAppSettings();
    const configuredBaseUrl = settings
        ? resolveConfiguredBaseUrl(settings)
        : null;

    return configuredBaseUrl ? normalizeGeminiApiBaseUrl(configuredBaseUrl) : null;
};

const extractLiveApiToken = (payload: unknown): string | null => {
    if (typeof payload === 'string') {
        return payload.trim() || null;
    }

    if (!payload || typeof payload !== 'object') {
        return null;
    }

    const tokenPayload = payload as Record<string, unknown>;
    const token =
        tokenPayload.name ??
        tokenPayload.token ??
        tokenPayload.ephemeralToken ??
        tokenPayload.authToken;

    return typeof token === 'string' && token.trim().length > 0 ? token.trim() : null;
};

export const getLiveApiClient = async (
    appSettings: Pick<AppSettings, 'liveApiEphemeralTokenEndpoint' | 'useCustomApiConfig' | 'useApiProxy' | 'apiProxyUrl'>,
    httpOptions?: ClientHttpOptions,
): Promise<GoogleGenAI> => {
    const endpoint = appSettings.liveApiEphemeralTokenEndpoint?.trim();

    if (!endpoint) {
        throw new LiveApiAuthConfigurationError(
            'MISSING_EPHEMERAL_TOKEN_ENDPOINT',
            'Live API requires an ephemeral token endpoint.',
        );
    }

    let response: Response;
    try {
        response = await fetch(endpoint);
    } catch (error) {
        throw new LiveApiAuthConfigurationError(
            'FAILED_TO_FETCH_EPHEMERAL_TOKEN',
            error instanceof Error
                ? error.message
                : 'Failed to fetch Live API ephemeral token.',
        );
    }

    if (!response.ok) {
        throw new LiveApiAuthConfigurationError(
            'FAILED_TO_FETCH_EPHEMERAL_TOKEN_HTTP',
            `Failed to fetch Live API ephemeral token (${response.status}).`,
        );
    }

    let payload: unknown;
    try {
        payload = await response.json();
    } catch {
        throw new LiveApiAuthConfigurationError(
            'INVALID_EPHEMERAL_TOKEN_RESPONSE',
            'Live API token endpoint must return JSON.',
        );
    }

    const token = extractLiveApiToken(payload);
    if (!token) {
        throw new LiveApiAuthConfigurationError(
            'MISSING_EPHEMERAL_TOKEN',
            'Live API token endpoint response must include `name` or `token`.',
        );
    }

    return getClient(token, resolveConfiguredBaseUrl(appSettings), httpOptions);
};

const hasPerPartMediaResolution = (parts: Part[] = []): boolean =>
    parts.some((part) => Boolean((part as Part & { mediaResolution?: unknown }).mediaResolution));

export const getHttpOptionsForContents = (
    contents: Array<{ parts?: Part[] }>,
): { apiVersion: 'v1alpha' } | undefined => {
    if (contents.some((content) => hasPerPartMediaResolution(content.parts))) {
        return { apiVersion: 'v1alpha' };
    }

    return undefined;
};

export const buildGenerationConfig = async (
    modelId: string,
    systemInstruction: string,
    config: BuildGenerationConfigInput,
    showThoughts: boolean,
    thinkingBudget: number,
    isGoogleSearchEnabled?: boolean,
    isCodeExecutionEnabled?: boolean,
    isUrlContextEnabled?: boolean,
    thinkingLevel?: 'MINIMAL' | 'LOW' | 'MEDIUM' | 'HIGH',
    aspectRatio?: string,
    isDeepSearchEnabled?: boolean,
    imageSize?: string,
    safetySettings?: SafetySetting[],
    mediaResolution?: MediaResolution,
    isLocalPythonEnabled?: boolean,
    imageOutputMode: ImageOutputMode = 'IMAGE_TEXT',
    personGeneration: ImagePersonGeneration = 'ALLOW_ADULT',
): Promise<GenerationConfig> => {
    const googleSearchTool = modelId === 'gemini-3.1-flash-image-preview'
        ? {
            googleSearch: {
                searchTypes: {
                    webSearch: {},
                    imageSearch: {},
                },
            },
        }
        : { googleSearch: {} };

    if (modelId === 'gemini-2.5-flash-image-preview' || modelId === 'gemini-2.5-flash-image') {
        const imageConfig: NonNullable<GenerationConfig['imageConfig']> = {};
        if (aspectRatio && aspectRatio !== 'Auto') imageConfig.aspectRatio = aspectRatio;
        imageConfig.personGeneration = toGeminiPersonGeneration(personGeneration);
        
        const config: GenerationConfig = {
            responseModalities: imageOutputMode === 'IMAGE_ONLY' ? IMAGE_ONLY_MODALITIES : IMAGE_TEXT_MODALITIES,
        };
        if (Object.keys(imageConfig).length > 0) {
            config.imageConfig = imageConfig;
        }
        return config;
    }

    if (modelId === 'gemini-3-pro-image-preview' || modelId === 'gemini-3.1-flash-image-preview') {
         const imageConfig: NonNullable<GenerationConfig['imageConfig']> = {
            imageSize: imageSize || '1K',
            personGeneration: toGeminiPersonGeneration(personGeneration),
         };
         if (aspectRatio && aspectRatio !== 'Auto') {
            imageConfig.aspectRatio = aspectRatio;
         }
         
         const config: GenerationConfig = {
            responseModalities: imageOutputMode === 'IMAGE_ONLY' ? IMAGE_ONLY_MODALITIES : IMAGE_TEXT_MODALITIES,
            imageConfig,
         };

         if (modelId === 'gemini-3.1-flash-image-preview') {
            config.thinkingConfig = {
                includeThoughts: true,
                thinkingLevel: thinkingLevel === 'HIGH' ? 'HIGH' : 'MINIMAL',
            };
         }
         
         // Add tools if enabled
         const tools = [];
         if (isGoogleSearchEnabled) tools.push(googleSearchTool);
         if (tools.length > 0) config.tools = tools;
         
         if (systemInstruction) config.systemInstruction = systemInstruction;
         
         return config;
    }
    
    let finalSystemInstruction = systemInstruction;
    if (isDeepSearchEnabled) {
        const deepSearchPrompt = await loadDeepSearchSystemPrompt();
        finalSystemInstruction = finalSystemInstruction
            ? `${finalSystemInstruction}\n\n${deepSearchPrompt}`
            : deepSearchPrompt;
    }

    if (isLocalPythonEnabled) {
        const localPythonPrompt = await loadLocalPythonSystemPrompt();
        finalSystemInstruction = finalSystemInstruction
            ? `${finalSystemInstruction}\n\n${localPythonPrompt}`
            : localPythonPrompt;
    }

    const isGemma = isGemmaModel(modelId);
    const gemmaThinkingLevel = isGemma
        ? (showThoughts ? 'HIGH' : 'MINIMAL')
        : undefined;

    const generationConfig: GenerationConfig = {
        ...config,
        systemInstruction: finalSystemInstruction || undefined,
        safetySettings: safetySettings || undefined,
    };

    // Check if model is Gemini 3. If so, prefer per-part media resolution (handled in content construction),
    // but we can omit the global config to avoid conflict, or set it if per-part isn't used.
    // However, if we are NOT Gemini 3, we MUST use global config.
    const isGemini3 = isGemini3Model(modelId);
    const normalizedMediaResolution =
        !isGemini3 && mediaResolution === MediaResolution.MEDIA_RESOLUTION_ULTRA_HIGH
            ? MediaResolution.MEDIA_RESOLUTION_HIGH
            : mediaResolution;
    if (!isGemini3 && normalizedMediaResolution) {
        // For non-Gemini 3 models, apply global media resolution when specified.
        generationConfig.mediaResolution = normalizedMediaResolution;
    } 
    // Note: For Gemini 3, we don't set global mediaResolution here because we inject it into parts in `buildContentParts`.
    // The API documentation says per-part overrides global, but to be clean/explicit as requested ("become Per-part"), 
    // we skip global for G3.

    if (!generationConfig.systemInstruction) {
        delete generationConfig.systemInstruction;
    }

    // Robust check for Gemini 3
    const supportsThinkingLevel = isGemini3 || isGeminiRoboticsModel(modelId);

    if (supportsThinkingLevel) {
        // Gemini 3 and Gemini Robotics-ER 1.6 support both thinkingLevel and
        // thinkingBudget. We prioritize budget if it's explicitly set (>0).
        generationConfig.thinkingConfig = {
            includeThoughts: true, // Always capture thoughts in data; UI toggles visibility
        };

        if (thinkingBudget > 0) {
            generationConfig.thinkingConfig.thinkingBudget = thinkingBudget;
        } else {
            generationConfig.thinkingConfig.thinkingLevel = thinkingLevel || 'HIGH';
        }
    } else if (isGemma) {
        generationConfig.thinkingConfig = {
            includeThoughts: true,
            thinkingLevel: gemmaThinkingLevel,
        };
    } else {
        const modelSupportsThinking = modelId.includes('gemini-2.5') || isGeminiRoboticsModel(modelId);

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
        tools.push(googleSearchTool);
    }
    // Only allow server code execution if local python is DISABLED
    if (!isGemma && isCodeExecutionEnabled && !isLocalPythonEnabled) {
        tools.push({ codeExecution: {} });
    }
    if (!isGemma && isUrlContextEnabled) {
        tools.push({ urlContext: {} });
    }

    if (tools.length > 0) {
        generationConfig.tools = tools;
    }
    
    return generationConfig;
};

const hasBuiltInTools = (tools: GenerationConfig['tools'] | undefined): boolean =>
    !!tools?.some((tool) => 'googleSearch' in tool || 'codeExecution' in tool || 'urlContext' in tool);

export const appendFunctionDeclarationsToTools = (
    modelId: string,
    generationConfig: GenerationConfig,
    functionDeclarations: FunctionDeclaration[],
): GenerationConfig => {
    if (functionDeclarations.length === 0) {
        return generationConfig;
    }

    if (hasBuiltInTools(generationConfig.tools) && !isGemini3Model(modelId)) {
        logService.warn(
            'Skipping custom function declarations because built-in/custom tool combinations are only supported for Gemini 3 models.',
            {
                modelId,
                functionDeclarationCount: functionDeclarations.length,
            },
        );
        return generationConfig;
    }

    const hasBuiltIns = hasBuiltInTools(generationConfig.tools);
    const shouldIncludeServerSideToolInvocations = hasBuiltIns && isGemini3Model(modelId);

    return {
        ...generationConfig,
        tools: [
            ...(generationConfig.tools ?? []),
            { functionDeclarations },
        ],
        toolConfig: shouldIncludeServerSideToolInvocations
            ? {
                ...(generationConfig.toolConfig ?? {}),
                includeServerSideToolInvocations: true,
            }
            : generationConfig.toolConfig,
    };
};

export const toCountTokensConfig = (
    generationConfig?: GenerationConfig,
): CountTokensConfig | undefined => {
    if (!generationConfig) {
        return undefined;
    }

    const { systemInstruction, tools } = generationConfig;
    const countTokensConfig: CountTokensConfig = {};

    if (systemInstruction) {
        countTokensConfig.systemInstruction = systemInstruction;
    }

    if (tools && tools.length > 0) {
        countTokensConfig.tools = tools as CountTokensConfig['tools'];
    }

    return Object.keys(countTokensConfig).length > 0 ? countTokensConfig : undefined;
};
