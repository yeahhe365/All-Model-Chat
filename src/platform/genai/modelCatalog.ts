export type ThinkingLevel = 'MINIMAL' | 'LOW' | 'MEDIUM' | 'HIGH';
export type LiveTextTransport = 'client-content' | 'realtime-input';
export type ModelFamily = 'gemini-2.5' | 'gemini-3' | 'gemma-4' | 'imagen-4' | 'other';
export type ModelMode = 'chat' | 'image' | 'tts' | 'native-audio' | 'live';
export type ModelSortCategory = 'standard' | 'native-audio' | 'image' | 'imagen' | 'tts';

export interface ThinkingBudgetRange {
  min: number;
  max: number;
}

export interface ModelDescriptor {
  id: string;
  name: string;
  family: ModelFamily;
  mode: ModelMode;
  sortCategory: ModelSortCategory;
  supportsThinkingLevel: boolean;
  supportsThinkingBudget: boolean;
  mandatoryThinking: boolean;
  supportsLive: boolean;
  supportsRawMode: boolean;
  liveTextTransport: LiveTextTransport;
  supportedAspectRatios?: readonly string[];
  supportedImageSizes?: readonly string[];
  thinkingBudgetRange?: ThinkingBudgetRange;
}

export interface ModelCapabilities {
  isGemini3: boolean;
  isGemini3ImageModel: boolean;
  isImagenModel: boolean;
  isNativeAudioModel: boolean;
  isTtsModel: boolean;
  supportedAspectRatios?: string[];
  supportedImageSizes?: string[];
}

const MODELS_PREFIX_REGEX = /^models\//i;

const GEMINI_IMAGE_ASPECT_RATIOS = [
  'Auto',
  '1:1',
  '16:9',
  '9:16',
  '4:3',
  '3:4',
  '3:2',
  '2:3',
  '4:5',
  '5:4',
  '21:9',
] as const;

const IMAGEN_ASPECT_RATIOS = ['1:1', '16:9', '9:16', '4:3', '3:4'] as const;
const GEMINI_IMAGE_SIZES = ['1K', '2K', '4K'] as const;
const IMAGEN_IMAGE_SIZES = ['1K', '2K'] as const;

export const normalizeModelId = (modelId: string) =>
  modelId.trim().replace(MODELS_PREFIX_REGEX, '').toLowerCase();

const createDescriptor = (descriptor: ModelDescriptor): ModelDescriptor => descriptor;

