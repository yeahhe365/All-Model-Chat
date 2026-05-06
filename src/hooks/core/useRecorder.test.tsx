import { act } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createDeferred, flushPromises, renderHook } from '@/test/testUtils';
import { useRecorder } from './useRecorder';

const { getMixedAudioStreamMock } = vi.hoisted(() => ({
  getMixedAudioStreamMock: vi.fn(),
}));

vi.mock('@/features/audio/audioProcessing', () => ({
  getMixedAudioStream: getMixedAudioStreamMock,
}));

class FakeTrack {
  stop = vi.fn();
}

class FakeMediaStream {
  private readonly tracks: FakeTrack[];

  constructor(tracks = [new FakeTrack()]) {
    this.tracks = tracks;
  }

  getTracks() {
    return this.tracks;
  }
}

class FakeMediaRecorder {
  static isTypeSupported = vi.fn((mimeType: string): boolean => mimeType === 'audio/webm;codecs=opus');

  ondataavailable: ((event: BlobEvent) => void) | null = null;
  onstop: (() => void) | null = null;
  state = 'inactive';
  readonly stream: MediaStream;
  readonly options?: MediaRecorderOptions;

  constructor(stream: MediaStream, options?: MediaRecorderOptions) {
    this.stream = stream;
    this.options = options;
    mediaRecorderInstances.push(this);
  }

  start() {
    this.state = 'recording';
  }

  stop() {
    this.state = 'inactive';
    this.onstop?.();
  }
}

let mediaRecorderInstances: FakeMediaRecorder[] = [];
const getUserMediaMock = vi.fn();

describe('useRecorder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mediaRecorderInstances = [];
    FakeMediaRecorder.isTypeSupported = vi.fn((mimeType: string): boolean => mimeType === 'audio/webm;codecs=opus');

    Object.defineProperty(globalThis, 'MediaRecorder', {
      configurable: true,
      value: FakeMediaRecorder,
    });

    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: {
        getUserMedia: getUserMediaMock,
      },
    });

    getMixedAudioStreamMock.mockImplementation(async (stream: MediaStream) => ({
      stream,
      cleanup: vi.fn(),
    }));
  });

  it('does not create a MediaRecorder if recording is cancelled while microphone permission is pending', async () => {
    const micStream = new FakeMediaStream();
    const deferredMic = createDeferred<MediaStream>();
    getUserMediaMock.mockReturnValue(deferredMic.promise);
    const { result, unmount } = renderHook(() => useRecorder());

    await act(async () => {
      void result.current.startRecording();
      await flushPromises();
    });

    expect(result.current.isInitializing).toBe(true);

    act(() => {
      result.current.cancelRecording();
    });

    await act(async () => {
      deferredMic.resolve(micStream as unknown as MediaStream);
      await flushPromises();
    });

    expect(mediaRecorderInstances).toHaveLength(0);
    expect(micStream.getTracks()[0].stop).toHaveBeenCalled();
    expect(result.current.status).toBe('idle');
    expect(result.current.isInitializing).toBe(false);

    unmount();
  });

  it('uses the first supported recording mime type', async () => {
    const micStream = new FakeMediaStream();
    getUserMediaMock.mockResolvedValue(micStream);
    FakeMediaRecorder.isTypeSupported = vi.fn((mimeType: string): boolean => mimeType === 'audio/webm');
    const { result, unmount } = renderHook(() => useRecorder());

    await act(async () => {
      await result.current.startRecording();
    });

    expect(mediaRecorderInstances).toHaveLength(1);
    expect(mediaRecorderInstances[0].options).toEqual({ mimeType: 'audio/webm' });

    unmount();
  });
});
