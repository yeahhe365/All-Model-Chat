import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useLiveAPI } from '../useLiveAPI';

const captured = {
  latestSetSessionHandle: null as null | ((handle: string | null) => void),
  liveConfigCalls: [] as Array<{ sessionHandle: string | null }>,
};

vi.mock('../live-api/useLiveAudio', () => ({
  useLiveAudio: () => ({
    volume: 0,
    isSpeaking: false,
    isMuted: false,
    toggleMute: vi.fn(),
    initializeAudio: vi.fn(),
    playAudioChunk: vi.fn(),
    stopAudioPlayback: vi.fn(),
    cleanupAudio: vi.fn(),
  }),
}));

vi.mock('../live-api/useLiveVideo', () => ({
  useLiveVideo: () => ({
    videoStream: null,
    videoSource: null,
    videoRef: { current: null },
    startCamera: vi.fn(),
    startScreenShare: vi.fn(),
    stopVideo: vi.fn(),
    captureFrame: vi.fn(),
  }),
}));

vi.mock('../live-api/useLiveConfig', () => ({
  useLiveConfig: ({ sessionHandle }: { sessionHandle: string | null }) => {
    captured.liveConfigCalls.push({ sessionHandle });
    return {
      liveConfig: { sessionHandle },
      tools: [],
    };
  },
}));

vi.mock('../live-api/useLiveMessageProcessing', () => ({
  useLiveMessageProcessing: ({
    setSessionHandle,
  }: {
    setSessionHandle: (handle: string | null) => void;
  }) => {
    captured.latestSetSessionHandle = setSessionHandle;
    return {
      handleMessage: vi.fn(),
    };
  },
}));

vi.mock('../live-api/useLiveConnection', () => ({
  useLiveConnection: () => ({
    isConnected: false,
    isReconnecting: false,
    error: null,
    connect: vi.fn(),
    disconnect: vi.fn(),
    sendText: vi.fn(),
  }),
}));

vi.mock('../live-api/useLiveFrameCapture', () => ({
  useLiveFrameCapture: vi.fn(),
}));

vi.mock('../core/useBackgroundKeepAlive', () => ({
  useBackgroundKeepAlive: vi.fn(),
}));

describe('useLiveAPI', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    captured.latestSetSessionHandle = null;
    captured.liveConfigCalls = [];
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it('recomputes live config when the session handle changes', () => {
    const Harness = () => {
      useLiveAPI({
        appSettings: {} as never,
        chatSettings: {
          ttsVoice: 'Aoede',
          isGoogleSearchEnabled: false,
          isDeepSearchEnabled: false,
          systemInstruction: '',
          mediaResolution: 'MEDIA_RESOLUTION_LOW',
          thinkingBudget: 0,
          showThoughts: false,
        } as never,
        modelId: 'gemini-live',
      });
      return null;
    };

    act(() => {
      root.render(<Harness />);
    });

    expect(captured.liveConfigCalls.at(-1)?.sessionHandle).toBeNull();

    act(() => {
      captured.latestSetSessionHandle?.('session-123');
    });

    expect(captured.liveConfigCalls.at(-1)?.sessionHandle).toBe('session-123');
  });
});
