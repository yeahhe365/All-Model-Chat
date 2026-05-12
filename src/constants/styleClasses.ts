const FOCUS_VISIBLE_RING_CLASS =
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-border-focus)] focus-visible:ring-offset-2';

export const FOCUS_VISIBLE_RING_PRIMARY_OFFSET_CLASS = `${FOCUS_VISIBLE_RING_CLASS} focus-visible:ring-offset-[var(--theme-bg-primary)]`;
export const FOCUS_VISIBLE_RING_SECONDARY_OFFSET_CLASS = `${FOCUS_VISIBLE_RING_CLASS} focus-visible:ring-offset-[var(--theme-bg-secondary)]`;
export const FOCUS_VISIBLE_RING_INPUT_OFFSET_CLASS = `${FOCUS_VISIBLE_RING_CLASS} focus-visible:ring-offset-[var(--theme-bg-input)]`;

export const MESSAGE_BLOCK_BUTTON_CLASS =
  'min-h-11 min-w-11 p-1.5 rounded-md inline-flex items-center justify-center text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-tertiary)]/50 transition-all duration-200 focus:outline-none opacity-70 hover:opacity-100';
export const CHAT_INPUT_BUTTON_CLASS = `h-11 w-11 rounded-full flex items-center justify-center flex-shrink-0 transition-colors duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${FOCUS_VISIBLE_RING_INPUT_OFFSET_CLASS} p-0 m-0 border-0 leading-none`;
export const ICON_BUTTON_CLASS =
  'p-2 text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-tertiary)] rounded-lg transition-colors';
export const MODAL_CLOSE_BUTTON_CLASS = `p-1.5 text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-tertiary)] rounded-full transition-colors ${FOCUS_VISIBLE_RING_SECONDARY_OFFSET_CLASS}`;
export const MODAL_CLOSE_BUTTON_DANGER_HOVER_CLASS = `p-2 text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-danger)] hover:bg-[var(--theme-bg-danger)]/10 rounded-lg transition-colors ${FOCUS_VISIBLE_RING_SECONDARY_OFFSET_CLASS}`;
export const SMALL_ICON_BUTTON_CLASS = `p-1.5 text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-tertiary)] rounded-md transition-colors ${FOCUS_VISIBLE_RING_PRIMARY_OFFSET_CLASS}`;
export const SMALL_ICON_BUTTON_ROUND_CLASS = `p-1.5 text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-tertiary)] rounded-full transition-colors ${FOCUS_VISIBLE_RING_PRIMARY_OFFSET_CLASS}`;
export const SMALL_ICON_DANGER_BUTTON_CLASS = `p-1.5 text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-danger)] hover:bg-[var(--theme-bg-danger)]/10 rounded-md transition-colors ${FOCUS_VISIBLE_RING_PRIMARY_OFFSET_CLASS}`;
export const MENU_ITEM_BUTTON_CLASS =
  'w-full text-left px-3 py-1.5 text-sm flex items-center gap-2 transition-colors focus:outline-none';
export const MENU_ITEM_DEFAULT_STATE_CLASS =
  'text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-tertiary)] focus-visible:bg-[var(--theme-bg-tertiary)]';
export const MENU_ITEM_DANGER_STATE_CLASS =
  'text-[var(--theme-icon-error)] hover:bg-[var(--theme-bg-danger)] hover:text-[var(--theme-text-accent)] focus-visible:bg-[var(--theme-bg-danger)] focus-visible:text-[var(--theme-text-accent)]';
export const MENU_ITEM_COMPACT_BUTTON_CLASS =
  'w-full text-left px-3 py-2 text-xs flex items-center gap-2 transition-colors focus:outline-none';
export const SETTINGS_INPUT_CLASS =
  'bg-[var(--theme-bg-input)] border-[var(--theme-border-secondary)] focus:border-[var(--theme-border-focus)] focus:ring-[var(--theme-border-focus)]/20 text-[var(--theme-text-primary)] placeholder-[var(--theme-text-tertiary)]';
