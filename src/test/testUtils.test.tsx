import { useEffect, useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useI18n } from '../contexts/I18nContext';
import { useWindowContext } from '../contexts/WindowContext';
import { createDeferred, createTestRenderer, flushPromises, render, renderHook, setupTestRenderer } from './testUtils';
import { renderHookWithProviders, renderWithProviders, setupProviderTestRenderer } from './providerTestUtils';

describe('testUtils', () => {
  it('renders hooks and runs cleanup on unmount', () => {
    const cleanup = vi.fn();

    const { result, unmount } = renderHook(() => {
      const [value] = useState('ready');
      useEffect(() => cleanup, []);
      return value;
    });

    expect(result.current).toBe('ready');

    unmount();

    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  it('renders components through the shared test renderer', () => {
    const renderer = createTestRenderer();

    renderer.render(<span>first</span>);
    expect(renderer.container).toHaveTextContent('first');

    renderer.render(<span>second</span>);
    expect(renderer.container).toHaveTextContent('second');

    renderer.unmount();
    expect(renderer.container).toBeEmptyDOMElement();
  });

  it('renders again after a manual unmount', () => {
    const renderer = createTestRenderer();

    renderer.render(<span>before unmount</span>);
    renderer.unmount();
    renderer.render(<span>after unmount</span>);

    expect(renderer.container).toHaveTextContent('after unmount');
  });

  it('exposes the shared React Testing Library render helper', () => {
    const view = render(<span>shared render</span>);

    expect(view.container).toHaveTextContent('shared render');

    view.unmount();
  });

  it('renders components with project providers from a single helper', () => {
    const Probe = () => {
      const { language, t } = useI18n();
      const { document: providerDocument } = useWindowContext();

      return (
        <span>
          {language}:{t('close', 'Close')}:{providerDocument === document ? 'same-document' : 'custom-document'}
        </span>
      );
    };

    const view = renderWithProviders(<Probe />, { language: 'zh' });

    expect(view.container).toHaveTextContent('zh:关闭:same-document');

    view.unmount();
  });

  it('creates controllable promises for async tests', async () => {
    const deferred = createDeferred<string>();
    let value = '';

    deferred.promise.then((resolvedValue) => {
      value = resolvedValue;
    });

    deferred.resolve('loaded');
    await flushPromises();

    expect(value).toBe('loaded');
  });

  it('rerenders with an updated hook callback', () => {
    const { result, rerender, unmount } = renderHook(() => 'first');

    rerender(() => 'second');

    expect(result.current).toBe('second');
    unmount();
  });

  it('renders hooks with project providers and supports context overrides', () => {
    const customDocument = document.implementation.createHTMLDocument('custom-test-document');
    const customWindow = customDocument.defaultView as unknown as Window;

    const { result, unmount } = renderHookWithProviders(
      () => {
        const i18n = useI18n();
        const win = useWindowContext();

        return { i18n, win };
      },
      {
        language: 'en',
        window: customWindow,
        document: customDocument,
      },
    );

    expect(result.current.i18n.t('close', 'Close')).toBe('Close');
    expect(result.current.win.document).toBe(customDocument);

    unmount();
  });

  describe('setupTestRenderer', () => {
    const renderer = setupTestRenderer();
    const containers: HTMLDivElement[] = [];

    afterEach(() => {
      containers.push(renderer.container);
    });

    it('provides a renderer in the current test', () => {
      renderer.render(<span>first setup renderer</span>);

      expect(renderer.container).toHaveTextContent('first setup renderer');
    });

    it('creates a fresh renderer for each test', () => {
      renderer.render(<span>second setup renderer</span>);

      expect(renderer.container).toHaveTextContent('second setup renderer');
      expect(renderer.container).not.toBe(containers[0]);
    });
  });

  describe('setupTestRenderer with providers', () => {
    const renderer = setupProviderTestRenderer({ providers: { language: 'zh' } });

    it('wraps each render with project providers', () => {
      const Probe = () => {
        const { t } = useI18n();

        return <span>{t('close', 'Close')}</span>;
      };

      renderer.render(<Probe />);

      expect(renderer.container).toHaveTextContent('关闭');
    });
  });
});
