import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { mockUseRecorder, mockCreateObjectURL, mockRevokeObjectURL } = vi.hoisted(() => ({
  mockUseRecorder: vi.fn(),
  mockCreateObjectURL: vi.fn(() => 'blob:recording-url'),
  mockRevokeObjectURL: vi.fn(),
}));

vi.mock('./core/useRecorder', () => ({
  useRecorder: mockUseRecorder,
}));

import { useAudioRecorder } from './useAudioRecorder';

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
    rerender: () => {
      act(() => {
        root.render(<TestComponent />);
      });
    },
    unmount: () => {
      act(() => {
        root.unmount();
      });
    },
  };
};

describe('useAudioRecorder', () => {
  const recorderState = {
    status: 'idle' as 'idle' | 'recording' | 'paused',
    isInitializing: false,
    duration: 0,
    error: null as string | null,
    stream: null as MediaStream | null,
    startRecording: vi.fn(),
    stopRecording: vi.fn(),
    cancelRecording: vi.fn(),
    onStop: undefined as ((blob: Blob) => void) | undefined,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    recorderState.status = 'idle';
    recorderState.isInitializing = false;
    recorderState.duration = 0;
    recorderState.error = null;
    recorderState.stream = null;
    recorderState.startRecording = vi.fn();
    recorderState.stopRecording = vi.fn();
    recorderState.cancelRecording = vi.fn();
    recorderState.onStop = undefined;

    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: mockCreateObjectURL,
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: mockRevokeObjectURL,
    });

    mockUseRecorder.mockImplementation((options?: { onStop?: (blob: Blob) => void }) => {
      recorderState.onStop = options?.onStop;
      return {
        status: recorderState.status,
        isInitializing: recorderState.isInitializing,
        duration: recorderState.duration,
        error: recorderState.error,
        stream: recorderState.stream,
        startRecording: recorderState.startRecording,
        stopRecording: recorderState.stopRecording,
        cancelRecording: recorderState.cancelRecording,
      };
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('derives review state from a completed recording and recording state from recorder status', () => {
    const { result, rerender, unmount } = renderHook(() => useAudioRecorder());

    expect(result.current.viewState).toBe('idle');

    recorderState.status = 'recording';
    rerender();

    expect(result.current.viewState).toBe('recording');

    const blob = new Blob(['audio'], { type: 'audio/webm' });

    act(() => {
      recorderState.onStop?.(blob);
    });

    expect(result.current.viewState).toBe('review');
    expect(result.current.audioBlob).toBe(blob);
    expect(result.current.audioUrl).toBe('blob:recording-url');

    unmount();
  });
});
