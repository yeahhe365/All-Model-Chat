import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SidebarActions } from '../sidebar/SidebarActions';

describe('SidebarActions', () => {
  let container: HTMLDivElement;
  let root: Root;

  afterEach(() => {
    if (root) {
      act(() => {
        root.unmount();
      });
    }
    container?.remove();
  });

  it('clears the search query when Escape closes the active search box', () => {
    const setIsSearching = vi.fn();
    const setSearchQuery = vi.fn();

    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    act(() => {
      root.render(
        <SidebarActions
          onNewChat={vi.fn()}
          onAddNewGroup={vi.fn()}
          isSearching={true}
          searchQuery="gemini"
          setIsSearching={setIsSearching}
          setSearchQuery={setSearchQuery}
          t={(key) => key}
        />
      );
    });

    const input = container.querySelector('input') as HTMLInputElement;

    act(() => {
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });

    expect(setIsSearching).toHaveBeenCalledWith(false);
    expect(setSearchQuery).toHaveBeenCalledWith('');
  });
});
