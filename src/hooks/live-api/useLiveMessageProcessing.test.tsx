import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockHandleToolCall, mockCreateWavBlobFromPCMChunks } = vi.hoisted(() => ({
  mockHandleToolCall: vi.fn(),
  mockCreateWavBlobFromPCMChunks: vi.fn(() => 'blob:audio'),
}));

vi.mock('./useLiveTools', () => ({
  useLiveTools: () => ({
    handleToolCall: mockHandleToolCall,
  }),
}));

vi.mock('../../utils/audio/audioProcessing', () => ({
  createWavBlobFromPCMChunks: mockCreateWavBlobFromPCMChunks,
}));

import { useLiveMessageProcessing } from './useLiveMessageProcessing';

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

describe('useLiveMessageProcessing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('plays every audio part in a Gemini 3.1 live model turn', async () => {
    const playAudioChunk = vi.fn();
    const onTranscript = vi.fn();

    const { result, unmount } = renderHook(() =>
      useLiveMessageProcessing({
        playAudioChunk,
        stopAudioPlayback: vi.fn(),
        onTranscript,
        sessionRef: { current: null },
        setSessionHandle: vi.fn(),
        sessionHandleRef: { current: null },
      }),
    );

    await act(async () => {
      await result.current.handleMessage({
        serverContent: {
          modelTurn: {
            parts: [
              { text: 'preface' },
              { inlineData: { data: 'audio-1' } },
              { inlineData: { data: 'audio-2' } },
              { text: 'suffix' },
            ],
          },
          turnComplete: true,
        },
      } as any);
    });

    expect(playAudioChunk).toHaveBeenCalledTimes(2);
    expect(playAudioChunk).toHaveBeenNthCalledWith(1, 'audio-1');
    expect(playAudioChunk).toHaveBeenNthCalledWith(2, 'audio-2');
    expect(mockCreateWavBlobFromPCMChunks).toHaveBeenCalledWith(['audio-1', 'audio-2']);
    expect(onTranscript).toHaveBeenCalledWith('preface', 'model', false, 'content');
    expect(onTranscript).toHaveBeenCalledWith('suffix', 'model', false, 'content');
    expect(onTranscript).toHaveBeenCalledWith('', 'model', true, 'content', 'blob:audio');

    unmount();
  });

  it('drops buffered audio chunks when the connection layer requests a reset', async () => {
    const playAudioChunk = vi.fn();
    const onTranscript = vi.fn();

    const { result, unmount } = renderHook(() =>
      useLiveMessageProcessing({
        playAudioChunk,
        stopAudioPlayback: vi.fn(),
        onTranscript,
        sessionRef: { current: null },
        setSessionHandle: vi.fn(),
        sessionHandleRef: { current: null },
      }),
    );

    await act(async () => {
      await result.current.handleMessage({
        serverContent: {
          modelTurn: {
            parts: [{ inlineData: { data: 'stale-audio' } }],
          },
        },
      } as any);
    });

    act(() => {
      result.current.clearBufferedAudio();
    });

    await act(async () => {
      await result.current.handleMessage({
        serverContent: {
          turnComplete: true,
        },
      } as any);
    });

    expect(mockCreateWavBlobFromPCMChunks).not.toHaveBeenCalled();
    expect(onTranscript).toHaveBeenCalledWith('', 'user', true, 'content');
    expect(onTranscript).toHaveBeenCalledWith('', 'model', true, 'content');

    unmount();
  });
});
