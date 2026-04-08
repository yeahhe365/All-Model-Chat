import React, { act, useLayoutEffect } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useLiveMessageProcessing } from '../useLiveMessageProcessing';

vi.mock('../useLiveTools', () => ({
  useLiveTools: () => ({
    handleToolCall: vi.fn(),
  }),
}));

vi.mock('../../../utils/audio/audioProcessing', () => ({
  createWavBlobFromPCMChunks: vi.fn(() => 'blob:audio'),
}));

describe('useLiveMessageProcessing', () => {
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

  it('processes audio chunks from every part in a single server event', async () => {
    const onTranscript = vi.fn();
    const playAudioChunk = vi.fn().mockResolvedValue(undefined);

    const { result } = renderHook(() =>
      useLiveMessageProcessing({
        playAudioChunk,
        stopAudioPlayback: vi.fn(),
        onTranscript,
        clientFunctions: {},
        sessionRef: { current: null },
        setSessionHandle: vi.fn(),
        sessionHandleRef: { current: null },
      })
    );

    await act(async () => {
      await result.current.handleMessage({
        serverContent: {
          modelTurn: {
            parts: [
              { text: 'first transcript' },
              { inlineData: { mimeType: 'audio/pcm', data: 'audio-one' } },
              { inlineData: { mimeType: 'audio/pcm', data: 'audio-two' } },
            ],
          },
        },
      } as any);
    });

    expect(onTranscript).toHaveBeenCalledWith('first transcript', 'model', false, 'content');
    expect(playAudioChunk).toHaveBeenNthCalledWith(1, 'audio-one');
    expect(playAudioChunk).toHaveBeenNthCalledWith(2, 'audio-two');
  });
});
