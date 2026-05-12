import React from 'react';
import { act } from 'react';
import { setupTestRenderer } from '@/test/testUtils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
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

vi.mock('@/hooks/features/useScenarioManager', () => ({
  useScenarioManager: () => scenarioManagerState,
}));

vi.mock('@/components/shared/Modal', () => ({
  Modal: ({ children, contentClassName }: { children: React.ReactNode; contentClassName?: string }) => (
    <div data-testid="modal-shell" className={contentClassName}>
      {children}
    </div>
  ),
}));

vi.mock('./ScenarioList', () => ({
  ScenarioList: () => <div data-testid="scenario-list" />,
}));

vi.mock('./ScenarioEditor', () => ({
  ScenarioEditor: () => <div data-testid="scenario-editor" />,
}));

describe('PreloadedMessagesModal', () => {
  const renderer = setupTestRenderer();

  beforeEach(() => {
    vi.clearAllMocks();
    scenarioManagerState.view = 'list';
    scenarioManagerState.hasUnsavedChanges = true;
  });

  it('closes without saving when the close button is clicked', () => {
    const onClose = vi.fn();

    act(() => {
      renderer.root.render(
        <PreloadedMessagesModal
          isOpen
          onClose={onClose}
          savedScenarios={[]}
          onSaveAllScenarios={vi.fn()}
          onLoadScenario={vi.fn()}
        />,
      );
    });

    const closeButton = Array.from(renderer.container.querySelectorAll('button')).find(
      (button) => button.getAttribute('aria-label') === 'Close scenarios manager',
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
      renderer.root.render(
        <PreloadedMessagesModal
          isOpen
          onClose={vi.fn()}
          savedScenarios={[]}
          onSaveAllScenarios={vi.fn()}
          onLoadScenario={vi.fn()}
        />,
      );
    });

    const saveButton = Array.from(renderer.container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Save'),
    );

    expect(saveButton).not.toBeUndefined();

    act(() => {
      saveButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(scenarioManagerState.actions.handleSaveAllAndClose).toHaveBeenCalledTimes(1);
  });

  it('uses compact desktop spacing in the scenario list content area', () => {
    act(() => {
      renderer.root.render(
        <PreloadedMessagesModal
          isOpen
          onClose={vi.fn()}
          savedScenarios={[]}
          onSaveAllScenarios={vi.fn()}
          onLoadScenario={vi.fn()}
        />,
      );
    });

    const scenarioList = renderer.container.querySelector('[data-testid="scenario-list"]');
    const contentArea = scenarioList?.parentElement;

    expect(contentArea?.className).toContain('md:px-6');
    expect(contentArea?.className).toContain('md:py-5');
    expect(contentArea?.className).not.toContain('md:p-8');
  });

  it('matches the settings modal desktop corner radius', () => {
    act(() => {
      renderer.root.render(
        <PreloadedMessagesModal
          isOpen
          onClose={vi.fn()}
          savedScenarios={[]}
          onSaveAllScenarios={vi.fn()}
          onLoadScenario={vi.fn()}
        />,
      );
    });

    const modalShell = renderer.container.querySelector('[data-testid="modal-shell"]');

    expect(modalShell?.className).toContain('sm:rounded-xl');
    expect(modalShell?.className).not.toContain('sm:rounded-3xl');
  });
});
