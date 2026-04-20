import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
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
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    document.body.innerHTML = '';
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
});
