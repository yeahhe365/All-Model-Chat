import { act } from 'react';
import { setupProviderTestRenderer as setupTestRenderer } from '@/test/providerTestUtils';
import { describe, expect, it, vi } from 'vitest';
import { FOCUS_HISTORY_SEARCH_EVENT } from '../../constants/shortcuts';
import { HistorySidebar } from './HistorySidebar';

vi.mock('@formkit/auto-animate/react', () => ({
  useAutoAnimate: () => [vi.fn()],
}));

describe('HistorySidebar search shortcut', () => {
  const renderer = setupTestRenderer({ providers: { language: 'en' } });

  it('opens and focuses chat search when the global focus event is dispatched', async () => {
    const onToggle = vi.fn();

    await act(async () => {
      renderer.root.render(
        <HistorySidebar
          isOpen={false}
          onToggle={onToggle}
          onAutoClose={vi.fn()}
          sessions={[]}
          groups={[]}
          activeSessionId={null}
          loadingSessionIds={new Set()}
          generatingTitleSessionIds={new Set()}
          onSelectSession={vi.fn()}
          onNewChat={vi.fn()}
          onDeleteSession={vi.fn()}
          onRenameSession={vi.fn()}
          onTogglePinSession={vi.fn()}
          onDuplicateSession={vi.fn()}
          onOpenExportModal={vi.fn()}
          onAddNewGroup={vi.fn()}
          onDeleteGroup={vi.fn()}
          onRenameGroup={vi.fn()}
          onMoveSessionToGroup={vi.fn()}
          onToggleGroupExpansion={vi.fn()}
          onOpenSettingsModal={vi.fn()}
          themeId="pearl"
          newChatShortcut=""
          searchChatsShortcut="Ctrl + K"
        />,
      );
    });

    await act(async () => {
      document.dispatchEvent(new Event(FOCUS_HISTORY_SEARCH_EVENT));
      await new Promise((resolve) => window.setTimeout(resolve, 0));
    });

    expect(onToggle).toHaveBeenCalledTimes(1);
    const searchInput = renderer.container.querySelector<HTMLInputElement>('input[aria-label="Search chat history"]');
    expect(searchInput).not.toBeNull();
    expect(document.activeElement).toBe(searchInput);
  });

  it('shows the chat search shortcut in the collapsed search tooltip', async () => {
    await act(async () => {
      renderer.root.render(
        <HistorySidebar
          isOpen={false}
          onToggle={vi.fn()}
          onAutoClose={vi.fn()}
          sessions={[]}
          groups={[]}
          activeSessionId={null}
          loadingSessionIds={new Set()}
          generatingTitleSessionIds={new Set()}
          onSelectSession={vi.fn()}
          onNewChat={vi.fn()}
          onDeleteSession={vi.fn()}
          onRenameSession={vi.fn()}
          onTogglePinSession={vi.fn()}
          onDuplicateSession={vi.fn()}
          onOpenExportModal={vi.fn()}
          onAddNewGroup={vi.fn()}
          onDeleteGroup={vi.fn()}
          onRenameGroup={vi.fn()}
          onMoveSessionToGroup={vi.fn()}
          onToggleGroupExpansion={vi.fn()}
          onOpenSettingsModal={vi.fn()}
          themeId="pearl"
          newChatShortcut=""
          searchChatsShortcut="Ctrl + K"
        />,
      );
    });

    const searchButton = renderer.container.querySelector<HTMLButtonElement>('button[aria-label="Search (Ctrl + K)"]');
    expect(searchButton).not.toBeNull();
    expect(searchButton?.getAttribute('title')).toBe('Search (Ctrl + K)');
  });
});
