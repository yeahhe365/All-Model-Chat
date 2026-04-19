import type { ModelOption } from '../types';

type ModelRegistryGroup =
  | 'defaultPinned'
  | 'tts'
  | 'image'
  | 'canvas'
  | 'connectionTest'
  | 'transcription';

interface RegisteredModel {
  id: string;
  name: string;
  groups: ModelRegistryGroup[];
  groupLabels?: Partial<Record<ModelRegistryGroup, string>>;
}

const MODEL_REGISTRY: RegisteredModel[] = [
  {
    id: 'gemini-3-flash-preview',
    name: 'Gemini 3 Flash Preview',
    groups: ['defaultPinned', 'canvas', 'connectionTest', 'transcription'],
    groupLabels: {
      canvas: 'Gemini 3 Flash',
      transcription: 'Gemini 3.0 Flash (Fastest)',
    },
  },
  {
    id: 'gemini-3.1-flash-live-preview',
    name: 'Gemini 3.1 Flash Live Preview',
    groups: ['defaultPinned'],
  },
  {
    id: 'gemini-3.1-flash-lite-preview',
    name: 'Gemini 3.1 Flash Lite Preview',
    groups: ['defaultPinned', 'canvas', 'connectionTest', 'transcription'],
    groupLabels: {
      canvas: 'Gemini 3.1 Flash Lite',
      connectionTest: 'Gemini 3.1 Flash Lite',
      transcription: 'Gemini 3.1 Flash Lite',
    },
  },
  {
    id: 'gemini-3.1-pro-preview',
    name: 'Gemini 3.1 Pro Preview',
    groups: ['defaultPinned', 'transcription', 'connectionTest'],
    groupLabels: {
      connectionTest: 'Gemini 3.1 Pro',
      transcription: 'Gemini 3.1 Pro',
    },
  },
  {
    id: 'gemini-2.5-flash-native-audio-preview-12-2025',
    name: 'Gemini 2.5 Flash Native Audio',
    groups: ['defaultPinned'],
  },
  {
    id: 'gemma-4-31b-it',
    name: 'Gemma 4 31B IT',
    groups: ['defaultPinned', 'connectionTest'],
  },
  {
    id: 'gemma-4-26b-a4b-it',
    name: 'Gemma 4 26B A4B IT',
    groups: ['defaultPinned', 'connectionTest'],
  },
  {
    id: 'gemini-2.5-pro-preview-tts',
    name: 'Gemini 2.5 Pro TTS',
    groups: ['tts'],
  },
  {
    id: 'gemini-2.5-flash-preview-tts',
    name: 'Gemini 2.5 Flash TTS',
    groups: ['tts'],
  },
  {
    id: 'gemini-3.1-flash-tts-preview',
    name: 'Gemini 3.1 Flash TTS Preview',
    groups: ['tts'],
  },
  {
    id: 'gemini-2.5-flash-image',
    name: 'Nano Banana',
    groups: ['image'],
  },
  {
    id: 'gemini-3-pro-image-preview',
    name: 'Nano Banana Pro',
    groups: ['image'],
  },
  {
    id: 'gemini-3.1-flash-image-preview',
    name: 'Nano Banana 2',
    groups: ['image'],
  },
  {
    id: 'imagen-4.0-fast-generate-001',
    name: 'Imagen 4.0 Fast',
    groups: ['image'],
  },
  {
    id: 'imagen-4.0-generate-001',
    name: 'Imagen 4.0',
    groups: ['image'],
  },
  {
    id: 'imagen-4.0-ultra-generate-001',
    name: 'Imagen 4.0 Ultra',
    groups: ['image'],
  },
];

const getRegisteredModels = (group: ModelRegistryGroup) =>
  MODEL_REGISTRY.filter((model) => model.groups.includes(group));

export const getModelOptionsForGroup = (
  group: ModelRegistryGroup,
  options: { pinned?: boolean } = {},
): ModelOption[] =>
  getRegisteredModels(group).map((model) => ({
    id: model.id,
    name: model.groupLabels?.[group] || model.name,
    ...(options.pinned !== undefined ? { isPinned: options.pinned } : {}),
  }));
