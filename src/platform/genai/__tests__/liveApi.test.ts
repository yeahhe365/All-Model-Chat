import React, { act, useLayoutEffect } from 'react';
import { Session } from '@google/genai';
import { createRoot, Root } from 'react-dom/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useLiveConnection } from '../../../hooks/live-api/useLiveConnection';

vi.mock('../../../utils/appUtils', () => ({
  logService: {
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

describe('Live API text transport selection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderHook = <TResult,>(useHook: () => TResult) => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    let root: Root | null = createRoot(container);
    const resultRef: { current: TResult | undefined } = { current: undefined };

    function HookHarness() {
      const value = useHook();

      useLayoutEffect(() => {
        resultRef.current = value;
      }, [value]);

      return null;
    }

    act(() => {
      root!.render(React.createElement(HookHarness));
    });

    return {
      result: {
        get current() {
          return resultRef.current!;
        },
      },
      unmount() {
        act(() => {
          root?.unmount();
          root = null;
        });
        container.remove();
      },
    };
  };

  const renderLiveConnection = (modelId: string) => {
    const session = {
      close: vi.fn(),
      sendClientContent: vi.fn(),
      sendRealtimeInput: vi.fn(),
    };

    const sessionRef = { current: Promise.resolve(session as unknown as Session) };
    const sessionHandleRef = { current: null };

    const hook = renderHook(() =>
      useLiveConnection({
        appSettings: {} as any,
        chatSettings: {} as any,
        modelId,
        liveConfig: {},
        tools: [],
        initializeAudio: vi.fn(),
        cleanupAudio: vi.fn(),
        stopVideo: vi.fn(),
        handleMessage: vi.fn(),
        onClose: vi.fn(),
        onTranscript: vi.fn(),
        setSessionHandle: vi.fn(),
        sessionHandleRef,
        sessionRef,
      })
    );

    return {
      ...hook,
      session,
    };
  };

  it('uses realtime text updates for Gemini 3.1 live models', async () => {
    const { result, session } = renderLiveConnection('gemini-3.1-flash-live-preview');

    await act(async () => {
      await result.current.sendText('hello live');
    });

    expect(session.sendRealtimeInput).toHaveBeenCalledWith({ text: 'hello live' });
    expect(session.sendClientContent).not.toHaveBeenCalled();
  });

  it('keeps client content turns for Gemini 2.5 live models', async () => {
    const { result, session } = renderLiveConnection('gemini-2.5-flash-native-audio-preview-12-2025');

    await act(async () => {
      await result.current.sendText('hello audio');
    });

    expect(session.sendClientContent).toHaveBeenCalledWith({
      turnComplete: true,
      turns: [{ parts: [{ text: 'hello audio' }], role: 'user' }],
    });
    expect(session.sendRealtimeInput).not.toHaveBeenCalled();
  });
});
