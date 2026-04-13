import { ModelOption } from '../types';
import { sortModels } from './modelHelpers';

const INITIAL_PINNED_MODELS: string[] = [
  'gemini-3-flash-preview',
  'gemini-3.1-flash-live-preview',
  'gemini-3.1-flash-lite-preview',
  'gemini-3.1-pro-preview',
  'gemini-2.5-flash-native-audio-preview-12-2025',
  'gemma-4-31b-it',
  'gemma-4-26b-a4b-it',
];

const STATIC_TTS_MODELS: ModelOption[] = [
  { id: 'gemini-2.5-pro-preview-tts', name: 'Gemini 2.5 Pro TTS', isPinned: true },
  { id: 'gemini-2.5-flash-preview-tts', name: 'Gemini 2.5 Flash TTS', isPinned: true },
];

const STATIC_IMAGEN_MODELS: ModelOption[] = [
  { id: 'gemini-2.5-flash-image', name: 'Nano Banana', isPinned: true },
  { id: 'gemini-3-pro-image-preview', name: 'Nano Banana Pro', isPinned: true },
  { id: 'gemini-3.1-flash-image-preview', name: 'Nano Banana 2', isPinned: true },
  { id: 'imagen-4.0-fast-generate-001', name: 'Imagen 4.0 Fast', isPinned: true },
  { id: 'imagen-4.0-generate-001', name: 'Imagen 4.0', isPinned: true },
  { id: 'imagen-4.0-ultra-generate-001', name: 'Imagen 4.0 Ultra', isPinned: true },
];

export const getDefaultModelOptions = (): ModelOption[] => {
  const pinnedInternalModels: ModelOption[] = INITIAL_PINNED_MODELS.map(id => {
    let name;
    if (id === 'gemini-2.5-flash-native-audio-preview-12-2025') {
      name = 'Gemini 2.5 Flash Native Audio';
    } else if (id.toLowerCase().includes('gemma')) {
      name = id.replace(/-/g, ' ')
        .replace(/\b\w/g, l => l.toUpperCase())
        .replace(/\bIt\b/, 'IT')
        .replace(/\bA4b\b/, 'A4B')
        .replace(/(\d)B\b/g, '$1B');
    } else {
      name = id.includes('/')
        ? `Gemini ${id.split('/')[1]}`.replace('gemini-', '').replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
        : `Gemini ${id.replace('gemini-', '').replace(/-/g, ' ')}`.replace(/\b\w/g, l => l.toUpperCase());
    }

    return { id, name, isPinned: true };
  });

  return sortModels([...pinnedInternalModels, ...STATIC_TTS_MODELS, ...STATIC_IMAGEN_MODELS]);
};
