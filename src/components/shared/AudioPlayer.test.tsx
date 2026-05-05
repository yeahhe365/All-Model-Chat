import { act } from 'react';
import { setupProviderTestRenderer } from '@/test/providerTestUtils';
import { describe, expect, it, vi } from 'vitest';
import { AudioPlayer } from './AudioPlayer';

vi.mock('../../utils/export/core', () => ({
  triggerDownload: vi.fn(),
}));

describe('AudioPlayer', () => {
  const renderer = setupProviderTestRenderer({ providers: { language: 'en' } });

  it('uses localized labels for playback controls', async () => {
    await act(async () => {
      renderer.root.render(<AudioPlayer src="https://example.com/audio.wav" />);
    });

    expect(renderer.container.querySelector('button[aria-label="Play"]')).not.toBeNull();
    expect(renderer.container.querySelector('button[title="Playback Speed"]')).not.toBeNull();
    expect(renderer.container.querySelector('button[title="Download Audio"]')).not.toBeNull();
  });
});
