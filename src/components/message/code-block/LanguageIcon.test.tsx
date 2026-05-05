import { act } from 'react';
import { createTestRenderer, type TestRenderer } from '@/test/testUtils';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { LanguageIcon } from './LanguageIcon';

describe('LanguageIcon', () => {
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
    expect(icon?.className.split(/\s+/)).toContain('h-5');
    expect(icon?.className.split(/\s+/)).toContain('w-5');
    expect(icon?.querySelector('svg')?.getAttribute('width')).toBe('20');
    expect(icon?.querySelector('svg')?.getAttribute('height')).toBe('20');
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
    const icon = container.querySelector('[data-language-icon="tsx"]');

    expect(badge).not.toBeNull();
    expect(badge?.textContent).toContain('TypeScript React');
    expect(badge?.textContent).toContain('TSX');
    expect(icon?.querySelector('svg')?.getAttribute('width')).toBe('20');
    expect(icon?.querySelector('svg')?.getAttribute('height')).toBe('20');
  });

  it('renders TypeScript code blocks with the SVG language icon', () => {
    act(() => {
      root.render(<LanguageIcon language="typescript" />);
    });

    const badge = container.querySelector('[data-language-badge="typescript"]');
    const icon = container.querySelector('[data-language-icon="typescript"]');

    expect(badge).not.toBeNull();
    expect(badge?.textContent).toContain('TypeScript');
    expect(icon?.querySelector('svg')?.getAttribute('width')).toBe('20');
    expect(icon?.querySelector('svg')?.getAttribute('height')).toBe('20');
    expect(icon?.textContent).not.toContain('TS');
  });

  it('renders dedicated SVG icons for common code block languages', () => {
    const cases = [
      ['go', 'go', 'Go'],
      ['golang', 'go', 'Go'],
      ['rust', 'rust', 'Rust'],
      ['rs', 'rust', 'Rust'],
      ['java', 'java', 'Java'],
      ['cs', 'csharp', 'C#'],
      ['csharp', 'csharp', 'C#'],
      ['kotlin', 'kotlin', 'Kotlin'],
      ['kt', 'kotlin', 'Kotlin'],
      ['ruby', 'ruby', 'Ruby'],
      ['rb', 'ruby', 'Ruby'],
      ['php', 'php', 'PHP'],
      ['swift', 'swift', 'Swift'],
      ['dart', 'dart', 'Dart'],
      ['lua', 'lua', 'Lua'],
      ['c', 'c', 'C'],
      ['cpp', 'cpp', 'C++'],
      ['c++', 'cpp', 'C++'],
      ['sql', 'sql', 'SQL'],
      ['postgresql', 'sql', 'SQL'],
      ['bash', 'shell', 'Shell'],
      ['powershell', 'shell', 'Shell'],
      ['yaml', 'yaml', 'YAML'],
      ['toml', 'toml', 'TOML'],
      ['ini', 'ini', 'INI'],
    ];

    cases.forEach(([language, iconId, label]) => {
      act(() => {
        root.render(<LanguageIcon language={language} />);
      });

      const icon = container.querySelector(`[data-language-icon="${iconId}"]`);
      const badge = container.querySelector('[data-language-badge]');

      expect(badge?.textContent).toContain(label);
      expect(icon?.querySelector('svg')?.getAttribute('width')).toBe('20');
      expect(icon?.querySelector('svg')?.getAttribute('height')).toBe('20');
    });
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
