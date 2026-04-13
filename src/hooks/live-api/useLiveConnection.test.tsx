import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi, beforeEach } from 'vitest';

const {
  mockGetLiveApiClient,
  mockFloat32ToPCM16Base64,
} = vi.hoisted(() => ({
  mockGetLiveApiClient: vi.fn(),
  mockFloat32ToPCM16Base64: vi.fn(() => 'pcm-base64'),
}));

vi.mock('../../utils/appUtils', () => ({
  logService: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('../../services/api/baseApi', () => ({
  LiveApiAuthConfigurationError: class LiveApiAuthConfigurationError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'LiveApiAuthConfigurationError';
    }
  },
  getLiveApiClient: mockGetLiveApiClient,
}));

vi.mock('../../utils/audio/audioProcessing', () => ({
  float32ToPCM16Base64: mockFloat32ToPCM16Base64,
}));

import { useLiveConnection } from './useLiveConnection';

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

describe('useLiveConnection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFloat32ToPCM16Base64.mockReturnValue('pcm-base64');
  });

  it('sends text with sendRealtimeInput for live sessions', async () => {
    const sendRealtimeInput = vi.fn();
    const sendClientContent = vi.fn();

    const sessionRef = {
      current: Promise.resolve({
        sendRealtimeInput,
        sendClientContent,
        close: vi.fn(),
      }),
    };

    const { result, unmount } = renderHook(() =>
      useLiveConnection({
        appSettings: {} as any,
        chatSettings: {} as any,
        modelId: 'gemini-3.1-flash-live-preview',
        liveConfig: {},
        tools: [],
        initializeAudio: vi.fn(),
        cleanupAudio: vi.fn(),
        stopVideo: vi.fn(),
        handleMessage: vi.fn(),
        setSessionHandle: vi.fn(),
        sessionHandleRef: { current: null },
        sessionRef: sessionRef as any,
      }),
    );

    await act(async () => {
      await result.current.sendText('Hello live');
    });

    expect(sendRealtimeInput).toHaveBeenCalledWith({ text: 'Hello live' });
    expect(sendClientContent).not.toHaveBeenCalled();
    unmount();
  });

  it('does not send text after disconnect clears the live session', async () => {
    const sendRealtimeInput = vi.fn();
    const close = vi.fn();

    const sessionRef = {
      current: Promise.resolve({
        sendRealtimeInput,
        sendClientContent: vi.fn(),
        close,
      }),
    };

    const { result, unmount } = renderHook(() =>
      useLiveConnection({
        appSettings: {} as any,
        chatSettings: {} as any,
        modelId: 'gemini-3.1-flash-live-preview',
        liveConfig: {},
        tools: [],
        initializeAudio: vi.fn(),
        cleanupAudio: vi.fn(),
        stopVideo: vi.fn(),
        handleMessage: vi.fn(),
        setSessionHandle: vi.fn(),
        sessionHandleRef: { current: null },
        sessionRef: sessionRef as any,
      }),
    );

    act(() => {
      result.current.disconnect();
    });

    await act(async () => {
      await result.current.sendText('should not send');
    });

    expect(close).toHaveBeenCalled();
    expect(sendRealtimeInput).not.toHaveBeenCalled();
    unmount();
  });

  it('sends microphone chunks through the audio field', async () => {
    let audioCallback: ((data: Float32Array) => void) | null = null;
    const sendRealtimeInput = vi.fn();

    mockGetLiveApiClient.mockResolvedValue({
      live: {
        connect: vi.fn(({ callbacks }) => {
          callbacks.onopen?.();
          return Promise.resolve({
            sendRealtimeInput,
            close: vi.fn(),
          });
        }),
      },
    });

    const sessionRef = { current: null as any };

    const { result, unmount } = renderHook(() =>
      useLiveConnection({
        appSettings: {} as any,
        chatSettings: {} as any,
        modelId: 'gemini-3.1-flash-live-preview',
        liveConfig: {},
        tools: [],
        initializeAudio: vi.fn(async (callback) => {
          audioCallback = callback;
        }),
        cleanupAudio: vi.fn(),
        stopVideo: vi.fn(),
        handleMessage: vi.fn(),
        setSessionHandle: vi.fn(),
        sessionHandleRef: { current: null },
        sessionRef,
      }),
    );

    await act(async () => {
      await result.current.connect();
    });

    expect(audioCallback).not.toBeNull();

    act(() => {
      audioCallback?.(new Float32Array([0.25, -0.25]));
    });

    await Promise.resolve();

    expect(sendRealtimeInput).toHaveBeenCalledWith({
      audio: {
        mimeType: 'audio/pcm;rate=16000',
        data: 'pcm-base64',
      },
    });
    unmount();
  });

  it('surfaces a configuration error when no ephemeral token endpoint is configured', async () => {
    mockGetLiveApiClient.mockRejectedValue(
      Object.assign(new Error('Live API requires an ephemeral token endpoint.'), {
        name: 'LiveApiAuthConfigurationError',
      }),
    );

    const { result, unmount } = renderHook(() =>
      useLiveConnection({
        appSettings: {} as any,
        chatSettings: {} as any,
        modelId: 'gemini-3.1-flash-live-preview',
        liveConfig: {},
        tools: [],
        initializeAudio: vi.fn(),
        cleanupAudio: vi.fn(),
        stopVideo: vi.fn(),
        handleMessage: vi.fn(),
        setSessionHandle: vi.fn(),
        sessionHandleRef: { current: null },
        sessionRef: { current: null },
      }),
    );

    await act(async () => {
      await result.current.connect();
    });

    expect(result.current.error).toBe('Live API requires an ephemeral token endpoint.');
    expect(result.current.isReconnecting).toBe(false);
    unmount();
  });
});
