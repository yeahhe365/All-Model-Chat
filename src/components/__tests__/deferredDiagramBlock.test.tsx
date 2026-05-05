import { act } from 'react';
import { createTestRenderer, type TestRenderer } from '@/test/testUtils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import { DeferredDiagramBlock } from '../message/blocks/DeferredDiagramBlock';

const projectRoot = path.resolve(__dirname, '../../..');
const deferredDiagramBlockPath = path.join(projectRoot, 'src/components/message/blocks/DeferredDiagramBlock.tsx');

describe('DeferredDiagramBlock', () => {
  let container: HTMLDivElement | null = null;
  let root: TestRenderer | null = null;

  afterEach(() => {
    act(() => {
      root?.unmount();
    });
    root = null;
    container = null;
  });

  it('eagerly loads the target component when eager mode is enabled', async () => {
    const Diagram = () => <div>Rendered diagram</div>;
    const load = vi.fn(async () => ({ default: Diagram }));

    root = createTestRenderer();
    container = root.container;
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

    await act(async () => {
      root!.render(<DeferredDiagramBlock eager load={load} componentProps={{}} label="Mermaid preview" />);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(load).toHaveBeenCalledTimes(1);
    expect(container).toHaveTextContent('Rendered diagram');
  });

  it('does not keep a dedicated eager-to-loading sync effect', () => {
    const source = fs.readFileSync(deferredDiagramBlockPath, 'utf8');

    expect(source).not.toMatch(/useEffect\(\(\) => \{\s*if \(eager && !Component\) \{\s*setIsLoading\(true\)/s);
  });
});
