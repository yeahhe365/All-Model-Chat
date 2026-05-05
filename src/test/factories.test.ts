import { describe, expect, it } from 'vitest';
import {
  createAppSettings,
  createChatMessage,
  createChatSettings,
  createSavedChatSession,
  createUploadedFile,
} from './factories';
import { createMessageSenderProps, createSessionLoaderProps, createStandardChatProps } from './hookFactories';

describe('typed test factories', () => {
  it('creates complete settings and chat records with focused overrides', () => {
    expect(createChatSettings({ modelId: 'model-from-test' }).modelId).toBe('model-from-test');
    expect(createAppSettings({ language: 'zh' }).language).toBe('zh');
    expect(createUploadedFile({ name: 'report.pdf', type: 'application/pdf' }).name).toBe('report.pdf');
    expect(createChatMessage({ role: 'model', content: 'answer' }).content).toBe('answer');
    expect(createSavedChatSession({ title: 'Saved' }).settings.modelId).toBe('gemini-3.1-pro-preview');
  });

  it('creates complete hook props with typed nested overrides', () => {
    expect(
      createMessageSenderProps({ currentChatSettings: { modelId: 'sender-model' } }).currentChatSettings.modelId,
    ).toBe('sender-model');
    expect(createStandardChatProps({ appSettings: { isStreamingEnabled: false } }).appSettings.isStreamingEnabled).toBe(
      false,
    );
    expect(createSessionLoaderProps({ activeSessionId: 'loader-session' }).activeSessionId).toBe('loader-session');
  });
});
