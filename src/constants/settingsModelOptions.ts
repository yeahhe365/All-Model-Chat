import { ModelOption } from '../types';
import { DEFAULT_AUTO_CANVAS_MODEL_ID } from './modelConstants';

export const AVAILABLE_CANVAS_MODELS: ModelOption[] = [
  { id: DEFAULT_AUTO_CANVAS_MODEL_ID, name: 'Gemini 3 Flash' },
  { id: 'gemini-3.1-flash-lite-preview', name: 'Gemini 3.1 Flash Lite' },
];

export const CONNECTION_TEST_MODELS: ModelOption[] = [
  { id: DEFAULT_AUTO_CANVAS_MODEL_ID, name: 'Gemini 3 Flash Preview' },
  { id: 'gemini-3.1-flash-lite-preview', name: 'Gemini 3.1 Flash Lite' },
  { id: 'gemma-4-31b-it', name: 'Gemma 4 31B IT' },
  { id: 'gemma-4-26b-a4b-it', name: 'Gemma 4 26B A4B IT' },
];

export const AVAILABLE_TRANSCRIPTION_MODELS: { id: string; name: string }[] = [
  { id: 'gemini-3-flash-preview', name: 'Gemini 3.0 Flash (Fastest)' },
  { id: 'gemini-3.1-flash-lite-preview', name: 'Gemini 3.1 Flash Lite' },
  { id: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro' },
];
