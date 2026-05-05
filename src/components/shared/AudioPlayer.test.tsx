import { act } from 'react';
import { setupTestRenderer } from '@/test/testUtils';
import { describe, expect, it, vi } from 'vitest';
import { AudioPlayer } from './AudioPlayer';

vi.mock('../../contexts/I18nContext', async () => {
  const { createI18nMockModule } = await import('../../test/moduleMockDoubles');

  return createI18nMockModule();
});

vi.mock('../../utils/export/core', () => ({
  triggerDownload: vi.fn(),
}));

describe('AudioPlayer', () => {
  const renderer = setupTestRenderer();

  it('uses localized labels for playback controls', async () => {
    await act(async () => {
      renderer.root.render(<AudioPlayer src="https://example.com/audio.wav" />);
    });

    expect(renderer.container.querySelector('button[aria-label="audioPlayer_play"]')).not.toBeNull();
    expect(renderer.container.querySelector('button[title="audioPlayer_playback_speed"]')).not.toBeNull();
    expect(renderer.container.querySelector('button[title="audioPlayer_download"]')).not.toBeNull();
  });
});
