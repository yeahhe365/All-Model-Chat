import { act } from 'react';
import { setupProviderTestRenderer } from '@/test/providerTestUtils';
import { describe, expect, it, vi } from 'vitest';
import { GraphvizBlock } from './GraphvizBlock';

vi.mock('@viz-js/viz', () => ({
  instance: vi.fn().mockRejectedValue(new Error('WASM failed')),
}));

describe('GraphvizBlock', () => {
  const renderer = setupProviderTestRenderer({ providers: { language: 'en' } });

  it('shows an error when the Graphviz renderer fails to initialize', async () => {
    act(() => {
      renderer.root.render(
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
      expect(renderer.container).toHaveTextContent('WASM failed');
    });
  });
});
