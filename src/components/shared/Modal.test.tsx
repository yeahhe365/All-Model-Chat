import { act } from 'react';
import { setupTestRenderer } from '@/test/testUtils';
import { describe, expect, it, vi } from 'vitest';
import { Modal } from './Modal';

describe('Modal', () => {
  const renderer = setupTestRenderer();

  it('uses Tailwind v4 compatible default backdrop classes', () => {
    act(() => {
      renderer.root.render(
        <Modal isOpen onClose={() => {}}>
          <div>Content</div>
        </Modal>,
      );
    });

    const dialog = document.querySelector('[role="dialog"]');
    expect(dialog).not.toBeNull();
    expect(dialog?.className).toContain('bg-black/60');
    expect(dialog?.className).not.toContain('bg-opacity-60');
  });

  it('waits for the exit animation event before unmounting', () => {
    const onClose = vi.fn();

    act(() => {
      renderer.root.render(
        <Modal isOpen onClose={onClose}>
          <div>Content</div>
        </Modal>,
      );
    });

    expect(document.querySelector('[role="dialog"]')).not.toBeNull();

    act(() => {
      renderer.root.render(
        <Modal isOpen={false} onClose={onClose}>
          <div>Content</div>
        </Modal>,
      );
    });

    expect(document.querySelector('[role="dialog"]')).not.toBeNull();

    const animatedSurface = document.querySelector('.modal-exit-animation');
    expect(animatedSurface).not.toBeNull();

    act(() => {
      animatedSurface?.dispatchEvent(new Event('animationend', { bubbles: true }));
    });

    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });
});
