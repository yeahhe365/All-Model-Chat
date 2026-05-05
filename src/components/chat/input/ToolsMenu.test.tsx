import { act } from 'react';
import { setupTestRenderer } from '@/test/testUtils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { I18nProvider } from '../../../contexts/I18nContext';
import { useSettingsStore } from '../../../stores/settingsStore';
import { ToolsMenu } from './ToolsMenu';

vi.mock('../../../services/logService', async () => {
  const { createLogServiceMockModule } = await import('../../../test/moduleMockDoubles');

  return createLogServiceMockModule();
});

const createToolStates = (
  enabled: Partial<
    Record<'googleSearch' | 'deepSearch' | 'codeExecution' | 'localPython' | 'urlContext', boolean>
  > = {},
) => ({
  googleSearch: { isEnabled: !!enabled.googleSearch, onToggle: () => {} },
  deepSearch: { isEnabled: !!enabled.deepSearch, onToggle: () => {} },
  codeExecution: { isEnabled: !!enabled.codeExecution, onToggle: () => {} },
  localPython: { isEnabled: !!enabled.localPython, onToggle: () => {} },
  urlContext: { isEnabled: !!enabled.urlContext, onToggle: () => {} },
});

const toolUtilityActions = {
  onAddYouTubeVideo: () => {},
  onCountTokens: () => {},
};

describe('ToolsMenu', () => {
  const renderer = setupTestRenderer();

  beforeEach(() => {
    useSettingsStore.setState({ language: 'en' });
  });

  it('keeps local Python available for native audio models', () => {
    act(() => {
      renderer.root.render(
        <I18nProvider>
          <ToolsMenu
            currentModelId="gemini-3.1-flash-live-preview"
            toolStates={createToolStates({ localPython: true })}
            toolUtilityActions={toolUtilityActions}
            disabled={false}
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
      renderer.root.render(
        <I18nProvider>
          <ToolsMenu
            currentModelId="gemini-3.1-flash-image-preview"
            toolStates={createToolStates()}
            toolUtilityActions={toolUtilityActions}
            disabled={false}
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
      renderer.root.render(
        <I18nProvider>
          <ToolsMenu
            currentModelId="gemma-3-27b-it"
            toolStates={createToolStates({ localPython: true })}
            toolUtilityActions={toolUtilityActions}
            disabled={false}
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
      renderer.root.render(
        <I18nProvider>
          <ToolsMenu
            currentModelId="gemini-2.5-pro"
            toolStates={createToolStates({ googleSearch: true, localPython: true })}
            toolUtilityActions={toolUtilityActions}
            disabled={false}
          />
        </I18nProvider>,
      );
    });

    expect(document.body.textContent).toContain("This model can't combine built-in tools with Pyodide in one request.");
  });

  it('does not show a combination notice for Gemini 3 models', () => {
    act(() => {
      renderer.root.render(
        <I18nProvider>
          <ToolsMenu
            currentModelId="gemini-3.1-pro-preview"
            toolStates={createToolStates({ googleSearch: true, localPython: true })}
            toolUtilityActions={toolUtilityActions}
            disabled={false}
          />
        </I18nProvider>,
      );
    });

    expect(document.body.textContent).not.toContain(
      "This model can't combine built-in tools with Pyodide in one request.",
    );
  });
});
