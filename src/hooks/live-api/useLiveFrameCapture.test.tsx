import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useLiveFrameCapture } from './useLiveFrameCapture';

const renderHook = <T,>(callback: () => T) => {
  const container = document.createElement('div');
  const root = createRoot(container);
  const result: { current: T | null } = { current: null };

  const TestComponent = () => {
    result.current = callback();
    return null;
  };

  act(() => {
    root.render(<TestComponent />);
  });

  return {
    result: result as { current: T },
    unmount: () => {
      act(() => {
        root.unmount();
      });
    },
  };
};

describe('useLiveFrameCapture', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('sends frames through the video field at most once per second', async () => {
    const sendRealtimeInput = vi.fn();
    const sessionRef = {
      current: Promise.resolve({
        sendRealtimeInput,
      }),
    };

    const videoStream = {} as MediaStream;

    const { unmount } = renderHook(() =>
      useLiveFrameCapture({
        isConnected: true,
        videoStream,
        videoSource: 'camera',
        volume: 0.2,
        isMuted: false,
        captureFrame: () => 'jpeg-base64',
        sessionRef: sessionRef as any,
      }),
    );

    await act(async () => {
      vi.advanceTimersByTime(999);
    });
    expect(sendRealtimeInput).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(1);
      await Promise.resolve();
    });

    expect(sendRealtimeInput).toHaveBeenCalledTimes(1);
    expect(sendRealtimeInput).toHaveBeenCalledWith({
      video: {
        mimeType: 'image/jpeg',
        data: 'jpeg-base64',
      },
    });

    unmount();
    vi.useRealTimers();
  });

  it('does not send frames while the user is silent', async () => {
    const sendRealtimeInput = vi.fn();
    const sessionRef = {
      current: Promise.resolve({
        sendRealtimeInput,
      }),
    };

    const videoStream = {} as MediaStream;

    const { unmount } = renderHook(() =>
      useLiveFrameCapture({
        isConnected: true,
        videoStream,
        videoSource: 'camera',
        volume: 0,
        isMuted: false,
        captureFrame: () => 'jpeg-base64',
        sessionRef: sessionRef as any,
      }),
    );

    await act(async () => {
      vi.advanceTimersByTime(1000);
      await Promise.resolve();
    });

    expect(sendRealtimeInput).not.toHaveBeenCalled();

    unmount();
    vi.useRealTimers();
  });

  it('continues sending screen-share frames while the user is silent', async () => {
    const sendRealtimeInput = vi.fn();
    const sessionRef = {
      current: Promise.resolve({
        sendRealtimeInput,
      }),
    };

    const videoStream = {} as MediaStream;

    const { unmount } = renderHook(() =>
      useLiveFrameCapture({
        isConnected: true,
        videoStream,
        videoSource: 'screen',
        volume: 0,
        isMuted: false,
        captureFrame: () => 'screen-jpeg-base64',
        sessionRef: sessionRef as any,
      }),
    );

    await act(async () => {
      vi.advanceTimersByTime(1000);
      await Promise.resolve();
    });

    expect(sendRealtimeInput).toHaveBeenCalledWith({
      video: {
        mimeType: 'image/jpeg',
        data: 'screen-jpeg-base64',
      },
    });

    unmount();
    vi.useRealTimers();
  });
});