export const MODEL_CATALOG: readonly ModelDescriptor[] = [
  createDescriptor({
    id: 'gemini-3-flash-preview',
    name: 'Gemini 3 Flash',
    family: 'gemini-3',
    mode: 'chat',
    sortCategory: 'standard',
    supportsThinkingLevel: true,
    supportsThinkingBudget: true,
    mandatoryThinking: true,
    supportsLive: false,
    supportsRawMode: true,
    liveTextTransport: 'client-content',
    thinkingBudgetRange: { min: 128, max: 32768 },
  }),
  createDescriptor({
    id: 'gemini-3.1-flash-lite-preview',
    name: 'Gemini 3.1 Flash Lite',
    family: 'gemini-3',
    mode: 'chat',
    sortCategory: 'standard',
    supportsThinkingLevel: true,
    supportsThinkingBudget: true,
    mandatoryThinking: true,
    supportsLive: false,
    supportsRawMode: true,
    liveTextTransport: 'client-content',
    thinkingBudgetRange: { min: 128, max: 32768 },
  }),
  createDescriptor({
    id: 'gemini-3.1-pro-preview',
    name: 'Gemini 3.1 Pro',
    family: 'gemini-3',
    mode: 'chat',
    sortCategory: 'standard',
    supportsThinkingLevel: true,
    supportsThinkingBudget: true,
    mandatoryThinking: true,
    supportsLive: false,
    supportsRawMode: true,
    liveTextTransport: 'client-content',
    thinkingBudgetRange: { min: 128, max: 32768 },
  }),
  createDescriptor({
    id: 'gemini-3.1-flash-live-preview',
    name: 'Gemini 3.1 Flash Live',
    family: 'gemini-3',
    mode: 'live',
    sortCategory: 'standard',
    supportsThinkingLevel: false,
    supportsThinkingBudget: false,
    mandatoryThinking: false,
    supportsLive: true,
    supportsRawMode: false,
    liveTextTransport: 'realtime-input',
  }),
  createDescriptor({
    id: 'gemini-2.5-pro',
    name: 'Gemini 2.5 Pro',
    family: 'gemini-2.5',
    mode: 'chat',
    sortCategory: 'standard',
    supportsThinkingLevel: false,
    supportsThinkingBudget: true,
    mandatoryThinking: true,
    supportsLive: false,
    supportsRawMode: true,
    liveTextTransport: 'client-content',
    thinkingBudgetRange: { min: 128, max: 32768 },
  }),
  createDescriptor({
    id: 'gemini-2.5-flash-preview-09-2025',
    name: 'Gemini 2.5 Flash',
    family: 'gemini-2.5',
    mode: 'chat',
    sortCategory: 'standard',
    supportsThinkingLevel: false,
    supportsThinkingBudget: true,
    mandatoryThinking: false,
    supportsLive: false,
    supportsRawMode: true,
    liveTextTransport: 'client-content',
    thinkingBudgetRange: { min: 0, max: 24576 },
  }),
  createDescriptor({
    id: 'gemini-2.5-flash-lite-preview-09-2025',
    name: 'Gemini 2.5 Flash Lite',
    family: 'gemini-2.5',
    mode: 'chat',
    sortCategory: 'standard',
    supportsThinkingLevel: false,
    supportsThinkingBudget: true,
    mandatoryThinking: false,
    supportsLive: false,
    supportsRawMode: true,
    liveTextTransport: 'client-content',
    thinkingBudgetRange: { min: 512, max: 24576 },
  }),
  createDescriptor({
    id: 'gemini-2.5-flash-native-audio-preview-12-2025',
    name: 'Gemini 2.5 Flash Native Audio',
    family: 'gemini-2.5',
    mode: 'native-audio',
    sortCategory: 'native-audio',
    supportsThinkingLevel: false,
    supportsThinkingBudget: true,
    mandatoryThinking: false,
    supportsLive: true,
    supportsRawMode: false,
    liveTextTransport: 'client-content',
    thinkingBudgetRange: { min: 0, max: 24576 },
  }),
  createDescriptor({
    id: 'gemini-2.5-flash-image',
    name: 'Nano Banana',
    family: 'gemini-2.5',
    mode: 'image',
    sortCategory: 'image',
    supportsThinkingLevel: false,
    supportsThinkingBudget: false,
    mandatoryThinking: false,
    supportsLive: false,
    supportsRawMode: false,
    liveTextTransport: 'client-content',
    supportedAspectRatios: GEMINI_IMAGE_ASPECT_RATIOS,
  }),
  createDescriptor({
    id: 'gemini-2.5-flash-image-preview',
    name: 'Nano Banana',
    family: 'gemini-2.5',
    mode: 'image',
    sortCategory: 'image',
    supportsThinkingLevel: false,
    supportsThinkingBudget: false,
    mandatoryThinking: false,
    supportsLive: false,
    supportsRawMode: false,
    liveTextTransport: 'client-content',
    supportedAspectRatios: GEMINI_IMAGE_ASPECT_RATIOS,
  }),
  createDescriptor({
    id: 'gemini-3-pro-image-preview',
    name: 'Nano Banana Pro',
    family: 'gemini-3',
    mode: 'image',
    sortCategory: 'image',
    supportsThinkingLevel: false,
    supportsThinkingBudget: false,
    mandatoryThinking: false,
    supportsLive: false,
    supportsRawMode: false,
    liveTextTransport: 'client-content',
    supportedAspectRatios: GEMINI_IMAGE_ASPECT_RATIOS,
    supportedImageSizes: GEMINI_IMAGE_SIZES,
  }),
  createDescriptor({
    id: 'gemini-3.1-flash-image-preview',
    name: 'Nano Banana 2',
    family: 'gemini-3',
    mode: 'image',
    sortCategory: 'image',
    supportsThinkingLevel: false,
    supportsThinkingBudget: false,
    mandatoryThinking: false,
    supportsLive: false,
    supportsRawMode: false,
    liveTextTransport: 'client-content',
    supportedAspectRatios: GEMINI_IMAGE_ASPECT_RATIOS,
    supportedImageSizes: GEMINI_IMAGE_SIZES,
  }),
  createDescriptor({
    id: 'imagen-4.0-fast-generate-001',
    name: 'Imagen 4.0 Fast',
    family: 'imagen-4',
    mode: 'image',
    sortCategory: 'imagen',
    supportsThinkingLevel: false,
    supportsThinkingBudget: false,
    mandatoryThinking: false,
    supportsLive: false,
    supportsRawMode: false,
    liveTextTransport: 'client-content',
    supportedAspectRatios: IMAGEN_ASPECT_RATIOS,
  }),
  createDescriptor({
    id: 'imagen-4.0-generate-001',
    name: 'Imagen 4.0',
    family: 'imagen-4',
    mode: 'image',
    sortCategory: 'imagen',
    supportsThinkingLevel: false,
    supportsThinkingBudget: false,
    mandatoryThinking: false,
    supportsLive: false,
    supportsRawMode: false,
    liveTextTransport: 'client-content',
    supportedAspectRatios: IMAGEN_ASPECT_RATIOS,
    supportedImageSizes: IMAGEN_IMAGE_SIZES,
  }),
  createDescriptor({
    id: 'imagen-4.0-ultra-generate-001',
    name: 'Imagen 4.0 Ultra',
    family: 'imagen-4',
    mode: 'image',
    sortCategory: 'imagen',
    supportsThinkingLevel: false,
    supportsThinkingBudget: false,
    mandatoryThinking: false,
    supportsLive: false,
    supportsRawMode: false,
    liveTextTransport: 'client-content',
    supportedAspectRatios: IMAGEN_ASPECT_RATIOS,
    supportedImageSizes: IMAGEN_IMAGE_SIZES,
  }),
  createDescriptor({
    id: 'gemini-2.5-pro-preview-tts',
    name: 'Gemini 2.5 Pro TTS',
    family: 'gemini-2.5',
    mode: 'tts',
    sortCategory: 'tts',
    supportsThinkingLevel: false,
    supportsThinkingBudget: false,
    mandatoryThinking: false,
    supportsLive: false,
    supportsRawMode: false,
    liveTextTransport: 'client-content',
  }),
  createDescriptor({
    id: 'gemini-2.5-flash-preview-tts',
    name: 'Gemini 2.5 Flash TTS',
    family: 'gemini-2.5',
    mode: 'tts',
    sortCategory: 'tts',
    supportsThinkingLevel: false,
    supportsThinkingBudget: false,
    mandatoryThinking: false,
    supportsLive: false,
    supportsRawMode: false,
    liveTextTransport: 'client-content',
  }),
  createDescriptor({
    id: 'gemma-4-31b-it',
    name: 'Gemma 4 31B IT',
    family: 'gemma-4',
    mode: 'chat',
    sortCategory: 'standard',
    supportsThinkingLevel: false,
    supportsThinkingBudget: false,
    mandatoryThinking: false,
    supportsLive: false,
    supportsRawMode: false,
    liveTextTransport: 'client-content',
  }),
  createDescriptor({
    id: 'gemma-4-26b-a4b-it',
    name: 'Gemma 4 26B A4B IT',
    family: 'gemma-4',
    mode: 'chat',
    sortCategory: 'standard',
    supportsThinkingLevel: false,
    supportsThinkingBudget: false,
    mandatoryThinking: false,
    supportsLive: false,
    supportsRawMode: false,
    liveTextTransport: 'client-content',
  }),
] as const;

