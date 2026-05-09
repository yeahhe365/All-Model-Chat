import React from 'react';
import { createPortal } from 'react-dom';
import { Ellipsis } from 'lucide-react';
import { useI18n } from '../../../../contexts/I18nContext';
import { usePortaledMenu } from '../../../../hooks/ui/usePortaledMenu';
import { CHAT_INPUT_BUTTON_CLASS } from '../../../../constants/appConstants';
import type { ComposerAuxiliaryAction } from './useComposerAuxiliaryActions';

export const ComposerMoreMenu: React.FC<{ actions: ComposerAuxiliaryAction[]; disabled?: boolean }> = ({
  actions,
  disabled = false,
}) => {
  const { t } = useI18n();
  const { isOpen, menuPosition, containerRef, buttonRef, menuRef, targetWindow, closeMenu, toggleMenu } =
    usePortaledMenu({ menuWidth: 224 });

  if (actions.length === 0) {
    return null;
  }

  return (
    <div ref={containerRef} data-testid="composer-more-menu" className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={toggleMenu}
        disabled={disabled}
        className={`${CHAT_INPUT_BUTTON_CLASS} bg-transparent text-[var(--theme-icon-settings)] hover:bg-[var(--theme-bg-tertiary)] ${isOpen ? 'bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-primary)]' : ''}`}
        aria-label={t('composer_more_actions')}
        title={t('composer_more_actions')}
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <Ellipsis size={20} strokeWidth={2.2} />
      </button>

      {isOpen &&
        targetWindow &&
        createPortal(
          <div
            ref={menuRef}
            className="fixed w-56 overflow-hidden rounded-xl border border-[var(--theme-border-secondary)] bg-[var(--theme-bg-primary)] py-1.5 shadow-premium"
            style={menuPosition}
            role="menu"
          >
            {actions.map((item) => (
              <button
                key={item.id}
                type="button"
                role="menuitem"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  item.action();
                  closeMenu();
                }}
                disabled={item.disabled}
                data-testid={item.testId}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-[var(--theme-text-primary)] transition-colors hover:bg-[var(--theme-bg-tertiary)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span className="text-[var(--theme-text-secondary)]">{item.icon}</span>
                <span className="font-medium">{item.label}</span>
              </button>
            ))}
          </div>,
          targetWindow.document.body,
        )}
    </div>
  );
};
