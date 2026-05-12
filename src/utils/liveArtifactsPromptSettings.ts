import type { LiveArtifactsPromptMode, LiveArtifactsSystemPrompts } from '@/types';

interface LiveArtifactsPromptSettings {
  liveArtifactsPromptMode?: LiveArtifactsPromptMode;
  liveArtifactsSystemPrompt?: string | null;
  liveArtifactsSystemPrompts?: Partial<Record<LiveArtifactsPromptMode, string>> | null;
}

const LIVE_ARTIFACTS_PROMPT_MODES: LiveArtifactsPromptMode[] = ['inline', 'full', 'fullHtml'];

export const createEmptyLiveArtifactsSystemPrompts = (): LiveArtifactsSystemPrompts => ({
  inline: '',
  full: '',
  fullHtml: '',
});

export const normalizeLiveArtifactsSystemPrompts = (
  settings: LiveArtifactsPromptSettings,
): LiveArtifactsSystemPrompts => {
  const prompts = createEmptyLiveArtifactsSystemPrompts();
  const storedPrompts = settings.liveArtifactsSystemPrompts;

  for (const mode of LIVE_ARTIFACTS_PROMPT_MODES) {
    const prompt = storedPrompts?.[mode];
    if (typeof prompt === 'string') {
      prompts[mode] = prompt;
    }
  }

  const hasVersionedPrompt = LIVE_ARTIFACTS_PROMPT_MODES.some((mode) => prompts[mode].trim());
  const legacyPrompt = settings.liveArtifactsSystemPrompt?.trim();

  if (!hasVersionedPrompt && legacyPrompt) {
    prompts[settings.liveArtifactsPromptMode ?? 'inline'] = settings.liveArtifactsSystemPrompt ?? '';
  }

  return prompts;
};

export const getLiveArtifactsSystemPromptOverride = (
  settings: LiveArtifactsPromptSettings,
  promptMode: LiveArtifactsPromptMode = settings.liveArtifactsPromptMode ?? 'inline',
) => normalizeLiveArtifactsSystemPrompts(settings)[promptMode].trim();

export const getLiveArtifactsSystemPromptValue = (
  settings: LiveArtifactsPromptSettings,
  promptMode: LiveArtifactsPromptMode = settings.liveArtifactsPromptMode ?? 'inline',
) => normalizeLiveArtifactsSystemPrompts(settings)[promptMode];

export const updateLiveArtifactsSystemPromptForMode = (
  settings: LiveArtifactsPromptSettings,
  promptMode: LiveArtifactsPromptMode,
  prompt: string,
): LiveArtifactsSystemPrompts => ({
  ...normalizeLiveArtifactsSystemPrompts(settings),
  [promptMode]: prompt,
});
