import { act } from 'react';
import { setupTestRenderer } from '@/test/testUtils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useChatStore } from '../../../stores/chatStore';
import { createChatInputToolbarContextValue } from '../../../test/chatInputContextFixtures';
import { getModelCapabilities } from '../../../utils/modelHelpers';

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
import { ChatInputToolbarContext } from './ChatInputContext';
import { ChatInputToolbar } from './ChatInputToolbar';

describe('ChatInputToolbar', () => {
  const renderer = setupTestRenderer();

  const renderToolbar = () => {
    act(() => {
      renderer.root.render(
        <ChatInputToolbarContext.Provider
          value={createChatInputToolbarContextValue({
            capabilities: {
              ...getModelCapabilities('imagen-test-model'),
              ...mockCapabilities.value,
            },
          })}
        >
          <ChatInputToolbar />
        </ChatInputToolbarContext.Provider>,
      );
    });
  };

  beforeEach(() => {
    personGenerationSelectorMock.mockClear();
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
