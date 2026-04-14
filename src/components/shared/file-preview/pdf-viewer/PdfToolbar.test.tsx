import React, { useState } from 'react';
import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PdfToolbar } from './PdfToolbar';

const PdfToolbarHarness: React.FC = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [showSidebar, setShowSidebar] = useState(true);
  const numPages = 5;

  return (
    <div>
      <button type="button" onClick={() => setCurrentPage(4)}>
        Jump to page 4
      </button>
      <PdfToolbar
        currentPage={currentPage}
        numPages={numPages}
        scale={scale}
        showSidebar={showSidebar}
        onPageInputCommit={(value) => {
          const parsed = Number.parseInt(value, 10);
          if (!Number.isNaN(parsed) && parsed >= 1 && parsed <= numPages) {
            setCurrentPage(parsed);
          }
        }}
        onPrevPage={() => setCurrentPage((value) => Math.max(1, value - 1))}
        onNextPage={() => setCurrentPage((value) => Math.min(numPages, value + 1))}
        onZoomIn={() => setScale((value) => Math.min(3, value + 0.2))}
        onZoomOut={() => setScale((value) => Math.max(0.4, value - 0.2))}
        onRotate={() => setRotation((value) => (value + 90) % 360)}
        onToggleSidebar={() => setShowSidebar((value) => !value)}
      />
      <div data-testid="rotation">{rotation}</div>
    </div>
  );
};

describe('PdfToolbar', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    vi.restoreAllMocks();
  });

  it('keeps the typed page draft while the current page changes before commit', async () => {
    await act(async () => {
      root.render(<PdfToolbarHarness />);
    });

    const input = container.querySelector('input[aria-label="Page number"]') as HTMLInputElement | null;
    const jumpButton = Array.from(container.querySelectorAll('button')).find(
      (button) => button.textContent?.includes('Jump to page 4'),
    );

    expect(input).toBeTruthy();
    expect(jumpButton).toBeTruthy();

    await act(async () => {
      input!.focus();
      const valueSetter = Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        'value',
      )?.set;
      valueSetter?.call(input, '12');
      input!.dispatchEvent(new Event('input', { bubbles: true }));
      input!.dispatchEvent(new Event('change', { bubbles: true }));
    });

    expect(input!.value).toBe('12');

    await act(async () => {
      jumpButton!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(input!.value).toBe('12');
  });
});
