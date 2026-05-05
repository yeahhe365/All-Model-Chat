import { act } from 'react';
import { setupTestRenderer } from '@/test/testUtils';
import { describe, expect, it, vi } from 'vitest';
import { I18nProvider } from '../../../../contexts/I18nContext';
import { ApiProxySettings } from './ApiProxySettings';

describe('ApiProxySettings', () => {
  const renderer = setupTestRenderer();

  it('renders the SDK request preview for a renderer.root proxy URL', () => {
    act(() => {
      renderer.root.render(
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
      renderer.root.render(
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
    expect(renderer.container.querySelector('#api-proxy-url-input')).toBeNull();
  });
});
