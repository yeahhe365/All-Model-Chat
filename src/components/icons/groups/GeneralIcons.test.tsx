import { describe, expect, it } from 'vitest';
import { render } from '@/test/testUtils';
import { IconSidebarToggle } from './GeneralIcons';

describe('GeneralIcons', () => {
  it('renders the sidebar toggle as two horizontal lines', () => {
    const { container } = render(<IconSidebarToggle size={20} strokeWidth={2} />);

    const svg = container.querySelector('svg');
    const lines = Array.from(container.querySelectorAll('line'));

    expect(svg?.getAttribute('viewBox')).toBe('0 0 24 24');
    expect(lines).toHaveLength(2);
    expect(lines.map((line) => line.getAttribute('y1'))).toEqual(['8', '16']);
    expect(lines.map((line) => line.getAttribute('y2'))).toEqual(['8', '16']);
    expect(lines.map((line) => line.getAttribute('x1'))).toEqual(['4', '4']);
    expect(lines.map((line) => line.getAttribute('x2'))).toEqual(['20', '14']);
  });
});
