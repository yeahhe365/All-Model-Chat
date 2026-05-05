import { act } from 'react';
import { setupTestRenderer } from '@/test/testUtils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const personGenerationSelectorMock = vi.fn();

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

import { ChatInputToolbar } from './ChatInputToolbar';
import type { ChatInputToolbarProps } from '../../../types';

const baseProps: ChatInputToolbarProps = {
  isImagenModel: false,
  fileError: null,
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
  isLoading: false,
};

describe('ChatInputToolbar', () => {
  const renderer = setupTestRenderer();

  beforeEach(() => {
    personGenerationSelectorMock.mockClear();
  });

  it('shows person generation selector for real Imagen models', () => {
    act(() => {
      renderer.root.render(
        <ChatInputToolbar
          {...baseProps}
          isImagenModel
          isRealImagenModel
          personGeneration="ALLOW_ADULT"
          setPersonGeneration={vi.fn()}
        />,
      );
    });

    expect(personGenerationSelectorMock).toHaveBeenCalledWith(
      expect.objectContaining({ personGeneration: 'ALLOW_ADULT' }),
    );
  });

  it('hides person generation selector for Gemini image models', () => {
    act(() => {
      renderer.root.render(
        <ChatInputToolbar
          {...baseProps}
          isImagenModel
          isRealImagenModel={false}
          personGeneration="ALLOW_ADULT"
          setPersonGeneration={vi.fn()}
        />,
      );
    });

    expect(personGenerationSelectorMock).not.toHaveBeenCalled();
  });
});
