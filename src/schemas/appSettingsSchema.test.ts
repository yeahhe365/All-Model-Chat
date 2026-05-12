import { describe, expect, it } from 'vitest';
import { sanitizeImportedAppSettings } from './appSettingsSchema';

describe('appSettingsSchema', () => {
  it('preserves custom Live Artifacts prompts from imported settings', () => {
    const settings = sanitizeImportedAppSettings({
      liveArtifactsSystemPrompt: 'Custom Live Artifacts prompt',
    });

    expect((settings as { liveArtifactsSystemPrompt?: string }).liveArtifactsSystemPrompt).toBe(
      'Custom Live Artifacts prompt',
    );
  });

  it('defaults missing custom Live Artifacts prompts to blank', () => {
    const settings = sanitizeImportedAppSettings({});

    expect((settings as { liveArtifactsSystemPrompt?: string }).liveArtifactsSystemPrompt).toBe('');
  });

  it('preserves per-version custom Live Artifacts prompts from imported settings', () => {
    const settings = sanitizeImportedAppSettings({
      liveArtifactsSystemPrompts: {
        inline: 'Inline custom prompt',
        full: 'Full custom prompt',
        fullHtml: 'Complete HTML custom prompt',
        unsupported: 'Ignore me',
      },
    });

    expect(
      (
        settings as {
          liveArtifactsSystemPrompts?: Record<string, string>;
        }
      ).liveArtifactsSystemPrompts,
    ).toEqual({
      inline: 'Inline custom prompt',
      full: 'Full custom prompt',
      fullHtml: 'Complete HTML custom prompt',
    });
  });

  it('defaults Live Artifacts built-in prompt mode to inline', () => {
    const settings = sanitizeImportedAppSettings({});

    expect(settings.liveArtifactsPromptMode).toBe('inline');
  });

  it('preserves valid Live Artifacts built-in prompt modes', () => {
    const settings = sanitizeImportedAppSettings({
      liveArtifactsPromptMode: 'full',
    });

    expect(settings.liveArtifactsPromptMode).toBe('full');
  });

  it('preserves the complete HTML Live Artifacts built-in prompt mode', () => {
    const settings = sanitizeImportedAppSettings({
      liveArtifactsPromptMode: 'fullHtml',
    });

    expect(settings.liveArtifactsPromptMode).toBe('fullHtml');
  });
});
