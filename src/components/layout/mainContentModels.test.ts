import { describe, expect, it } from 'vitest';
import { createAppSettings, createChatSettings } from '../../test/factories';
import { buildSettingsForModal, splitScopedSettingsUpdate } from './mainContentModels';

describe('settings modal models', () => {
  const appSettings = createAppSettings({
    modelId: 'default-model',
    temperature: 0.6,
    language: 'en',
  });

  const currentChatSettings = createChatSettings({
    modelId: 'current-model',
    temperature: 1.2,
  });

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
    const nextSettings = createAppSettings({
      ...previousSettings,
      modelId: 'next-current-model',
      temperature: 0.3,
      language: 'zh',
    });

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
