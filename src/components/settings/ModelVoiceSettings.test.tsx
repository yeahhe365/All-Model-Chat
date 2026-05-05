import { act } from 'react';
import { setupTestRenderer } from '@/test/testUtils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { I18nProvider } from '../../contexts/I18nContext';
import { useSettingsStore } from '../../stores/settingsStore';
import { ModelVoiceSettings } from './ModelVoiceSettings';
import { MediaResolution } from '../../types/settings';

vi.mock('./controls/ModelSelector', () => ({
  ModelSelector: () => <div data-testid="model-selector" />,
}));

vi.mock('./controls/thinking/ThinkingControl', () => ({
  ThinkingControl: () => <div data-testid="thinking-control" />,
}));

vi.mock('./controls/VoiceControl', () => ({
  VoiceControl: () => <div data-testid="voice-control" />,
}));

vi.mock('../modals/TextEditorModal', () => ({
  TextEditorModal: () => null,
}));

vi.mock('../shared/Tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('../shared/Select', () => ({
  Select: ({
    children,
    id,
    value,
    onChange,
  }: {
    children: React.ReactNode;
    id?: string;
    value?: string;
    onChange?: React.ChangeEventHandler<HTMLSelectElement>;
  }) => (
    <select id={id} value={value} onChange={onChange}>
      {children}
    </select>
  ),
}));

describe('ModelVoiceSettings media resolution options', () => {
  const renderer = setupTestRenderer();
  const initialState = useSettingsStore.getState();

  const baseProps = {
    setModelId: vi.fn(),
    availableModels: [{ id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash' }],
    t: (key: string) => key,
    setAvailableModels: vi.fn(),
    currentSettings: {
      ...useSettingsStore.getState().appSettings,
      transcriptionModelId: 'gemini-3-flash-preview',
      ttsVoice: 'Zephyr',
      systemInstruction: '',
      thinkingBudget: -1,
      thinkingLevel: 'HIGH' as const,
      showThoughts: true,
      temperature: 1,
      topP: 0.95,
      topK: 64,
      mediaResolution: MediaResolution.MEDIA_RESOLUTION_UNSPECIFIED,
    },
    onUpdateSetting: vi.fn(),
  };

  beforeEach(() => {
    useSettingsStore.setState({ language: 'en' });
  });

  afterEach(() => {
    vi.clearAllMocks();
    useSettingsStore.setState(initialState);
  });

  const renderSettings = (modelId: string) => {
    act(() => {
      renderer.root.render(
        <I18nProvider>
          <ModelVoiceSettings {...baseProps} modelId={modelId} />
        </I18nProvider>,
      );
    });
  };

  it('hides ULTRA_HIGH in global settings for non-Gemini 3 models', () => {
    renderSettings('gemini-2.5-flash');

    expect(document.querySelector('option[value="MEDIA_RESOLUTION_ULTRA_HIGH"]')).toBeNull();
  });

  it('keeps ULTRA_HIGH available for Gemini 3 models', () => {
    renderSettings('gemini-3-flash-preview');

    expect(document.querySelector('option[value="MEDIA_RESOLUTION_ULTRA_HIGH"]')).not.toBeNull();
  });

  it('keeps ULTRA_HIGH available for Gemini Robotics models', () => {
    renderSettings('gemini-robotics-er-1.6-preview');

    expect(document.querySelector('option[value="MEDIA_RESOLUTION_ULTRA_HIGH"]')).not.toBeNull();
  });
});
