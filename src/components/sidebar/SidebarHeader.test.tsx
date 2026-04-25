import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { translations } from '../../utils/translations';
import { SidebarHeader } from './SidebarHeader';

describe('SidebarHeader', () => {
  let container: HTMLDivElement;
  let root: Root;

  const t = (key: keyof typeof translations) => String(key);

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

  it('renders the sidebar logo from the PNG asset', () => {
    act(() => {
      root.render(<SidebarHeader isOpen={true} onToggle={vi.fn()} t={t} themeId="pearl" />);
    });

    const logo = container.querySelector('a[href="https://all-model-chat.pages.dev/"] img[alt="All Model Chat"]');

    expect(logo?.getAttribute('src')).toBe('/sidebar-logo.png');
    expect(container.querySelector('a[href="https://all-model-chat.pages.dev/"] svg')).toBeNull();
  });

  it('uses the dark sidebar logo for the onyx theme', () => {
    act(() => {
      root.render(<SidebarHeader isOpen={true} onToggle={vi.fn()} t={t} themeId="onyx" />);
    });

    const logo = container.querySelector('a[href="https://all-model-chat.pages.dev/"] img[alt="All Model Chat"]');

    expect(logo?.getAttribute('src')).toBe('/sidebar-logo-dark.png');
  });
});
