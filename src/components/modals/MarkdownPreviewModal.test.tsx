import { act } from 'react';
import { setupProviderTestRenderer } from '@/test/providerTestUtils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createUploadedFile } from '@/test/factories';

const { mockMarkdownFileViewer, mockSettingsState } = vi.hoisted(() => ({
  mockMarkdownFileViewer: vi.fn(
    ({
      content,
      isEditable,
      onChange,
    }: {
      content?: string | null;
      isEditable?: boolean;
      onChange?: (value: string) => void;
    }) => (
      <div data-testid="markdown-file-viewer" data-editable={String(isEditable)}>
        <span data-testid="viewer-content">{content ?? 'loaded markdown'}</span>
        {isEditable && (
          <button type="button" onClick={() => onChange?.('changed markdown')}>
            change content
          </button>
        )}
      </div>
    ),
  ),
  mockSettingsState: {
    language: 'en',
    currentTheme: { id: 'pearl' },
  },
}));

vi.mock('@/stores/settingsStore', () => ({
  useSettingsStore: (selector: (state: typeof mockSettingsState) => unknown) => selector(mockSettingsState),
}));

vi.mock('@/components/shared/Modal', () => ({
  Modal: ({ children }: { children: React.ReactNode }) => <div data-testid="modal-shell">{children}</div>,
}));

vi.mock('@/components/shared/file-preview/MarkdownFileViewer', () => ({
  MarkdownFileViewer: mockMarkdownFileViewer,
}));

vi.mock('@/utils/export/core', () => ({
  triggerDownload: vi.fn(),
}));

import { MarkdownPreviewModal } from './MarkdownPreviewModal';

describe('MarkdownPreviewModal', () => {
  const renderer = setupProviderTestRenderer();
  let confirmSpy: ReturnType<typeof vi.spyOn>;

  const createMarkdownFile = () =>
    createUploadedFile({
      id: 'md-1',
      name: 'notes.md',
      type: 'text/markdown',
      size: 128,
      textContent: '# Original',
    });

  beforeEach(() => {
    vi.clearAllMocks();
    confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
  });

  afterEach(() => {
    confirmSpy.mockRestore();
  });

  it('asks before discarding unsaved markdown edits when cancelling edit mode', () => {
    const onClose = vi.fn();

    act(() => {
      renderer.root.render(
        <MarkdownPreviewModal file={createMarkdownFile()} onClose={onClose} onSaveText={vi.fn()} initialEditMode />,
      );
    });

    const changeButton = Array.from(renderer.container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('change content'),
    );
    expect(changeButton).toBeDefined();

    act(() => {
      changeButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    const closeButton = Array.from(renderer.container.querySelectorAll('button')).find(
      (button) => button.getAttribute('title') === 'Cancel Edit',
    );
    expect(closeButton).toBeDefined();

    act(() => {
      closeButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(confirmSpy).toHaveBeenCalledTimes(1);
    expect(mockMarkdownFileViewer).toHaveBeenLastCalledWith(
      expect.objectContaining({ isEditable: true, content: 'changed markdown' }),
      expect.anything(),
    );
    expect(onClose).not.toHaveBeenCalled();

    confirmSpy.mockReturnValue(true);

    act(() => {
      closeButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(mockMarkdownFileViewer).toHaveBeenLastCalledWith(
      expect.objectContaining({ isEditable: false }),
      expect.anything(),
    );
  });
});
