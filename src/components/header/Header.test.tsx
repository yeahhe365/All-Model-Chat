import { act } from 'react';
import { setupProviderTestRenderer } from '@/test/providerTestUtils';
import { describe, expect, it, vi } from 'vitest';
import { Header } from './Header';

vi.mock('./HeaderModelSelector', () => ({
  HeaderModelSelector: () => <div data-testid="header-model-selector" />,
}));

describe('Header', () => {
  const renderer = setupProviderTestRenderer({ providers: { language: 'en' } });

  it('uses localized PiP labels from the translation layer', async () => {
    await act(async () => {
      renderer.root.render(
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

    const pipButton = renderer.container.querySelector('button[aria-label="Enter Picture-in-Picture"]');
    expect(pipButton).not.toBeNull();
    expect(pipButton?.getAttribute('title')).toBe('Enter Picture-in-Picture');
  });

  it('keeps the canvas helper hit target stable while pressing', async () => {
    await act(async () => {
      renderer.root.render(
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

    const canvasButton = renderer.container.querySelector('button[aria-label="Load Canvas prompt and save settings"]');

    expect(canvasButton).not.toBeNull();
    expect(canvasButton?.className).toContain('w-9');
    expect(canvasButton?.className).toContain('h-9');
    expect(canvasButton?.className).not.toContain('hover:scale-105');
    expect(canvasButton?.className).not.toContain('active:scale-95');
  });

  it('uses compact vertical chrome for the top header', async () => {
    await act(async () => {
      renderer.root.render(
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

    const header = renderer.container.querySelector('header');

    expect(header?.className).toContain('py-[0.32rem]');
    expect(header?.className).toContain('sm:py-[0.48rem]');
    expect(header?.className.split(/\s+/)).not.toContain('p-2');
    expect(header?.className.split(/\s+/)).not.toContain('sm:p-3');
  });
});
