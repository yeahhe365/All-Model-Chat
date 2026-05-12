import { act } from 'react';
import type { ReactNode } from 'react';
import { setupTestRenderer } from '@/test/testUtils';
import { describe, expect, it, vi } from 'vitest';
import { FileDisplay } from './FileDisplay';
import { createUploadedFile } from '@/test/factories';

vi.mock('react-pdf', () => ({
  Document: ({ children }: { children: ReactNode }) => <div data-testid="mock-pdf-document">{children}</div>,
  Page: ({ pageNumber }: { pageNumber: number }) => (
    <div data-testid="mock-pdf-page" data-page-number={pageNumber}>
      PDF page {pageNumber}
    </div>
  ),
  pdfjs: {
    GlobalWorkerOptions: {
      workerSrc: 'pdf.worker.mjs',
    },
  },
}));

const createImageFile = () =>
  createUploadedFile({
    id: 'image-1',
    name: 'portrait.png',
    size: 1024,
    dataUrl: 'data:image/png;base64,ZmFrZQ==',
  });

describe('FileDisplay', () => {
  const renderer = setupTestRenderer();

  it('uses a tighter max height for standalone message images', () => {
    act(() => {
      renderer.root.render(<FileDisplay file={createImageFile()} onFileClick={() => {}} isFromMessageList />);
    });

    const image = renderer.container.querySelector('img');

    expect(image).not.toBeNull();
    expect(image).toHaveClass('max-h-56');
    expect(image).toHaveClass('object-contain');
  });

  it('renders a PDF thumbnail in message file cards', async () => {
    await act(async () => {
      renderer.root.render(
        <FileDisplay
          file={createUploadedFile({
            id: 'pdf-1',
            name: 'paper.pdf',
            type: 'application/pdf',
            size: 2048,
            dataUrl: 'blob:paper',
          })}
          onFileClick={() => {}}
          isFromMessageList
        />,
      );
    });

    expect(renderer.container.querySelector('[data-thumbnail-kind="pdf"]')).not.toBeNull();
    await vi.waitFor(() => {
      expect(renderer.container.querySelector('[data-testid="mock-pdf-page"]')).not.toBeNull();
    });
  });

  it('renders a video thumbnail in message file cards', () => {
    act(() => {
      renderer.root.render(
        <FileDisplay
          file={createUploadedFile({
            id: 'video-1',
            name: 'clip.mp4',
            type: 'video/mp4',
            size: 4096,
            dataUrl: 'blob:clip',
          })}
          onFileClick={() => {}}
          isFromMessageList
        />,
      );
    });

    expect(renderer.container.querySelector('[data-thumbnail-kind="video"]')).not.toBeNull();
    expect(renderer.container.querySelector('video')).not.toBeNull();
  });
});
