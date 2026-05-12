import { act } from 'react';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { setupProviderTestRenderer as setupTestRenderer } from '@/test/providerTestUtils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useSettingsStore } from '@/stores/settingsStore';
import { setupStoreStateReset } from '@/test/storeTestUtils';
import { AboutSection } from './AboutSection';

describe('AboutSection', () => {
  const renderer = setupTestRenderer();
  setupStoreStateReset();
  const fetchMock = vi.fn();
  const packageVersion = JSON.parse(readFileSync(path.resolve(process.cwd(), 'package.json'), 'utf8'))
    .version as string;
  const nextPatchVersion = (() => {
    const [major = 0, minor = 0, patch = 0] = packageVersion.split('.').map(Number);
    return `${major}.${minor}.${patch + 1}`;
  })();

  beforeEach(() => {
    fetchMock.mockResolvedValue({
      ok: false,
      json: async () => ({}),
    });
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const renderAboutSection = async (language: 'en' | 'zh' = 'zh') => {
    await act(async () => {
      useSettingsStore.setState({ language });
      renderer.root.render(<AboutSection />);
    });
  };

  it('updates translated copy from the global i18n context', async () => {
    await renderAboutSection('en');

    expect(renderer.container.textContent).toContain('View on GitHub');

    act(() => {
      useSettingsStore.setState({ language: 'zh' });
    });

    expect(renderer.container.textContent).toContain('在 GitHub 上查看');
  });

  it('keeps the star card visible when GitHub data is unavailable', async () => {
    await renderAboutSection();

    expect(renderer.container.textContent).toContain('不可用');
  });

  it('renders the about panel logo from the PNG asset', async () => {
    await renderAboutSection();

    const logo = renderer.container.querySelector('img[alt="AMC WebUI 标志"]');

    expect(logo?.getAttribute('src')).toBe('/about-logo.png');
    expect(renderer.container.querySelector('svg[aria-label="AMC WebUI 标志"]')).toBeNull();
  });

  it('uses the dark about logo for the resolved onyx theme', async () => {
    await act(async () => {
      useSettingsStore.getState().setAppSettings((settings) => ({
        ...settings,
        language: 'zh',
        themeId: 'onyx',
      }));
      renderer.root.render(<AboutSection />);
    });

    const logo = renderer.container.querySelector('img[alt="AMC WebUI 标志"]');

    expect(logo?.getAttribute('src')).toBe('/about-logo-dark.png');
  });

  it('does not render a duplicate app title under the about logo', async () => {
    await renderAboutSection();

    expect(renderer.container.querySelector('h3')).toBeNull();
    expect(renderer.container.textContent).not.toContain('AMC WebUI');
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

    await renderAboutSection();

    const releaseLink = renderer.container.querySelector('a[href="https://github.com/yeahhe365/AMC-WebUI/releases"]');

    expect(renderer.container.textContent).toContain(`v${packageVersion}`);
    expect(renderer.container.textContent).toContain('测试版');
    expect(renderer.container.textContent).toContain('星标');
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
        json: async () => ({ tag_name: nextPatchVersion }),
      });

    await renderAboutSection();

    const releaseLink = renderer.container.querySelector('a[href="https://github.com/yeahhe365/AMC-WebUI/releases"]');

    expect(releaseLink?.getAttribute('title')).toBe(`有新版本：${nextPatchVersion}`);
  });

  it('does not render the manual update check controls in the about panel', async () => {
    await renderAboutSection();

    const checkButton = Array.from(renderer.container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('检查更新'),
    );

    expect(checkButton).toBeUndefined();
    expect(renderer.container.textContent).not.toContain('检查更新');
    expect(renderer.container.textContent).not.toContain('已是最新');
    expect(renderer.container.textContent).not.toContain('发现可用更新');
    expect(renderer.container.textContent).not.toContain('暂时无法检查更新');
  });
});
