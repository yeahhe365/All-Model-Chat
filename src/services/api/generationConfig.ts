import type { CountTokensConfig, FunctionDeclaration } from '@google/genai';
import { loadDeepSearchSystemPrompt, loadLocalPythonSystemPrompt } from '../../constants/promptHelpers';
import type { ChatSettings, ImageOutputMode, ImagePersonGeneration, SafetySetting } from '../../types/settings';
import { MediaResolution } from '../../types/settings';
import { logService } from '../logService';
import {
  isGemini3Model,
  isGeminiRoboticsModel,
  isGemmaModel,
  getModelCapabilities,
  normalizeAspectRatioForModel,
  normalizeImageSizeForModel,
} from '../../utils/modelHelpers';

const IMAGE_TEXT_MODALITIES = ['IMAGE', 'TEXT'] as const;
const IMAGE_ONLY_MODALITIES = ['IMAGE'] as const;

type GenerationConfig = {
  responseModalities?: ReadonlyArray<'IMAGE' | 'TEXT'>;
  responseMimeType?: string;
  responseSchema?: Record<string, unknown>;
  imageConfig?: {
    aspectRatio?: string;
    imageSize?: string;
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

type GenerationConfigSettings = Pick<
  ChatSettings,
  | 'modelId'
  | 'systemInstruction'
  | 'temperature'
  | 'topP'
  | 'topK'
  | 'showThoughts'
  | 'thinkingBudget'
  | 'isGoogleSearchEnabled'
  | 'isCodeExecutionEnabled'
  | 'isUrlContextEnabled'
  | 'thinkingLevel'
  | 'isDeepSearchEnabled'
  | 'safetySettings'
  | 'mediaResolution'
  | 'isLocalPythonEnabled'
>;

interface BuildGenerationConfigOptions {
  settings: GenerationConfigSettings;
  modelId?: string;
  systemInstruction?: string;
  config?: Partial<BuildGenerationConfigInput>;
  aspectRatio?: string;
  imageSize?: string;
  isLocalPythonEnabled?: boolean;
  imageOutputMode?: ImageOutputMode;
  personGeneration?: ImagePersonGeneration;
}

type InternalBuildGenerationConfigOptions = {
  modelId: string;
  systemInstruction: string;
  config: BuildGenerationConfigInput;
  showThoughts: boolean;
  thinkingBudget: number;
  isGoogleSearchEnabled?: boolean;
  isCodeExecutionEnabled?: boolean;
  isUrlContextEnabled?: boolean;
  thinkingLevel?: 'MINIMAL' | 'LOW' | 'MEDIUM' | 'HIGH';
  aspectRatio?: string;
  isDeepSearchEnabled?: boolean;
  imageSize?: string;
  safetySettings?: SafetySetting[];
  mediaResolution?: MediaResolution;
  isLocalPythonEnabled?: boolean;
  imageOutputMode?: ImageOutputMode;
  personGeneration?: ImagePersonGeneration;
};

const toInternalBuildGenerationConfigOptions = (
  options: BuildGenerationConfigOptions,
): InternalBuildGenerationConfigOptions => {
  const { settings } = options;

  return {
    modelId: options.modelId ?? settings.modelId,
    systemInstruction: options.systemInstruction ?? settings.systemInstruction,
    config: {
      temperature: settings.temperature,
      topP: settings.topP,
      topK: settings.topK,
      ...options.config,
    },
    showThoughts: settings.showThoughts,
    thinkingBudget: settings.thinkingBudget,
    isGoogleSearchEnabled: settings.isGoogleSearchEnabled,
    isCodeExecutionEnabled: settings.isCodeExecutionEnabled,
    isUrlContextEnabled: settings.isUrlContextEnabled,
    thinkingLevel: settings.thinkingLevel,
    aspectRatio: options.aspectRatio,
    isDeepSearchEnabled: settings.isDeepSearchEnabled,
    imageSize: options.imageSize,
    safetySettings: settings.safetySettings,
    mediaResolution: settings.mediaResolution,
    isLocalPythonEnabled: options.isLocalPythonEnabled ?? settings.isLocalPythonEnabled,
    imageOutputMode: options.imageOutputMode,
    personGeneration: options.personGeneration,
  };
};

async function buildGenerationConfigFromOptions({
  modelId,
  systemInstruction,
  config,
  showThoughts,
  thinkingBudget,
  isGoogleSearchEnabled,
  isCodeExecutionEnabled,
  isUrlContextEnabled,
  thinkingLevel,
  aspectRatio,
  isDeepSearchEnabled,
  imageSize,
  safetySettings,
  mediaResolution,
  isLocalPythonEnabled,
  imageOutputMode = 'IMAGE_TEXT',
}: InternalBuildGenerationConfigOptions): Promise<GenerationConfig> {
  const normalizedAspectRatio = normalizeAspectRatioForModel(modelId, aspectRatio);
  const normalizedImageSize = normalizeImageSizeForModel(modelId, imageSize);
  const googleSearchTool =
    modelId === 'gemini-3.1-flash-image-preview'
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
    if (normalizedAspectRatio && normalizedAspectRatio !== 'Auto') {
      imageConfig.aspectRatio = normalizedAspectRatio;
    }

    const generationConfig: GenerationConfig = {
      responseModalities: imageOutputMode === 'IMAGE_ONLY' ? IMAGE_ONLY_MODALITIES : IMAGE_TEXT_MODALITIES,
    };
    if (Object.keys(imageConfig).length > 0) {
      generationConfig.imageConfig = imageConfig;
    }
    return generationConfig;
  }

  if (modelId === 'gemini-3-pro-image-preview' || modelId === 'gemini-3.1-flash-image-preview') {
    const imageConfig: NonNullable<GenerationConfig['imageConfig']> = {
      imageSize: normalizedImageSize || '1K',
    };
    if (normalizedAspectRatio && normalizedAspectRatio !== 'Auto') {
      imageConfig.aspectRatio = normalizedAspectRatio;
    }

    const generationConfig: GenerationConfig = {
      responseModalities: imageOutputMode === 'IMAGE_ONLY' ? IMAGE_ONLY_MODALITIES : IMAGE_TEXT_MODALITIES,
      imageConfig,
    };

    if (modelId === 'gemini-3.1-flash-image-preview') {
      generationConfig.thinkingConfig = {
        includeThoughts: true,
        thinkingLevel: thinkingLevel === 'HIGH' ? 'HIGH' : 'MINIMAL',
      };
    }

    const tools: NonNullable<GenerationConfig['tools']> = [];
    if (isGoogleSearchEnabled) tools.push(googleSearchTool);
    if (tools.length > 0) generationConfig.tools = tools;

    if (systemInstruction) generationConfig.systemInstruction = systemInstruction;

    return generationConfig;
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
  const gemmaThinkingLevel = isGemma ? (showThoughts ? 'HIGH' : 'MINIMAL') : undefined;

  const generationConfig: GenerationConfig = {
    ...config,
    systemInstruction: finalSystemInstruction || undefined,
    safetySettings: safetySettings || undefined,
  };

  const isGemini3 = isGemini3Model(modelId);
  const normalizedMediaResolution =
    !isGemini3 && mediaResolution === MediaResolution.MEDIA_RESOLUTION_ULTRA_HIGH
      ? MediaResolution.MEDIA_RESOLUTION_HIGH
      : mediaResolution;
  if (!isGemini3 && normalizedMediaResolution) {
    generationConfig.mediaResolution = normalizedMediaResolution;
  }

  if (!generationConfig.systemInstruction) {
    delete generationConfig.systemInstruction;
  }

  const supportsThinkingLevel = isGemini3 || isGeminiRoboticsModel(modelId);

  if (supportsThinkingLevel) {
    generationConfig.thinkingConfig = {
      includeThoughts: true,
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
    const modelSupportsThinking = getModelCapabilities(modelId).supportsThinkingBudgetConfig;

    if (modelSupportsThinking) {
      generationConfig.thinkingConfig = {
        thinkingBudget,
        includeThoughts: true,
      };
    }
  }

  const tools: NonNullable<GenerationConfig['tools']> = [];
  if (isGoogleSearchEnabled || isDeepSearchEnabled) {
    tools.push(googleSearchTool);
  }
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
}

export const buildGenerationConfig = (options: BuildGenerationConfigOptions): Promise<GenerationConfig> =>
  buildGenerationConfigFromOptions(toInternalBuildGenerationConfigOptions(options));

const hasBuiltInTools = (tools: GenerationConfig['tools'] | undefined): boolean =>
  !!tools?.some((tool) => 'googleSearch' in tool || 'codeExecution' in tool || 'urlContext' in tool);

export const appendFunctionDeclarationsToTools = (
  modelId: string,
  generationConfig: GenerationConfig,
  functionDeclarations: FunctionDeclaration[],
): GenerationConfig => {
  const supportsBuiltInCustomToolCombination = isGemini3Model(modelId) || isGeminiRoboticsModel(modelId);
  const hasBuiltIns = hasBuiltInTools(generationConfig.tools);
  const shouldIncludeServerSideToolInvocations = hasBuiltIns && supportsBuiltInCustomToolCombination;

  if (functionDeclarations.length === 0) {
    return shouldIncludeServerSideToolInvocations
      ? {
          ...generationConfig,
          toolConfig: {
            ...(generationConfig.toolConfig ?? {}),
            includeServerSideToolInvocations: true,
          },
        }
      : generationConfig;
  }

  if (hasBuiltInTools(generationConfig.tools) && !supportsBuiltInCustomToolCombination) {
    logService.warn(
      'Skipping custom function declarations because built-in/custom tool combinations are only supported for Gemini 3 models.',
      {
        modelId,
        functionDeclarationCount: functionDeclarations.length,
      },
    );
    return generationConfig;
  }

  return {
    ...generationConfig,
    tools: [...(generationConfig.tools ?? []), { functionDeclarations }],
    toolConfig: shouldIncludeServerSideToolInvocations
      ? {
          ...(generationConfig.toolConfig ?? {}),
          includeServerSideToolInvocations: true,
        }
      : generationConfig.toolConfig,
  };
};

export const toCountTokensConfig = (generationConfig?: GenerationConfig): CountTokensConfig | undefined => {
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
