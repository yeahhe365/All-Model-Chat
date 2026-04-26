import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GraphvizBlock } from './GraphvizBlock';

vi.mock('../../../contexts/I18nContext', () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@viz-js/viz', () => ({
  instance: vi.fn().mockRejectedValue(new Error('WASM failed')),
}));

describe('GraphvizBlock', () => {
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
