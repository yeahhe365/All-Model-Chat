import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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

  it('does not render a Vertex Express shortcut button', () => {
    act(() => {
      root.render(
        <ApiProxySettings
          useApiProxy
          setUseApiProxy={vi.fn()}
          apiProxyUrl="https://api-proxy.de/gemini/v1beta"
          setApiProxyUrl={vi.fn()}
          t={(key) => key}
        />
      );
    });

    expect(document.body).not.toHaveTextContent('Vertex Express');
    expect(document.body).not.toHaveTextContent('apiConfig_vertexExpress_btn');
  });
});
