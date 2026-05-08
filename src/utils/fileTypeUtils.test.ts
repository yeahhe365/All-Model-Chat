import { describe, expect, it } from 'vitest';
import {
  getFileKindFlags,
  getFileTypeCategory,
  isAudioMimeType,
  isImageMimeType,
  isMarkdownFile,
  isTextFile,
  isVideoMimeType,
} from './fileTypeUtils';

describe('fileTypeUtils', () => {
  it('classifies MIME families from one shared helper surface', () => {
    expect(isImageMimeType('image/png')).toBe(true);
    expect(isImageMimeType('image/svg+xml')).toBe(true);
    expect(isAudioMimeType('audio/mpeg')).toBe(true);
    expect(isVideoMimeType('video/mp4')).toBe(true);
    expect(getFileKindFlags({ name: 'youtube.url', type: 'video/youtube-link' }).isYoutube).toBe(true);
    expect(getFileKindFlags({ name: 'report.pdf', type: '' }).isPdf).toBe(true);
  });

  it('uses the same media flags for inline-data eligibility', () => {
    expect(getFileKindFlags({ type: 'image/webp' }).isInlineData).toBe(true);
    expect(getFileKindFlags({ type: 'audio/wav' }).isInlineData).toBe(true);
    expect(getFileKindFlags({ type: 'video/webm' }).isInlineData).toBe(true);
    expect(getFileKindFlags({ type: 'application/pdf' }).isInlineData).toBe(true);
    expect(getFileKindFlags({ type: 'application/vnd.ms-excel' }).isInlineData).toBe(false);
  });

  it('returns reusable kind flags that components can consume without parsing MIME strings', () => {
    const flags = getFileKindFlags({ name: 'diagram.svg', type: 'image/svg+xml' });

    expect(flags).toMatchObject({
      category: 'image',
      isImage: true,
      isAudio: false,
      isVideo: false,
      isYoutube: false,
      isPdf: false,
      isInlineData: true,
    });
  });

  it('keeps getFileTypeCategory compatible with existing UI categories', () => {
    expect(getFileTypeCategory('video/youtube-link')).toBe('youtube');
    expect(getFileTypeCategory('application/pdf')).toBe('pdf');
    expect(getFileTypeCategory('text/plain')).toBe('code');
    expect(getFileTypeCategory('image/png', 'upload failed')).toBe('error');
  });

  it('classifies text and Markdown files from the same helper surface', () => {
    expect(isTextFile({ name: 'notes.md', type: '' })).toBe(true);
    expect(isTextFile({ name: 'config.json', type: 'application/json' })).toBe(true);
    expect(isTextFile({ name: 'photo.png', type: 'image/png' })).toBe(false);
    expect(isMarkdownFile({ name: 'README.markdown', type: '' })).toBe(true);
    expect(isMarkdownFile({ name: 'README.txt', type: 'text/plain' })).toBe(false);
  });

  it('does not treat extension-like filenames without dots as file extensions', () => {
    expect(isTextFile({ name: 'sql', type: '' })).toBe(false);
    expect(isMarkdownFile({ name: 'markdown', type: '' })).toBe(false);
  });
});
