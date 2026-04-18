import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { MessageFiles } from './MessageFiles';
import type { UploadedFile } from '../../../types';

const createImageFile = (id: string, name: string): UploadedFile => ({
  id,
  name,
  type: 'image/png',
  size: 1024,
  dataUrl: `data:image/png;base64,${id}`,
  uploadState: 'active',
});

describe('MessageFiles', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    document.body.innerHTML = '';
  });

  it('renders non-quad multi-image rows as fixed-height cover thumbnails', () => {
    act(() => {
      root.render(
        <MessageFiles
          files={[
            createImageFile('image-1', 'first.png'),
            createImageFile('image-2', 'second.png'),
          ]}
          onImageClick={() => {}}
          messageId="message-1"
          hasContentOrAudio={false}
        />,
      );
    });

    const heightLockedItems = container.querySelectorAll('.h-40');
    const images = Array.from(container.querySelectorAll('img'));

    expect(heightLockedItems).toHaveLength(2);
    expect(images).toHaveLength(2);
    expect(images.every((image) => image.className.includes('object-cover'))).toBe(true);
  });

  it('hides generated files in the top attachment strip when tool results render them inline', () => {
    act(() => {
      root.render(
        <MessageFiles
          files={[
            createImageFile('generated-1', 'generated-image-1.png'),
            createImageFile('plain-1', 'plain-image.png'),
          ]}
          content={'<div class="tool-result outcome-ok">done</div>'}
          onImageClick={() => {}}
          messageId="message-2"
          hasContentOrAudio
        />,
      );
    });

    const images = Array.from(container.querySelectorAll('img'));
    const sources = images.map((image) => image.getAttribute('src'));

    expect(images).toHaveLength(1);
    expect(sources).toEqual(['data:image/png;base64,plain-1']);
  });
});