const MODEL_DESCRIPTOR_MAP = new Map(MODEL_CATALOG.map((descriptor) => [descriptor.id, descriptor]));

const SORT_WEIGHTS: Record<ModelSortCategory, number> = {
  standard: 1,
  'native-audio': 2,
  image: 3,
  imagen: 4,
  tts: 5,
};

const inferFamily = (modelId: string): ModelFamily => {
  if (modelId.startsWith('gemini-3')) return 'gemini-3';
  if (modelId.startsWith('gemini-2.5')) return 'gemini-2.5';
  if (modelId.startsWith('gemma-4')) return 'gemma-4';
  if (modelId.startsWith('imagen-4')) return 'imagen-4';
  return 'other';
};

const inferMode = (modelId: string): ModelMode => {
  if (modelId.includes('tts')) return 'tts';
  if (modelId.includes('native-audio')) return 'native-audio';
  if (modelId.includes('live')) return 'live';
  if (modelId.includes('image') || modelId.includes('imagen')) return 'image';
  return 'chat';
};

const inferSortCategory = (modelId: string, family: ModelFamily, mode: ModelMode): ModelSortCategory => {
  if (mode === 'tts') return 'tts';
  if (mode === 'native-audio') return 'native-audio';
  if (modelId.includes('imagen')) return 'imagen';
  if (family === 'imagen-4') return 'imagen';
  if (mode === 'image') return 'image';
  return 'standard';
};

