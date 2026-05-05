import { act } from 'react';
import { setupProviderTestRenderer as setupTestRenderer } from '@/test/providerTestUtils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { setupStoreStateReset } from '../../../../test/storeTestUtils';
import { ModelListView } from './ModelListView';

describe('ModelListView', () => {
  const renderer = setupTestRenderer({ providers: { language: 'en' } });
  setupStoreStateReset();

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders a plain model list without search, badges, or section labels', () => {
    act(() => {
      renderer.root.render(
        <ModelListView
          availableModels={[
            { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash Preview', isPinned: true },
            { id: 'gemma-4-31b-it', name: 'Gemma 4 31B IT' },
            { id: 'gemini-3-pro-image-preview', name: 'Gemini 3 Pro Image Preview' },
          ]}
          selectedModelId="gemini-3-flash-preview"
          onSelectModel={vi.fn()}
        />,
      );
    });

    expect(renderer.container.querySelector('input[placeholder="Search models..."]')).toBeNull();
    expect(renderer.container.textContent).toContain('Gemini 3 Pro Image Preview');
    expect(renderer.container.textContent).toContain('Gemma 4 31B IT');
    expect(renderer.container.querySelector('[data-badge-key="pinned"]')).toBeNull();
    expect(renderer.container.querySelector('[data-badge-key="flash"]')).toBeNull();
    expect(renderer.container.querySelector('[data-badge-key="pro"]')).toBeNull();
    expect(renderer.container.querySelector('[data-badge-key="gemma"]')).toBeNull();
    expect(renderer.container.querySelector('[data-badge-key="live"]')).toBeNull();
    expect(renderer.container.querySelector('[data-badge-key="tts"]')).toBeNull();
    expect(renderer.container.querySelector('[data-badge-key="image"]')).toBeNull();
    expect(renderer.container.querySelector('[data-badge-key="robotics"]')).toBeNull();
    expect(renderer.container.textContent).not.toContain('Pinned');
    expect(renderer.container.textContent).not.toContain('Speech');
  });
});
