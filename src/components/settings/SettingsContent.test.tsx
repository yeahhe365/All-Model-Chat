import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_APP_SETTINGS } from '../../constants/appConstants';
import { SettingsContent } from './SettingsContent';

const mockChatBehaviorSection = vi.hoisted(() => ({
  lastProps: null as any,
}));

vi.mock('./sections/UsageSection', () => ({
  UsageSection: () => <div data-testid="usage-section">Usage Section</div>,
}));

vi.mock('./sections/ChatBehaviorSection', () => ({
  ChatBehaviorSection: (props: any) => {
    mockChatBehaviorSection.lastProps = props;
    return (
      <button
        data-testid="save-model-list"
        onClick={() =>
          props.setAvailableModels([
            { id: 'fallback-model', name: 'Fallback Model', isPinned: true },
            { id: 'secondary-model', name: 'Secondary Model' },
          ])
        }
      >
        save
      </button>
    );
  },
}));

describe('SettingsContent', () => {
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
    mockChatBehaviorSection.lastProps = null;
  });

  it('does not render the obsolete usage section when the removed tab is requested', () => {
    act(() => {
      root.render(
        <SettingsContent
          activeTab={'usage' as any}
          currentSettings={DEFAULT_APP_SETTINGS}
          availableModels={[]}
          updateSetting={vi.fn()}
          handleModelChange={vi.fn()}
          setAvailableModels={vi.fn()}
          onClearHistory={vi.fn()}
          onClearCache={vi.fn()}
          onOpenLogViewer={vi.fn()}
          onClearLogs={vi.fn()}
          onReset={vi.fn()}
          onInstallPwa={vi.fn()}
          installState="installed"
          onImportSettings={vi.fn()}
          onExportSettings={vi.fn()}
          onImportHistory={vi.fn()}
          onExportHistory={vi.fn()}
          onImportScenarios={vi.fn()}
          onExportScenarios={vi.fn()}
          t={(key) => key}
        />,
      );
    });

    expect(container.querySelector('[data-testid="usage-section"]')).toBeNull();
  });

  it('switches to a fallback model when the current model is removed from the edited list', () => {
    const updateSetting = vi.fn();
    const setAvailableModels = vi.fn();
    const handleModelChange = vi.fn();

    act(() => {
      root.render(
        <SettingsContent
          activeTab="model"
          currentSettings={{
            ...DEFAULT_APP_SETTINGS,
            modelId: 'removed-model',
          }}
          availableModels={[
            { id: 'removed-model', name: 'Removed Model', isPinned: true },
          ]}
          updateSetting={updateSetting}
          handleModelChange={handleModelChange}
          setAvailableModels={setAvailableModels}
          onClearHistory={vi.fn()}
          onClearCache={vi.fn()}
          onOpenLogViewer={vi.fn()}
          onClearLogs={vi.fn()}
          onReset={vi.fn()}
          onInstallPwa={vi.fn()}
          installState="installed"
          onImportSettings={vi.fn()}
          onExportSettings={vi.fn()}
          onImportHistory={vi.fn()}
          onExportHistory={vi.fn()}
          onImportScenarios={vi.fn()}
          onExportScenarios={vi.fn()}
          t={(key) => key}
        />,
      );
    });

    act(() => {
      container.querySelector('[data-testid="save-model-list"]')?.dispatchEvent(
        new MouseEvent('click', { bubbles: true }),
      );
    });

    expect(setAvailableModels).toHaveBeenCalledWith([
      { id: 'fallback-model', name: 'Fallback Model', isPinned: true },
      { id: 'secondary-model', name: 'Secondary Model' },
    ]);
    expect(handleModelChange).toHaveBeenCalledWith('fallback-model');
    expect(updateSetting).not.toHaveBeenCalledWith('modelId', 'fallback-model');
  });
});
