import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FileConfigurationModal } from './FileConfigurationModal';
import { UploadedFile } from '../../types';

describe('FileConfigurationModal', () => {
  let container: HTMLDivElement;
  let root: Root;

  const t = (key: string) => {
    const dictionary: Record<string, string> = {
      cancel: 'Cancel',
      videoSettings_save: 'Save',
      videoSettings_start: 'Start',
      videoSettings_end: 'End',
      videoSettings_placeholder: 'Timestamp',
      videoSettings_fps: 'FPS',
      videoSettings_fps_placeholder: 'Frames per second',
      videoSettings_tip_fps: 'FPS tip',
      videoSettings_tip_timestamp: 'Timestamp tip',
      fileConfig_title: 'Configure File',
      fileConfig_resolution: 'Resolution',
      fileConfig_video: 'Video',
      mediaResolution_title: 'Media Resolution',
      mediaResolution_description: 'Resolution description',
      mediaResolution_auto: 'Auto',
      mediaResolution_low: 'Low',
      mediaResolution_medium: 'Medium',
      mediaResolution_high: 'High',
      mediaResolution_ultra: 'Ultra',
    };

    return dictionary[key] ?? key;
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

  const renderModal = (file: UploadedFile, onSave = vi.fn(), onClose = vi.fn()) => {
    act(() => {
      root.render(
        <FileConfigurationModal
          isOpen
          onClose={onClose}
          file={file}
          onSave={onSave}
          t={t}
          isGemini3={false}
        />
      );
    });

    return { onSave, onClose };
  };

  const getButtonByText = (text: string) => {
    return Array.from(document.querySelectorAll('button')).find(
      (button) => button.textContent?.includes(text)
    ) as HTMLButtonElement | undefined;
  };

  const setInputValue = (input: HTMLInputElement, value: string) => {
    const descriptor = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      'value'
    );

    descriptor?.set?.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  };

  it('does not persist empty video metadata for a new video file', async () => {
    const file: UploadedFile = {
      id: 'video-1',
      name: 'demo.mp4',
      type: 'video/mp4',
      size: 128,
      uploadState: 'active',
    };

    const { onSave, onClose } = renderModal(file);

    const saveButton = getButtonByText('Save');
    expect(saveButton).toBeDefined();

    await act(async () => {
      saveButton!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onSave).toHaveBeenCalledWith(file.id, {});
    expect(onClose).toHaveBeenCalled();
  });

  it('clears existing video metadata when all video fields are removed', async () => {
    const file: UploadedFile = {
      id: 'video-2',
      name: 'demo.mp4',
      type: 'video/mp4',
      size: 128,
      uploadState: 'active',
      videoMetadata: {
        startOffset: '3s',
        endOffset: '9s',
        fps: 2,
      },
    };

    const { onSave } = renderModal(file);

    const inputs = Array.from(document.querySelectorAll('input'));
    expect(inputs).toHaveLength(3);

    await act(async () => {
      for (const input of inputs) {
        setInputValue(input as HTMLInputElement, '');
      }
    });

    const saveButton = getButtonByText('Save');
    expect(saveButton).toBeDefined();

    await act(async () => {
      saveButton!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onSave).toHaveBeenCalledWith(file.id, { videoMetadata: undefined });
  });
});
