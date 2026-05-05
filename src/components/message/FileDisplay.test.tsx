import { act } from 'react';
import { setupTestRenderer } from '@/test/testUtils';
import { describe, expect, it } from 'vitest';
import { FileDisplay } from './FileDisplay';
import { createUploadedFile } from '../../test/factories';

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
});
