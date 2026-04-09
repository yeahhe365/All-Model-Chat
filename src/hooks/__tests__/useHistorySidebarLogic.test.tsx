import React from 'react';
import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Translator } from '../../utils/appUtils';
import { useHistorySidebarLogic } from '../useHistorySidebarLogic';

const baseProps = {
  onToggle: vi.fn(),
  sessions: [],
  groups: [],
  generatingTitleSessionIds: new Set<string>(),
  onRenameSession: vi.fn(),
  onRenameGroup: vi.fn(),
  onMoveSessionToGroup: vi.fn(),
  onSelectSession: vi.fn(),
  t: ((key: string, fallback?: string) => fallback ?? key) as Translator,
  language: 'zh' as const,
};

describe('useHistorySidebarLogic', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    baseProps.onToggle.mockReset();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  it('does not collapse the sidebar when clicking empty space on desktop', () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1024 });
    const latestHookRef: { current: ReturnType<typeof useHistorySidebarLogic> | null } = { current: null };
    const HookHarness = () => {
      const hook = useHistorySidebarLogic(baseProps);
      React.useEffect(() => {
        latestHookRef.current = hook;
      }, [hook]);
      return null;
    };

    act(() => {
      root.render(<HookHarness />);
    });

    const target = document.createElement('div');

    act(() => {
      latestHookRef.current?.handleEmptySpaceClick({
        target,
        currentTarget: target,
      } as unknown as React.MouseEvent);
    });

    expect(baseProps.onToggle).not.toHaveBeenCalled();
  });
});
