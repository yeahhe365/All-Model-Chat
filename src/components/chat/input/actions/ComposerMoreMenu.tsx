import React from 'react';
import { createPortal } from 'react-dom';
import { ClipboardPaste, Eraser, Ellipsis, Languages, Loader2, Maximize2, Minimize2 } from 'lucide-react';
import { useI18n } from '../../../../contexts/I18nContext';
import { usePortaledMenu } from '../../../../hooks/ui/usePortaledMenu';
import { CHAT_INPUT_BUTTON_CLASS } from '../../../../constants/appConstants';

interface ComposerMoreMenuProps {
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  isTranslating: boolean;
  onTranslate: () => void;
  showTranslateButton?: boolean;
  canTranslate: boolean;
  onPasteFromClipboard?: () => void;
  showInputPasteButton?: boolean;
  onClearInput?: () => void;
  showInputClearButton?: boolean;
  disabled: boolean;
  isLoading: boolean;
  isWaitingForUpload: boolean;
  isInputDisabled?: boolean;
}

export const ComposerMoreMenu: React.FC<ComposerMoreMenuProps> = ({
  isFullscreen,
  onToggleFullscreen,
  isTranslating,
  onTranslate,
  showTranslateButton = false,
  canTranslate,
  onPasteFromClipboard,
  showInputPasteButton = true,
  onClearInput,
  showInputClearButton = false,
  disabled,
  isLoading,
  isWaitingForUpload,
  isInputDisabled,
}) => {
  const { t } = useI18n();
  const { isOpen, menuPosition, containerRef, buttonRef, menuRef, targetWindow, closeMenu, toggleMenu } =
    usePortaledMenu({ menuWidth: 224 });

  const commonBlocked = !!isInputDisabled || isLoading || isWaitingForUpload;
  const items = [
    onToggleFullscreen
      ? {
          key: 'fullscreen',
          label: isFullscreen ? t('fullscreen_tooltip_collapse') : t('fullscreen_tooltip_expand'),
          icon: isFullscreen ? <Minimize2 size={17} strokeWidth={2} /> : <Maximize2 size={17} strokeWidth={2} />,
          disabled,
          action: onToggleFullscreen,
          testId: 'fullscreen-button',
        }
      : null,
    showTranslateButton
      ? {
          key: 'translate',
          label: isTranslating ? t('translating_button_title') : t('translate_button_title'),
          icon: isTranslating ? (
            <Loader2 size={17} className="animate-spin text-[var(--theme-text-link)]" strokeWidth={2} />
          ) : (
            <Languages size={17} strokeWidth={2} />
          ),
          disabled: !canTranslate || isTranslating,
          action: onTranslate,
          testId: 'translate-button',
        }
      : null,
    showInputClearButton && onClearInput
      ? {
          key: 'clear',
          label: t('clearInput_title'),
          icon: <Eraser size={17} strokeWidth={2} />,
          disabled: commonBlocked,
          action: onClearInput,
          testId: 'clear-input-button',
        }
      : null,
    showInputPasteButton && onPasteFromClipboard
      ? {
          key: 'paste',
          label: t('pasteClipboard_title'),
          icon: <ClipboardPaste size={17} strokeWidth={2} />,
          disabled: commonBlocked,
          action: onPasteFromClipboard,
          testId: 'paste-button',
        }
      : null,
  ].filter((item): item is NonNullable<typeof item> => item !== null);

  if (items.length === 0) {
    return null;
  }

  return (
    <div ref={containerRef} data-testid="composer-more-menu" className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={toggleMenu}
        disabled={disabled && items.every((item) => item.disabled)}
        className={`${CHAT_INPUT_BUTTON_CLASS} bg-transparent text-[var(--theme-icon-settings)] hover:bg-[var(--theme-bg-tertiary)] ${isOpen ? 'bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-primary)]' : ''}`}
        aria-label={t('composer_more_actions', 'More input actions')}
        title={t('composer_more_actions', 'More input actions')}
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
            {items.map((item) => (
              <button
                key={item.key}
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
