import { act } from 'react';
import { createTestRenderer, type TestRenderer } from '@/test/testUtils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useSettingsStore } from '../../../stores/settingsStore';
import { ChatBehaviorSection } from './ChatBehaviorSection';

vi.mock('../ModelVoiceSettings', () => ({
  ModelVoiceSettings: () => <div data-testid="model-voice-settings" />,
}));

vi.mock('./SafetySection', () => ({
  SafetySection: () => <div data-testid="safety-section" />,
}));

const baseProps = {
  modelId: 'gemini-3.1-flash-lite-preview',
  setModelId: vi.fn(),
  availableModels: [{ id: 'gemini-3.1-flash-lite-preview', name: 'Gemini 3.1 Flash Lite Preview' }],
  setAvailableModels: vi.fn(),
  currentSettings: {
    ...useSettingsStore.getState().appSettings,
    transcriptionModelId: 'gemini-3.1-flash-lite-preview',
    ttsVoice: 'Zephyr',
    systemInstruction: '',
    temperature: 1,
    topP: 0.95,
    topK: 64,
    thinkingBudget: 0,
    showThoughts: true,
    safetySettings: [],
    translationTargetLanguage: 'English' as const,
    inputTranslationModelId: 'gemini-3.1-flash-lite-preview',
    thoughtTranslationTargetLanguage: 'Simplified Chinese' as const,
    thoughtTranslationModelId: 'gemini-3.1-flash-lite-preview',
    autoCanvasVisualization: false,
    autoCanvasModelId: 'gemini-3.1-flash-lite-preview',
  },
  onUpdateSetting: vi.fn(),
};

describe('ChatBehaviorSection', () => {
  let container: HTMLDivElement;
  let root: TestRenderer;

  beforeEach(() => {
    root = createTestRenderer();
    container = root.container;
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
  });

  it('shows translation controls without extra subgroup headings and keeps language before model', () => {
    useSettingsStore.setState({ language: 'zh' });

    act(() => {
      root.render(<ChatBehaviorSection {...baseProps} />);
    });

    const text = container.textContent || '';
    const inputLanguage = text.indexOf('输入框翻译语言');
    const inputModel = text.indexOf('输入框翻译模型');
    const thoughtLanguage = text.indexOf('思维链翻译语言');
    const thoughtModel = text.indexOf('思维链翻译模型');
    const subgroupHeadings = Array.from(container.querySelectorAll('h5')).map((heading) => heading.textContent?.trim());

    expect(inputLanguage).toBeGreaterThan(-1);
    expect(inputModel).toBeGreaterThan(inputLanguage);
    expect(thoughtLanguage).toBeGreaterThan(inputModel);
    expect(thoughtModel).toBeGreaterThan(thoughtLanguage);
    expect(subgroupHeadings).not.toContain('输入框翻译');
    expect(subgroupHeadings).not.toContain('思维链翻译');
    expect(text).not.toContain('目标语言');
  });
});
