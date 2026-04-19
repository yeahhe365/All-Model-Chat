import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';
import { SidebarActions } from './SidebarActions';

const render = (node: React.ReactNode) => {
  const container = document.createElement('div');
  const root = createRoot(container);

  act(() => {
    root.render(node);
  });

  return {
    container,
    unmount: () => {
      act(() => {
        root.unmount();
      });
    },
  };
};

const t = (key: string) =>
  (
    {
      newChat: 'New Chat',
      headerNewChat_aria: 'Start a new chat',
      history_search_button: '搜索聊天',
      history_search_aria: '搜索聊天记录',
      history_search_clear_aria: '清除搜索',
      history_search_placeholder: '搜索历史...',
      newGroup_button: '新建分组',
      newGroup_aria: '创建分组',
    } satisfies Record<string, string>
  )[key] ?? key;

describe('SidebarActions', () => {
  it('renders New Group as its own full-row action below Search', () => {
    const { container, unmount } = render(
      <SidebarActions
        onNewChat={vi.fn()}
        onAddNewGroup={vi.fn()}
        isSearching={false}
        searchQuery=""
        setIsSearching={vi.fn()}
        setSearchQuery={vi.fn()}
        t={t}
      />,
    );

    const actionLabels = Array.from(container.querySelectorAll('a, button'))
      .map((element) => element.textContent?.trim())
      .filter((value): value is string => Boolean(value));
    const folderIcon = container.querySelector('[data-testid="new-group-folder-icon"]');

    expect(actionLabels.slice(0, 3)).toEqual(['New Chat', '搜索聊天', '新建分组']);
    expect(folderIcon).not.toBeNull();
    expect(folderIcon?.getAttribute('viewBox')).toBe('0 0 24 24');
    expect(folderIcon?.querySelectorAll('path')).toHaveLength(3);
    expect(folderIcon?.querySelector('path')?.getAttribute('d')).toContain('M20 20');
    expect(container.querySelector('[data-testid="new-group-icon"]')).toBeNull();

    unmount();
  });
});
