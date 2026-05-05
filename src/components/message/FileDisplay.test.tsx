import { act } from 'react';
import { createTestRenderer, type TestRenderer } from '@/test/testUtils';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { FileDisplay } from './FileDisplay';
import type { UploadedFile } from '../../types';

const createImageFile = (overrides: Partial<UploadedFile> = {}): UploadedFile => ({
  id: 'image-1',
  name: 'portrait.png',
  type: 'image/png',
  size: 1024,
  dataUrl: 'data:image/png;base64,ZmFrZQ==',
  uploadState: 'active',
  ...overrides,
});

describe('FileDisplay', () => {
  let container: HTMLDivElement;
  let root: TestRenderer;

  beforeEach(() => {
    root = createTestRenderer();
    container = root.container;
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
  });

  it('uses a tighter max height for standalone message images', () => {
    act(() => {
      root.render(<FileDisplay file={createImageFile()} onFileClick={() => {}} isFromMessageList />);
    });

    const image = container.querySelector('img');

    expect(image).not.toBeNull();
    expect(image).toHaveClass('max-h-56');
    expect(image).toHaveClass('object-contain');
  });
});
