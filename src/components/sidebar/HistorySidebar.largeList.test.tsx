import { act, fireEvent, screen } from '@testing-library/react';
import { setupProviderTestRenderer as setupTestRenderer } from '@/test/providerTestUtils';
import { describe, expect, it, vi } from 'vitest';
import type { SavedChatSession } from '@/types';
import { createChatSettings } from '@/test/factories';
import { HistorySidebar } from './HistorySidebar';

vi.mock('@formkit/auto-animate/react', () => ({
  useAutoAnimate: () => [vi.fn()],
}));

const createSession = (index: number): SavedChatSession => ({
  id: `session-${index}`,
  title: `Chat ${index}`,
  timestamp: Date.now() - index,
  messages: [],
  settings: createChatSettings(),
});

const renderer = setupTestRenderer({ providers: { language: 'en' } });

const renderSidebar = async (sessions: SavedChatSession[]) => {
  await act(async () => {
    renderer.root.render(
      <HistorySidebar
        isOpen={true}
        onToggle={vi.fn()}
        onAutoClose={vi.fn()}
        sessions={sessions}
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
        searchChatsShortcut=""
      />,
    );
  });
};

describe('HistorySidebar large history lists', () => {
  it('limits each large session section until the user asks for more', async () => {
    await renderSidebar(Array.from({ length: 200 }, (_, index) => createSession(index)));

    expect(screen.getByText('Chat 0')).toBeInTheDocument();
    expect(screen.getByText('Chat 79')).toBeInTheDocument();
    expect(screen.queryByText('Chat 80')).toBeNull();
    expect(screen.queryByText('Chat 120')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Show 120 more chats' }));

    expect(screen.getByText('Chat 120')).toBeInTheDocument();
  });
});
