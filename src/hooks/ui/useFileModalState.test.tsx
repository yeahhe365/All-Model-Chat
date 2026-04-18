import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { UploadedFile } from '../../types';
import { useFileModalState } from './useFileModalState';

const renderHook = <T,>(callback: () => T) => {
  const container = document.createElement('div');
  const root = createRoot(container);
  const result: { current: T | null } = { current: null };

  const TestComponent = () => {
    result.current = callback();
    return null;
  };

  act(() => {
    root.render(<TestComponent />);
  });

  return {
    result: result as { current: T },
    unmount: () => {
      act(() => {
        root.unmount();
      });
    },
  };
};

const files: UploadedFile[] = [
  {
    id: 'file-1',
    name: 'preview.png',
    type: 'image/png',
    size: 1,
    uploadState: 'active',
  },
];

describe('useFileModalState', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

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
