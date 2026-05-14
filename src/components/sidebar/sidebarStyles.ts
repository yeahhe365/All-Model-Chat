export const SIDEBAR_ICON_BUTTON_CLASS =
  'flex items-center justify-center p-2.5 rounded-xl text-[var(--theme-icon-history)] hover:bg-[var(--theme-bg-tertiary)] hover:text-[var(--theme-text-primary)] transition-colors focus:outline-none focus:visible:ring-2 focus:visible:ring-[var(--theme-border-focus)]';

export const SIDEBAR_CLICKABLE_ICON_BUTTON_CLASS = `${SIDEBAR_ICON_BUTTON_CLASS} cursor-pointer`;

export const SIDEBAR_ICON_LINK_BUTTON_CLASS = `${SIDEBAR_CLICKABLE_ICON_BUTTON_CLASS} no-underline`;

export const SIDEBAR_ACTION_ROW_CLASS =
  'flex items-center gap-3 w-full text-left px-3 h-9 text-sm bg-transparent border border-transparent rounded-lg hover:bg-[var(--theme-bg-tertiary)] hover:border-[var(--theme-border-secondary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--theme-border-focus)] transition-colors';

export const SIDEBAR_ACTION_LINK_CLASS = `flex-grow ${SIDEBAR_ACTION_ROW_CLASS} no-underline`;
