import { act } from 'react';
import { createTestRenderer, type TestRenderer } from '@/test/testUtils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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
  let container: HTMLDivElement;
  let root: TestRenderer;
  const initialState = useSettingsStore.getState();

  beforeEach(() => {
    root = createTestRenderer();
    container = root.container;
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    useSettingsStore.setState(initialState);
  });

  it('updates translated control labels from the global i18n context', async () => {
    await act(async () => {
      useSettingsStore.setState({ language: 'en' });
      root.render(
        <I18nProvider>
          <AppearanceSection settings={settingsFixture} onUpdate={vi.fn()} />
        </I18nProvider>,
      );
    });

    expect(container.textContent).toContain('Theme');
    expect(container.textContent).toContain('Reading Size');
    expect(container.textContent).toContain('Input Toolbar');
    expect(container.textContent).toContain('Streaming Responses');
    expect(container.textContent).toContain('Show Translate Button');
    expect(container.textContent).toContain('Show Paste Button');
    expect(container.textContent).toContain('Show Clear Input Button');
    expect(container.textContent).toContain('Preserve Formatting When Copying Selection');
    expect(container.textContent).not.toContain('File Transfer Method');

    act(() => {
      useSettingsStore.setState({ language: 'zh' });
    });

    expect(container.textContent).toContain('主题');
    expect(container.textContent).toContain('阅读字号');
    expect(container.textContent).toContain('输入框工具栏');
    expect(container.textContent).toContain('流式输出');
    expect(container.textContent).toContain('显示翻译按钮');
    expect(container.textContent).toContain('显示粘贴按钮');
    expect(container.textContent).toContain('显示清空输入框按钮');
    expect(container.textContent).toContain('复制选区时保留格式');
    expect(container.textContent).not.toContain('文件传输方式');
  });

  it('updates the translate button visibility preference from the input toolbar group', async () => {
    const onUpdate = vi.fn();

    await act(async () => {
      useSettingsStore.setState({ language: 'zh' });
      root.render(
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

    const toolbarHeading = Array.from(container.querySelectorAll('label')).find(
      (element) => element.textContent?.trim() === '输入框工具栏',
    );
    const toggleRow = Array.from(container.querySelectorAll('div')).find((element) =>
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
      root.render(
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

    const toggleRow = Array.from(container.querySelectorAll('div')).find((element) =>
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
      root.render(
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

    const toggleRow = Array.from(container.querySelectorAll('div')).find((element) =>
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
      root.render(
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

    const toggleRow = Array.from(container.querySelectorAll('div')).find((element) =>
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
