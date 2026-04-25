import { describe, expect, it } from 'vitest';
import { DEFAULT_SHORTCUTS, SHORTCUT_REGISTRY } from './shortcuts';

describe('SHORTCUT_REGISTRY', () => {
  it('does not expose slash command typing as a configurable shortcut', () => {
    const shortcutIds = SHORTCUT_REGISTRY.map((shortcut) => shortcut.id);

    expect(shortcutIds).not.toContain('input.slashCommands');
  });

  it('uses the reduced-conflict defaults for the three high-conflict app shortcuts', () => {
    expect(DEFAULT_SHORTCUTS['general.newChat']).toBe('mod+shift+o');
    expect(DEFAULT_SHORTCUTS['general.togglePip']).toBe('mod+alt+p');
    expect(DEFAULT_SHORTCUTS['general.toggleFullscreen']).toBe('mod+alt+f');
  });
});
