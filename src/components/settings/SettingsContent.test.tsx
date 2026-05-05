import { act } from 'react';
import { createTestRenderer, type TestRenderer } from '@/test/testUtils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_APP_SETTINGS } from '../../constants/appConstants';
import { SettingsContent } from './SettingsContent';

const mockModelsSection = vi.hoisted(() => ({
  lastProps: null as any,
}));

const mockGenerationSection = vi.hoisted(() => ({
  lastProps: null as any,
}));

const mockShortcutsSection = vi.hoisted(() => ({
  lastProps: null as any,
}));

vi.mock('./sections/UsageSection', () => ({
  UsageSection: () => <div data-testid="usage-section">Usage Section</div>,
}));

vi.mock('./sections/AppearanceSection', () => ({
  AppearanceSection: () => <div data-testid="appearance-section">appearance</div>,
}));

vi.mock('./sections/ModelsSection', () => ({
  ModelsSection: (props: any) => {
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
        <button data-testid="select-model" onClick={() => props.setModelId('manual-openai-model')}>
          select
        </button>
      </>
    );
  },
}));

vi.mock('./sections/GenerationSection', () => ({
  GenerationSection: (props: any) => {
    mockGenerationSection.lastProps = props;
    return <div data-testid="generation-section">generation</div>;
  },
}));

vi.mock('./sections/ShortcutsSection', () => ({
  ShortcutsSection: (props: any) => {
    mockShortcutsSection.lastProps = props;
    return <div data-testid="shortcuts-section">shortcuts</div>;
  },
}));

describe('SettingsContent', () => {
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
    mockModelsSection.lastProps = null;
    mockGenerationSection.lastProps = null;
    mockShortcutsSection.lastProps = null;
  });

  it('does not render the obsolete usage section when the removed tab is requested', () => {
    act(() => {
      root.render(
        <SettingsContent
          activeTab={'usage' as any}
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

    expect(container.querySelector('[data-testid="usage-section"]')).toBeNull();
  });

  it('switches to a fallback model when the current model is removed from the edited list', () => {
    const updateSetting = vi.fn();
    const setAvailableModels = vi.fn();
    const handleModelChange = vi.fn();

    act(() => {
      root.render(
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
      container
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
      root.render(
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

    expect(mockModelsSection.lastProps.currentSettings.transcriptionModelId).toBe('gemini-3-flash-preview');
    expect(mockModelsSection.lastProps.currentSettings.translationTargetLanguage).toBe('Japanese');
    expect(mockModelsSection.lastProps.currentSettings.inputTranslationModelId).toBe('gemini-custom-input-translator');
    expect(mockModelsSection.lastProps.currentSettings.thoughtTranslationTargetLanguage).toBe('Korean');
    expect(mockModelsSection.lastProps.currentSettings.thoughtTranslationModelId).toBe(
      'gemini-custom-thought-translator',
    );
    expect(mockModelsSection.lastProps.availableModels).toEqual([
      { id: 'gemini-custom-input-translator', name: 'Input Translator' },
      { id: 'gemini-custom-thought-translator', name: 'Thought Translator' },
    ]);
    expect(updateSetting).not.toHaveBeenCalled();
  });

  it('uses the independent OpenAI-compatible model list in OpenAI-compatible mode', () => {
    const updateSetting = vi.fn();
    const setAvailableModels = vi.fn();
    const handleModelChange = vi.fn();
    const openAIModels = [
      { id: 'gpt-5.5', name: 'GPT-5.5', isPinned: true },
      { id: 'gpt-4.1', name: 'GPT-4.1' },
    ];
    const geminiModels = [{ id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash Preview' }];

    act(() => {
      root.render(
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

    expect(mockModelsSection.lastProps.modelId).toBe('gpt-5.5');
    expect(mockModelsSection.lastProps.availableModels).toBe(openAIModels);
    expect(mockModelsSection.lastProps.defaultModels).toEqual([
      { id: 'gpt-5.5', name: 'GPT-5.5', isPinned: true },
      { id: 'gpt-5.1', name: 'GPT-5.1', isPinned: true },
      { id: 'gpt-4.1', name: 'GPT-4.1' },
    ]);
    expect(mockModelsSection.lastProps.isOpenAICompatibleMode).toBe(true);

    act(() => {
      container
        .querySelector('[data-testid="save-model-list"]')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(updateSetting).toHaveBeenCalledWith('openaiCompatibleModels', [
      { id: 'fallback-model', name: 'Fallback Model', isPinned: true },
      { id: 'secondary-model', name: 'Secondary Model' },
    ]);
    expect(updateSetting).toHaveBeenCalledWith('openaiCompatibleModelId', 'fallback-model');
    expect(setAvailableModels).not.toHaveBeenCalled();
    expect(handleModelChange).not.toHaveBeenCalled();

    act(() => {
      container
        .querySelector('[data-testid="select-model"]')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(updateSetting).toHaveBeenCalledWith('openaiCompatibleModelId', 'manual-openai-model');
    expect(setAvailableModels).not.toHaveBeenCalled();
    expect(handleModelChange).not.toHaveBeenCalled();
  });

  it('does not render the removed model behavior section when the obsolete tab is requested', () => {
    act(() => {
      root.render(
        <SettingsContent
          activeTab={'generation' as any}
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

    expect(container.querySelector('[data-testid="generation-section"]')).toBeNull();
  });

  it('keeps tts voice and raw reasoning controls inside models settings', () => {
    const updateSetting = vi.fn();

    act(() => {
      root.render(
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

    expect(mockModelsSection.lastProps.currentSettings.ttsVoice).toBe('Aoede');
    expect(mockModelsSection.lastProps.currentSettings.isRawModeEnabled).toBe(true);
    expect(mockModelsSection.lastProps.currentSettings.hideThinkingInContext).toBe(true);
  });

  it('does not apply zoom-based enter animation to the active settings panel', () => {
    act(() => {
      root.render(
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

    const panelSurface = container.querySelector('[data-testid="save-model-list"]')?.closest('div');

    expect(panelSurface).not.toBeNull();
    expect(panelSurface?.className).not.toContain('zoom-in-95');
  });

  it('keeps shortcuts out of the workspace tab', () => {
    act(() => {
      root.render(
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

    expect(container.querySelector('[data-testid="appearance-section"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="shortcuts-section"]')).toBeNull();
  });

  it('renders shortcuts inside the shortcuts tab', () => {
    const availableModels = [{ id: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro Preview' }];

    act(() => {
      root.render(
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

    expect(container.querySelector('[data-testid="shortcuts-section"]')).not.toBeNull();
    expect(mockShortcutsSection.lastProps.availableModels).toBe(availableModels);
  });
});
