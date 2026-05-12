import type { AppSettings } from '@/types';

type OpenAICompatibleModeSettings = Pick<AppSettings, 'apiMode' | 'isOpenAICompatibleApiEnabled'>;

export const isOpenAICompatibleApiActive = (settings: OpenAICompatibleModeSettings): boolean =>
  settings.isOpenAICompatibleApiEnabled === true && settings.apiMode === 'openai-compatible';
