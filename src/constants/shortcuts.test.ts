import { describe, expect, it } from 'vitest';
import { SHORTCUT_REGISTRY } from './shortcuts';

describe('SHORTCUT_REGISTRY', () => {
  it('does not expose slash command typing as a configurable shortcut', () => {
    const shortcutIds = SHORTCUT_REGISTRY.map((shortcut) => shortcut.id);

    expect(shortcutIds).not.toContain('input.slashCommands');
  });
});
