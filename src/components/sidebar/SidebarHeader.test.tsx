import { act } from 'react';
import { fireEvent } from '@testing-library/react';
import { setupTestRenderer } from '@/test/testUtils';
import { describe, expect, it, vi } from 'vitest';
import { SidebarHeader } from './SidebarHeader';

describe('SidebarHeader', () => {
  const renderer = setupTestRenderer();

  const getLogoButton = () =>
    Array.from(renderer.container.querySelectorAll<HTMLButtonElement>('button')).find((button) =>
      button.querySelector('img[alt="AMC WebUI"]'),
    );

  it('renders the sidebar logo from the PNG asset', () => {
    act(() => {
      renderer.root.render(<SidebarHeader isOpen={true} onToggle={vi.fn()} themeId="pearl" />);
    });

    const logoButton = getLogoButton();
    const logo = logoButton?.querySelector('img[alt="AMC WebUI"]');

    expect(logo?.getAttribute('src')).toBe('/sidebar-logo.png');
    expect(logoButton?.querySelector('svg')).toBeNull();
  });

  it('uses the dark sidebar logo for the onyx theme', () => {
    act(() => {
      renderer.root.render(<SidebarHeader isOpen={true} onToggle={vi.fn()} themeId="onyx" />);
    });

    const logo = getLogoButton()?.querySelector('img[alt="AMC WebUI"]');

    expect(logo?.getAttribute('src')).toBe('/sidebar-logo-dark.png');
  });

  it('toggles the sidebar when the logo is clicked', () => {
    const onToggle = vi.fn();

    act(() => {
      renderer.root.render(<SidebarHeader isOpen={true} onToggle={onToggle} themeId="pearl" />);
    });

    const logoButton = getLogoButton();

    expect(logoButton).not.toBeNull();
    fireEvent.click(logoButton!);
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('raises the expanded sidebar toggle in the header chrome', () => {
    act(() => {
      renderer.root.render(<SidebarHeader isOpen={true} onToggle={vi.fn()} themeId="pearl" />);
    });

    const toggle = renderer.container.querySelector('button[aria-label="Close history sidebar"]');

    expect(toggle?.className).toContain('-translate-y-1');
  });
});
