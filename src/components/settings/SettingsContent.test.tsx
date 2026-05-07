import { act, type ComponentProps } from 'react';
import { setupTestRenderer } from '@/test/testUtils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_APP_SETTINGS } from '../../constants/appConstants';
import { SettingsContent } from './SettingsContent';
import type { SettingsTab } from '../../hooks/features/useSettingsLogic';
import type { ModelsSection } from './sections/ModelsSection';
import type { GenerationSection } from './sections/GenerationSection';
import type { ShortcutsSection } from './sections/ShortcutsSection';

type ModelsSectionProps = ComponentProps<typeof ModelsSection>;
type GenerationSectionProps = ComponentProps<typeof GenerationSection>;
type ShortcutsSectionProps = ComponentProps<typeof ShortcutsSection>;

const removedSettingsTab = (tab: string): SettingsTab => tab as SettingsTab;

const mockModelsSection = vi.hoisted(() => ({
  lastProps: null as ModelsSectionProps | null,
}));

const mockGenerationSection = vi.hoisted(() => ({
  lastProps: null as GenerationSectionProps | null,
}));

const mockShortcutsSection = vi.hoisted(() => ({
  lastProps: null as ShortcutsSectionProps | null,
}));

vi.mock('./sections/UsageSection', () => ({
  UsageSection: () => <div data-testid="usage-section">Usage Section</div>,
}));

vi.mock('./sections/AppearanceSection', () => ({
  AppearanceSection: () => <div data-testid="appearance-section">appearance</div>,
}));

vi.mock('./sections/ModelsSection', () => ({
  ModelsSection: (props: ModelsSectionProps) => {
    mockModelsSection.lastProps = props;
    return (
      <>
        <button
          data-testid="save-model-list"
          onClick={() =>
            props.setAvailableModels([
              { id: 'fallback-model', name: 'Fallback Model', isPinned: true },
              { id: 'secondary-model', name: 'Secondary Model' },
            ])
          }
        >
          save
        </button>
        <button
          data-testid="save-provider-model-list"
          onClick={() =>
            props.setAvailableModels([
              { id: 'gemini-new', name: 'Gemini New', isPinned: true, apiMode: 'gemini-native' },
              { id: 'gpt-new', name: 'GPT New', isPinned: false, apiMode: 'openai-compatible' },
            ])
          }
        >
          save providers
        </button>
        <button data-testid="select-model" onClick={() => props.setModelId('manual-openai-model')}>
          select
        </button>
        <button
          data-testid="select-gemini-model"
          onClick={() => props.setModelId('gemini-3-flash-preview', 'gemini-native')}
        >
          select gemini
        </button>
        <button data-testid="select-openai-model" onClick={() => props.setModelId('gpt-5.5', 'openai-compatible')}>
          select openai
        </button>
      </>
    );
  },
}));

vi.mock('./sections/GenerationSection', () => ({
  GenerationSection: (props: GenerationSectionProps) => {
    mockGenerationSection.lastProps = props;
    return <div data-testid="generation-section">generation</div>;
  },
}));

vi.mock('./sections/ShortcutsSection', () => ({
  ShortcutsSection: (props: ShortcutsSectionProps) => {
    mockShortcutsSection.lastProps = props;
    return <div data-testid="shortcuts-section">shortcuts</div>;
  },
}));

