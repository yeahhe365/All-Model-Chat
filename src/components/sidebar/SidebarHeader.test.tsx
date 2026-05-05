import { act } from 'react';
import { setupTestRenderer } from '@/test/testUtils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SidebarHeader } from './SidebarHeader';

describe('SidebarHeader', () => {
  const renderer = setupTestRenderer();

  afterEach(() => {
    delete window.__AMC_RUNTIME_CONFIG__;
  });

  it('renders the sidebar logo from the PNG asset', () => {
    act(() => {
      renderer.root.render(<SidebarHeader isOpen={true} onToggle={vi.fn()} themeId="pearl" />);
    });

    const logo = renderer.container.querySelector('a[href="https://all-model-chat.pages.dev/"] img[alt="AMC WebUI"]');

    expect(logo?.getAttribute('src')).toBe('/sidebar-logo.png');
    expect(renderer.container.querySelector('a[href="https://all-model-chat.pages.dev/"] svg')).toBeNull();
  });

  it('uses the dark sidebar logo for the onyx theme', () => {
    act(() => {
      renderer.root.render(<SidebarHeader isOpen={true} onToggle={vi.fn()} themeId="onyx" />);
    });

    const logo = renderer.container.querySelector('a[href="https://all-model-chat.pages.dev/"] img[alt="AMC WebUI"]');

    expect(logo?.getAttribute('src')).toBe('/sidebar-logo-dark.png');
  });

  it('uses the runtime-config project URL for the sidebar logo link', () => {
    window.__AMC_RUNTIME_CONFIG__ = {
      projectUrl: 'https://deploy.example/amc',
    };

    act(() => {
      renderer.root.render(<SidebarHeader isOpen={true} onToggle={vi.fn()} themeId="pearl" />);
    });

    const logo = renderer.container.querySelector('a[href="https://deploy.example/amc"] img[alt="AMC WebUI"]');

    expect(logo).not.toBeNull();
  });
});
