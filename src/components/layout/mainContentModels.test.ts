import { describe, expect, it } from 'vitest';
import { DEFAULT_APP_SETTINGS, DEFAULT_CHAT_SETTINGS } from '../../constants/appConstants';
import type { AppSettings, ChatSettings } from '../../types';
import { buildSettingsForModal, splitScopedSettingsUpdate } from './mainContentModels';

describe('settings modal models', () => {
  const appSettings = {
    ...DEFAULT_APP_SETTINGS,
    modelId: 'default-model',
    temperature: 0.6,
    language: 'en',
  } as AppSettings;

  const currentChatSettings = {
    ...DEFAULT_CHAT_SETTINGS,
    modelId: 'current-model',
    temperature: 1.2,
  } as ChatSettings;

  it('builds default scoped settings from app settings only', () => {
    const settings = buildSettingsForModal({
      appSettings,
      activeSessionId: 'chat-1',
      currentChatSettings,
      scope: 'defaults',
    });

    expect(settings.modelId).toBe('default-model');
    expect(settings.temperature).toBe(0.6);
  });

  it('builds current chat scoped settings by overlaying chat settings on defaults', () => {
    const settings = buildSettingsForModal({
      appSettings,
      activeSessionId: 'chat-1',
      currentChatSettings,
      scope: 'currentChat',
    });

    expect(settings.modelId).toBe('current-model');
    expect(settings.temperature).toBe(1.2);
    expect(settings.language).toBe('en');
  });

  it('routes current chat scoped chat keys to the chat settings and app keys to defaults', () => {
    const previousSettings = buildSettingsForModal({
      appSettings,
      activeSessionId: 'chat-1',
      currentChatSettings,
      scope: 'currentChat',
    });
    const nextSettings = {
      ...previousSettings,
      modelId: 'next-current-model',
      temperature: 0.3,
      language: 'zh',
    } as AppSettings;

    const result = splitScopedSettingsUpdate({
      scope: 'currentChat',
      previousSettings,
      nextSettings,
      appSettings,
      currentChatSettings,
    });

    expect(result.nextChatSettings?.modelId).toBe('next-current-model');
    expect(result.nextChatSettings?.temperature).toBe(0.3);
    expect(result.nextAppSettings?.language).toBe('zh');
    expect(result.nextAppSettings?.modelId).toBe('default-model');
  });
});