describe('SettingsContent', () => {
  const renderer = setupTestRenderer();

  afterEach(() => {
    mockModelsSection.lastProps = null;
    mockGenerationSection.lastProps = null;
    mockShortcutsSection.lastProps = null;
  });

  it('does not render the obsolete usage section when the removed tab is requested', () => {
    act(() => {
      renderer.root.render(
        <SettingsContent
          activeTab={removedSettingsTab('usage')}
          currentSettings={DEFAULT_APP_SETTINGS}
          availableModels={[]}
          updateSetting={vi.fn()}
          handleModelChange={vi.fn()}
          setAvailableModels={vi.fn()}
          onClearHistory={vi.fn()}
          onClearCache={vi.fn()}
          onOpenLogViewer={vi.fn()}
          onClearLogs={vi.fn()}
          onReset={vi.fn()}
          onInstallPwa={vi.fn()}
          installState="installed"
          onImportSettings={vi.fn()}
          onExportSettings={vi.fn()}
          onImportHistory={vi.fn()}
          onExportHistory={vi.fn()}
          onImportScenarios={vi.fn()}
          onExportScenarios={vi.fn()}
        />,
      );
    });

    expect(renderer.container.querySelector('[data-testid="usage-section"]')).toBeNull();
  });

  it('switches to a fallback model when the current model is removed from the edited list', () => {
    const updateSetting = vi.fn();
    const setAvailableModels = vi.fn();
    const handleModelChange = vi.fn();

    act(() => {
      renderer.root.render(
        <SettingsContent
          activeTab="models"
          currentSettings={{
            ...DEFAULT_APP_SETTINGS,
            modelId: 'removed-model',
          }}
          availableModels={[{ id: 'removed-model', name: 'Removed Model', isPinned: true }]}
          updateSetting={updateSetting}
          handleModelChange={handleModelChange}
          setAvailableModels={setAvailableModels}
          onClearHistory={vi.fn()}
          onClearCache={vi.fn()}
          onOpenLogViewer={vi.fn()}
          onClearLogs={vi.fn()}
          onReset={vi.fn()}
          onInstallPwa={vi.fn()}
          installState="installed"
          onImportSettings={vi.fn()}
          onExportSettings={vi.fn()}
          onImportHistory={vi.fn()}
          onExportHistory={vi.fn()}
          onImportScenarios={vi.fn()}
          onExportScenarios={vi.fn()}
        />,
      );
    });

    act(() => {
      renderer.container
        .querySelector('[data-testid="save-model-list"]')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(setAvailableModels).toHaveBeenCalledWith([
      { id: 'fallback-model', name: 'Fallback Model', isPinned: true },
      { id: 'secondary-model', name: 'Secondary Model' },
    ]);
    expect(handleModelChange).toHaveBeenCalledWith('fallback-model');
    expect(updateSetting).not.toHaveBeenCalledWith('modelId', 'fallback-model');
  });

  it('passes language, voice, and translation settings into models settings', () => {
    const updateSetting = vi.fn();

    act(() => {
      renderer.root.render(
        <SettingsContent
          activeTab="models"
          currentSettings={{
            ...DEFAULT_APP_SETTINGS,
            transcriptionModelId: 'gemini-3-flash-preview',
            translationTargetLanguage: 'Japanese',
            inputTranslationModelId: 'gemini-custom-input-translator',
            thoughtTranslationTargetLanguage: 'Korean',
            thoughtTranslationModelId: 'gemini-custom-thought-translator',
          }}
          availableModels={[
            { id: 'gemini-custom-input-translator', name: 'Input Translator' },
            { id: 'gemini-custom-thought-translator', name: 'Thought Translator' },
          ]}
          updateSetting={updateSetting}
          handleModelChange={vi.fn()}
          setAvailableModels={vi.fn()}
          onClearHistory={vi.fn()}
          onClearCache={vi.fn()}
          onOpenLogViewer={vi.fn()}
          onClearLogs={vi.fn()}
          onReset={vi.fn()}
          onInstallPwa={vi.fn()}
          installState="installed"
          onImportSettings={vi.fn()}
          onExportSettings={vi.fn()}
          onImportHistory={vi.fn()}
          onExportHistory={vi.fn()}
          onImportScenarios={vi.fn()}
          onExportScenarios={vi.fn()}
        />,
      );
    });

    expect(mockModelsSection.lastProps!.currentSettings.transcriptionModelId).toBe('gemini-3-flash-preview');
    expect(mockModelsSection.lastProps!.currentSettings.translationTargetLanguage).toBe('Japanese');
    expect(mockModelsSection.lastProps!.currentSettings.inputTranslationModelId).toBe('gemini-custom-input-translator');
    expect(mockModelsSection.lastProps!.currentSettings.thoughtTranslationTargetLanguage).toBe('Korean');
    expect(mockModelsSection.lastProps!.currentSettings.thoughtTranslationModelId).toBe(
      'gemini-custom-thought-translator',
    );
    expect(mockModelsSection.lastProps!.availableModels).toEqual([
      { id: 'gemini-custom-input-translator', name: 'Input Translator', apiMode: 'gemini-native' },
      { id: 'gemini-custom-thought-translator', name: 'Thought Translator', apiMode: 'gemini-native' },
      { id: 'gpt-5.5', name: 'GPT-5.5', isPinned: true, apiMode: 'openai-compatible' },
    ]);
    expect(updateSetting).not.toHaveBeenCalled();
  });

  it('passes Gemini and OpenAI-compatible models together in model settings', () => {
    const updateSetting = vi.fn();
    const setAvailableModels = vi.fn();
    const handleModelChange = vi.fn();
    const openAIModels = [
      { id: 'gpt-5.5', name: 'GPT-5.5', isPinned: true },
      { id: 'gpt-4.1', name: 'GPT-4.1' },
    ];
    const geminiModels = [{ id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash Preview' }];

    act(() => {
      renderer.root.render(
        <SettingsContent
          activeTab="models"
          currentSettings={{
            ...DEFAULT_APP_SETTINGS,
            apiMode: 'openai-compatible',
            modelId: 'gemini-3-flash-preview',
            openaiCompatibleModelId: 'gpt-5.5',
            openaiCompatibleModels: openAIModels,
          }}
          availableModels={geminiModels}
          updateSetting={updateSetting}
          handleModelChange={handleModelChange}
          setAvailableModels={setAvailableModels}
          onClearHistory={vi.fn()}
          onClearCache={vi.fn()}
          onOpenLogViewer={vi.fn()}
          onClearLogs={vi.fn()}
          onReset={vi.fn()}
          onInstallPwa={vi.fn()}
          installState="installed"
          onImportSettings={vi.fn()}
          onExportSettings={vi.fn()}
          onImportHistory={vi.fn()}
          onExportHistory={vi.fn()}
          onImportScenarios={vi.fn()}
          onExportScenarios={vi.fn()}
        />,
      );
    });

    expect(mockModelsSection.lastProps!.modelId).toBe('gpt-5.5');
    expect(mockModelsSection.lastProps!.availableModels).toEqual([
      { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash Preview', apiMode: 'gemini-native' },
      { id: 'gpt-5.5', name: 'GPT-5.5', isPinned: true, apiMode: 'openai-compatible' },
      { id: 'gpt-4.1', name: 'GPT-4.1', apiMode: 'openai-compatible' },
    ]);
    expect(mockModelsSection.lastProps!.defaultModels).toContainEqual({
      id: 'gpt-5.5',
      name: 'GPT-5.5',
      isPinned: true,
      apiMode: 'openai-compatible',
    });
    expect(mockModelsSection.lastProps!.isOpenAICompatibleMode).toBe(true);

    act(() => {
      renderer.container
        .querySelector('[data-testid="save-provider-model-list"]')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(setAvailableModels).toHaveBeenCalledWith([{ id: 'gemini-new', name: 'Gemini New', isPinned: true }]);
    expect(updateSetting).toHaveBeenCalledWith('openaiCompatibleModels', [
      { id: 'gpt-new', name: 'GPT New', isPinned: false },
    ]);
    expect(updateSetting).toHaveBeenCalledWith('openaiCompatibleModelId', 'gpt-new');
    expect(handleModelChange).toHaveBeenCalledWith('gemini-new');
  });

  it('switches API mode when selecting a provider-tagged model from settings', () => {
    const updateSetting = vi.fn();
    const handleModelChange = vi.fn();

    act(() => {
      renderer.root.render(
        <SettingsContent
          activeTab="models"
          currentSettings={{
            ...DEFAULT_APP_SETTINGS,
            apiMode: 'openai-compatible',
            modelId: 'gemini-3-flash-preview',
            openaiCompatibleModelId: 'gpt-5.5',
            openaiCompatibleModels: [{ id: 'gpt-5.5', name: 'GPT-5.5', isPinned: true }],
          }}
          availableModels={[{ id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash Preview' }]}
          updateSetting={updateSetting}
          handleModelChange={handleModelChange}
          setAvailableModels={vi.fn()}
          onClearHistory={vi.fn()}
          onClearCache={vi.fn()}
          onOpenLogViewer={vi.fn()}
          onClearLogs={vi.fn()}
          onReset={vi.fn()}
          onInstallPwa={vi.fn()}
          installState="installed"
          onImportSettings={vi.fn()}
          onExportSettings={vi.fn()}
          onImportHistory={vi.fn()}
          onExportHistory={vi.fn()}
          onImportScenarios={vi.fn()}
          onExportScenarios={vi.fn()}
        />,
      );
    });

    act(() => {
      renderer.container
        .querySelector('[data-testid="select-gemini-model"]')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(updateSetting).toHaveBeenCalledWith('apiMode', 'gemini-native');
    expect(handleModelChange).toHaveBeenCalledWith('gemini-3-flash-preview');

    act(() => {
      renderer.root.render(
        <SettingsContent
          activeTab="models"
          currentSettings={{
            ...DEFAULT_APP_SETTINGS,
            apiMode: 'gemini-native',
            modelId: 'gemini-3-flash-preview',
            openaiCompatibleModelId: 'gpt-5.5',
            openaiCompatibleModels: [{ id: 'gpt-5.5', name: 'GPT-5.5', isPinned: true }],
          }}
          availableModels={[{ id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash Preview' }]}
          updateSetting={updateSetting}
          handleModelChange={handleModelChange}
          setAvailableModels={vi.fn()}
          onClearHistory={vi.fn()}
          onClearCache={vi.fn()}
          onOpenLogViewer={vi.fn()}
          onClearLogs={vi.fn()}
          onReset={vi.fn()}
          onInstallPwa={vi.fn()}
          installState="installed"
          onImportSettings={vi.fn()}
          onExportSettings={vi.fn()}
          onImportHistory={vi.fn()}
          onExportHistory={vi.fn()}
          onImportScenarios={vi.fn()}
          onExportScenarios={vi.fn()}
        />,
      );
    });

    act(() => {
      renderer.container
        .querySelector('[data-testid="select-openai-model"]')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(updateSetting).toHaveBeenCalledWith('apiMode', 'openai-compatible');
    expect(updateSetting).toHaveBeenCalledWith('openaiCompatibleModelId', 'gpt-5.5');
  });

  it('does not render the removed model behavior section when the obsolete tab is requested', () => {
    act(() => {
      renderer.root.render(
        <SettingsContent
          activeTab={removedSettingsTab('generation')}
          currentSettings={DEFAULT_APP_SETTINGS}
          availableModels={[]}
          updateSetting={vi.fn()}
          handleModelChange={vi.fn()}
          setAvailableModels={vi.fn()}
          onClearHistory={vi.fn()}
          onClearCache={vi.fn()}
          onOpenLogViewer={vi.fn()}
          onClearLogs={vi.fn()}
          onReset={vi.fn()}
          onInstallPwa={vi.fn()}
          installState="installed"
          onImportSettings={vi.fn()}
          onExportSettings={vi.fn()}
          onImportHistory={vi.fn()}
          onExportHistory={vi.fn()}
          onImportScenarios={vi.fn()}
          onExportScenarios={vi.fn()}
        />,
      );
    });

    expect(renderer.container.querySelector('[data-testid="generation-section"]')).toBeNull();
  });

  it('keeps tts voice and raw reasoning controls inside models settings', () => {
    const updateSetting = vi.fn();

    act(() => {
      renderer.root.render(
        <SettingsContent
          activeTab="models"
          currentSettings={{
            ...DEFAULT_APP_SETTINGS,
            ttsVoice: 'Aoede',
            isRawModeEnabled: true,
            hideThinkingInContext: true,
          }}
          availableModels={[]}
          updateSetting={updateSetting}
          handleModelChange={vi.fn()}
          setAvailableModels={vi.fn()}
          onClearHistory={vi.fn()}
          onClearCache={vi.fn()}
          onOpenLogViewer={vi.fn()}
          onClearLogs={vi.fn()}
          onReset={vi.fn()}
          onInstallPwa={vi.fn()}
          installState="installed"
          onImportSettings={vi.fn()}
          onExportSettings={vi.fn()}
          onImportHistory={vi.fn()}
          onExportHistory={vi.fn()}
          onImportScenarios={vi.fn()}
          onExportScenarios={vi.fn()}
        />,
      );
    });

    expect(mockModelsSection.lastProps!.currentSettings.ttsVoice).toBe('Aoede');
    expect(mockModelsSection.lastProps!.currentSettings.isRawModeEnabled).toBe(true);
    expect(mockModelsSection.lastProps!.currentSettings.hideThinkingInContext).toBe(true);
  });

  it('does not apply zoom-based enter animation to the active settings panel', () => {
    act(() => {
      renderer.root.render(
        <SettingsContent
          activeTab="models"
          currentSettings={DEFAULT_APP_SETTINGS}
          availableModels={[]}
          updateSetting={vi.fn()}
          handleModelChange={vi.fn()}
          setAvailableModels={vi.fn()}
          onClearHistory={vi.fn()}
          onClearCache={vi.fn()}
          onOpenLogViewer={vi.fn()}
          onClearLogs={vi.fn()}
          onReset={vi.fn()}
          onInstallPwa={vi.fn()}
          installState="installed"
          onImportSettings={vi.fn()}
          onExportSettings={vi.fn()}
          onImportHistory={vi.fn()}
          onExportHistory={vi.fn()}
          onImportScenarios={vi.fn()}
          onExportScenarios={vi.fn()}
        />,
      );
    });

    const panelSurface = renderer.container.querySelector('[data-testid="save-model-list"]')?.closest('div');

    expect(panelSurface).not.toBeNull();
    expect(panelSurface?.className).not.toContain('zoom-in-95');
  });

  it('keeps shortcuts out of the workspace tab', () => {
    act(() => {
      renderer.root.render(
        <SettingsContent
          activeTab="interface"
          currentSettings={DEFAULT_APP_SETTINGS}
          availableModels={[]}
          updateSetting={vi.fn()}
          handleModelChange={vi.fn()}
          setAvailableModels={vi.fn()}
          onClearHistory={vi.fn()}
          onClearCache={vi.fn()}
          onOpenLogViewer={vi.fn()}
          onClearLogs={vi.fn()}
          onReset={vi.fn()}
          onInstallPwa={vi.fn()}
          installState="installed"
          onImportSettings={vi.fn()}
          onExportSettings={vi.fn()}
          onImportHistory={vi.fn()}
          onExportHistory={vi.fn()}
          onImportScenarios={vi.fn()}
          onExportScenarios={vi.fn()}
        />,
      );
    });

    expect(renderer.container.querySelector('[data-testid="appearance-section"]')).not.toBeNull();
    expect(renderer.container.querySelector('[data-testid="shortcuts-section"]')).toBeNull();
  });

  it('renders shortcuts inside the shortcuts tab', () => {
    const availableModels = [{ id: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro Preview' }];

    act(() => {
      renderer.root.render(
        <SettingsContent
          activeTab="shortcuts"
          currentSettings={DEFAULT_APP_SETTINGS}
          availableModels={availableModels}
          updateSetting={vi.fn()}
          handleModelChange={vi.fn()}
          setAvailableModels={vi.fn()}
          onClearHistory={vi.fn()}
          onClearCache={vi.fn()}
          onOpenLogViewer={vi.fn()}
          onClearLogs={vi.fn()}
          onReset={vi.fn()}
          onInstallPwa={vi.fn()}
          installState="installed"
          onImportSettings={vi.fn()}
          onExportSettings={vi.fn()}
          onImportHistory={vi.fn()}
          onExportHistory={vi.fn()}
          onImportScenarios={vi.fn()}
          onExportScenarios={vi.fn()}
        />,
      );
    });

    expect(renderer.container.querySelector('[data-testid="shortcuts-section"]')).not.toBeNull();
    expect(mockShortcutsSection.lastProps!.availableModels).toBe(availableModels);
  });
});
