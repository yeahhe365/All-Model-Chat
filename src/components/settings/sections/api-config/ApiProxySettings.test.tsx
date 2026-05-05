import { act } from 'react';
import { createTestRenderer, type TestRenderer } from '@/test/testUtils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { I18nProvider } from '../../../../contexts/I18nContext';
import { ApiProxySettings } from './ApiProxySettings';

describe('ApiProxySettings', () => {
  let container: HTMLDivElement;
  let root: TestRenderer;

  beforeEach(() => {
    root = createTestRenderer();
    container = root.container;
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
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

  it('collapses proxy URL details while proxy usage is off', () => {
    act(() => {
      root.render(
        <I18nProvider>
          <ApiProxySettings
            useApiProxy={false}
            setUseApiProxy={vi.fn()}
            apiProxyUrl="http://localhost:7860/v1beta"
            setApiProxyUrl={vi.fn()}
          />
        </I18nProvider>,
      );
    });

    expect(document.body).toHaveTextContent('Use Proxy Endpoint');
    expect(document.body).not.toHaveTextContent('Reset');
    expect(document.body).not.toHaveTextContent('Request URL Preview');
    expect(container.querySelector('#api-proxy-url-input')).toBeNull();
  });
});
