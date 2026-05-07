import { act } from 'react';
import { setupTestRenderer } from '@/test/testUtils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useChatStore } from '../../../stores/chatStore';
import { useSettingsStore } from '../../../stores/settingsStore';
import { createChatAreaProviderValue, createChatRuntimeValues } from '../../../test/chatAreaFixtures';
import { createAppSettings } from '../../../test/factories';
import { ChatRuntimeValuesProvider } from '../../layout/chat-runtime/ChatRuntimeContext';

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

import { ChatInputToolbarContext, type ChatInputToolbarContextValue } from './ChatInputContext';
import { ChatInputToolbar } from './ChatInputToolbar';

const toolbarContextValue: ChatInputToolbarContextValue = {
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
  onEditTtsContext: vi.fn(),
};

describe('ChatInputToolbar', () => {
  const renderer = setupTestRenderer();

  const renderToolbar = () => {
    const providerValue = createChatAreaProviderValue();

    act(() => {
      renderer.root.render(
        <ChatRuntimeValuesProvider value={createChatRuntimeValues(providerValue)}>
          <ChatInputToolbarContext.Provider value={toolbarContextValue}>
            <ChatInputToolbar />
          </ChatInputToolbarContext.Provider>
        </ChatRuntimeValuesProvider>,
      );
    });
  };

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

    renderToolbar();

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

    renderToolbar();

    expect(personGenerationSelectorMock).not.toHaveBeenCalled();
  });
});
