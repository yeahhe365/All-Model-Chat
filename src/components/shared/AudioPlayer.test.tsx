import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
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
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    document.body.innerHTML = '';
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
