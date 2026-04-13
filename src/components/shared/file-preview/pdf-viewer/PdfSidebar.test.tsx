import React from 'react';
import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PdfSidebar } from './PdfSidebar';

const pageRenderSpy = vi.fn(({ pageNumber }: { pageNumber: number }) => (
  <div data-testid={`pdf-thumbnail-${pageNumber}`}>Thumbnail {pageNumber}</div>
));

vi.mock('react-pdf', () => ({
  Document: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="pdf-document">{children}</div>
  ),
  Page: (props: { pageNumber: number }) => pageRenderSpy(props),
}));

describe('PdfSidebar', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    pageRenderSpy.mockClear();
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it('only renders thumbnails near the current page', () => {
    act(() => {
      root.render(
        <PdfSidebar
          fileUrl="blob:test-pdf"
          numPages={20}
          currentPage={10}
          showSidebar
          onPageClick={() => {}}
          sidebarRef={{ current: null }}
        />
      );
    });

    expect(pageRenderSpy).toHaveBeenCalledTimes(11);
    expect(pageRenderSpy.mock.calls.map(([props]) => props.pageNumber)).toEqual([
      5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15,
    ]);
  });
});
