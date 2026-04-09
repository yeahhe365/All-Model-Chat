import { describe, expect, it } from 'vitest';
import {
  getFileApiUploadDecisions,
  shouldUseFileApi,
} from '../utils';

const baseAppSettings = {
  filesApiConfig: {
    images: false,
    pdfs: false,
    audio: false,
    video: false,
    text: false,
  },
};

describe('shouldUseFileApi', () => {
  it('uses Files API when the user explicitly enables it for images', () => {
    const file = new File(['img'], 'image.png', { type: 'image/png' });
    const appSettings = {
      ...baseAppSettings,
      filesApiConfig: { ...baseAppSettings.filesApiConfig, images: true },
    };

    expect(shouldUseFileApi(file, appSettings as any)).toBe(true);
  });

  it('forces Files API for oversized PDFs even if the toggle is off', () => {
    const file = new File(['pdf'], 'large.pdf', { type: 'application/pdf' });
    Object.defineProperty(file, 'size', { value: 51 * 1024 * 1024 });

    expect(shouldUseFileApi(file, baseAppSettings as any)).toBe(true);
  });
});

describe('getFileApiUploadDecisions', () => {
  it('forces batch uploads to Files API when combined inline payload exceeds 100MB', () => {
    const first = new File(['a'], 'video-1.mp4', { type: 'video/mp4' });
    const second = new File(['b'], 'video-2.mp4', { type: 'video/mp4' });

    Object.defineProperty(first, 'size', { value: 60 * 1024 * 1024 });
    Object.defineProperty(second, 'size', { value: 60 * 1024 * 1024 });

    expect(getFileApiUploadDecisions([first, second], baseAppSettings as any)).toEqual([true, true]);
  });
});
