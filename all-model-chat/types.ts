
// Re-export types from the decomposed files in the types/ directory
export * from './types/settings';
export * from './types/chat';
export * from './types/api';
// Props are now exported from their respective components

// Re-export ThemeColors from constants as it was in the original file
import { ThemeColors, Theme } from './constants/themeConstants';
import { ChatHistoryItem } from "@google/genai";

export type { ThemeColors, Theme, ChatHistoryItem };
