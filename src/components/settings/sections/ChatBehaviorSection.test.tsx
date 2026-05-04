import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
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
  transcriptionModelId: 'gemini-3.1-flash-lite-preview',
  setTranscriptionModelId: vi.fn(),
  ttsVoice: 'Zephyr',
  setTtsVoice: vi.fn(),
  systemInstruction: '',
  setSystemInstruction: vi.fn(),
  temperature: 1,
  setTemperature: vi.fn(),
  topP: 0.95,
  setTopP: vi.fn(),
  topK: 64,
  setTopK: vi.fn(),
  thinkingBudget: 0,
  setThinkingBudget: vi.fn(),
  showThoughts: true,
  setShowThoughts: vi.fn(),
  safetySettings: [],
  setSafetySettings: vi.fn(),
  setAvailableModels: vi.fn(),
  translationTargetLanguage: 'English' as const,
  setTranslationTargetLanguage: vi.fn(),
  inputTranslationModelId: 'gemini-3.1-flash-lite-preview',
  setInputTranslationModelId: vi.fn(),
  thoughtTranslationTargetLanguage: 'Simplified Chinese' as const,
  setThoughtTranslationTargetLanguage: vi.fn(),
  thoughtTranslationModelId: 'gemini-3.1-flash-lite-preview',
  setThoughtTranslationModelId: vi.fn(),
  autoCanvasVisualization: false,
  setAutoCanvasVisualization: vi.fn(),
  autoCanvasModelId: 'gemini-3.1-flash-lite-preview',
  setAutoCanvasModelId: vi.fn(),
};

describe('ChatBehaviorSection', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
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
