import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { I18nProvider } from '../../../contexts/I18nContext';
import { useSettingsStore } from '../../../stores/settingsStore';
import { AboutSection } from './AboutSection';

describe('AboutSection', () => {
  let container: HTMLDivElement;
  let root: Root;
  const initialState = useSettingsStore.getState();
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockResolvedValue({
      ok: false,
      json: async () => ({}),
    });
    vi.stubGlobal('fetch', fetchMock);

    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    useSettingsStore.setState(initialState);
    vi.unstubAllGlobals();
  });

  it('updates translated copy from the global i18n context', async () => {
    await act(async () => {
      useSettingsStore.setState({ language: 'en' });
      root.render(
        <I18nProvider>
          <AboutSection />
        </I18nProvider>,
      );
    });

    expect(container.textContent).toContain('View on GitHub');

    act(() => {
      useSettingsStore.setState({ language: 'zh' });
    });

    expect(container.textContent).toContain('在 GitHub 上查看');
  });
});
