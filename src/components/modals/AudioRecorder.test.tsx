import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/test/providerTestUtils';
import { AudioRecorder } from './AudioRecorder';

const { mockUseAudioRecorder } = vi.hoisted(() => ({
  mockUseAudioRecorder: vi.fn(),
}));

vi.mock('@/features/audio/useAudioRecorder', () => ({
  useAudioRecorder: mockUseAudioRecorder,
}));

vi.mock('@/components/recorder/AudioVisualizer', () => ({
  AudioVisualizer: () => <div data-testid="audio-visualizer" />,
}));

vi.mock('@/components/shared/AudioPlayer', () => ({
  AudioPlayer: () => <div data-testid="audio-player" />,
}));

describe('AudioRecorder', () => {
  const recorderState = {
    viewState: 'idle' as 'idle' | 'recording' | 'review',
    isInitializing: false,
    recordingTime: 0,
    audioBlob: null as Blob | null,
    audioUrl: null as string | null,
    error: null as string | null,
    systemAudioWarning: null as string | null,
    stream: null as MediaStream | null,
    status: 'idle' as 'idle' | 'recording' | 'paused',
    startRecording: vi.fn(),
    stopRecording: vi.fn(),
    discardRecording: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    recorderState.viewState = 'idle';
    recorderState.isInitializing = false;
    recorderState.recordingTime = 0;
    recorderState.audioBlob = null;
    recorderState.audioUrl = null;
    recorderState.error = null;
    recorderState.systemAudioWarning = null;
    recorderState.stream = null;
    recorderState.status = 'idle';
    recorderState.startRecording = vi.fn();
    recorderState.stopRecording = vi.fn();
    recorderState.discardRecording = vi.fn();

    mockUseAudioRecorder.mockImplementation(() => recorderState);
  });

  it('starts microphone-only recording from the primary recorder choice', () => {
    renderWithProviders(<AudioRecorder onRecord={vi.fn()} onCancel={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: /record microphone/i }));

    expect(recorderState.startRecording).toHaveBeenCalledWith({ captureSystemAudio: false });
  });

  it('starts system audio capture directly from a dedicated recorder choice', () => {
    renderWithProviders(<AudioRecorder onRecord={vi.fn()} onCancel={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: /record system audio/i }));

    expect(recorderState.startRecording).toHaveBeenCalledWith({ captureSystemAudio: true });
  });

  it('renders recorder choices in Chinese when the app language is Chinese', () => {
    renderWithProviders(<AudioRecorder onRecord={vi.fn()} onCancel={vi.fn()} />, { language: 'zh' });

    expect(screen.getByRole('heading', { name: '录音' })).toBeInTheDocument();
    expect(screen.queryByText('准备录音')).not.toBeInTheDocument();
    expect(screen.queryByText('选择录音来源')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /录制麦克风/ })).toBeInTheDocument();
    expect(screen.getByText('仅麦克风输入')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /录制系统音频/ })).toBeInTheDocument();
    expect(screen.getByText('系统音频 + 麦克风')).toBeInTheDocument();
    expect(screen.getByText('录制系统音频需要浏览器授权。')).toBeInTheDocument();
  });
});
