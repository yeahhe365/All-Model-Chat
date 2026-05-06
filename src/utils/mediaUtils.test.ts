import { afterEach, describe, expect, it, vi } from 'vitest';
import { captureScreenImage } from './mediaUtils';

const originalMediaDevices = navigator.mediaDevices;
const originalImageCapture = window.ImageCapture;

describe('captureScreenImage', () => {
  afterEach(() => {
    vi.useRealTimers();
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: originalMediaDevices,
    });
    Object.defineProperty(window, 'ImageCapture', {
      configurable: true,
      value: originalImageCapture,
    });
    vi.restoreAllMocks();
  });

  it('returns null instead of throwing when mediaDevices is unavailable', async () => {
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: undefined,
    });
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

    await expect(captureScreenImage()).resolves.toBeNull();

    expect(alertSpy).toHaveBeenCalledWith('Your browser does not support screen capture.');
  });

  it('settles and stops the stream when the video fallback never becomes ready', async () => {
    vi.useFakeTimers();
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
    const stop = vi.fn();
    const track = { stop } as unknown as MediaStreamTrack;
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: {
        getDisplayMedia: vi.fn(async () => ({
          getVideoTracks: () => [track],
          getTracks: () => [track],
        })),
      },
    });

    let resolvedValue: Blob | null | 'pending' = 'pending';
    const capturePromise = captureScreenImage().then((value) => {
      resolvedValue = value;
    });

    await vi.advanceTimersByTimeAsync(3000);
    await capturePromise;

    expect(resolvedValue).toBeNull();
    expect(stop).toHaveBeenCalledTimes(1);
  });
});
