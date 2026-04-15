import { describe, expect, it } from 'vitest';
import { buildSettingsForModal } from './mainContentModels';

describe('buildSettingsForModal', () => {
  it('overlays current chat settings onto app settings for the active session', () => {
    const appSettings = {
      modelId: 'gemini-2.5-pro',
      systemInstruction: 'app-level instruction',
      thinkingLevel: 'HIGH',
    };

    const settings = buildSettingsForModal({
      appSettings: appSettings as any,
      activeSessionId: 'session-1',
      currentChatSettings: {
        modelId: 'gemini-3.1-flash-live-preview',
        systemInstruction: 'session-level instruction',
        thinkingLevel: 'LOW',
      } as any,
    });

    expect(settings.modelId).toBe('gemini-3.1-flash-live-preview');
    expect(settings.systemInstruction).toBe('session-level instruction');
    expect(settings.thinkingLevel).toBe('LOW');
  });
});
