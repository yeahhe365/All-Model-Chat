export interface GeminiApiKeyEnv {
  VITE_GEMINI_API_KEY?: string;
  GEMINI_API_KEY?: string;
}

export const resolveGeminiApiKeys = (env: GeminiApiKeyEnv) => {
  const viteApiKeys = env.VITE_GEMINI_API_KEY?.trim();
  if (viteApiKeys) {
    return viteApiKeys;
  }

  const legacyApiKeys = env.GEMINI_API_KEY?.trim();
  return legacyApiKeys || null;
};
