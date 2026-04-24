import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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
  t: (key: string) => key,
};

describe('ChatInputToolbar', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    personGenerationSelectorMock.mockClear();
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it('shows person generation selector for real Imagen models', () => {
    act(() => {
      root.render(
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
      root.render(
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
