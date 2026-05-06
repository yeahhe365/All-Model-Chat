import { act } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_APP_SETTINGS } from '@/constants/appConstants';
import { renderHook } from '@/test/testUtils';
import { useFilePreProcessing } from './useFilePreProcessing';

const { compressAudioToMp3Mock } = vi.hoisted(() => ({
  compressAudioToMp3Mock: vi.fn(),
}));

vi.mock('@/features/audio/audioCompression', () => ({
  compressAudioToMp3: compressAudioToMp3Mock,
}));

describe('useFilePreProcessing audio compression', () => {
  it('does not route WebM video files through audio compression', async () => {
    const setSelectedFiles = vi.fn();
    const videoFile = new File([new Uint8Array([1, 2, 3])], 'screen-recording.webm', { type: 'video/webm' });
    const compressedAudio = new File([new Uint8Array([4, 5, 6])], 'screen-recording.mp3', { type: 'audio/mpeg' });
    compressAudioToMp3Mock.mockResolvedValue(compressedAudio);

    const { result, unmount } = renderHook(() =>
      useFilePreProcessing({
        appSettings: {
          ...DEFAULT_APP_SETTINGS,
          isAudioCompressionEnabled: true,
        },
        setSelectedFiles,
      }),
    );

    let processedFiles: File[] = [];
    await act(async () => {
      processedFiles = await result.current.processFiles([videoFile]);
    });

    expect(compressAudioToMp3Mock).not.toHaveBeenCalled();
    expect(processedFiles).toEqual([videoFile]);

    unmount();
  });
});
