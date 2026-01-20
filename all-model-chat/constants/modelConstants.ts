
import { ModelOption } from '../types';

export const DEFAULT_MODEL_ID = 'gemini-3-flash-preview'; 

export const TAB_CYCLE_MODELS: string[] = [
    'gemini-3-flash-preview',
    'gemini-3-pro-preview',
];

export const INITIAL_PINNED_MODELS: string[] = [
    'gemini-3-flash-preview',
    'gemini-3-pro-preview',
    'gemini-2.5-pro',
    'gemini-2.5-flash-preview-09-2025',
    'gemini-2.5-flash-lite-preview-09-2025',
    'gemini-2.5-flash-native-audio-preview-12-2025',
    'gemma-3-27b-it',
];

export const GEMINI_3_RO_MODELS: string[] = [
    'gemini-3-pro-preview', 
    'models/gemini-3-pro-preview',
    'gemini-3-flash-preview',
    'models/gemini-3-flash-preview',
];

export const MODELS_MANDATORY_THINKING = [
    'gemini-3-pro-preview',
    'models/gemini-3-pro-preview',
    'gemini-3-flash-preview',
    'models/gemini-3-flash-preview',
    'gemini-2.5-pro',
];

export const THINKING_LEVELS = [
    { id: 'MINIMAL', name: 'Minimal' },
    { id: 'LOW', name: 'Low' },
    { id: 'MEDIUM', name: 'Medium' },
    { id: 'HIGH', name: 'High' },
];

export const DEFAULT_THINKING_LEVEL = 'HIGH';

export const THINKING_BUDGET_RANGES: { [key: string]: { min: number; max: number } } = {
    'gemini-2.5-flash-preview-09-2025': { min: 0, max: 24576 },
    'gemini-2.5-pro': { min: 128, max: 32768 },
    'gemini-3-pro-preview': { min: 128, max: 32768 }, 
    'models/gemini-3-pro-preview': { min: 128, max: 32768 },
    'gemini-3-flash-preview': { min: 128, max: 32768 },
    'models/gemini-3-flash-preview': { min: 128, max: 32768 },
    'gemini-2.5-flash-lite-preview-09-2025': { min: 512, max: 24576 },
    'gemini-2.5-flash-native-audio-preview-12-2025': { min: 0, max: 24576 },
};

export const DEFAULT_TEMPERATURE = 1.0; 
export const DEFAULT_TOP_P = 0.95; 
export const DEFAULT_SHOW_THOUGHTS = true;
export const DEFAULT_THINKING_BUDGET = -1; // -1 for auto/unlimited budget
export const DEFAULT_TTS_VOICE = 'Zephyr';

export const DEFAULT_TRANSCRIPTION_MODEL_ID = 'gemini-3-flash-preview';
export const DEFAULT_TTS_MODEL_ID = 'gemini-2.5-flash-preview-tts';

export const STATIC_TTS_MODELS: ModelOption[] = [
    { id: 'gemini-2.5-pro-preview-tts', name: 'Gemini 2.5 Pro TTS', isPinned: true },
    { id: 'gemini-2.5-flash-preview-tts', name: 'Gemini 2.5 Flash TTS', isPinned: true },
];

export const STATIC_IMAGEN_MODELS: ModelOption[] = [
    { id: 'gemini-2.5-flash-image', name: 'Nano Banana', isPinned: true },
    { id: 'gemini-3-pro-image-preview', name: 'Nano Banana Pro', isPinned: true },
    { id: 'imagen-4.0-fast-generate-001', name: 'Imagen 4.0 Fast', isPinned: true },
    { id: 'imagen-4.0-generate-001', name: 'Imagen 4.0', isPinned: true },
    { id: 'imagen-4.0-ultra-generate-001', name: 'Imagen 4.0 Ultra', isPinned: true },
];

export const AVAILABLE_TRANSCRIPTION_MODELS: { id: string; name: string }[] = [
    { id: 'gemini-3-flash-preview', name: 'Gemini 3.0 Flash (Fastest)' },
    { id: 'gemini-3-pro-preview', name: 'Gemini 3.0 Pro' },
    { id: 'gemini-2.5-flash-preview-09-2025', name: 'Gemini 2.5 Flash' },
    { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro (Higher Quality)' },
    { id: 'gemini-2.5-flash-lite-preview-09-2025', name: 'Gemini 2.5 Flash Lite' },
    { id: 'gemini-2.5-flash-native-audio-preview-12-2025', name: 'Gemini 2.5 Flash Native Audio' },
];

export const AVAILABLE_TTS_VOICES: { id: string; name: string }[] = [
    { id: 'Zephyr', name: 'Zephyr (Bright)' },
    { id: 'Puck', name: 'Puck (Upbeat)' },
    { id: 'Charon', name: 'Charon (Informative)' },
    { id: 'Kore', name: 'Kore (Firm)' },
    { id: 'Fenrir', name: 'Fenrir (Excitable)' },
    { id: 'Leda', name: 'Leda (Youthful)' },
    { id: 'Orus', name: 'Orus (Firm)' },
    { id: 'Aoede', name: 'Aoede (Breezy)' },
    { id: 'Callirrhoe', name: 'Callirrhoe (Easy-going)' },
    { id: 'Autonoe', name: 'Autonoe (Bright)' },
    { id: 'Enceladus', name: 'Enceladus (Breathy)' },
    { id: 'Iapetus', name: 'Iapetus (Clear)' },
    { id: 'Umbriel', name: 'Umbriel (Easy-going)' },
    { id: 'Algieba', name: 'Algieba (Smooth)' },
    { id: 'Despina', name: 'Despina (Smooth)' },
    { id: 'Erinome', name: 'Erinome (Clear)' },
    { id: 'Algenib', name: 'Algenib (Gravelly)' },
    { id: 'Rasalgethi', name: 'Rasalgethi (Informative)' },
    { id: 'Laomedeia', name: 'Laomedeia (Upbeat)' },
    { id: 'Achernar', name: 'Achernar (Soft)' },
    { id: 'Alnilam', name: 'Alnilam (Firm)' },
    { id: 'Schedar', name: 'Schedar (Even)' },
    { id: 'Gacrux', name: 'Gacrux (Mature)' },
    { id: 'Pulcherrima', name: 'Pulcherrima (Forward)' },
    { id: 'Achird', name: 'Achird (Friendly)' },
    { id: 'Zubenelgenubi', name: 'Zubenelgenubi (Casual)' },
    { id: 'Vindemiatrix', name: 'Vindemiatrix (Gentle)' },
    { id: 'Sadachbia', name: 'Sadachbia (Lively)' },
    { id: 'Sadaltager', name: 'Sadaltager (Knowledgeable)' },
    { id: 'Sulafat', name: 'Sulafat (Warm)' },
];
