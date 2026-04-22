import { describe, expect, it } from 'vitest';
import {
  CHAT_INPUT_BUTTON_CLASS,
  FOCUS_VISIBLE_RING_CLASS,
  FOCUS_VISIBLE_RING_INPUT_OFFSET_CLASS,
  FOCUS_VISIBLE_RING_PRIMARY_OFFSET_CLASS,
  FOCUS_VISIBLE_RING_SECONDARY_OFFSET_CLASS,
  ICON_BUTTON_CLASS,
  MENU_ITEM_BUTTON_CLASS,
  MENU_ITEM_COMPACT_BUTTON_CLASS,
  MENU_ITEM_DEFAULT_STATE_CLASS,
  MENU_ITEM_DANGER_STATE_CLASS,
  MESSAGE_BLOCK_BUTTON_CLASS,
  MODAL_CLOSE_BUTTON_CLASS,
  MODAL_CLOSE_BUTTON_DANGER_HOVER_CLASS,
  SMALL_ICON_BUTTON_CLASS,
  SMALL_ICON_BUTTON_ROUND_CLASS,
  SMALL_ICON_DANGER_BUTTON_CLASS,
} from './appConstants';

describe('CHAT_INPUT_BUTTON_CLASS', () => {
  it('keeps compact tap targets stable by avoiding scale transforms', () => {
    expect(CHAT_INPUT_BUTTON_CLASS).not.toContain('hover:scale');
    expect(CHAT_INPUT_BUTTON_CLASS).not.toContain('active:scale');
  });

  it('keeps compact input buttons at least 44px square for touch', () => {
    expect(CHAT_INPUT_BUTTON_CLASS).toContain('h-11');
    expect(CHAT_INPUT_BUTTON_CLASS).toContain('w-11');
  });
});

describe('MESSAGE_BLOCK_BUTTON_CLASS', () => {
  it('keeps compact message block buttons at least 44px square for touch', () => {
    expect(MESSAGE_BLOCK_BUTTON_CLASS).toContain('min-h-11');
    expect(MESSAGE_BLOCK_BUTTON_CLASS).toContain('min-w-11');
  });
});

describe('focus ring helper classes', () => {
  it('keeps the shared focus-visible ring definition centralized', () => {
    expect(FOCUS_VISIBLE_RING_CLASS).toContain('focus-visible:ring-2');
    expect(FOCUS_VISIBLE_RING_CLASS).toContain('focus-visible:ring-[var(--theme-border-focus)]');
    expect(FOCUS_VISIBLE_RING_CLASS).toContain('focus-visible:ring-offset-2');
  });

  it('provides per-surface offset helpers', () => {
    expect(FOCUS_VISIBLE_RING_PRIMARY_OFFSET_CLASS).toContain('focus-visible:ring-offset-[var(--theme-bg-primary)]');
    expect(FOCUS_VISIBLE_RING_SECONDARY_OFFSET_CLASS).toContain('focus-visible:ring-offset-[var(--theme-bg-secondary)]');
    expect(FOCUS_VISIBLE_RING_INPUT_OFFSET_CLASS).toContain('focus-visible:ring-offset-[var(--theme-bg-input)]');
  });
});

describe('menu item helper classes', () => {
  it('keeps shared menu item layout and state styles centralized', () => {
    expect(MENU_ITEM_BUTTON_CLASS).toContain('w-full');
    expect(MENU_ITEM_BUTTON_CLASS).toContain('focus:outline-none');
    expect(MENU_ITEM_COMPACT_BUTTON_CLASS).toContain('text-xs');
    expect(MENU_ITEM_DEFAULT_STATE_CLASS).toContain('focus-visible:bg-[var(--theme-bg-tertiary)]');
    expect(MENU_ITEM_DANGER_STATE_CLASS).toContain('focus-visible:bg-[var(--theme-bg-danger)]');
  });
});

describe('icon button helper classes', () => {
  it('keeps modal and utility icon buttons centralized', () => {
    expect(ICON_BUTTON_CLASS).toContain('rounded-lg');
    expect(MODAL_CLOSE_BUTTON_CLASS).toContain('rounded-full');
    expect(MODAL_CLOSE_BUTTON_DANGER_HOVER_CLASS).toContain('hover:text-[var(--theme-text-danger)]');
    expect(SMALL_ICON_BUTTON_CLASS).toContain('rounded-md');
    expect(SMALL_ICON_BUTTON_ROUND_CLASS).toContain('rounded-full');
    expect(SMALL_ICON_DANGER_BUTTON_CLASS).toContain('hover:text-[var(--theme-text-danger)]');
  });
});
