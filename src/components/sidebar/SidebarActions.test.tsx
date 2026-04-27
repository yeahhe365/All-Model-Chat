import React, { useState } from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
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

const setInputValue = (input: HTMLInputElement, value: string) => {
  const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
  descriptor?.set?.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
};

const t = (key: string) =>
  (
    ({
      newChat: 'New Chat',
      headerNewChat_aria: 'Start a new chat',
      history_search_button: '搜索聊天',
      history_search_aria: '搜索聊天记录',
      history_search_clear_aria: '清除搜索',
      history_search_placeholder: '搜索历史...',
      newGroup_button: '新建分组',
      newGroup_aria: '创建分组',
    }) satisfies Record<string, string>
  )[key] ?? key;

const SidebarActionsHarness = ({
  onNewChat = vi.fn(),
  onCloseSidebar = vi.fn(),
}: {
  onNewChat?: () => void;
  onCloseSidebar?: () => void;
}) => {
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <SidebarActions
      onNewChat={onNewChat}
      onCloseSidebar={onCloseSidebar}
      onAddNewGroup={vi.fn()}
      isSearching={isSearching}
      searchQuery={searchQuery}
      setIsSearching={setIsSearching}
      setSearchQuery={setSearchQuery}
      t={t}
    />
  );
};

describe('SidebarActions', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

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
    expect(folderIcon?.getAttribute('width')).toBe('18');
    expect(folderIcon?.getAttribute('height')).toBe('18');
    expect(folderIcon?.getAttribute('stroke-width')).toBe('2');
    expect(folderIcon?.querySelectorAll('path')).toHaveLength(3);
    expect(folderIcon?.querySelector('path')?.getAttribute('d')).toBe(
      'M3 7.5C3 6.67 3.67 6 4.5 6H9l2 2h8.5c.83 0 1.5.67 1.5 1.5V12',
    );
    expect(folderIcon?.querySelectorAll('path')[1]?.getAttribute('d')).toBe('M3 7.5V18c0 .83.67 1.5 1.5 1.5h8');
    expect(folderIcon?.querySelectorAll('path')[2]?.getAttribute('d')).toBe('M18 15v6M15 18h6');
    expect(container.querySelector('[data-testid="new-group-icon"]')).toBeNull();

    unmount();
  });

  it('uses a tighter shared vertical stack for the primary sidebar actions', () => {
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

    const actionStack = container.querySelector('[data-testid="sidebar-actions-stack"]');
    expect(actionStack?.className).toContain('space-y-1');

    unmount();
  });

  it('clears the search query when Escape closes the search input', () => {
    const { container, unmount } = render(<SidebarActionsHarness />);

    const openSearchButton = Array.from(container.querySelectorAll('button')).find(
      (element) => element.textContent?.trim() === '搜索聊天',
    );
    expect(openSearchButton).not.toBeUndefined();

    act(() => {
      openSearchButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    const searchInput = container.querySelector('input');
    expect(searchInput).not.toBeNull();

    act(() => {
      setInputValue(searchInput as HTMLInputElement, 'invoice');
    });
    expect((searchInput as HTMLInputElement).value).toBe('invoice');

    act(() => {
      searchInput?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });

    const reopenedSearchButton = Array.from(container.querySelectorAll('button')).find(
      (element) => element.textContent?.trim() === '搜索聊天',
    );
    expect(reopenedSearchButton).not.toBeUndefined();

    act(() => {
      reopenedSearchButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    const reopenedInput = container.querySelector('input');
    expect((reopenedInput as HTMLInputElement).value).toBe('');

    unmount();
  });

  it('only applies the focused search border while the input is actually focused', () => {
    const { container, unmount } = render(<SidebarActionsHarness />);

    const openSearchButton = Array.from(container.querySelectorAll('button')).find(
      (element) => element.textContent?.trim() === '搜索聊天',
    );
    expect(openSearchButton).not.toBeUndefined();

    act(() => {
      openSearchButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    const searchInput = container.querySelector('input');
    const searchShell = searchInput?.parentElement;

    expect(searchShell).not.toBeNull();
    expect(searchShell?.className).toContain('border-[var(--theme-border-secondary)]');
    expect(searchShell?.className).toContain('focus-within:border-[var(--theme-border-focus)]');
    expect(searchShell?.className).not.toContain('border-[var(--theme-border-focus)] rounded-lg');

    unmount();
  });

  it('closes the sidebar after starting a new chat on mobile', () => {
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 375,
      writable: true,
    });

    const onNewChat = vi.fn();
    const onCloseSidebar = vi.fn();
    const { container, unmount } = render(
      <SidebarActionsHarness onNewChat={onNewChat} onCloseSidebar={onCloseSidebar} />,
    );

    const newChatLink = container.querySelector('a');
    expect(newChatLink).not.toBeNull();

    act(() => {
      newChatLink?.dispatchEvent(new MouseEvent('click', { bubbles: true, button: 0 }));
    });

    expect(onNewChat).toHaveBeenCalledTimes(1);
    expect(onCloseSidebar).toHaveBeenCalledTimes(1);

    unmount();
  });
});
