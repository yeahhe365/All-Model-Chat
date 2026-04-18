import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_APP_SETTINGS } from '../../constants/appConstants';
import { SettingsContent } from './SettingsContent';

vi.mock('./sections/UsageSection', () => ({
  UsageSection: () => <div data-testid="usage-section">Usage Section</div>,
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
});
