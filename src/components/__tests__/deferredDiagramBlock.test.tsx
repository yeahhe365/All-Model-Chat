import { act } from 'react';
import { setupTestRenderer } from '@/test/testUtils';
import { describe, expect, it, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import { DeferredDiagramBlock } from '../message/blocks/DeferredDiagramBlock';

const projectRoot = path.resolve(__dirname, '../../..');
const deferredDiagramBlockPath = path.join(projectRoot, 'src/components/message/blocks/DeferredDiagramBlock.tsx');

describe('DeferredDiagramBlock', () => {
  const renderer = setupTestRenderer();

  it('eagerly loads the target component when eager mode is enabled', async () => {
    const Diagram = () => <div>Rendered diagram</div>;
    const load = vi.fn(async () => ({ default: Diagram }));

    await act(async () => {
      renderer.render(<DeferredDiagramBlock eager load={load} componentProps={{}} label="Mermaid preview" />);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(load).toHaveBeenCalledTimes(1);
    expect(renderer.container).toHaveTextContent('Rendered diagram');
  });

  it('does not keep a dedicated eager-to-loading sync effect', () => {
    const source = fs.readFileSync(deferredDiagramBlockPath, 'utf8');

    expect(source).not.toMatch(/useEffect\(\(\) => \{\s*if \(eager && !Component\) \{\s*setIsLoading\(true\)/s);
  });
});
