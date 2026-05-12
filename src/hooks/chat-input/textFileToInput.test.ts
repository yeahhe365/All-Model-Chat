import { afterEach, describe, expect, it, vi } from 'vitest';

import type { UploadedFile } from '@/types';
import { readUploadedTextFileContent } from './textFileToInput';

const createUploadedFile = (overrides: Partial<UploadedFile> = {}): UploadedFile => ({
  id: 'file-1',
  name: 'notes.txt',
  type: 'text/plain',
  size: 12,
  uploadState: 'active',
  ...overrides,
});

describe('readUploadedTextFileContent', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('prefers preloaded text content over other sources', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    const content = await readUploadedTextFileContent(
      createUploadedFile({
        textContent: 'from text content',
        rawFile: new File(['from raw file'], 'notes.txt', { type: 'text/plain' }),
        dataUrl: 'blob:notes',
      }),
    );

    expect(content).toBe('from text content');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('falls back to the raw file when textContent is missing', async () => {
    const content = await readUploadedTextFileContent(
      createUploadedFile({
        rawFile: new File(['from raw file'], 'notes.txt', { type: 'text/plain' }),
      }),
    );

    expect(content).toBe('from raw file');
  });

  it('falls back to fetching the data URL when no other text source is available', async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      text: vi.fn().mockResolvedValue('from data url'),
    });
    vi.stubGlobal('fetch', fetchSpy);

    const content = await readUploadedTextFileContent(
      createUploadedFile({
        dataUrl: 'blob:notes',
      }),
    );

    expect(content).toBe('from data url');
    expect(fetchSpy).toHaveBeenCalledWith('blob:notes');
  });

  it('rejects when the uploaded file has no readable text source', async () => {
    await expect(
      readUploadedTextFileContent(
        createUploadedFile({
          textContent: undefined,
          rawFile: undefined,
          dataUrl: undefined,
        }),
      ),
    ).rejects.toThrow('No readable text content available');
  });
});
