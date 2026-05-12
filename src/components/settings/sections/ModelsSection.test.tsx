import { act, type ComponentProps, type ReactNode, useState } from 'react';
import { setupProviderTestRenderer as setupTestRenderer } from '@/test/providerTestUtils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useSettingsStore } from '@/stores/settingsStore';
import { setupStoreStateReset } from '@/test/storeTestUtils';
import { ModelsSection } from './ModelsSection';
import type { AppSettings } from '@/types';
import type { ModelSelector } from '@/components/settings/controls/ModelSelector';
import type { LanguageVoiceSection } from './LanguageVoiceSection';
import type { SafetySection } from './SafetySection';

type ModelSelectorProps = ComponentProps<typeof ModelSelector>;
type LanguageVoiceSectionProps = ComponentProps<typeof LanguageVoiceSection>;
type SafetySectionProps = ComponentProps<typeof SafetySection>;

const mockSafetySection = vi.hoisted(() => ({
  renderCount: 0,
  lastProps: null as SafetySectionProps | null,
}));

const mockLanguageVoiceSection = vi.hoisted(() => ({
  lastProps: null as LanguageVoiceSectionProps | null,
}));

const mockModelSelector = vi.hoisted(() => ({
  lastProps: null as ModelSelectorProps | null,
}));

const { fetchOpenAICompatibleModelsMock } = vi.hoisted(() => ({
  fetchOpenAICompatibleModelsMock: vi.fn(),
}));

vi.mock('@/components/settings/controls/ModelSelector', () => ({
  ModelSelector: (props: ModelSelectorProps) => {
    mockModelSelector.lastProps = props;
    const extraModelListContent = (props as ModelSelectorProps & { extraModelListContent?: ReactNode })
      .extraModelListContent;
    return <div data-testid="model-selector">model selector{extraModelListContent}</div>;
  },
}));

vi.mock('@/services/api/openaiCompatibleApi', () => ({
  fetchOpenAICompatibleModels: fetchOpenAICompatibleModelsMock,
}));

vi.mock('./LanguageVoiceSection', () => ({
  LanguageVoiceSection: (props: LanguageVoiceSectionProps) => {
    mockLanguageVoiceSection.lastProps = props;
    return <div data-testid="language-voice-section">language voice section</div>;
  },
}));

vi.mock('./SafetySection', () => ({
  SafetySection: (props: SafetySectionProps) => {
    mockSafetySection.renderCount += 1;
    mockSafetySection.lastProps = props;
    return <div data-testid="safety-section">safety section</div>;
  },
}));

