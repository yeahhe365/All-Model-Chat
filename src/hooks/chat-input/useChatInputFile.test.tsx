import React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useChatInputFile } from './useChatInputFile';

vi.mock('./useFilePreProcessingEffects', () => ({
  useFilePreProcessingEffects: () => ({
    isConverting: false,
    setIsConverting: vi.fn(),
    handleScreenshot: vi.fn(),
    handleOpenFolderPicker: vi.fn(),
    handleFileChange: vi.fn(),
    handleFolderChange: vi.fn(),
    handleZipChange: vi.fn(),
  }),
}));

vi.mock('./useChatInputFileUi', () => ({
  useChatInputFileUi: () => ({
    modalsState: {},
    localFileState: {},
  }),
}));

describe('useChatInputFile', () => {
  let container: HTMLDivElement;
  let root: Root;

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
    vi.clearAllMocks();
  });

  it('resets add-by-id progress when adding the file fails', async () => {
    const setAddingById = vi.fn();
    const setFileIdInput = vi.fn();
    const justInitiatedFileOpRef = { current: false };
    const onAddFileById = vi.fn(async () => {
      throw new Error('metadata lookup failed');
    });
    interface HarnessHandle {
      submit: () => Promise<void>;
    }

    const Harness = React.forwardRef<HarnessHandle>((_, ref) => {
      const textareaRef = React.useRef<HTMLTextAreaElement>(null);
      const fileInputRef = React.useRef<HTMLInputElement>(null);
      const imageInputRef = React.useRef<HTMLInputElement>(null);
      const folderInputRef = React.useRef<HTMLInputElement>(null);
      const zipInputRef = React.useRef<HTMLInputElement>(null);
      const cameraInputRef = React.useRef<HTMLInputElement>(null);
      const result = useChatInputFile({
        fileIdInput: ' files/example ',
        isAddingById: false,
        setAddingById,
        setFileIdInput,
        setInputText: vi.fn(),
        textareaRef,
        selectedFiles: [],
        setSelectedFiles: vi.fn(),
        setAppFileError: vi.fn(),
        onProcessFiles: vi.fn(async () => {}),
        onAddFileById,
        isLoading: false,
        fileRefs: {
          fileInputRef,
          imageInputRef,
          folderInputRef,
          zipInputRef,
          cameraInputRef,
        },
        justInitiatedFileOpRef,
      });

      React.useImperativeHandle(ref, () => ({ submit: result.handleAddFileByIdSubmit }), [
        result.handleAddFileByIdSubmit,
      ]);

      return null;
    });
    const harnessRef = React.createRef<HarnessHandle>();

    act(() => {
      root.render(<Harness ref={harnessRef} />);
    });

    await expect(harnessRef.current?.submit()).rejects.toThrow('metadata lookup failed');

    expect(onAddFileById).toHaveBeenCalledWith('files/example');
    expect(setAddingById).toHaveBeenNthCalledWith(1, true);
    expect(setAddingById).toHaveBeenNthCalledWith(2, false);
    expect(setFileIdInput).not.toHaveBeenCalled();
    expect(justInitiatedFileOpRef.current).toBe(true);
  });
});
