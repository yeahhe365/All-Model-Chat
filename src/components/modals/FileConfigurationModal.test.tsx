import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import { I18nProvider } from '../../contexts/I18nContext';
import { useSettingsStore } from '../../stores/settingsStore';
import { FileConfigurationModal } from './FileConfigurationModal';
import { UploadedFile } from '../../types';

const projectRoot = path.resolve(__dirname, '../../..');
const modalPath = path.join(projectRoot, 'src/components/modals/FileConfigurationModal.tsx');

describe('FileConfigurationModal', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    useSettingsStore.setState({ language: 'en' });
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
        <I18nProvider>
          <FileConfigurationModal
            isOpen
            onClose={onClose}
            file={file}
            onSave={onSave}
            isGemini3={false}
          />
        </I18nProvider>
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

  it('avoids per-field mirrored state plus a file-sync effect', () => {
    const source = fs.readFileSync(modalPath, 'utf8');

    expect(source).not.toContain("const [startOffset, setStartOffset] = useState('')");
    expect(source).not.toContain("const [endOffset, setEndOffset] = useState('')");
    expect(source).not.toContain("const [fps, setFps] = useState('')");
    expect(source).not.toContain("const [mediaResolution, setMediaResolution] = useState<MediaResolution | ''>('')");
    expect(source).not.toMatch(/useEffect\(\(\) => \{\s*if \(isOpen && file\) \{\s*setStartOffset/s);
  });
});
