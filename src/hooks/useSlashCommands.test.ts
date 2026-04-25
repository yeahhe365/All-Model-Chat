import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useSlashCommands } from './useSlashCommands';

const renderHook = <T,>(callback: () => T) => {
  const container = document.createElement('div');
  const root = createRoot(container);
  const result: { current: T | null } = { current: null };

  const TestComponent = () => {
    result.current = callback();
    return null;
  };

  act(() => {
    root.render(React.createElement(TestComponent));
  });

  return {
    result: result as { current: T },
    unmount: () => {
      act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
};

const createProps = (overrides: Partial<Parameters<typeof useSlashCommands>[0]> = {}) => {
  const textarea = document.createElement('textarea');

  return {
    t: (key: string) => key,
    onToggleGoogleSearch: vi.fn(),
    onToggleDeepSearch: vi.fn(),
    onToggleCodeExecution: vi.fn(),
    onToggleUrlContext: vi.fn(),
    onClearChat: vi.fn(),
    onNewChat: vi.fn(),
    onOpenSettings: vi.fn(),
    onToggleCanvasPrompt: vi.fn(),
    onTogglePinCurrentSession: vi.fn(),
    onRetryLastTurn: vi.fn(),
    onAttachmentAction: vi.fn(),
    availableModels: [
      { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', isPinned: true },
      { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
    ],
    onSelectModel: vi.fn(),
    onMessageSent: vi.fn(),
    setIsHelpModalOpen: vi.fn(),
    textareaRef: { current: textarea },
    onEditLastUserMessage: vi.fn(),
    onTogglePip: vi.fn(),
    setInputText: vi.fn(),
    currentModelId: 'gemini-2.5-pro',
    onSetThinkingLevel: vi.fn(),
    thinkingLevel: 'MEDIUM' as const,
    ...overrides,
  };
};

describe('useSlashCommands', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not execute a command just because the user typed a trailing space', () => {
    const props = createProps();
    const { result, unmount } = renderHook(() => useSlashCommands(props));

    act(() => {
      result.current.handleInputChange('/clear ');
    });

    expect(props.onClearChat).not.toHaveBeenCalled();
    expect(props.setInputText).toHaveBeenCalledWith('/clear ');
    expect(result.current.slashCommandState.isOpen).toBe(false);
    unmount();
  });

  it('keeps help metadata aligned with the executable slash command registry', () => {
    const props = createProps();
    const { result, unmount } = renderHook(() => useSlashCommands(props));

    act(() => {
      result.current.handleInputChange('/');
    });

    const executableCommands = result.current.slashCommandState.filteredCommands.map(({ name, description, icon }) => ({
      name: `/${name}`,
      description,
      icon,
    }));

    expect(result.current.allCommandsForHelp).toEqual(executableCommands);
    unmount();
  });

  it('returns false for slash-prefixed text that is not an exact command', () => {
    const props = createProps();
    const { result, unmount } = renderHook(() => useSlashCommands(props));

    let handledKnownWithArgs = false;
    let handledUnknown = false;
    let handledUnknownModel = false;

    act(() => {
      handledKnownWithArgs = result.current.handleSlashCommandExecution('/help me');
      handledUnknown = result.current.handleSlashCommandExecution('/unknown');
      handledUnknownModel = result.current.handleSlashCommandExecution('/model missing-model');
    });

    expect(handledKnownWithArgs).toBe(false);
    expect(handledUnknown).toBe(false);
    expect(handledUnknownModel).toBe(false);
    expect(props.setIsHelpModalOpen).not.toHaveBeenCalled();
    expect(props.onSelectModel).not.toHaveBeenCalled();
    expect(props.setInputText).not.toHaveBeenCalledWith('');
    unmount();
  });

  it('still executes an exact slash command when explicitly submitted', () => {
    vi.useFakeTimers();
    const props = createProps();
    const { result, unmount } = renderHook(() => useSlashCommands(props));

    let handled = false;

    act(() => {
      handled = result.current.handleSlashCommandExecution('/help');
      vi.runAllTimers();
    });

    expect(handled).toBe(true);
    expect(props.setIsHelpModalOpen).toHaveBeenCalledWith(true);
    expect(props.setInputText).toHaveBeenCalledWith('');
    expect(props.onMessageSent).not.toHaveBeenCalled();
    unmount();
  });

  it('opens the model command list after selecting /model from the slash menu', () => {
    vi.useFakeTimers();
    const props = createProps();
    const { result, unmount } = renderHook(() => useSlashCommands(props));

    act(() => {
      result.current.handleInputChange('/');
    });

    const modelCommand = result.current.slashCommandState.filteredCommands.find((command) => command.name === 'model');
    expect(modelCommand).toBeDefined();

    act(() => {
      result.current.handleCommandSelect(modelCommand!);
      vi.runAllTimers();
    });

    expect(props.setInputText).toHaveBeenCalledWith('/model ');
    expect(result.current.slashCommandState.isOpen).toBe(true);
    expect(result.current.slashCommandState.filteredCommands.map((command) => command.name)).toEqual([
      'Gemini 2.5 Pro',
      'Gemini 2.5 Flash',
    ]);
    unmount();
  });
});
