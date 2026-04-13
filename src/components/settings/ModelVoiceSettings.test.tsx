import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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
  let container: HTMLDivElement;
  let root: Root;

  const baseProps = {
    setModelId: vi.fn(),
    availableModels: [{ id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash' }],
    transcriptionModelId: 'gemini-3-flash-preview',
    setTranscriptionModelId: vi.fn(),
    ttsVoice: 'Zephyr',
    setTtsVoice: vi.fn(),
    t: (key: string) => key,
    systemInstruction: '',
    setSystemInstruction: vi.fn(),
    thinkingBudget: -1,
    setThinkingBudget: vi.fn(),
    thinkingLevel: 'HIGH' as const,
    setThinkingLevel: vi.fn(),
    showThoughts: true,
    setShowThoughts: vi.fn(),
    temperature: 1,
    setTemperature: vi.fn(),
    topP: 0.95,
    setTopP: vi.fn(),
    topK: 64,
    setTopK: vi.fn(),
    setAvailableModels: vi.fn(),
    mediaResolution: MediaResolution.MEDIA_RESOLUTION_UNSPECIFIED,
    setMediaResolution: vi.fn(),
  };

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
    document.body.innerHTML = '';
    vi.clearAllMocks();
  });

  const renderSettings = (modelId: string) => {
    act(() => {
      root.render(<ModelVoiceSettings {...baseProps} modelId={modelId} />);
    });
  };

  it('hides ULTRA_HIGH in global settings for non-Gemini 3 models', () => {
    renderSettings('gemini-2.5-flash');

    expect(
      document.querySelector('option[value="MEDIA_RESOLUTION_ULTRA_HIGH"]')
    ).toBeNull();
  });

  it('keeps ULTRA_HIGH available for Gemini 3 models', () => {
    renderSettings('gemini-3-flash-preview');

    expect(
      document.querySelector('option[value="MEDIA_RESOLUTION_ULTRA_HIGH"]')
    ).not.toBeNull();
  });
});