const titleCaseWord = (word: string) =>
  word.length === 0 ? word : `${word[0].toUpperCase()}${word.slice(1)}`;

const getFallbackName = (modelId: string) => {
  if (modelId.startsWith('gemma-')) {
    return modelId
      .split('-')
      .map((segment) => {
        if (segment === 'it') return 'IT';
        if (segment === 'a4b') return 'A4B';
        if (/^\d+b$/i.test(segment)) return segment.toUpperCase();
        return titleCaseWord(segment);
      })
      .join(' ');
  }

  return modelId
    .split('-')
    .map((segment) => {
      if (segment === 'tts') return 'TTS';
      if (/^\d+b$/i.test(segment)) return segment.toUpperCase();
      return titleCaseWord(segment);
    })
    .join(' ');
};

const inferImageAspectRatios = (family: ModelFamily, sortCategory: ModelSortCategory) => {
  if (family === 'imagen-4' || sortCategory === 'imagen') {
    return IMAGEN_ASPECT_RATIOS;
  }

  if (sortCategory === 'image') {
    return GEMINI_IMAGE_ASPECT_RATIOS;
  }

  return undefined;
};

const inferImageSizes = (modelId: string, family: ModelFamily, sortCategory: ModelSortCategory) => {
  if (family === 'imagen-4' || sortCategory === 'imagen') {
    return modelId.includes('fast') ? undefined : IMAGEN_IMAGE_SIZES;
  }

  if (family === 'gemini-3' && sortCategory === 'image') {
    return GEMINI_IMAGE_SIZES;
  }

  return undefined;
};

const inferDescriptor = (modelId: string): ModelDescriptor | undefined => {
  if (!modelId) {
    return undefined;
  }

  const family = inferFamily(modelId);
  const mode = inferMode(modelId);
  const sortCategory = inferSortCategory(modelId, family, mode);
  const supportsThinkingLevel = family === 'gemini-3' && mode === 'chat';
  const supportsThinkingBudget =
    (family === 'gemini-3' && mode === 'chat') ||
    (family === 'gemini-2.5' && (mode === 'chat' || mode === 'native-audio'));

  return {
    id: modelId,
    name: getFallbackName(modelId),
    family,
    mode,
    sortCategory,
    supportsThinkingLevel,
    supportsThinkingBudget,
    mandatoryThinking: false,
    supportsLive: mode === 'live' || mode === 'native-audio',
    supportsRawMode: false,
    liveTextTransport: mode === 'live' ? 'realtime-input' : 'client-content',
    supportedAspectRatios: inferImageAspectRatios(family, sortCategory),
    supportedImageSizes: inferImageSizes(modelId, family, sortCategory),
  };
};

export const getModelDescriptor = (modelId: string): ModelDescriptor | undefined => {
  const normalizedModelId = normalizeModelId(modelId);

  if (!normalizedModelId) {
    return undefined;
  }

  return MODEL_DESCRIPTOR_MAP.get(normalizedModelId) ?? inferDescriptor(normalizedModelId);
};

export const getModelCapabilities = (modelId: string): ModelCapabilities => {
  const descriptor = getModelDescriptor(modelId);

  return {
    isGemini3: descriptor?.family === 'gemini-3',
    isGemini3ImageModel: descriptor?.family === 'gemini-3' && descriptor.mode === 'image',
    // Compatibility wrapper: existing UI treats all image-generation models as "Imagen".
    isImagenModel: descriptor?.sortCategory === 'image' || descriptor?.sortCategory === 'imagen',
    isNativeAudioModel: descriptor?.mode === 'native-audio',
    isTtsModel: descriptor?.mode === 'tts',
    supportedAspectRatios: descriptor?.supportedAspectRatios
      ? [...descriptor.supportedAspectRatios]
      : undefined,
    supportedImageSizes: descriptor?.supportedImageSizes
      ? [...descriptor.supportedImageSizes]
      : undefined,
  };
};

export const getModelSortWeight = (modelId: string) =>
  SORT_WEIGHTS[getModelDescriptor(modelId)?.sortCategory ?? 'standard'];

export const getThinkingBudgetRange = (modelId: string) =>
  getModelDescriptor(modelId)?.thinkingBudgetRange;

export const getModelDisplayName = (modelId: string) =>
  getModelDescriptor(modelId)?.name ?? getFallbackName(normalizeModelId(modelId));

export const getLiveTextTransport = (modelId: string): LiveTextTransport =>
  getModelDescriptor(modelId)?.liveTextTransport ?? 'client-content';
