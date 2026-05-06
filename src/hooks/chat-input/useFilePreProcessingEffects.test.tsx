import { act } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@/test/testUtils';
import { useFilePreProcessingEffects } from './useFilePreProcessingEffects';
import { captureScreenImage } from '../../utils/mediaUtils';

vi.mock('../../utils/mediaUtils', () => ({
  captureScreenImage: vi.fn(),
}));

const mockedCaptureScreenImage = vi.mocked(captureScreenImage);

const createParams = (overrides: Partial<Parameters<typeof useFilePreProcessingEffects>[0]> = {}) => ({
  fileInputRef: { current: null },
  imageInputRef: { current: null },
  folderInputRef: { current: null },
  zipInputRef: { current: null },
  justInitiatedFileOpRef: { current: false },
  onProcessFiles: vi.fn(async () => {}),
  setSelectedFiles: vi.fn(),
  setAppFileError: vi.fn(),
  ...overrides,
});

describe('useFilePreProcessingEffects screenshot handling', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('reports capture errors and clears the screenshot busy state', async () => {
    mockedCaptureScreenImage.mockRejectedValue(new Error('screen capture exploded'));
    const params = createParams();

    const { result, unmount } = renderHook(() => useFilePreProcessingEffects(params));

    await act(async () => {
      await result.current.handleScreenshot();
    });

    expect(params.setAppFileError).toHaveBeenCalledWith('Failed to capture screenshot.');
    expect(params.onProcessFiles).not.toHaveBeenCalled();
    expect(result.current.isScreenCapturing).toBe(false);

    unmount();
  });

  it('ignores duplicate screenshot requests while a capture is in progress', async () => {
    let resolveCapture!: (blob: Blob) => void;
    mockedCaptureScreenImage.mockReturnValue(
      new Promise<Blob>((resolve) => {
        resolveCapture = resolve;
      }),
    );
    const params = createParams();

    const { result, unmount } = renderHook(() => useFilePreProcessingEffects(params));

    let firstCapture!: Promise<void>;
    await act(async () => {
      firstCapture = result.current.handleScreenshot();
    });

    await act(async () => {
      await result.current.handleScreenshot();
    });

    expect(mockedCaptureScreenImage).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveCapture(new Blob(['png'], { type: 'image/png' }));
      await firstCapture;
    });

    expect(params.onProcessFiles).toHaveBeenCalledTimes(1);
    expect(result.current.isScreenCapturing).toBe(false);

    unmount();
  });
});
