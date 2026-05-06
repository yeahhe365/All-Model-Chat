import { act } from 'react';
import { setupTestRenderer } from '@/test/testUtils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useChatStore } from '../../../stores/chatStore';
import { useSettingsStore } from '../../../stores/settingsStore';
import { createAppSettings } from '../../../test/factories';

const personGenerationSelectorMock = vi.fn();
const mockCapabilities = vi.hoisted(() => ({
  value: {
    isImagenModel: false,
    isGemini3ImageModel: false,
    isRealImagenModel: false,
    isTtsModel: false,
    isNativeAudioModel: false,
    supportedAspectRatios: [] as string[],
    supportedImageSizes: [] as string[],
  },
}));

vi.mock('./toolbar/AddFileByIdInput', () => ({ AddFileByIdInput: () => null }));
vi.mock('./toolbar/AddUrlInput', () => ({ AddUrlInput: () => null }));
vi.mock('./toolbar/ImagenAspectRatioSelector', () => ({ ImagenAspectRatioSelector: () => null }));
vi.mock('./toolbar/ImageSizeSelector', () => ({ ImageSizeSelector: () => null }));
vi.mock('./toolbar/ImageOutputModeSelector', () => ({ ImageOutputModeSelector: () => null }));
vi.mock('./toolbar/QuadImageToggle', () => ({ QuadImageToggle: () => null }));
vi.mock('./toolbar/TtsVoiceSelector', () => ({ TtsVoiceSelector: () => null }));
vi.mock('./toolbar/MediaResolutionSelector', () => ({ MediaResolutionSelector: () => null }));
vi.mock('./toolbar/PersonGenerationSelector', () => ({
  PersonGenerationSelector: (props: unknown) => {
    personGenerationSelectorMock(props);
    return <div data-testid="person-generation-selector" />;
  },
}));
vi.mock('../../../stores/modelCapabilitiesStore', () => ({
  getCachedModelCapabilities: () => mockCapabilities.value,
}));

import { ChatInputToolbar } from './ChatInputToolbar';

const localProps = {
  showAddByIdInput: false,
  fileIdInput: '',
  setFileIdInput: vi.fn(),
  onAddFileByIdSubmit: vi.fn(),
  onCancelAddById: vi.fn(),
  isAddingById: false,
  showAddByUrlInput: false,
  urlInput: '',
  setUrlInput: vi.fn(),
  onAddUrlSubmit: vi.fn(),
  onCancelAddUrl: vi.fn(),
  isAddingByUrl: false,
};

describe('ChatInputToolbar', () => {
  const renderer = setupTestRenderer();

  beforeEach(() => {
    personGenerationSelectorMock.mockClear();
    useSettingsStore.setState({
      appSettings: createAppSettings({ modelId: 'imagen-test-model' }),
    });
    useChatStore.setState({
      activeSessionId: null,
      savedSessions: [],
      activeMessages: [],
      personGeneration: 'ALLOW_ADULT',
    });
    mockCapabilities.value = {
      isImagenModel: false,
      isGemini3ImageModel: false,
      isRealImagenModel: false,
      isTtsModel: false,
      isNativeAudioModel: false,
      supportedAspectRatios: [],
      supportedImageSizes: [],
    };
  });

  it('shows person generation selector for real Imagen models', () => {
    mockCapabilities.value = {
      ...mockCapabilities.value,
      isImagenModel: true,
      isRealImagenModel: true,
    };

    act(() => {
      renderer.root.render(<ChatInputToolbar {...localProps} />);
    });

    expect(personGenerationSelectorMock).toHaveBeenCalledWith(
      expect.objectContaining({ personGeneration: 'ALLOW_ADULT' }),
    );
  });

  it('hides person generation selector for Gemini image models', () => {
    mockCapabilities.value = {
      ...mockCapabilities.value,
      isImagenModel: true,
      isRealImagenModel: false,
    };

    act(() => {
      renderer.root.render(<ChatInputToolbar {...localProps} />);
    });

    expect(personGenerationSelectorMock).not.toHaveBeenCalled();
  });
});
