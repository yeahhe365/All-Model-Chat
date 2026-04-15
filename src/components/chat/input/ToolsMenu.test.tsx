import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { I18nProvider } from '../../../contexts/I18nContext';
import { useSettingsStore } from '../../../stores/settingsStore';
import { ToolsMenu } from './ToolsMenu';

describe('ToolsMenu', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    useSettingsStore.setState({ language: 'en' });
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

  it('keeps local Python available for native audio models', () => {
    act(() => {
      root.render(
        <I18nProvider>
          <ToolsMenu
            isGoogleSearchEnabled={false}
            onToggleGoogleSearch={() => {}}
            isCodeExecutionEnabled={false}
            onToggleCodeExecution={() => {}}
            isLocalPythonEnabled
            onToggleLocalPython={() => {}}
            isUrlContextEnabled={false}
            onToggleUrlContext={() => {}}
            isDeepSearchEnabled={false}
            onToggleDeepSearch={() => {}}
            onAddYouTubeVideo={() => {}}
            onCountTokens={() => {}}
            disabled={false}
            isNativeAudioModel
          />
        </I18nProvider>,
      );
    });

    const toolsButton = document.querySelector('button[aria-label="Tools"]') as HTMLButtonElement | null;
    expect(toolsButton).not.toBeNull();

    act(() => {
      toolsButton?.click();
    });

    expect(document.body.textContent).toContain('Pyodide');
    expect(document.body.textContent).not.toContain('Code Execution');
    expect(document.body.textContent).not.toContain('Deep Search');
  });
});