describe('ModelsSection', () => {
  const renderer = setupTestRenderer({ providers: { language: 'en' } });
  setupStoreStateReset();

  const renderModelsSection = async (overrides: Partial<ComponentProps<typeof ModelsSection>> = {}) => {
    await act(async () => {
      renderer.root.render(
        <ModelsSection
          modelId="gemini-3.1-pro-preview"
          setModelId={vi.fn()}
          availableModels={[{ id: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro Preview', isPinned: true }]}
          setAvailableModels={vi.fn()}
          currentSettings={useSettingsStore.getState().appSettings}
          onUpdateSettings={vi.fn()}
          {...overrides}
        />,
      );
    });
  };

  afterEach(() => {
    mockSafetySection.renderCount = 0;
    mockSafetySection.lastProps = null;
    mockLanguageVoiceSection.lastProps = null;
    mockModelSelector.lastProps = null;
    vi.clearAllMocks();
  });

  it('keeps tab cycle model settings out of models settings', async () => {
    const onUpdateSettings = vi.fn();

    await renderModelsSection({
      availableModels: [
        { id: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro Preview', isPinned: true },
        { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash Preview', isPinned: true },
        { id: 'gemini-3.1-flash-lite-preview', name: 'Gemini 3.1 Flash Lite Preview', isPinned: true },
      ],
      currentSettings: {
        ...useSettingsStore.getState().appSettings,
        tabModelCycleIds: ['gemini-3.1-pro-preview', 'gemini-3-flash-preview'],
      },
      onUpdateSettings,
    });

    expect(renderer.container.querySelector('[data-testid="model-selector"]')).not.toBeNull();
    expect(renderer.container.textContent).not.toContain('Models Included In Tab Cycle');
    expect(renderer.container.textContent).not.toContain('2 models selected');
    expect(renderer.container.textContent).not.toContain('Gemini 3.1 Flash Lite Preview');
    expect(
      renderer.container.querySelector<HTMLButtonElement>('button[aria-label="Toggle Tab cycle model panel"]'),
    ).toBeNull();
    expect(onUpdateSettings).not.toHaveBeenCalledWith(
      expect.objectContaining({
        tabModelCycleIds: expect.anything(),
      }),
    );
  });

  it('keeps safety settings inside models settings and collapsed by default', async () => {
    const onUpdateSettings = vi.fn();
    const safetySettings = useSettingsStore.getState().appSettings.safetySettings;

    await renderModelsSection({
      currentSettings: {
        ...useSettingsStore.getState().appSettings,
        safetySettings,
      },
      onUpdateSettings,
    });

    const toggleButton = renderer.container.querySelector<HTMLButtonElement>(
      'button[aria-label="Toggle safety settings"]',
    );

    expect(toggleButton).not.toBeNull();
    expect(toggleButton?.getAttribute('aria-expanded')).toBe('false');
    expect(renderer.container.textContent).toContain('Safety Settings');
    expect(renderer.container.querySelector('[data-testid="safety-section"]')).toBeNull();

    await act(async () => {
      toggleButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(toggleButton?.getAttribute('aria-expanded')).toBe('true');
    expect(renderer.container.querySelector('[data-testid="safety-section"]')).not.toBeNull();
    expect(mockSafetySection.lastProps!.safetySettings).toBe(safetySettings);

    mockSafetySection.lastProps!.setSafetySettings([]);

    expect(onUpdateSettings).toHaveBeenCalledWith({ safetySettings: [] });
  });

  it('keeps Live Artifacts settings inside models settings', async () => {
    const onUpdateSettings = vi.fn();
    const initialSettings = {
      ...useSettingsStore.getState().appSettings,
      autoLiveArtifactsVisualization: false,
      autoLiveArtifactsModelId: 'gemini-3-flash-preview',
      liveArtifactsPromptMode: 'inline',
      liveArtifactsSystemPrompts: {
        inline: 'Inline custom Live Artifacts prompt',
        full: 'Full custom Live Artifacts prompt',
        fullHtml: 'Complete HTML custom Live Artifacts prompt',
      },
    } as AppSettings;

    const StatefulModelsSection = () => {
      const [settings, setSettings] = useState(initialSettings);
      const handleUpdateSettings = (updates: Partial<AppSettings>) => {
        onUpdateSettings(updates);
        setSettings((previous) => ({ ...previous, ...updates }));
      };

      return (
        <ModelsSection
          modelId="gemini-3.1-pro-preview"
          setModelId={vi.fn()}
          availableModels={[{ id: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro Preview', isPinned: true }]}
          setAvailableModels={vi.fn()}
          currentSettings={settings}
          onUpdateSettings={handleUpdateSettings}
        />
      );
    };

    await act(async () => {
      renderer.root.render(<StatefulModelsSection />);
    });

    expect(renderer.container.textContent).toContain('Live Artifacts');
    expect(renderer.container.textContent).toContain('Auto-open Live Artifacts');
    expect(renderer.container.textContent).toContain('Live Artifacts Model');
    expect(renderer.container.textContent).not.toContain('Live Artifacts Prompt Version');
    expect(renderer.container.textContent).toContain('Inline HTML Only');
    expect(renderer.container.textContent).toContain('Live Artifacts Prompt');

    const promptToggle = renderer.container.querySelector<HTMLButtonElement>('#live-artifacts-prompt-toggle');
    expect(promptToggle?.getAttribute('aria-expanded')).toBe('false');
    expect(renderer.container.querySelector<HTMLTextAreaElement>('#live-artifacts-prompt-input')).toBeNull();
    expect(renderer.container.querySelector<HTMLButtonElement>('#live-artifacts-prompt-reset')).toBeNull();

    const toggleLabel = Array.from(renderer.container.querySelectorAll('span')).find(
      (element) => element.textContent?.trim() === 'Auto-open Live Artifacts',
    );
    const toggleInput = toggleLabel?.closest('.group')?.querySelector<HTMLInputElement>('input[type="checkbox"]');

    await act(async () => {
      toggleInput?.click();
    });

    expect(onUpdateSettings).toHaveBeenCalledWith({ autoLiveArtifactsVisualization: true });

    await act(async () => {
      renderer.container
        .querySelector<HTMLButtonElement>('#live-artifacts-model-select')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    await act(async () => {
      Array.from(renderer.container.querySelectorAll('button'))
        .find((button) => button.textContent?.trim() === 'Gemini 3.1 Pro')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onUpdateSettings).toHaveBeenCalledWith({ autoLiveArtifactsModelId: 'gemini-3.1-pro-preview' });

    await act(async () => {
      renderer.container
        .querySelector<HTMLButtonElement>('#live-artifacts-prompt-mode-select')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(renderer.container.textContent).toContain('Complete HTML Only');

    await act(async () => {
      Array.from(renderer.container.querySelectorAll('button'))
        .find((button) => button.textContent?.trim() === 'Full or Inline HTML')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onUpdateSettings).toHaveBeenCalledWith({ liveArtifactsPromptMode: 'full' });

    await act(async () => {
      renderer.container
        .querySelector<HTMLButtonElement>('#live-artifacts-prompt-mode-select')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    await act(async () => {
      Array.from(renderer.container.querySelectorAll('button'))
        .find((button) => button.textContent?.trim() === 'Complete HTML Only')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onUpdateSettings).toHaveBeenCalledWith({ liveArtifactsPromptMode: 'fullHtml' });

    await act(async () => {
      renderer.container
        .querySelector<HTMLButtonElement>('#live-artifacts-prompt-toggle')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    const expandedPromptToggle = renderer.container.querySelector<HTMLButtonElement>('#live-artifacts-prompt-toggle');
    expect(expandedPromptToggle?.getAttribute('aria-expanded')).toBe('true');
    const promptTextarea = renderer.container.querySelector<HTMLTextAreaElement>('#live-artifacts-prompt-input');
    expect(promptTextarea?.value).toBe('Complete HTML custom Live Artifacts prompt');
    const promptPanel = renderer.container.querySelector<HTMLElement>('#live-artifacts-prompt-panel');
    const promptReset = renderer.container.querySelector<HTMLButtonElement>('#live-artifacts-prompt-reset');
    expect(promptReset).not.toBeNull();
    expect(promptPanel?.contains(promptReset)).toBe(true);

    await act(async () => {
      const descriptor = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value');
      descriptor?.set?.call(promptTextarea, 'Use product-dashboard HTML artifacts.');
      promptTextarea?.dispatchEvent(new Event('input', { bubbles: true }));
      promptTextarea?.dispatchEvent(new Event('change', { bubbles: true }));
    });

    expect(onUpdateSettings).toHaveBeenCalledWith({ liveArtifactsSystemPrompt: '' });
    expect(onUpdateSettings).toHaveBeenCalledWith({
      liveArtifactsSystemPrompts: {
        inline: 'Inline custom Live Artifacts prompt',
        full: 'Full custom Live Artifacts prompt',
        fullHtml: 'Use product-dashboard HTML artifacts.',
      },
    });
  });

  it('shows the selected built-in Live Artifacts prompt in the prompt editor when there is no custom prompt', async () => {
    await renderModelsSection({
      currentSettings: {
        ...useSettingsStore.getState().appSettings,
        liveArtifactsPromptMode: 'inline',
        liveArtifactsSystemPrompt: '',
        liveArtifactsSystemPrompts: {
          inline: '',
          full: '',
          fullHtml: '',
        },
      } as AppSettings,
    });

    await act(async () => {
      renderer.container
        .querySelector<HTMLButtonElement>('#live-artifacts-prompt-toggle')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    await vi.waitFor(() => {
      expect(renderer.container.querySelector<HTMLTextAreaElement>('#live-artifacts-prompt-input')?.value).toContain(
        '[Live Artifacts Inline Protocol - en]',
      );
    });
  });

  it('keeps language, voice, and translation settings inside models settings', async () => {
    const onUpdateSettings = vi.fn();

    await renderModelsSection({
      availableModels: [
        { id: 'gemini-custom-input-translator', name: 'Input Translator' },
        { id: 'gemini-custom-thought-translator', name: 'Thought Translator' },
      ],
      currentSettings: {
        ...useSettingsStore.getState().appSettings,
        transcriptionModelId: 'gemini-3-flash-preview',
        translationTargetLanguage: 'Japanese',
        inputTranslationModelId: 'gemini-custom-input-translator',
        thoughtTranslationTargetLanguage: 'Korean',
        thoughtTranslationModelId: 'gemini-custom-thought-translator',
      },
      onUpdateSettings,
    });

    expect(renderer.container.querySelector('[data-testid="language-voice-section"]')).not.toBeNull();
    expect(mockLanguageVoiceSection.lastProps!.currentSettings.transcriptionModelId).toBe('gemini-3-flash-preview');
    expect(mockLanguageVoiceSection.lastProps!.currentSettings.translationTargetLanguage).toBe('Japanese');
    expect(mockLanguageVoiceSection.lastProps!.currentSettings.inputTranslationModelId).toBe(
      'gemini-custom-input-translator',
    );
    expect(mockLanguageVoiceSection.lastProps!.currentSettings.thoughtTranslationTargetLanguage).toBe('Korean');
    expect(mockLanguageVoiceSection.lastProps!.currentSettings.thoughtTranslationModelId).toBe(
      'gemini-custom-thought-translator',
    );

    act(() => {
      mockLanguageVoiceSection.lastProps!.onUpdateSetting('transcriptionModelId', 'gemini-3.1-flash-lite-preview');
      mockLanguageVoiceSection.lastProps!.onUpdateSetting('translationTargetLanguage', 'Simplified Chinese');
      mockLanguageVoiceSection.lastProps!.onUpdateSetting('inputTranslationModelId', 'gemini-3-flash-preview');
      mockLanguageVoiceSection.lastProps!.onUpdateSetting('thoughtTranslationTargetLanguage', 'English');
      mockLanguageVoiceSection.lastProps!.onUpdateSetting('thoughtTranslationModelId', 'gemini-3.1-pro-preview');
    });

    expect(onUpdateSettings).toHaveBeenCalledWith({ transcriptionModelId: 'gemini-3.1-flash-lite-preview' });
    expect(onUpdateSettings).toHaveBeenCalledWith({ translationTargetLanguage: 'Simplified Chinese' });
    expect(onUpdateSettings).toHaveBeenCalledWith({ inputTranslationModelId: 'gemini-3-flash-preview' });
    expect(onUpdateSettings).toHaveBeenCalledWith({ thoughtTranslationTargetLanguage: 'English' });
    expect(onUpdateSettings).toHaveBeenCalledWith({ thoughtTranslationModelId: 'gemini-3.1-pro-preview' });
  });

  it('keeps OpenAI-compatible models out of Gemini language and voice controls', async () => {
    await renderModelsSection({
      availableModels: [
        { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash Preview', apiMode: 'gemini-native' },
        { id: 'gpt-5.5', name: 'GPT-5.5', apiMode: 'openai-compatible' },
      ],
    });

    expect(mockLanguageVoiceSection.lastProps!.availableModels).toEqual([
      { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash Preview' },
    ]);
  });

  it('manages OpenAI-compatible model IDs inside the models settings screen', async () => {
    const onUpdateSettings = vi.fn();

    await renderModelsSection({
      currentSettings: {
        ...useSettingsStore.getState().appSettings,
        isOpenAICompatibleApiEnabled: true,
        apiMode: 'openai-compatible',
        openaiCompatibleModelId: 'gpt-5.5',
        openaiCompatibleModels: [
          { id: 'gpt-5.5', name: 'GPT-5.5', isPinned: true },
          { id: 'gpt-4.1', name: 'GPT-4.1' },
        ],
      },
      onUpdateSettings,
    });

    const modelSelector = renderer.container.querySelector('[data-testid="model-selector"]');
    expect(modelSelector).not.toBeNull();
    expect(modelSelector!.textContent).toContain('OpenAI-Compatible Model IDs');

    const modelIdInputs = Array.from(
      modelSelector!.querySelectorAll<HTMLInputElement>('input[data-openai-compatible-model-id-input="true"]'),
    );
    expect(modelIdInputs.map((input) => input.value)).toEqual(['gpt-5.5', 'gpt-4.1']);

    await act(async () => {
      const addButton = Array.from(renderer.container.querySelectorAll('button')).find((button) =>
        button.textContent?.includes('Add Model'),
      );
      addButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    const updatedModelIdInputs = Array.from(
      modelSelector!.querySelectorAll<HTMLInputElement>('input[data-openai-compatible-model-id-input="true"]'),
    );

    await act(async () => {
      const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
      descriptor?.set?.call(updatedModelIdInputs[2], 'deepseek-chat');
      updatedModelIdInputs[2].dispatchEvent(new Event('input', { bubbles: true }));
      updatedModelIdInputs[2].dispatchEvent(new Event('change', { bubbles: true }));
    });

    expect(onUpdateSettings).toHaveBeenCalledWith({
      openaiCompatibleModels: [
        { id: 'gpt-5.5', name: 'GPT-5.5', isPinned: true },
        { id: 'gpt-4.1', name: 'GPT-4.1' },
        { id: 'deepseek-chat', name: 'deepseek-chat' },
      ],
    });
  });

  it('fetches OpenAI-compatible models from the models settings screen', async () => {
    const onUpdateSettings = vi.fn();
    fetchOpenAICompatibleModelsMock.mockResolvedValue([
      { id: 'gpt-5.5', name: 'gpt-5.5' },
      { id: 'deepseek-chat', name: 'deepseek-chat' },
    ]);

    await renderModelsSection({
      currentSettings: {
        ...useSettingsStore.getState().appSettings,
        isOpenAICompatibleApiEnabled: true,
        apiMode: 'openai-compatible',
        openaiCompatibleApiKey: 'openai-compatible-key',
        openaiCompatibleBaseUrl: 'https://api.openai.com/v1',
        openaiCompatibleModelId: 'missing-model',
        openaiCompatibleModels: [{ id: 'gpt-5.5', name: 'My GPT', isPinned: true }],
      },
      onUpdateSettings,
    });

    const modelSelector = renderer.container.querySelector('[data-testid="model-selector"]');
    expect(modelSelector).not.toBeNull();

    const fetchButton = Array.from(modelSelector!.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Fetch Models'),
    );

    expect(fetchButton).toBeDefined();

    await act(async () => {
      fetchButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    await vi.waitFor(() => {
      expect(fetchOpenAICompatibleModelsMock).toHaveBeenCalledWith(
        'openai-compatible-key',
        'https://api.openai.com/v1',
        expect.any(AbortSignal),
      );
    });
    expect(onUpdateSettings).toHaveBeenCalledWith({
      openaiCompatibleModels: [
        { id: 'gpt-5.5', name: 'My GPT', isPinned: true },
        { id: 'deepseek-chat', name: 'deepseek-chat' },
      ],
    });
    expect(onUpdateSettings).toHaveBeenCalledWith({ openaiCompatibleModelId: 'gpt-5.5' });
    expect(renderer.container.textContent).toContain('Fetched 2 models.');
  });

  it('shows only GPT-compatible model and chat controls in OpenAI-compatible mode', async () => {
    const onUpdateSettings = vi.fn();
    const defaultModels = [
      { id: 'gpt-5.5', name: 'GPT-5.5', isPinned: true },
      { id: 'gpt-4.1', name: 'GPT-4.1' },
    ];

    await renderModelsSection({
      modelId: 'gpt-5.5',
      availableModels: defaultModels,
      defaultModels,
      isOpenAICompatibleMode: true,
      currentSettings: {
        ...useSettingsStore.getState().appSettings,
        isOpenAICompatibleApiEnabled: true,
        apiMode: 'openai-compatible',
      },
      onUpdateSettings,
    });

    expect(renderer.container.querySelector('[data-testid="model-selector"]')).not.toBeNull();
    expect(mockModelSelector.lastProps!.defaultModels).toBe(defaultModels);
    expect(renderer.container.textContent).toContain('Default System Prompt');
    expect(renderer.container.textContent).toContain('Temperature');
    expect(renderer.container.textContent).toContain('Top P');
    expect(renderer.container.textContent).not.toContain('Top K');
    expect(renderer.container.textContent).not.toContain('Live Artifacts');
    expect(renderer.container.textContent).not.toContain('Safety Settings');
    expect(renderer.container.querySelector('[data-testid="language-voice-section"]')).toBeNull();
    expect(
      renderer.container.querySelector<HTMLButtonElement>('button[aria-label="Toggle safety settings"]'),
    ).toBeNull();
  });
});
