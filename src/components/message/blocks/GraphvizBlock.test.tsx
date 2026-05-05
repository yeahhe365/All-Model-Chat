import { act } from 'react';
import { createTestRenderer, type TestRenderer } from '@/test/testUtils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GraphvizBlock } from './GraphvizBlock';

vi.mock('../../../contexts/I18nContext', async () => {
  const { createI18nMock } = await import('../../../test/i18nTestDoubles');

  return createI18nMock();
});

vi.mock('@viz-js/viz', () => ({
  instance: vi.fn().mockRejectedValue(new Error('WASM failed')),
}));

describe('GraphvizBlock', () => {
  let container: HTMLDivElement;
  let root: TestRenderer;

  beforeEach(() => {
    root = createTestRenderer();
    container = root.container;
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
  });

  it('shows an error when the Graphviz renderer fails to initialize', async () => {
    act(() => {
      root.render(
        <GraphvizBlock
          code="digraph G { A -> B; }"
          isLoading={false}
          themeId="pearl"
          onImageClick={vi.fn()}
          onOpenSidePanel={vi.fn()}
          renderDelayMs={0}
        />,
      );
    });

    await vi.waitFor(() => {
      expect(container).toHaveTextContent('WASM failed');
    });
  });
});
