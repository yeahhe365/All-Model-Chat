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
        <QueuedSubmissionCard title="queued" previewText="preview" fileCount={2} onEdit={vi.fn()} onRemove={vi.fn()} />,
      );
    });

    expect(container.textContent).toContain('2 queuedSubmission_attachments');
    expect(container.querySelector('button[aria-label="queuedSubmission_edit"]')).not.toBeNull();
    expect(container.querySelector('button[aria-label="queuedSubmission_remove"]')).not.toBeNull();
  });

  it('uses the compact composer-strip presentation for queued drafts', async () => {
    await act(async () => {
      root.render(
        <QueuedSubmissionCard
          title="queued"
          previewText="阿斯顿发大水"
          fileCount={0}
          onEdit={vi.fn()}
          onRemove={vi.fn()}
        />,
      );
    });

    const strip = container.querySelector('[data-queued-submission-card="composer-strip"]');
    const preview = container.querySelector('[data-testid="queued-submission-preview"]');
    const editButton = container.querySelector<HTMLButtonElement>('button[aria-label="queuedSubmission_edit"]');

    expect(strip).not.toBeNull();
    expect(strip?.className).toContain('min-h-14');
    expect(strip?.className).toContain('pb-4');
    expect(preview?.className).toContain('truncate');
    expect(preview?.textContent).toBe('阿斯顿发大水');
    expect(editButton?.textContent).toContain('queuedSubmission_action');
  });
});
