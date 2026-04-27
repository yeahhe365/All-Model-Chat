import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { I18nProvider } from '../../../../contexts/I18nContext';
import { ApiProxySettings } from './ApiProxySettings';

describe('ApiProxySettings', () => {
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

  it('renders the SDK request preview for a root proxy URL', () => {
    act(() => {
      root.render(
        <I18nProvider>
          <ApiProxySettings
            useApiProxy
            setUseApiProxy={vi.fn()}
            apiProxyUrl="https://api-proxy.de/gemini/v1beta"
            setApiProxyUrl={vi.fn()}
          />
        </I18nProvider>,
      );
    });

    expect(document.body).toHaveTextContent(
      'https://api-proxy.de/gemini/v1beta/models/gemini-3-flash-preview:generateContent',
    );
  });
});
