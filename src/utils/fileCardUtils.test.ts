import { describe, expect, it } from 'vitest';
import { Edit3, Scissors, SlidersHorizontal } from 'lucide-react';
import type { UploadedFile } from '../types';
import { getFileCardMeta } from './fileCardUtils';

const createFile = (overrides: Partial<UploadedFile> = {}): UploadedFile => ({
  id: 'file-1',
  name: 'file.txt',
  type: 'text/plain',
  size: 128,
  uploadState: 'active',
  isProcessing: false,
  ...overrides,
});

describe('getFileCardMeta', () => {
  it('marks active text files as editable/configurable when text editing is allowed', () => {
    const meta = getFileCardMeta(createFile(), {
      isGemini3: false,
      includeTextEditing: true,
      requireActiveForConfigure: true,
      canConfigure: true,
    });

    expect(meta.isText).toBe(true);
    expect(meta.canConfigure).toBe(true);
    expect(meta.ConfigIcon).toBe(Edit3);
  });

  it('uses scissors for video configuration outside Gemini 3 mode', () => {
    const meta = getFileCardMeta(
      createFile({ type: 'video/mp4', name: 'clip.mp4' }),
      {
        isGemini3: false,
        includeTextEditing: false,
        requireActiveForConfigure: false,
        canConfigure: true,
      },
    );

    expect(meta.isVideo).toBe(true);
    expect(meta.canConfigure).toBe(true);
    expect(meta.ConfigIcon).toBe(Scissors);
  });

  it('uses sliders for image/pdf configuration in Gemini 3 mode', () => {
    const imageMeta = getFileCardMeta(
      createFile({ type: 'image/png', name: 'image.png' }),
      {
        isGemini3: true,
        includeTextEditing: false,
        requireActiveForConfigure: false,
        canConfigure: true,
      },
    );

    const pdfMeta = getFileCardMeta(
      createFile({ type: 'application/pdf', name: 'doc.pdf' }),
      {
        isGemini3: true,
        includeTextEditing: false,
        requireActiveForConfigure: false,
        canConfigure: true,
      },
    );

    expect(imageMeta.canConfigure).toBe(true);
    expect(imageMeta.ConfigIcon).toBe(SlidersHorizontal);
    expect(pdfMeta.canConfigure).toBe(true);
    expect(pdfMeta.ConfigIcon).toBe(SlidersHorizontal);
  });

  it('disables configuration when the file is not active and active state is required', () => {
    const meta = getFileCardMeta(
      createFile({ type: 'video/mp4', uploadState: 'uploading' }),
      {
        isGemini3: false,
        includeTextEditing: false,
        requireActiveForConfigure: true,
        canConfigure: true,
      },
    );

    expect(meta.canConfigure).toBe(false);
  });
});
