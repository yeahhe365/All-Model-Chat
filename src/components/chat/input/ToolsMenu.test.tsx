import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ToolsMenu } from './ToolsMenu';

const t = (key: string) =>
  ({
    tools_button: 'Tools',
    deep_search_label: 'Deep Search',
    web_search_label: 'Web Search',
    code_execution_label: 'Code Execution',
    local_python_label: 'Pyodide',
    url_context_label: 'URL Context',
    attachMenu_addByUrl: 'Add by URL',
    tools_token_count_label: 'Count Tokens',
    local_python_short: 'Pyodide',
  })[key] ?? key;

describe('ToolsMenu', () => {
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

  it('keeps local Python available for native audio models', () => {
    act(() => {
      root.render(
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
          t={t as any}
          isNativeAudioModel
        />,
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
