import { act } from 'react';
import { readFileSync } from 'node:fs';
import path from 'node:path';
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
  const packageVersion = JSON.parse(
    readFileSync(path.resolve(process.cwd(), 'package.json'), 'utf8'),
  ).version as string;

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

  it('keeps the star card visible when GitHub data is unavailable', async () => {
    await act(async () => {
      useSettingsStore.setState({ language: 'zh' });
      root.render(
        <I18nProvider>
          <AboutSection />
        </I18nProvider>,
      );
    });

    expect(container.textContent).toContain('不可用');
  });

  it('localizes release status copy and mirrors the package version', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ stargazers_count: 785 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ tag_name: '1.8.7' }),
      });

    await act(async () => {
      useSettingsStore.setState({ language: 'zh' });
      root.render(
        <I18nProvider>
          <AboutSection />
        </I18nProvider>,
      );
    });

    const releaseLink = container.querySelector('a[href="https://github.com/yeahhe365/All-Model-Chat/releases"]');

    expect(container.textContent).toContain(`v${packageVersion}`);
    expect(container.textContent).toContain('测试版');
    expect(container.textContent).toContain('星标');
    expect(releaseLink?.getAttribute('title')).toBeNull();
  });

  it('uses a localized update tooltip when a newer release exists', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ stargazers_count: 785 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ tag_name: '1.8.9' }),
      });

    await act(async () => {
      useSettingsStore.setState({ language: 'zh' });
      root.render(
        <I18nProvider>
          <AboutSection />
        </I18nProvider>,
      );
    });

    const releaseLink = container.querySelector('a[href="https://github.com/yeahhe365/All-Model-Chat/releases"]');

    expect(releaseLink?.getAttribute('title')).toBe('有新版本：1.8.9');
  });

  it('renders a manual update check button and status copy', async () => {
    const onCheckForUpdates = vi.fn();

    await act(async () => {
      useSettingsStore.setState({ language: 'zh' });
      root.render(
        <I18nProvider>
          <AboutSection
            canCheckForUpdates
            onCheckForUpdates={onCheckForUpdates}
            manualUpdateCheckState="up-to-date"
          />
        </I18nProvider>,
      );
    });

    const checkButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('检查更新'),
    );

    expect(checkButton).toBeDefined();
    expect(container.textContent).toContain('已是最新');

    await act(async () => {
      checkButton?.click();
    });

    expect(onCheckForUpdates).toHaveBeenCalledTimes(1);
  });
});
