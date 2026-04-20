import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueuedSubmissionCard } from './QueuedSubmissionCard';

vi.mock('../../../contexts/I18nContext', () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}));

describe('QueuedSubmissionCard', () => {
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

  it('localizes attachment counts and action labels', async () => {
    await act(async () => {
      root.render(
        <QueuedSubmissionCard
          title="queued"
          previewText="preview"
          fileCount={2}
          onEdit={vi.fn()}
          onRemove={vi.fn()}
        />,
      );
    });

    expect(container.textContent).toContain('2 queuedSubmission_attachments');
    expect(container.querySelector('button[aria-label="queuedSubmission_edit"]')).not.toBeNull();
    expect(container.querySelector('button[aria-label="queuedSubmission_remove"]')).not.toBeNull();
  });
});
