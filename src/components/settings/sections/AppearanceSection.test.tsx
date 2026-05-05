import { act } from 'react';
import { setupTestRenderer } from '@/test/testUtils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { I18nProvider } from '../../../contexts/I18nContext';
import { useSettingsStore } from '../../../stores/settingsStore';
import type { AppSettings } from '../../../types';
import { AppearanceSection } from './AppearanceSection';

const settingsFixture: AppSettings = {
  ...useSettingsStore.getState().appSettings,
  themeId: 'system',
  language: 'en',
};

describe('AppearanceSection', () => {
  const renderer = setupTestRenderer();
  const initialState = useSettingsStore.getState();

  afterEach(() => {
    useSettingsStore.setState(initialState);
  });

  it('updates translated control labels from the global i18n context', async () => {
    await act(async () => {
      useSettingsStore.setState({ language: 'en' });
      renderer.root.render(
        <I18nProvider>
          <AppearanceSection settings={settingsFixture} onUpdate={vi.fn()} />
        </I18nProvider>,
      );
    });

    expect(renderer.container.textContent).toContain('Theme');
    expect(renderer.container.textContent).toContain('Reading Size');
    expect(renderer.container.textContent).toContain('Input Toolbar');
    expect(renderer.container.textContent).toContain('Streaming Responses');
    expect(renderer.container.textContent).toContain('Show Translate Button');
    expect(renderer.container.textContent).toContain('Show Paste Button');
    expect(renderer.container.textContent).toContain('Show Clear Input Button');
    expect(renderer.container.textContent).toContain('Preserve Formatting When Copying Selection');
    expect(renderer.container.textContent).not.toContain('File Transfer Method');

    act(() => {
      useSettingsStore.setState({ language: 'zh' });
    });

    expect(renderer.container.textContent).toContain('主题');
    expect(renderer.container.textContent).toContain('阅读字号');
    expect(renderer.container.textContent).toContain('输入框工具栏');
    expect(renderer.container.textContent).toContain('流式输出');
    expect(renderer.container.textContent).toContain('显示翻译按钮');
    expect(renderer.container.textContent).toContain('显示粘贴按钮');
    expect(renderer.container.textContent).toContain('显示清空输入框按钮');
    expect(renderer.container.textContent).toContain('复制选区时保留格式');
    expect(renderer.container.textContent).not.toContain('文件传输方式');
  });

  it('updates the translate button visibility preference from the input toolbar group', async () => {
    const onUpdate = vi.fn();

    await act(async () => {
      useSettingsStore.setState({ language: 'zh' });
      renderer.root.render(
        <I18nProvider>
          <AppearanceSection
            settings={{
              ...settingsFixture,
              showInputTranslationButton: false,
            }}
            onUpdate={onUpdate}
          />
        </I18nProvider>,
      );
    });

    const toolbarHeading = Array.from(renderer.container.querySelectorAll('label')).find(
      (element) => element.textContent?.trim() === '输入框工具栏',
    );
    const toggleRow = Array.from(renderer.container.querySelectorAll('div')).find((element) =>
      element.textContent?.trim().startsWith('显示翻译按钮'),
    ) as HTMLDivElement | undefined;
    const toggle = toggleRow?.querySelector('input[type="checkbox"]') as HTMLInputElement | undefined;

    expect(toolbarHeading).not.toBeUndefined();
    expect(toggle).not.toBeUndefined();
    expect(toggle?.checked).toBe(false);

    act(() => {
      toggle?.click();
    });

    expect(onUpdate).toHaveBeenCalledWith('showInputTranslationButton', true);
  });

  it('updates the paste button visibility preference', async () => {
    const onUpdate = vi.fn();

    await act(async () => {
      useSettingsStore.setState({ language: 'zh' });
      renderer.root.render(
        <I18nProvider>
          <AppearanceSection
            settings={{
              ...settingsFixture,
              showInputPasteButton: false,
            }}
            onUpdate={onUpdate}
          />
        </I18nProvider>,
      );
    });

    const toggleRow = Array.from(renderer.container.querySelectorAll('div')).find((element) =>
      element.textContent?.trim().startsWith('显示粘贴按钮'),
    ) as HTMLDivElement | undefined;
    const toggle = toggleRow?.querySelector('input[type="checkbox"]') as HTMLInputElement | undefined;

    expect(toggle).not.toBeUndefined();
    expect(toggle?.checked).toBe(false);

    act(() => {
      toggle?.click();
    });

    expect(onUpdate).toHaveBeenCalledWith('showInputPasteButton', true);
  });

  it('updates the clear input button visibility preference', async () => {
    const onUpdate = vi.fn();

    await act(async () => {
      useSettingsStore.setState({ language: 'zh' });
      renderer.root.render(
        <I18nProvider>
          <AppearanceSection
            settings={{
              ...settingsFixture,
              showInputClearButton: false,
            }}
            onUpdate={onUpdate}
          />
        </I18nProvider>,
      );
    });

    const toggleRow = Array.from(renderer.container.querySelectorAll('div')).find((element) =>
      element.textContent?.trim().startsWith('显示清空输入框按钮'),
    ) as HTMLDivElement | undefined;
    const toggle = toggleRow?.querySelector('input[type="checkbox"]') as HTMLInputElement | undefined;

    expect(toggle).not.toBeUndefined();
    expect(toggle?.checked).toBe(false);

    act(() => {
      toggle?.click();
    });

    expect(onUpdate).toHaveBeenCalledWith('showInputClearButton', true);
  });

  it('updates the selected-text formatting copy preference', async () => {
    const onUpdate = vi.fn();

    await act(async () => {
      useSettingsStore.setState({ language: 'zh' });
      renderer.root.render(
        <I18nProvider>
          <AppearanceSection
            settings={{
              ...settingsFixture,
              isCopySelectionFormattingEnabled: false,
            }}
            onUpdate={onUpdate}
          />
        </I18nProvider>,
      );
    });

    const toggleRow = Array.from(renderer.container.querySelectorAll('div')).find((element) =>
      element.textContent?.trim().startsWith('复制选区时保留格式'),
    ) as HTMLDivElement | undefined;
    const toggle = toggleRow?.querySelector('input[type="checkbox"]') as HTMLInputElement | undefined;

    expect(toggle).not.toBeUndefined();
    expect(toggle?.checked).toBe(false);

    act(() => {
      toggle?.click();
    });

    expect(onUpdate).toHaveBeenCalledWith('isCopySelectionFormattingEnabled', true);
  });
});
