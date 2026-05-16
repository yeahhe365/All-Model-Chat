import React, { useMemo, useState } from 'react';
import { useAutoAnimate } from '@formkit/auto-animate/react';
import { type SavedChatSession } from '@/types';
import { useI18n } from '@/contexts/I18nContext';
import { SessionItem } from './SessionItem';
import { type SessionItemPassedProps } from './GroupItem';

const INITIAL_VISIBLE_SESSION_COUNT = 80;
const SESSION_LIST_INCREMENT = 80;

interface LimitedSessionListProps {
  sessions: SavedChatSession[];
  sessionItemProps: SessionItemPassedProps;
  className?: string;
}

const formatShowMoreLabel = (template: string, count: number) => template.replace('{count}', String(count));

export const LimitedSessionList: React.FC<LimitedSessionListProps> = ({ sessions, sessionItemProps, className }) => {
  const { t } = useI18n();
  const [animatedParent] = useAutoAnimate<HTMLUListElement>({ duration: 200 });
  const [limitState, setLimitState] = useState({
    listSignature: '',
    visibleCount: INITIAL_VISIBLE_SESSION_COUNT,
  });
  const listSignature = useMemo(() => sessions.map((session) => session.id).join('|'), [sessions]);
  const isLargeList = sessions.length > INITIAL_VISIBLE_SESSION_COUNT;
  const visibleCount =
    limitState.listSignature === listSignature ? limitState.visibleCount : INITIAL_VISIBLE_SESSION_COUNT;
  const { activeSessionId, activeMenu, loadingSessionIds, generatingTitleSessionIds } = sessionItemProps;

  const importantSessionIds = useMemo(() => {
    const ids = new Set<string>();

    if (activeSessionId) ids.add(activeSessionId);
    if (activeMenu) ids.add(activeMenu);
    loadingSessionIds.forEach((id) => ids.add(id));
    generatingTitleSessionIds.forEach((id) => ids.add(id));

    return ids;
  }, [activeMenu, activeSessionId, generatingTitleSessionIds, loadingSessionIds]);

  const visibleSessions = useMemo(() => {
    if (!isLargeList) {
      return sessions;
    }

    const visible = sessions.slice(0, visibleCount);
    const visibleIds = new Set(visible.map((session) => session.id));

    for (const session of sessions.slice(visibleCount)) {
      if (importantSessionIds.has(session.id) && !visibleIds.has(session.id)) {
        visible.push(session);
        visibleIds.add(session.id);
      }
    }

    return visible;
  }, [importantSessionIds, isLargeList, sessions, visibleCount]);

  const remainingCount = Math.max(0, sessions.length - visibleCount);
  const shouldShowMore = isLargeList && remainingCount > 0;

  return (
    <>
      <ul ref={isLargeList ? undefined : animatedParent} className={className}>
        {visibleSessions.map((session) => (
          <SessionItem key={session.id} session={session} {...sessionItemProps} />
        ))}
      </ul>
      {shouldShowMore && (
        <button
          type="button"
          onClick={() =>
            setLimitState({
              listSignature,
              visibleCount: Math.min(sessions.length, visibleCount + SESSION_LIST_INCREMENT),
            })
          }
          className="mx-1 my-1 w-[calc(100%-0.5rem)] rounded-lg px-3 py-2 text-left text-xs font-medium text-[var(--theme-text-tertiary)] hover:bg-[var(--theme-bg-tertiary)] hover:text-[var(--theme-text-primary)]"
          aria-label={formatShowMoreLabel(t('history_show_more_chats'), remainingCount)}
        >
          {formatShowMoreLabel(t('history_show_more_chats'), remainingCount)}
        </button>
      )}
    </>
  );
};
