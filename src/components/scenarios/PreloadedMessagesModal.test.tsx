import React from 'react';
import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PreloadedMessagesModal } from './PreloadedMessagesModal';

const { scenarioManagerState } = vi.hoisted(() => ({
  scenarioManagerState: {
    scenarios: [],
    view: 'list' as const,
    editingScenario: null,
    searchQuery: '',
    setSearchQuery: vi.fn(),
    feedback: null,
    importInputRef: { current: null },
    systemScenarioIds: [],
    hasUnsavedChanges: true,
    showFeedback: vi.fn(),
    actions: {
      handleStartAddNew: vi.fn(),
      handleStartEdit: vi.fn(),
      handleDuplicateScenario: vi.fn(),
      handleCancelEdit: vi.fn(),
      handleSaveScenario: vi.fn(),
      handleDeleteScenario: vi.fn(),
      handleSaveAllAndClose: vi.fn(),
      handleExportScenarios: vi.fn(),
      handleExportSingleScenario: vi.fn(),
      handleImportScenarios: vi.fn(),
    },
  },
}));

vi.mock('../../hooks/features/useScenarioManager', () => ({
  useScenarioManager: () => scenarioManagerState,
}));

vi.mock('../shared/Modal', () => ({
  Modal: ({ children }: { children: React.ReactNode }) => <div data-testid="modal-shell">{children}</div>,
}));

vi.mock('./ScenarioList', () => ({
  ScenarioList: () => <div data-testid="scenario-list" />,
}));

vi.mock('./ScenarioEditor', () => ({
  ScenarioEditor: () => <div data-testid="scenario-editor" />,
}));

describe('PreloadedMessagesModal', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    vi.clearAllMocks();
    scenarioManagerState.view = 'list';
    scenarioManagerState.hasUnsavedChanges = true;
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    document.body.innerHTML = '';
  });

  it('closes without saving when the close button is clicked', () => {
    const onClose = vi.fn();

    act(() => {
      root.render(
        <PreloadedMessagesModal
          isOpen
          onClose={onClose}
          savedScenarios={[]}
          onSaveAllScenarios={vi.fn()}
          onLoadScenario={vi.fn()}
          t={(key) => key}
        />,
      );
    });

    const closeButton = Array.from(container.querySelectorAll('button')).find(
      (button) => button.getAttribute('aria-label') === 'scenarios_close_aria',
    );

    expect(closeButton).not.toBeUndefined();

    act(() => {
      closeButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(scenarioManagerState.actions.handleSaveAllAndClose).not.toHaveBeenCalled();
  });

  it('persists changes only when the explicit save button is clicked', () => {
    act(() => {
      root.render(
        <PreloadedMessagesModal
          isOpen
          onClose={vi.fn()}
          savedScenarios={[]}
          onSaveAllScenarios={vi.fn()}
          onLoadScenario={vi.fn()}
          t={(key) => key}
        />,
      );
    });

    const saveButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('scenarios_save_and_close'),
    );

    expect(saveButton).not.toBeUndefined();

    act(() => {
      saveButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(scenarioManagerState.actions.handleSaveAllAndClose).toHaveBeenCalledTimes(1);
  });
});
