import { describe, expect, it } from 'vitest';
import { sanitizeCssColorFunctionsForPngExport } from './dom';

describe('sanitizeCssColorFunctionsForPngExport', () => {
  it('converts Tailwind oklch palette variables into rgba', () => {
    const css = `
      :root {
        --color-blue-500: oklch(62.3% .214 259.815);
      }

      .text-blue-500 {
        color: var(--color-blue-500);
      }
    `;

    const sanitized = sanitizeCssColorFunctionsForPngExport(css);

    expect(sanitized).not.toContain('oklch');
    expect(sanitized).toContain('--color-blue-500: rgba(43, 127, 255, 1)');
  });

  it('converts Tailwind color-mix oklab theme opacity colors into rgba', () => {
    const css = `
      .bg-quiet {
        background-color: color-mix(in oklab, var(--theme-bg-tertiary) 20%, transparent);
        border-color: color-mix(in oklab, transparent 40%, var(--theme-border-secondary));
      }
    `;

    const sanitized = sanitizeCssColorFunctionsForPngExport(css, {
      resolveCssVariable: (name) => ({
        '--theme-bg-tertiary': '#18181b',
        '--theme-border-secondary': '#27272a',
      })[name] ?? '',
    });

    expect(sanitized).not.toContain('oklab');
    expect(sanitized).not.toContain('color-mix');
    expect(sanitized).toContain('rgba(24, 24, 27, 0.2)');
    expect(sanitized).toContain('rgba(39, 39, 42, 0.6)');
  });
});
