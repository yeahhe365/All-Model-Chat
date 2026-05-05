import { act } from 'react';
import { createTestRenderer, type TestRenderer } from '@/test/testUtils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { I18nProvider } from '../../../../contexts/I18nContext';
import { useSettingsStore } from '../../../../stores/settingsStore';
import { ModelListView } from './ModelListView';

describe('ModelListView', () => {
  let container: HTMLDivElement;
  let root: TestRenderer;
  const initialState = useSettingsStore.getState();

  beforeEach(() => {
    useSettingsStore.setState({ language: 'en' });
    root = createTestRenderer();
    container = root.container;
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    vi.clearAllMocks();
    useSettingsStore.setState(initialState);
  });

  it('renders a plain model list without search, badges, or section labels', () => {
    act(() => {
      root.render(
        <I18nProvider>
          <ModelListView
            availableModels={[
              { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash Preview', isPinned: true },
              { id: 'gemma-4-31b-it', name: 'Gemma 4 31B IT' },
              { id: 'gemini-3-pro-image-preview', name: 'Gemini 3 Pro Image Preview' },
            ]}
            selectedModelId="gemini-3-flash-preview"
            onSelectModel={vi.fn()}
          />
        </I18nProvider>,
      );
    });

    expect(container.querySelector('input[placeholder="Search models..."]')).toBeNull();
    expect(container.textContent).toContain('Gemini 3 Pro Image Preview');
    expect(container.textContent).toContain('Gemma 4 31B IT');
    expect(container.querySelector('[data-badge-key="pinned"]')).toBeNull();
    expect(container.querySelector('[data-badge-key="flash"]')).toBeNull();
    expect(container.querySelector('[data-badge-key="pro"]')).toBeNull();
    expect(container.querySelector('[data-badge-key="gemma"]')).toBeNull();
    expect(container.querySelector('[data-badge-key="live"]')).toBeNull();
    expect(container.querySelector('[data-badge-key="tts"]')).toBeNull();
    expect(container.querySelector('[data-badge-key="image"]')).toBeNull();
    expect(container.querySelector('[data-badge-key="robotics"]')).toBeNull();
    expect(container.textContent).not.toContain('Pinned');
    expect(container.textContent).not.toContain('Speech');
  });
});
