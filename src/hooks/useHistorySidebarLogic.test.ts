import { describe, expect, it } from 'vitest';
import type { SavedChatSession } from '../types';
import { createChatSettings } from '../test/factories';
import { renderHook } from '../test/testUtils';
import { useSettingsStore } from '../stores/settingsStore';
import { useHistorySidebarLogic } from './useHistorySidebarLogic';

const createSession = (id: string, daysAgo: number): SavedChatSession => {
  const timestamp = new Date();
  timestamp.setHours(12, 0, 0, 0);
  timestamp.setDate(timestamp.getDate() - daysAgo);

  return {
    id,
    title: id,
    timestamp: timestamp.getTime(),
    messages: [],
    settings: createChatSettings(),
  };
};

const renderHistoryLogic = (sessions: SavedChatSession[]) => {
  useSettingsStore.setState({ language: 'en' });

  return renderHook(() =>
    useHistorySidebarLogic({
      isOpen: true,
      onToggle: () => {},
      onAutoClose: () => {},
      sessions,
      groups: [],
      generatingTitleSessionIds: new Set(),
      onRenameSession: () => {},
      onRenameGroup: () => {},
      onMoveSessionToGroup: () => {},
      onSelectSession: () => {},
    }),
  );
};

describe('categorizeSessionsByDate', () => {
  it('places yesterday into its own category before previous 7 days', () => {
    const { result, unmount } = renderHistoryLogic([
      createSession('today', 0),
      createSession('yesterday', 1),
      createSession('previous', 2),
    ]);
    const { categoryOrder, categories } = result.current.categorizedUngroupedSessions;

    expect(categoryOrder).toEqual(['Today', 'Yesterday', 'Previous 7 Days']);
    expect(categories.Yesterday.map((session) => session.id)).toEqual(['yesterday']);
    unmount();
  });

  it('keeps previous 30 days separate from the new yesterday and previous 7 days buckets', () => {
    const { result, unmount } = renderHistoryLogic([createSession('older', 20)]);
    const { categoryOrder, categories } = result.current.categorizedUngroupedSessions;

    expect(categoryOrder).toEqual(['Previous 30 Days']);
    expect(categories['Previous 30 Days'].map((session) => session.id)).toEqual(['older']);
    unmount();
  });
});
