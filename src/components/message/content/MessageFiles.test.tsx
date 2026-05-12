import { act } from 'react';
import { setupTestRenderer } from '@/test/testUtils';
import { describe, expect, it } from 'vitest';
import { MessageFiles } from './MessageFiles';
import { createUploadedFile } from '@/test/factories';

const createImageFile = (id: string, name: string) =>
  createUploadedFile({
    id,
    name,
    size: 1024,
    dataUrl: `data:image/png;base64,${id}`,
  });

describe('MessageFiles', () => {
  const renderer = setupTestRenderer();

  it('renders non-quad multi-image rows as fixed-height cover thumbnails', () => {
    act(() => {
      renderer.root.render(
        <MessageFiles
          files={[createImageFile('image-1', 'first.png'), createImageFile('image-2', 'second.png')]}
          onImageClick={() => {}}
          messageId="message-1"
          hasContentOrAudio={false}
        />,
      );
    });

    const heightLockedItems = renderer.container.querySelectorAll('.h-40');
    const images = Array.from(renderer.container.querySelectorAll('img'));

    expect(heightLockedItems).toHaveLength(2);
    expect(images).toHaveLength(2);
    expect(images.every((image) => image.className.includes('object-cover'))).toBe(true);
  });

  it('hides generated files in the top attachment strip when tool results render them inline', () => {
    act(() => {
      renderer.root.render(
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

    const images = Array.from(renderer.container.querySelectorAll('img'));
    const sources = images.map((image) => image.getAttribute('src'));

    expect(images).toHaveLength(1);
    expect(sources).toEqual(['data:image/png;base64,plain-1']);
  });
});
