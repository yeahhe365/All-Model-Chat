import { describe, expect, it } from 'vitest';
import { DEFAULT_APP_SETTINGS } from '../../constants/appConstants';
import type { AppSettings } from '../../types';
import {
  checkBatchNeedsApiKey,
  getFilesRequiringFileApi,
  shouldUseFileApi,
} from './utils';

const createFile = (name: string, type: string, size: number) => {
  const file = new File(['x'], name, { type });
  Object.defineProperty(file, 'size', { configurable: true, value: size });
  return file;
};

const makeSettings = (overrides?: Partial<AppSettings>): AppSettings => ({
  ...DEFAULT_APP_SETTINGS,
  filesApiConfig: {
    images: false,
    pdfs: false,
    audio: false,
    video: false,
    text: false,
  },
  ...overrides,
});

describe('file upload strategy limits', () => {
  it('forces oversized PDFs onto the Files API even when inline is preferred', () => {
    const settings = makeSettings();
    const file = createFile('report.pdf', 'application/pdf', 51 * 1024 * 1024);

    expect(shouldUseFileApi(file, settings)).toBe(true);
  });

  it('forces oversized non-PDF payloads onto the Files API even when inline is preferred', () => {
    const settings = makeSettings();
    const file = createFile('clip.mp4', 'video/mp4', 101 * 1024 * 1024);

    expect(shouldUseFileApi(file, settings)).toBe(true);
  });

  it('promotes an inline batch to the Files API when the combined payload exceeds 100MB', () => {
    const settings = makeSettings();
    const first = createFile('frame-1.png', 'image/png', 60 * 1024 * 1024);
    const second = createFile('frame-2.png', 'image/png', 45 * 1024 * 1024);

    const filesRequiringApi = getFilesRequiringFileApi([first, second], settings);

    expect(filesRequiringApi.has(first)).toBe(true);
    expect(filesRequiringApi.has(second)).toBe(true);
    expect(checkBatchNeedsApiKey([first, second], settings)).toBe(true);
  });
});
