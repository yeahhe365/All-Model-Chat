import React, { CSSProperties, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { useI18n } from '../../contexts/I18nContext';
import { useWindowContext } from '../../contexts/WindowContext';
import { IconHistory } from '../icons/CustomIcons';
import type { SavedChatSession } from '../../types';

interface CollapsedRecentChatsButtonProps {
  sessions: SavedChatSession[];
  activeSessionId: string | null;
  onSelectSession: (sessionId: string) => void;
}

const PANEL_WIDTH = 320;
const PANEL_GAP = 12;
const PANEL_MARGIN = 16;
const MAX_RECENT_ITEMS = 8;
const CLOSE_DELAY_MS = 120;

export const CollapsedRecentChatsButton: React.FC<CollapsedRecentChatsButtonProps> = ({
  sessions,
  activeSessionId,
  onSelectSession,
}) => {
  const { t } = useI18n();
  const { window: targetWindow, document: targetDocument } = useWindowContext();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeTimerRef = useRef<number | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [panelPosition, setPanelPosition] = useState<CSSProperties>({});

  const recentSessions = useMemo(
    () =>
      [...sessions]
        .filter((session) => session.id !== activeSessionId)
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, MAX_RECENT_ITEMS),
    [activeSessionId, sessions],
  );

  const clearCloseTimer = useCallback(() => {
    if (closeTimerRef.current !== null) {
      targetWindow.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, [targetWindow]);

  const closePopover = useCallback(() => {
    clearCloseTimer();
    setIsOpen(false);
  }, [clearCloseTimer]);

  const computePanelPosition = useCallback((): CSSProperties => {
    if (!buttonRef.current) {
      return {};
    }

    const buttonRect = buttonRef.current.getBoundingClientRect();
    const viewportWidth = targetWindow.innerWidth;
    const viewportHeight = targetWindow.innerHeight;
    const leftCandidate = buttonRect.right + PANEL_GAP;
    const fitsRight = leftCandidate + PANEL_WIDTH <= viewportWidth - PANEL_MARGIN;
    const left = fitsRight
      ? leftCandidate
      : Math.max(PANEL_MARGIN, buttonRect.left - PANEL_WIDTH - PANEL_GAP);
    const top = Math.min(
      Math.max(PANEL_MARGIN, buttonRect.top),
      viewportHeight - PANEL_MARGIN * 2,
    );

    return {
      position: 'fixed',
      top,
      left,
      width: PANEL_WIDTH,
      maxHeight: `calc(100vh - ${top + PANEL_MARGIN}px)`,
      zIndex: 9999,
    };
  }, [targetWindow]);

  const openPopover = useCallback(() => {
    clearCloseTimer();
    setPanelPosition(computePanelPosition());
    setIsOpen(true);
  }, [clearCloseTimer, computePanelPosition]);

  const scheduleClose = useCallback(() => {
    clearCloseTimer();
    closeTimerRef.current = targetWindow.setTimeout(() => {
      setIsOpen(false);
      closeTimerRef.current = null;
    }, CLOSE_DELAY_MS);
  }, [clearCloseTimer, targetWindow]);

  useEffect(() => () => clearCloseTimer(), [clearCloseTimer]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const updatePosition = () => {
      setPanelPosition(computePanelPosition());
    };

    targetWindow.addEventListener('resize', updatePosition);
    targetWindow.addEventListener('scroll', updatePosition, true);

    return () => {
      targetWindow.removeEventListener('resize', updatePosition);
      targetWindow.removeEventListener('scroll', updatePosition, true);
    };
  }, [computePanelPosition, isOpen, targetWindow]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (
        (buttonRef.current && target && buttonRef.current.contains(target)) ||
        (panelRef.current && target && panelRef.current.contains(target))
      ) {
        return;
      }
      closePopover();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closePopover();
      }
    };

    targetDocument.addEventListener('mousedown', handlePointerDown);
    targetDocument.addEventListener('touchstart', handlePointerDown);
    targetDocument.addEventListener('keydown', handleKeyDown);

    return () => {
      targetDocument.removeEventListener('mousedown', handlePointerDown);
      targetDocument.removeEventListener('touchstart', handlePointerDown);
      targetDocument.removeEventListener('keydown', handleKeyDown);
    };
  }, [closePopover, isOpen, targetDocument]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          if (isOpen) {
            closePopover();
            return;
          }
          openPopover();
        }}
        onMouseEnter={openPopover}
        onMouseLeave={scheduleClose}
        onFocus={openPopover}
        onBlur={(event) => {
          const nextFocusTarget = event.relatedTarget as Node | null;
          if (
            nextFocusTarget &&
            ((buttonRef.current && buttonRef.current.contains(nextFocusTarget)) ||
              (panelRef.current && panelRef.current.contains(nextFocusTarget)))
          ) {
            return;
          }
          scheduleClose();
        }}
        className="flex items-center justify-center p-2.5 rounded-xl text-[var(--theme-icon-history)] hover:bg-[var(--theme-bg-tertiary)] hover:text-[var(--theme-text-primary)] transition-colors focus:outline-none focus:visible:ring-2 focus:visible:ring-[var(--theme-border-focus)]"
        title={t('history_recent_chats')}
        aria-label={t('history_recent_chats')}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
      >
        <IconHistory size={20} strokeWidth={2} />
      </button>

      {isOpen &&
        createPortal(
          <div
            ref={panelRef}
            style={panelPosition}
            className="overflow-hidden rounded-2xl border border-[var(--theme-border-primary)] bg-[var(--theme-bg-primary)] shadow-premium"
            onMouseEnter={openPopover}
            onMouseLeave={scheduleClose}
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-label={t('history_recent_chats')}
          >
            <div className="px-4 py-3 text-sm font-medium text-[var(--theme-text-secondary)]">
              {t('history_recent_chats')}
            </div>
            <div className="max-h-[min(420px,calc(100vh-120px))] overflow-y-auto py-1 custom-scrollbar">
              {recentSessions.length > 0 ? (
                recentSessions.map((session) => (
                  <a
                    key={session.id}
                    href={`/chat/${session.id}`}
                    onClick={(event) => {
                      if (event.button === 0 && !event.ctrlKey && !event.metaKey && !event.shiftKey) {
                        event.preventDefault();
                        event.stopPropagation();
                        onSelectSession(session.id);
                        closePopover();
                      }
                    }}
                    className="block px-4 py-2.5 text-sm text-[var(--theme-text-primary)] no-underline hover:bg-[var(--theme-bg-tertiary)] focus:bg-[var(--theme-bg-tertiary)] focus:outline-none"
                  >
                    <span className="block truncate" title={session.title}>
                      {session.title}
                    </span>
                  </a>
                ))
              ) : (
                <p className="px-4 py-3 text-sm text-[var(--theme-text-tertiary)]">
                  {t('history_empty')}
                </p>
              )}
            </div>
          </div>,
          targetDocument.body,
        )}
    </>
  );
};
