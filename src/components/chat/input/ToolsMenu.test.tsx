import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { I18nProvider } from '../../../contexts/I18nContext';
import { useSettingsStore } from '../../../stores/settingsStore';
import { ToolsMenu } from './ToolsMenu';

vi.mock('../../../services/logService', () => ({
  logService: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn(), recordTokenUsage: vi.fn() },
}));

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

  it('hides code execution tooling for Gemini image-generation models', () => {
    act(() => {
      root.render(
        <I18nProvider>
          <ToolsMenu
            isImageModel
            isGemini3ImageModel
            isGoogleSearchEnabled={false}
            onToggleGoogleSearch={() => {}}
            isCodeExecutionEnabled={false}
            onToggleCodeExecution={() => {}}
            isLocalPythonEnabled={false}
            onToggleLocalPython={() => {}}
            isUrlContextEnabled={false}
            onToggleUrlContext={() => {}}
            isDeepSearchEnabled={false}
            onToggleDeepSearch={() => {}}
            onAddYouTubeVideo={() => {}}
            onCountTokens={() => {}}
            disabled={false}
            isNativeAudioModel={false}
          />
        </I18nProvider>,
      );
    });

    const toolsButton = document.querySelector('button[aria-label="Tools"]') as HTMLButtonElement | null;
    expect(toolsButton).not.toBeNull();

    act(() => {
      toolsButton?.click();
    });

    expect(document.body.textContent).toContain('Web Search');
    expect(document.body.textContent).not.toContain('Code Execution');
    expect(document.body.textContent).toContain('Token Calculator');
    expect(document.body.textContent).not.toContain('Deep Search');
    expect(document.body.textContent).not.toContain('Pyodide');
    expect(document.body.textContent).not.toContain('URL Context');
    expect(document.body.textContent).not.toContain('Add YouTube Video');
  });

  it('hides unsupported built-in tools for Gemma models', () => {
    act(() => {
      root.render(
        <I18nProvider>
          <ToolsMenu
            isGemmaModel
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
            isNativeAudioModel={false}
          />
        </I18nProvider>,
      );
    });

    const toolsButton = document.querySelector('button[aria-label="Tools"]') as HTMLButtonElement | null;
    expect(toolsButton).not.toBeNull();

    act(() => {
      toolsButton?.click();
    });

    expect(document.body.textContent).toContain('Web Search');
    expect(document.body.textContent).toContain('Deep Search');
    expect(document.body.textContent).toContain('Pyodide');
    expect(document.body.textContent).not.toContain('Code Execution');
    expect(document.body.textContent).not.toContain('URL Context');
  });

  it('shows a combination notice when local Python and built-in tools are enabled on non-Gemini-3 models', () => {
    act(() => {
      root.render(
        <I18nProvider>
          <ToolsMenu
            supportsBuiltInCustomToolCombination={false}
            isGoogleSearchEnabled
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
            isNativeAudioModel={false}
          />
        </I18nProvider>,
      );
    });

    expect(document.body.textContent).toContain("This model can't combine built-in tools with Pyodide in one request.");
  });

  it('does not show a combination notice for Gemini 3 models', () => {
    act(() => {
      root.render(
        <I18nProvider>
          <ToolsMenu
            supportsBuiltInCustomToolCombination
            isGoogleSearchEnabled
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
            isNativeAudioModel={false}
          />
        </I18nProvider>,
      );
    });

    expect(document.body.textContent).not.toContain(
      "This model can't combine built-in tools with Pyodide in one request.",
    );
  });
});
