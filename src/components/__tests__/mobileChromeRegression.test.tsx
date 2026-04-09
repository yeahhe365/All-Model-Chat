import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ChatSuggestions } from '../chat/input/area/ChatSuggestions';
import { Header } from '../header/Header';
import { SidebarHeader } from '../sidebar/SidebarHeader';

interface RenderedRoot {
  container: HTMLDivElement;
  root: Root;
}

const mountedRoots: RenderedRoot[] = [];

const renderIntoDom = (ui: JSX.Element) => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  act(() => {
    root.render(ui);
  });

  const rendered = { container, root };
  mountedRoots.push(rendered);
  return rendered;
};

describe('mobile chrome regressions', () => {
  afterEach(() => {
    while (mountedRoots.length > 0) {
      const mounted = mountedRoots.pop()!;
      act(() => {
        mounted.root.unmount();
      });
      mounted.container.remove();
    }
  });

  it('does not apply desktop-only suggestion fade masks on touch layouts without hover', () => {
    const originalMatchMedia = window.matchMedia;

    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: (query: string) => ({
        matches: query.includes('(pointer: fine)') && !query.includes('(hover: hover)'),
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      }),
    });

    try {
      const { container } = renderIntoDom(
        <ChatSuggestions
          show
          onSuggestionClick={vi.fn()}
          onOrganizeInfoClick={vi.fn()}
          onToggleBBox={vi.fn()}
          isBBoxModeActive={false}
          onToggleGuide={vi.fn()}
          isGuideModeActive={false}
          t={(key) => key}
          isFullscreen={false}
        />
      );

      const scroller = container.querySelector('.overflow-x-auto') as HTMLDivElement;
      expect(scroller).toBeTruthy();

      Object.defineProperties(scroller, {
        clientWidth: { configurable: true, value: 180 },
        scrollWidth: { configurable: true, value: 520 },
        scrollLeft: { configurable: true, value: 0, writable: true },
      });

      act(() => {
        window.dispatchEvent(new Event('resize'));
      });

      expect(scroller.className).not.toContain('fade-mask-x');
      expect(container.querySelector('button[aria-label="scroll_left_aria"]')).toBeNull();
      expect(container.querySelector('button[aria-label="scroll_right_aria"]')).toBeNull();
    } finally {
      Object.defineProperty(window, 'matchMedia', {
        configurable: true,
        writable: true,
        value: originalMatchMedia,
      });
    }
  });

  it('reserves safe-area insets in the mobile header chrome', () => {
    const { container } = renderIntoDom(
      <Header
        onNewChat={vi.fn()}
        onOpenSettingsModal={vi.fn()}
        onOpenScenariosModal={vi.fn()}
        onToggleHistorySidebar={vi.fn()}
        isLoading={false}
        currentModelName="Gemini 2.5 Flash"
        availableModels={[]}
        selectedModelId="gemini-2.5-flash"
        onSelectModel={vi.fn()}
        isSwitchingModel={false}
        isHistorySidebarOpen={false}
        onLoadCanvasPrompt={vi.fn()}
        isCanvasPromptActive={false}
        t={(key) => key}
        isKeyLocked={false}
        isPipSupported={false}
        isPipActive={false}
        onTogglePip={vi.fn()}
        themeId="pearl"
        thinkingLevel="LOW"
        onSetThinkingLevel={vi.fn()}
      />
    );

    const header = container.querySelector('header');
    expect(header?.className).toContain('safe-area-inset-top');
    expect(header?.className).toContain('safe-area-inset-left');
    expect(header?.className).toContain('safe-area-inset-right');
  });

  it('reserves safe-area insets in the sidebar chrome', () => {
    const { container } = renderIntoDom(
      <SidebarHeader onToggle={vi.fn()} isOpen={true} t={(key) => key} />
    );

    const sidebarHeader = container.firstElementChild as HTMLElement | null;
    expect(sidebarHeader?.className).toContain('safe-area-inset-top');
    expect(sidebarHeader?.className).toContain('safe-area-inset-left');
    expect(sidebarHeader?.className).toContain('safe-area-inset-right');
  });
});
