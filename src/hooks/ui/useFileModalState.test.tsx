import { act } from 'react';
import { describe, expect, it } from 'vitest';
import { createUploadedFile } from '@/test/factories';
import { useFileModalState } from './useFileModalState';
import { renderHook } from '@/test/testUtils';

const files = [
  createUploadedFile({
    name: 'preview.png',
    size: 1,
  }),
];

describe('useFileModalState', () => {
  it('tracks preview state and resets editability when the preview closes', () => {
    const { result, unmount } = renderHook(() => useFileModalState<string>(files));

    act(() => {
      result.current.openPreview(files[0], { editable: true });
    });

    expect(result.current.previewFile).toBe(files[0]);
    expect(result.current.isPreviewEditable).toBe(true);

    act(() => {
      result.current.closePreview();
    });

    expect(result.current.previewFile).toBeNull();
    expect(result.current.isPreviewEditable).toBe(false);

    unmount();
  });

  it('tracks configuration payloads separately from preview state', () => {
    const { result, unmount } = renderHook(() =>
      useFileModalState<{ fileId: string; source: 'chat' | 'message' }>(files),
    );

    act(() => {
      result.current.openConfiguration({ fileId: 'file-1', source: 'message' });
    });

    expect(result.current.configuringFile).toEqual({ fileId: 'file-1', source: 'message' });

    act(() => {
      result.current.closeConfiguration();
    });

    expect(result.current.configuringFile).toBeNull();

    unmount();
  });
});
