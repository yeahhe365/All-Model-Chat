import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DeferredDiagramBlock } from '../message/blocks/DeferredDiagramBlock';

describe('DeferredDiagramBlock', () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;

  afterEach(() => {
    act(() => {
      root?.unmount();
    });
    container?.remove();
    root = null;
    container = null;
  });

  it('eagerly loads the target component when eager mode is enabled', async () => {
    const Diagram = () => <div>Rendered diagram</div>;
    const load = vi.fn(async () => ({ default: Diagram }));

    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    await act(async () => {
      root!.render(
        <DeferredDiagramBlock
          eager
          load={load}
          componentProps={{}}
          label="Mermaid preview"
        />
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(load).toHaveBeenCalledTimes(1);
    expect(container).toHaveTextContent('Rendered diagram');
  });
});
