import { act } from 'react';
import { createTestRenderer, type TestRenderer } from '@/test/testUtils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Modal } from './Modal';

describe('Modal', () => {
  let root: TestRenderer;

  beforeEach(() => {
    root = createTestRenderer();
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
  });

  it('uses Tailwind v4 compatible default backdrop classes', () => {
    act(() => {
      root.render(
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
      root.render(
        <Modal isOpen onClose={onClose}>
          <div>Content</div>
        </Modal>,
      );
    });

    expect(document.querySelector('[role="dialog"]')).not.toBeNull();

    act(() => {
      root.render(
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
