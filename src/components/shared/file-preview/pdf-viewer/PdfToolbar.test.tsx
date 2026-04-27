import React, { useEffect } from 'react';
import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { I18nProvider } from '../../../../contexts/I18nContext';
import { PdfToolbar } from './PdfToolbar';
import { usePdfViewer } from '../../../../hooks/ui/usePdfViewer';
import { UploadedFile } from '../../../../types';

const file: UploadedFile = {
  id: 'pdf-file',
  name: 'test.pdf',
  type: 'application/pdf',
  size: 1,
  dataUrl: 'blob:test-pdf',
  uploadState: 'active',
};

const secondFile: UploadedFile = {
  ...file,
  id: 'pdf-file-2',
  name: 'test-2.pdf',
  dataUrl: 'blob:test-pdf-2',
};

const PdfToolbarHarnessInner: React.FC<{ file: UploadedFile }> = ({ file }) => {
  const {
    numPages,
    currentPage,
    scale,
    showSidebar,
    containerRef,
    setPageRef,
    onDocumentLoadSuccess,
    scrollToPage,
    previousPage,
    nextPage,
    handlePageInputCommit,
    handleZoomIn,
    handleZoomOut,
    handleRotate,
    toggleSidebar,
  } = usePdfViewer(file);

  useEffect(() => {
    onDocumentLoadSuccess({ numPages: 5 });
  }, [onDocumentLoadSuccess]);

  return (
    <div>
      <div ref={containerRef}>
        {Array.from({ length: 5 }, (_, index) => {
          const pageNumber = index + 1;
          return (
            <div key={pageNumber} data-testid={`page-${pageNumber}`} ref={(element) => setPageRef(pageNumber, element)}>
              Page {pageNumber}
            </div>
          );
        })}
      </div>
      <button type="button" onClick={() => scrollToPage(4)}>
        Jump to page 4
      </button>
      <PdfToolbar
        currentPage={currentPage}
        numPages={numPages}
        scale={scale}
        showSidebar={showSidebar}
        onPageInputCommit={handlePageInputCommit}
        onPrevPage={previousPage}
        onNextPage={nextPage}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onRotate={handleRotate}
        onToggleSidebar={toggleSidebar}
      />
    </div>
  );
};

const PdfToolbarHarness: React.FC<{ file: UploadedFile }> = ({ file }) => (
  <I18nProvider>
    <PdfToolbarHarnessInner key={file.id} file={file} />
  </I18nProvider>
);

describe('PdfToolbar', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    Object.defineProperty(globalThis, 'IntersectionObserver', {
      configurable: true,
      value: class {
        observe() {}
        disconnect() {}
        unobserve() {}
      },
    });
    Object.defineProperty(Element.prototype, 'scrollIntoView', {
      configurable: true,
      value: vi.fn(),
    });
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
      root.render(<PdfToolbarHarness file={file} />);
    });

    const input = container.querySelector('input[aria-label="Page number"]') as HTMLInputElement | null;
    const jumpButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Jump to page 4'),
    );

    expect(input).toBeTruthy();
    expect(jumpButton).toBeTruthy();

    await act(async () => {
      input!.focus();
      const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
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

  it('resets to the first page when a new keyed file is mounted', async () => {
    await act(async () => {
      root.render(<PdfToolbarHarness file={file} />);
    });

    const jumpButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Jump to page 4'),
    );

    expect(jumpButton).toBeTruthy();

    await act(async () => {
      jumpButton!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    let input = container.querySelector('input[aria-label="Page number"]') as HTMLInputElement | null;
    expect(input?.value).toBe('4');

    await act(async () => {
      root.render(<PdfToolbarHarness file={secondFile} />);
    });

    input = container.querySelector('input[aria-label="Page number"]') as HTMLInputElement | null;
    expect(input?.value).toBe('1');
  });
});
