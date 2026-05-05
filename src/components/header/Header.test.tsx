import { act } from 'react';
import { createTestRenderer, type TestRenderer } from '@/test/testUtils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Header } from './Header';

vi.mock('../../contexts/I18nContext', () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('./HeaderModelSelector', () => ({
  HeaderModelSelector: () => <div data-testid="header-model-selector" />,
}));

describe('Header', () => {
  let container: HTMLDivElement;
  let root: TestRenderer;

  beforeEach(() => {
    root = createTestRenderer();
    container = root.container;
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
  });

  it('uses localized PiP labels from the translation layer', async () => {
    await act(async () => {
      root.render(
        <Header
          onNewChat={vi.fn()}
          onOpenScenariosModal={vi.fn()}
          onToggleHistorySidebar={vi.fn()}
          isLoading={false}
          currentModelName="Gemini 3 Flash"
          availableModels={[]}
          selectedModelId="gemini-3-flash-preview"
          onSelectModel={vi.fn()}
          isSwitchingModel={false}
          isHistorySidebarOpen={false}
          onLoadCanvasPrompt={vi.fn()}
          isCanvasPromptActive={false}
          isPipSupported={true}
          isPipActive={false}
          onTogglePip={vi.fn()}
          themeId="pearl"
          thinkingLevel="HIGH"
          onSetThinkingLevel={vi.fn()}
          showThoughts={true}
          onToggleGemmaReasoning={vi.fn()}
          newChatShortcut=""
          pipShortcut=""
        />,
      );
    });

    const pipButton = container.querySelector('button[aria-label="pipEnter"]');
    expect(pipButton).not.toBeNull();
    expect(pipButton?.getAttribute('title')).toBe('pipEnter');
  });

  it('keeps the canvas helper hit target stable while pressing', async () => {
    await act(async () => {
      root.render(
        <Header
          onNewChat={vi.fn()}
          onOpenScenariosModal={vi.fn()}
          onToggleHistorySidebar={vi.fn()}
          isLoading={false}
          currentModelName="Gemini 3 Flash"
          availableModels={[]}
          selectedModelId="gemini-3-flash-preview"
          onSelectModel={vi.fn()}
          isSwitchingModel={false}
          isHistorySidebarOpen={false}
          onLoadCanvasPrompt={vi.fn()}
          isCanvasPromptActive={false}
          isPipSupported={true}
          isPipActive={false}
          onTogglePip={vi.fn()}
          themeId="pearl"
          thinkingLevel="HIGH"
          onSetThinkingLevel={vi.fn()}
          showThoughts={true}
          onToggleGemmaReasoning={vi.fn()}
          newChatShortcut=""
          pipShortcut=""
        />,
      );
    });

    const canvasButton = container.querySelector('button[aria-label="canvasHelperInactive_aria"]');

    expect(canvasButton).not.toBeNull();
    expect(canvasButton?.className).toContain('w-9');
    expect(canvasButton?.className).toContain('h-9');
    expect(canvasButton?.className).not.toContain('hover:scale-105');
    expect(canvasButton?.className).not.toContain('active:scale-95');
  });

  it('uses compact vertical chrome for the top header', async () => {
    await act(async () => {
      root.render(
        <Header
          onNewChat={vi.fn()}
          onOpenScenariosModal={vi.fn()}
          onToggleHistorySidebar={vi.fn()}
          isLoading={false}
          currentModelName="Gemini 3 Flash"
          availableModels={[]}
          selectedModelId="gemini-3-flash-preview"
          onSelectModel={vi.fn()}
          isSwitchingModel={false}
          isHistorySidebarOpen={false}
          onLoadCanvasPrompt={vi.fn()}
          isCanvasPromptActive={false}
          isPipSupported={true}
          isPipActive={false}
          onTogglePip={vi.fn()}
          themeId="pearl"
          thinkingLevel="HIGH"
          onSetThinkingLevel={vi.fn()}
          showThoughts={true}
          onToggleGemmaReasoning={vi.fn()}
          newChatShortcut=""
          pipShortcut=""
        />,
      );
    });

    const header = container.querySelector('header');

    expect(header?.className).toContain('py-[0.32rem]');
    expect(header?.className).toContain('sm:py-[0.48rem]');
    expect(header?.className.split(/\s+/)).not.toContain('p-2');
    expect(header?.className.split(/\s+/)).not.toContain('sm:p-3');
  });
});
