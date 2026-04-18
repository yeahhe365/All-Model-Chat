import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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

const flushAsyncConnect = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

describe('useLiveConnection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    mockFloat32ToPCM16Base64.mockReturnValue('pcm-base64');
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('sends text with sendRealtimeInput for live sessions', async () => {
    const sendRealtimeInput = vi.fn();
    const sendClientContent = vi.fn();
    const sessionRef = { current: null as any };

    mockGetLiveApiClient.mockResolvedValue({
      live: {
        connect: vi.fn(({ callbacks }) => {
          callbacks.onopen?.();
          callbacks.onmessage?.({ setupComplete: {} });
          return Promise.resolve({
            sendRealtimeInput,
            sendClientContent,
            close: vi.fn(),
          });
        }),
      },
    });

    const { result, unmount } = renderHook(() =>
      useLiveConnection({
        appSettings: {} as any,
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
      await result.current.connect();
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
          callbacks.onmessage?.({ setupComplete: {} });
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
      Object.assign(new Error('custom backend message'), {
        name: 'LiveApiAuthConfigurationError',
        code: 'MISSING_EPHEMERAL_TOKEN_ENDPOINT',
      }),
    );

    const { result, unmount } = renderHook(() =>
      useLiveConnection({
        appSettings: {} as any,
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

    expect(result.current.errorState).toEqual({
      kind: 'translation',
      key: 'liveStatus_missing_token_endpoint',
      fallback: 'Live API requires an ephemeral token endpoint.',
    });
    expect(result.current.isReconnecting).toBe(false);
    unmount();
  });

  it('reconnects with exponential backoff after unexpected disconnects', async () => {
    vi.useFakeTimers();

    const callbacksByAttempt: Array<{
      onopen?: () => void;
      onmessage?: (message: unknown) => void;
      onclose?: (event: unknown) => void;
    }> = [];

    const connectLiveSession = vi.fn(({ callbacks }) => {
      callbacksByAttempt.push(callbacks);
      callbacks.onopen?.();
      return Promise.resolve({
        sendRealtimeInput: vi.fn(),
        close: vi.fn(),
      });
    });

    mockGetLiveApiClient
      .mockResolvedValueOnce({
        live: {
          connect: connectLiveSession,
        },
      })
      .mockRejectedValueOnce(new Error('temporary outage'))
      .mockResolvedValueOnce({
        live: {
          connect: connectLiveSession,
        },
      });

    const { result, unmount } = renderHook(() =>
      useLiveConnection({
        appSettings: {} as any,
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
      const connectPromise = result.current.connect();
      await flushAsyncConnect();
      callbacksByAttempt[0]?.onmessage?.({ setupComplete: {} });
      await connectPromise;
    });

    expect(connectLiveSession).toHaveBeenCalledTimes(1);

    await act(async () => {
      callbacksByAttempt[0]?.onclose?.({ reason: 'network-blip' });
      await Promise.resolve();
    });

    expect(vi.getTimerCount()).toBe(1);

    act(() => {
      vi.advanceTimersByTime(999);
    });
    expect(connectLiveSession).toHaveBeenCalledTimes(1);

    await act(async () => {
      vi.advanceTimersByTime(1);
      await Promise.resolve();
    });
    expect(mockGetLiveApiClient).toHaveBeenCalledTimes(2);
    expect(connectLiveSession).toHaveBeenCalledTimes(1);

    expect(vi.getTimerCount()).toBe(1);

    await act(async () => {
      vi.advanceTimersByTime(1999);
      await Promise.resolve();
    });
    expect(mockGetLiveApiClient).toHaveBeenCalledTimes(2);
    expect(connectLiveSession).toHaveBeenCalledTimes(1);

    await act(async () => {
      vi.advanceTimersByTime(1);
      await Promise.resolve();
    });
    expect(mockGetLiveApiClient).toHaveBeenCalledTimes(3);
    expect(connectLiveSession).toHaveBeenCalledTimes(2);

    unmount();
  });

  it('cancels a pending reconnect when the user disconnects manually', async () => {
    vi.useFakeTimers();

    const callbacksByAttempt: Array<{
      onopen?: () => void;
      onmessage?: (message: unknown) => void;
      onclose?: (event: unknown) => void;
    }> = [];
    const close = vi.fn();
    const sessionRef = { current: null as any };
    const sessionHandleRef = { current: null as string | null };

    const connectLiveSession = vi.fn(({ callbacks }) => {
      callbacksByAttempt.push(callbacks);
      callbacks.onopen?.();
      return Promise.resolve({
        sendRealtimeInput: vi.fn(),
        close,
      });
    });

    mockGetLiveApiClient.mockResolvedValue({
      live: {
        connect: connectLiveSession,
      },
    });

    const onClose = vi.fn();

    const { result, unmount } = renderHook(() =>
      useLiveConnection({
        appSettings: {} as any,
        modelId: 'gemini-3.1-flash-live-preview',
        liveConfig: {},
        tools: [],
        initializeAudio: vi.fn(),
        cleanupAudio: vi.fn(),
        stopVideo: vi.fn(),
        handleMessage: vi.fn(),
        onClose,
        setSessionHandle: vi.fn(),
        sessionHandleRef,
        sessionRef,
      }),
    );

    await act(async () => {
      const connectPromise = result.current.connect();
      await flushAsyncConnect();
      callbacksByAttempt[0]?.onmessage?.({ setupComplete: {} });
      await connectPromise;
    });

    await act(async () => {
      callbacksByAttempt[0]?.onclose?.({ reason: 'unexpected-drop' });
      await Promise.resolve();
    });

    expect(vi.getTimerCount()).toBe(1);

    await act(async () => {
      result.current.disconnect();
      await Promise.resolve();
    });

    await act(async () => {
      vi.advanceTimersByTime(30_000);
      await Promise.resolve();
    });

    expect(connectLiveSession).toHaveBeenCalledTimes(1);
    expect(close).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();

    unmount();
  });

  it('does not queue duplicate reconnect timers for one disconnect event burst', async () => {
    vi.useFakeTimers();

    const callbacksByAttempt: Array<{
      onopen?: () => void;
      onmessage?: (message: unknown) => void;
      onclose?: (event: unknown) => void;
      onerror?: (error: Error) => void;
    }> = [];

    const connectLiveSession = vi.fn(({ callbacks }) => {
      callbacksByAttempt.push(callbacks);
      callbacks.onopen?.();
      return Promise.resolve({
        sendRealtimeInput: vi.fn(),
        close: vi.fn(),
      });
    });

    mockGetLiveApiClient.mockResolvedValue({
      live: {
        connect: connectLiveSession,
      },
    });

    const { result, unmount } = renderHook(() =>
      useLiveConnection({
        appSettings: {} as any,
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
      const connectPromise = result.current.connect();
      await flushAsyncConnect();
      callbacksByAttempt[0]?.onmessage?.({ setupComplete: {} });
      await connectPromise;
    });

    await act(async () => {
      callbacksByAttempt[0]?.onerror?.(new Error('socket error'));
      callbacksByAttempt[0]?.onclose?.({ reason: 'socket closed' });
      await Promise.resolve();
    });

    expect(vi.getTimerCount()).toBe(1);

    await act(async () => {
      vi.advanceTimersByTime(1000);
      await Promise.resolve();
    });

    expect(connectLiveSession).toHaveBeenCalledTimes(2);

    unmount();
  });

  it('clears buffered audio and playback immediately before scheduling a reconnect', async () => {
    vi.useFakeTimers();

    const callbacksByAttempt: Array<{
      onopen?: () => void;
      onmessage?: (message: unknown) => void;
      onclose?: (event: unknown) => void;
    }> = [];
    const cleanupAudio = vi.fn();
    const clearBufferedAudio = vi.fn();

    const connectLiveSession = vi.fn(({ callbacks }) => {
      callbacksByAttempt.push(callbacks);
      callbacks.onopen?.();
      return Promise.resolve({
        sendRealtimeInput: vi.fn(),
        close: vi.fn(),
      });
    });

    mockGetLiveApiClient.mockResolvedValue({
      live: {
        connect: connectLiveSession,
      },
    });

    const { result, unmount } = renderHook(() =>
      useLiveConnection({
        appSettings: {} as any,
        modelId: 'gemini-3.1-flash-live-preview',
        liveConfig: {},
        tools: [],
        initializeAudio: vi.fn(),
        cleanupAudio,
        clearBufferedAudio,
        stopVideo: vi.fn(),
        handleMessage: vi.fn(),
        setSessionHandle: vi.fn(),
        sessionHandleRef: { current: null },
        sessionRef: { current: null },
      }),
    );

    await act(async () => {
      const connectPromise = result.current.connect();
      await flushAsyncConnect();
      callbacksByAttempt[0]?.onmessage?.({ setupComplete: {} });
      await connectPromise;
    });

    await act(async () => {
      callbacksByAttempt[0]?.onclose?.({ reason: 'network-drop' });
      await Promise.resolve();
    });

    expect(cleanupAudio).toHaveBeenCalledTimes(1);
    expect(clearBufferedAudio).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(1);

    unmount();
  });

  it('does not mark the session connected until setupComplete arrives', async () => {
    const callbacksByAttempt: Array<{
      onopen?: () => void;
      onmessage?: (message: unknown) => void;
    }> = [];

    mockGetLiveApiClient.mockResolvedValue({
      live: {
        connect: vi.fn(({ callbacks }) => {
          callbacksByAttempt.push(callbacks);
          callbacks.onopen?.();
          return Promise.resolve({
            sendRealtimeInput: vi.fn(),
            close: vi.fn(),
          });
        }),
      },
    });

    const { result, unmount } = renderHook(() =>
      useLiveConnection({
        appSettings: {} as any,
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

    let didResolve = false;

    await act(async () => {
      const connectPromise = result.current.connect().then(() => {
        didResolve = true;
      });
      await flushAsyncConnect();

      expect(result.current.isConnected).toBe(false);
      expect(didResolve).toBe(false);

      callbacksByAttempt[0]?.onmessage?.({ setupComplete: {} });
      await connectPromise;
    });

    expect(result.current.isConnected).toBe(true);
    expect(didResolve).toBe(true);

    unmount();
  });

  it('reconnects immediately when the server sends goAway and a resumable handle is available', async () => {
    const callbacksByAttempt: Array<{
      onopen?: () => void;
      onmessage?: (message: unknown) => void;
      onclose?: (event: unknown) => void;
    }> = [];
    const close = vi.fn();
    const sessionRef = { current: null as any };
    const sessionHandleRef = { current: 'resumable-handle' as string | null };

    const connectLiveSession = vi.fn(({ callbacks }) => {
      callbacksByAttempt.push(callbacks);
      callbacks.onopen?.();
      return Promise.resolve({
        sendRealtimeInput: vi.fn(),
        close,
      });
    });

    mockGetLiveApiClient.mockResolvedValue({
      live: {
        connect: connectLiveSession,
      },
    });

    const { result, unmount } = renderHook(() =>
      useLiveConnection({
        appSettings: {} as any,
        modelId: 'gemini-3.1-flash-live-preview',
        liveConfig: {},
        tools: [],
        initializeAudio: vi.fn(),
        cleanupAudio: vi.fn(),
        stopVideo: vi.fn(),
        handleMessage: vi.fn(),
        setSessionHandle: vi.fn(),
        sessionHandleRef,
        sessionRef,
      }),
    );

    await act(async () => {
      const connectPromise = result.current.connect();
      await flushAsyncConnect();
      callbacksByAttempt[0]?.onmessage?.({ setupComplete: {} });
      await connectPromise;
    });

    await act(async () => {
      result.current.handleGoAway({ timeLeft: '5s' });
      await Promise.resolve();
    });

    expect(close).toHaveBeenCalledTimes(1);

    await act(async () => {
      callbacksByAttempt[0]?.onclose?.({ reason: 'server-rotation' });
      callbacksByAttempt[1]?.onmessage?.({ setupComplete: {} });
      await Promise.resolve();
    });

    expect(connectLiveSession).toHaveBeenCalledTimes(2);

    unmount();
  });
});
