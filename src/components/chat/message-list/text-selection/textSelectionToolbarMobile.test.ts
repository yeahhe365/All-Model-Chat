import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

const toolbarContainerPath = path.resolve(__dirname, './ToolbarContainer.tsx');
const standardActionsViewPath = path.resolve(__dirname, './StandardActionsView.tsx');

describe('mobile text selection toolbar styles', () => {
  it('keeps the toolbar constrained within the viewport with horizontal overflow support', () => {
    const source = fs.readFileSync(toolbarContainerPath, 'utf8');

    expect(source).toContain('max-w-[calc(100vw-20px)]');
    expect(source).toContain('overflow-x-auto');
    expect(source).toContain('no-scrollbar');
    expect(source).toContain("translate: '-50% 0'");
    expect(source).not.toContain("transform: 'translateX(-50%)'");
  });

  it('prevents action labels from wrapping into stacked Chinese text on narrow screens', () => {
    const source = fs.readFileSync(standardActionsViewPath, 'utf8');

    expect(source).toContain('whitespace-nowrap');
    expect(source).toContain('h-11');
  });
});
