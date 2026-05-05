import { act } from 'react';
import { setupProviderTestRenderer as setupTestRenderer } from '@/test/providerTestUtils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import { setupStoreStateReset } from '../../test/storeTestUtils';
import { FileConfigurationModal } from './FileConfigurationModal';
import { UploadedFile } from '../../types';

const projectRoot = path.resolve(__dirname, '../../..');
const modalPath = path.join(projectRoot, 'src/components/modals/FileConfigurationModal.tsx');

describe('FileConfigurationModal', () => {
  const renderer = setupTestRenderer({ providers: { language: 'en' } });
  setupStoreStateReset();

  afterEach(() => {
    vi.clearAllMocks();
  });

  const renderModal = (file: UploadedFile, onSave = vi.fn(), onClose = vi.fn()) => {
    act(() => {
      renderer.root.render(
        <FileConfigurationModal isOpen onClose={onClose} file={file} onSave={onSave} isGemini3={false} />,
      );
    });

    return { onSave, onClose };
  };

  const getButtonByText = (text: string) => {
    return Array.from(document.querySelectorAll('button')).find((button) => button.textContent?.includes(text)) as
      | HTMLButtonElement
      | undefined;
  };

  const setInputValue = (input: HTMLInputElement, value: string) => {
    const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');

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

  it('adds visible keyboard focus styles to close and save controls', () => {
    const file: UploadedFile = {
      id: 'video-3',
      name: 'demo.mp4',
      type: 'video/mp4',
      size: 128,
      uploadState: 'active',
    };

    renderModal(file);

    const closeButton = Array.from(document.querySelectorAll('button')).find((button) =>
      button.className.includes('rounded-full'),
    );
    const saveButton = getButtonByText('Save');

    expect(closeButton?.className).toContain('focus-visible:ring-2');
    expect(saveButton?.className).toContain('focus-visible:ring-2');
  });
});
