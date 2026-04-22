import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CodeHeader } from './CodeHeader';

describe('CodeHeader', () => {
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

  it('uses the dedicated code block header chrome and keeps all controls visible', () => {
    act(() => {
      root.render(
        <CodeHeader
          language="python"
          showPreview
          isOverflowing
          isExpanded={false}
          isCopied={false}
          onToggleExpand={vi.fn()}
          onCopy={vi.fn()}
          onDownload={vi.fn()}
          onOpenSide={vi.fn()}
          onFullscreen={vi.fn()}
          t={(key) => key}
          canRun
          isRunning={false}
          onRun={vi.fn()}
        />,
      );
    });

    const header = container.firstElementChild as HTMLElement | null;
    const toolbar = container.querySelector('[data-code-header-toolbar]');

    expect(header).not.toBeNull();
    expect(header?.className).toContain('bg-[var(--theme-bg-code-block-header)]/95');
    expect(header?.className).toContain('border-b');
    expect(header?.className.split(/\s+/)).toContain('py-0');
    expect(toolbar).not.toBeNull();
    expect(toolbar?.className.split(/\s+/)).toContain('gap-0.5');
    expect(toolbar?.className).not.toContain('border');
    expect(container.querySelector('[title="Run Python Code"]')).not.toBeNull();
    expect(container.querySelector('[title="Open in Side Panel"]')).not.toBeNull();
    expect(container.querySelector('[title="code_fullscreen_monitor"]')).not.toBeNull();
    expect(container.querySelector('[title="code_fullscreen_modal"]')).not.toBeNull();
    expect(container.querySelector('[title="Download PYTHON"]')).not.toBeNull();
    expect(container.querySelector('[title="copy_button_title"]')).not.toBeNull();
    expect(container.querySelector('[title="Expand"]')).not.toBeNull();
    expect((container.querySelector('[title="copy_button_title"]') as HTMLElement | null)?.className).toContain('!min-h-10');
    expect((container.querySelector('[title="copy_button_title"]') as HTMLElement | null)?.className).toContain('!min-w-10');
    expect(container.querySelector('[title="copy_button_title"] svg')?.getAttribute('width')).toBe('16');
    expect(container.querySelector('[title="copy_button_title"] svg')?.getAttribute('height')).toBe('16');
  });

  it('shows the upgraded TSX language badge inside the header', () => {
    act(() => {
      root.render(
        <CodeHeader
          language="tsx"
          showPreview={false}
          isOverflowing={false}
          isExpanded={false}
          isCopied={false}
          onToggleExpand={vi.fn()}
          onCopy={vi.fn()}
          onDownload={vi.fn()}
          onOpenSide={vi.fn()}
          onFullscreen={vi.fn()}
          t={(key) => key}
        />,
      );
    });

    const badge = container.querySelector('[data-language-badge="tsx"]');

    expect(badge).not.toBeNull();
    expect(badge?.textContent).toContain('TypeScript React');
    expect(badge?.textContent).toContain('TSX');
  });
});
