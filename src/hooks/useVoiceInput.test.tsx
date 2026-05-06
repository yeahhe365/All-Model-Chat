import { act } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@/test/testUtils';
import { useVoiceInput } from './useVoiceInput';

const { mockUseRecorder } = vi.hoisted(() => ({
  mockUseRecorder: vi.fn(),
}));

vi.mock('./core/useRecorder', () => ({
  useRecorder: mockUseRecorder,
}));

describe('useVoiceInput', () => {
  const recorderState = {
    status: 'idle' as 'idle' | 'recording' | 'paused',
    isInitializing: false,
    startRecording: vi.fn(),
    stopRecording: vi.fn(),
    cancelRecording: vi.fn(),
    onStop: undefined as ((blob: Blob) => void) | undefined,
    onError: undefined as ((error: string) => void) | undefined,
    onSystemAudioWarning: undefined as ((warning: string | null) => void) | undefined,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    recorderState.status = 'idle';
    recorderState.isInitializing = false;
    recorderState.startRecording = vi.fn();
    recorderState.stopRecording = vi.fn();
    recorderState.cancelRecording = vi.fn();
    recorderState.onStop = undefined;
    recorderState.onError = undefined;
    recorderState.onSystemAudioWarning = undefined;

    mockUseRecorder.mockImplementation(
      (options?: {
        onStop?: (blob: Blob) => void;
        onError?: (error: string) => void;
        onSystemAudioWarning?: (warning: string | null) => void;
      }) => {
        recorderState.onStop = options?.onStop;
        recorderState.onError = options?.onError;
        recorderState.onSystemAudioWarning = options?.onSystemAudioWarning;
        return {
          status: recorderState.status,
          isInitializing: recorderState.isInitializing,
          startRecording: recorderState.startRecording,
          stopRecording: recorderState.stopRecording,
          cancelRecording: recorderState.cancelRecording,
        };
      },
    );
  });

  it('reports recorder errors through the chat input file error channel', () => {
    const setAppFileError = vi.fn();
    const { result, unmount } = renderHook(() =>
      useVoiceInput({
        onTranscribeAudio: vi.fn(async () => ''),
        setInputText: vi.fn(),
        setAppFileError,
        textareaRef: { current: null },
      }),
    );

    act(() => {
      recorderState.onError?.('Could not start recording. Please check permissions.');
    });

    expect(result.current.error).toBe('Could not start recording. Please check permissions.');
    expect(setAppFileError).toHaveBeenCalledWith('Could not start recording. Please check permissions.');

    unmount();
  });

  it('keeps voice input busy immediately after stopping until transcription finishes', async () => {
    recorderState.status = 'recording';
    const onTranscribeAudio = vi.fn(async () => 'hello');
    const { result, unmount } = renderHook(() =>
      useVoiceInput({
        onTranscribeAudio,
        setInputText: vi.fn(),
        textareaRef: { current: null },
      }),
    );

    act(() => {
      result.current.handleVoiceInputClick();
    });

    expect(recorderState.stopRecording).toHaveBeenCalled();
    expect(result.current.isTranscribing).toBe(true);

    await act(async () => {
      await recorderState.onStop?.(new Blob(['audio'], { type: 'audio/webm' }));
    });

    expect(result.current.isTranscribing).toBe(false);

    unmount();
  });

  it('reports system audio fallback warnings through the chat input file error channel', () => {
    const setAppFileError = vi.fn();
    const { result, unmount } = renderHook(() =>
      useVoiceInput({
        onTranscribeAudio: vi.fn(async () => ''),
        setInputText: vi.fn(),
        setAppFileError,
        textareaRef: { current: null },
      }),
    );

    act(() => {
      recorderState.onSystemAudioWarning?.(
        'System audio was not shared. Recording continued with microphone audio only.',
      );
    });

    expect(result.current.systemAudioWarning).toBe(
      'System audio was not shared. Recording continued with microphone audio only.',
    );
    expect(setAppFileError).toHaveBeenCalledWith(
      'System audio was not shared. Recording continued with microphone audio only.',
    );

    unmount();
  });

  it('always starts input-bar voice recording with microphone audio only', () => {
    const { result, unmount } = renderHook(() =>
      useVoiceInput({
        onTranscribeAudio: vi.fn(async () => ''),
        setInputText: vi.fn(),
        setAppFileError: vi.fn(),
        isSystemAudioRecordingEnabled: true,
        textareaRef: { current: null },
      }),
    );

    act(() => {
      result.current.handleVoiceInputClick();
    });

    expect(recorderState.startRecording).toHaveBeenCalledWith({ captureSystemAudio: false });

    unmount();
  });
});
