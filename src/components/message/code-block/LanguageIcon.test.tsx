import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { LanguageIcon } from './LanguageIcon';

describe('LanguageIcon', () => {
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

  it('renders a branded Python badge with a normalized display label', () => {
    act(() => {
      root.render(<LanguageIcon language="py" />);
    });

    const badge = container.querySelector('[data-language-badge="python"]');
    const icon = container.querySelector('[data-language-icon="python"]');
    const meta = container.querySelector('[data-language-meta]');

    expect(badge).not.toBeNull();
    expect(badge?.textContent).toContain('Python');
    expect(badge?.className.split(/\s+/)).toContain('gap-1.5');
    expect(icon).not.toBeNull();
    expect(icon?.className.split(/\s+/)).toContain('h-4');
    expect(icon?.className.split(/\s+/)).toContain('w-4');
    expect(icon?.querySelector('svg')?.getAttribute('width')).toBe('16');
    expect(icon?.querySelector('svg')?.getAttribute('height')).toBe('16');
    expect(icon?.querySelector('[stop-color="#5a9fd4"]')).not.toBeNull();
    expect(icon?.querySelector('[stop-color="#ffd43b"]')).not.toBeNull();
    expect(meta).not.toBeNull();
    expect(meta?.className.split(/\s+/)).toContain('inline-flex');
    expect(meta?.className.split(/\s+/)).toContain('items-center');
    expect(meta?.textContent).not.toContain('PY');
  });

  it('renders framework-aware labels for TSX code blocks', () => {
    act(() => {
      root.render(<LanguageIcon language="tsx" />);
    });

    const badge = container.querySelector('[data-language-badge="tsx"]');

    expect(badge).not.toBeNull();
    expect(badge?.textContent).toContain('TypeScript React');
    expect(badge?.textContent).toContain('TSX');
  });

  it('falls back to a generic code badge for unknown languages', () => {
    act(() => {
      root.render(<LanguageIcon language="brainfuck" />);
    });

    const badge = container.querySelector('[data-language-badge="brainfuck"]');

    expect(badge).not.toBeNull();
    expect(badge?.textContent).toContain('brainfuck');
    expect(container.querySelector('[data-language-icon="generic"]')).not.toBeNull();
  });
});
