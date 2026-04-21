import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { I18nProvider } from '../../contexts/I18nContext';
import { WindowProvider } from '../../contexts/WindowContext';
import { useSettingsStore } from '../../stores/settingsStore';
import type { SavedChatSession } from '../../types';
import { CollapsedRecentChatsButton } from './CollapsedRecentChatsButton';

const createSession = (id: string, timestamp: string): SavedChatSession => ({
  id,
  title: `Chat ${id}`,
  timestamp: new Date(timestamp).getTime(),
  messages: [],
  settings: {} as SavedChatSession['settings'],
});

describe('CollapsedRecentChatsButton', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    useSettingsStore.setState({ language: 'zh' });
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    document.body.innerHTML = '';
  });

  it('shows the most recent sessions except the active session and limits the list to eight items', () => {
    const onSelectSession = vi.fn();
    const onParentClick = vi.fn();
    const sessions = [
      createSession('active', '2026-04-20T10:00:00.000Z'),
      createSession('1', '2026-04-20T09:00:00.000Z'),
      createSession('2', '2026-04-20T08:00:00.000Z'),
      createSession('3', '2026-04-20T07:00:00.000Z'),
      createSession('4', '2026-04-20T06:00:00.000Z'),
      createSession('5', '2026-04-20T05:00:00.000Z'),
      createSession('6', '2026-04-20T04:00:00.000Z'),
      createSession('7', '2026-04-20T03:00:00.000Z'),
      createSession('8', '2026-04-20T02:00:00.000Z'),
      createSession('9', '2026-04-20T01:00:00.000Z'),
    ];

    act(() => {
      root.render(
        <WindowProvider>
          <I18nProvider>
            <div onClick={onParentClick}>
              <CollapsedRecentChatsButton
                sessions={sessions}
                activeSessionId="active"
                onSelectSession={onSelectSession}
              />
            </div>
          </I18nProvider>
        </WindowProvider>,
      );
    });

    const button = container.querySelector('button[aria-label="最近聊天"]');
    expect(button).not.toBeNull();

    act(() => {
      button?.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
    });

    const recentLinks = Array.from(document.body.querySelectorAll('a[href^="/chat/"]'));
    expect(recentLinks).toHaveLength(8);
    expect(document.body.textContent).not.toContain('Chat active');
    expect(recentLinks.map((link) => link.textContent?.trim())).toEqual([
      'Chat 1',
      'Chat 2',
      'Chat 3',
      'Chat 4',
      'Chat 5',
      'Chat 6',
      'Chat 7',
      'Chat 8',
    ]);

    act(() => {
      recentLinks[0]?.dispatchEvent(new MouseEvent('click', { bubbles: true, button: 0 }));
    });

    expect(onSelectSession).toHaveBeenCalledWith('1');
    expect(onParentClick).not.toHaveBeenCalled();
  });

  it('uses the project history icon instead of the generic chat bubble icon', () => {
    act(() => {
      root.render(
        <WindowProvider>
          <I18nProvider>
            <CollapsedRecentChatsButton
              sessions={[createSession('1', '2026-04-20T09:00:00.000Z')]}
              activeSessionId={null}
              onSelectSession={vi.fn()}
            />
          </I18nProvider>
        </WindowProvider>,
      );
    });

    const button = container.querySelector('button[aria-label="最近聊天"]');
    expect(button).not.toBeNull();
    expect(button?.querySelector('svg')).not.toBeNull();
    expect(button?.querySelector('svg.lucide-message-square-text')).toBeNull();
  });

  it('closes after an outside click', () => {
    act(() => {
      root.render(
        <WindowProvider>
          <I18nProvider>
            <CollapsedRecentChatsButton
              sessions={[createSession('1', '2026-04-20T09:00:00.000Z')]}
              activeSessionId={null}
              onSelectSession={vi.fn()}
            />
          </I18nProvider>
        </WindowProvider>,
      );
    });

    const button = container.querySelector('button[aria-label="最近聊天"]');
    expect(button).not.toBeNull();

    act(() => {
      button?.dispatchEvent(new MouseEvent('click', { bubbles: true, button: 0 }));
    });

    expect(document.body.textContent).toContain('Chat 1');

    act(() => {
      document.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    });

    expect(document.body.textContent).not.toContain('Chat 1');
  });
});
