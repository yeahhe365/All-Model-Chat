import { act } from 'react';
import { setupProviderTestRenderer } from '@/test/providerTestUtils';
import { describe, expect, it, vi } from 'vitest';
import { QueuedSubmissionCard } from './QueuedSubmissionCard';

describe('QueuedSubmissionCard', () => {
  const renderer = setupProviderTestRenderer({ providers: { language: 'en' } });

  it('localizes attachment counts and action labels', async () => {
    await act(async () => {
      renderer.root.render(
        <QueuedSubmissionCard title="queued" previewText="preview" fileCount={2} onEdit={vi.fn()} onRemove={vi.fn()} />,
      );
    });

    expect(renderer.container.textContent).toContain('2 attachments');
    expect(renderer.container.querySelector('button[aria-label="Edit queued message"]')).not.toBeNull();
    expect(renderer.container.querySelector('button[aria-label="Remove queued message"]')).not.toBeNull();
  });

  it('uses the compact composer-strip presentation for queued drafts', async () => {
    await act(async () => {
      renderer.root.render(
        <QueuedSubmissionCard
          title="queued"
          previewText="阿斯顿发大水"
          fileCount={0}
          onEdit={vi.fn()}
          onRemove={vi.fn()}
        />,
      );
    });

    const strip = renderer.container.querySelector('[data-queued-submission-card="composer-strip"]');
    const preview = renderer.container.querySelector('[data-testid="queued-submission-preview"]');
    const editButton = renderer.container.querySelector<HTMLButtonElement>('button[aria-label="Edit queued message"]');

    expect(strip).not.toBeNull();
    expect(strip?.className).toContain('min-h-14');
    expect(strip?.className).toContain('pb-4');
    expect(preview?.className).toContain('truncate');
    expect(preview?.textContent).toBe('阿斯顿发大水');
    expect(editButton?.textContent).toContain('Edit');
  });
});
