import { act } from 'react';
import { createTestRenderer, type TestRenderer } from '@/test/testUtils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AudioPlayer } from './AudioPlayer';

vi.mock('../../contexts/I18nContext', () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('../../utils/export/core', () => ({
  triggerDownload: vi.fn(),
}));

describe('AudioPlayer', () => {
  let container: HTMLDivElement;
  let root: TestRenderer;

  beforeEach(() => {
    root = createTestRenderer();
    container = root.container;
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
  });

  it('uses localized labels for playback controls', async () => {
    await act(async () => {
      root.render(<AudioPlayer src="https://example.com/audio.wav" />);
    });

    expect(container.querySelector('button[aria-label="audioPlayer_play"]')).not.toBeNull();
    expect(container.querySelector('button[title="audioPlayer_playback_speed"]')).not.toBeNull();
    expect(container.querySelector('button[title="audioPlayer_download"]')).not.toBeNull();
  });
});
