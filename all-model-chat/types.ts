
// Re-export types from the decomposed files in the types/ directory
export * from './types/settings';
export * from './types/chat';
export * from './types/api';
export * from './types/theme';

import { ChatHistoryItem } from "@google/genai";

export type { ChatHistoryItem };
