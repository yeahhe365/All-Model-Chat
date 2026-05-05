import React from 'react';
import { act } from 'react';
import { setupTestRenderer } from '@/test/testUtils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PdfSidebar } from './PdfSidebar';

const pageRenderSpy = vi.fn(({ pageNumber }: { pageNumber: number }) => (
  <div data-testid={`pdf-thumbnail-${pageNumber}`}>Thumbnail {pageNumber}</div>
));

vi.mock('react-pdf', () => ({
  Document: ({ children }: { children: React.ReactNode }) => <div data-testid="pdf-document">{children}</div>,
  Page: (props: { pageNumber: number }) => pageRenderSpy(props),
}));

describe('PdfSidebar', () => {
  const renderer = setupTestRenderer();

  beforeEach(() => {
    pageRenderSpy.mockClear();
  });

  it('only renders thumbnails near the current page', () => {
    act(() => {
      renderer.root.render(
        <PdfSidebar
          fileUrl="blob:test-pdf"
          numPages={20}
          currentPage={10}
          showSidebar
          onPageClick={() => {}}
          sidebarRef={{ current: null }}
        />,
      );
    });

    expect(pageRenderSpy).toHaveBeenCalledTimes(11);
    expect(pageRenderSpy.mock.calls.map(([props]) => props.pageNumber)).toEqual([
      5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15,
    ]);
  });
});
