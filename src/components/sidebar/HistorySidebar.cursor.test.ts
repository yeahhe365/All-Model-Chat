import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

const historySidebarPath = path.resolve(__dirname, './HistorySidebar.tsx');

describe('HistorySidebar cursor affordances', () => {
  it('uses the horizontal resize cursor on blank sidebar toggle areas', () => {
    const source = fs.readFileSync(historySidebarPath, 'utf8');

    expect(source).toContain('custom-scrollbar p-2 cursor-ew-resize');
    expect(source).toContain('text-center text-[var(--theme-text-tertiary)] cursor-auto');
    expect(source).toContain('transition-colors min-h-[50px] cursor-auto');
    expect(source).toContain('w-full min-w-[52.2px] cursor-ew-resize');
    expect(source).not.toContain('w-full min-w-[52.2px] cursor-pointer');
    expect(source).toContain('no-underline cursor-pointer');
    expect(source).toContain('focus:visible:ring-[var(--theme-border-focus)] cursor-pointer');
  });
});
