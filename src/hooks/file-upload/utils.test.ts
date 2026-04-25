import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_APP_SETTINGS } from '../../constants/appConstants';
import type { AppSettings } from '../../types';
import {
  buildFileUploadPreflight,
  checkBatchNeedsApiKey,
  getEffectiveMimeType,
  getFilesRequiringFileApi,
  shouldUseFileApi,
} from './utils';

vi.mock('../../utils/appUtils', () => ({
  isTextFile: (file: { name: string; type: string }) => {
    const lowerName = file.name.toLowerCase();
    return (
      file.type.startsWith('text/') ||
      file.type === 'application/json' ||
      file.type === 'application/xml' ||
      file.type === 'application/yaml' ||
      file.type === 'text/x-python' ||
      lowerName.endsWith('.txt') ||
      lowerName.endsWith('.csv') ||
      lowerName.endsWith('.py') ||
      lowerName.endsWith('.json') ||
      lowerName.endsWith('.xml') ||
      lowerName.endsWith('.yaml') ||
      lowerName.endsWith('.yml')
    );
  },
}));

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
  it('preserves specific text MIME types for structured text files', () => {
    const file = createFile('dataset.csv', 'text/csv', 1024);

    expect(getEffectiveMimeType(file)).toBe('text/csv');
  });

  it('infers a specific MIME type from text-based file extensions when the browser omits it', () => {
    const file = createFile('script.py', '', 1024);

    expect(getEffectiveMimeType(file)).toBe('text/x-python');
  });

  it('forces text/code files onto the Files API earlier when server-side code execution is enabled', () => {
    const settings = makeSettings({
      isCodeExecutionEnabled: true,
      isLocalPythonEnabled: false,
    });
    const file = createFile('dataset.csv', 'text/csv', 3 * 1024 * 1024);

    expect(shouldUseFileApi(file, settings)).toBe(true);
  });

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

  it('forces binary files onto the Files API when base64 expansion pushes the inline payload past 100MB', () => {
    const settings = makeSettings();
    const file = createFile('clip.mp4', 'video/mp4', 76 * 1024 * 1024);

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

  it('promotes an inline batch when encoded payload size exceeds 100MB even if raw bytes do not', () => {
    const settings = makeSettings();
    const first = createFile('frame-1.png', 'image/png', 38 * 1024 * 1024);
    const second = createFile('frame-2.png', 'image/png', 38 * 1024 * 1024);

    const filesRequiringApi = getFilesRequiringFileApi([first, second], settings);

    expect(filesRequiringApi.has(first)).toBe(true);
    expect(filesRequiringApi.has(second)).toBe(true);
    expect(checkBatchNeedsApiKey([first, second], settings)).toBe(true);
  });
});

describe('buildFileUploadPreflight', () => {
  it('skips duplicate incoming files while preserving the first occurrence', () => {
    const settings = makeSettings();
    const existingFile = {
      id: 'existing',
      name: 'report.pdf',
      type: 'application/pdf',
      size: 1024,
    };
    const duplicateOfExisting = createFile('report.pdf', 'application/pdf', 1024);
    const duplicateOne = createFile('photo.png', 'image/png', 2048);
    const duplicateTwo = createFile('photo.png', 'image/png', 2048);

    const result = buildFileUploadPreflight([duplicateOfExisting, duplicateOne, duplicateTwo], settings, [
      existingFile,
    ]);

    expect(result.filesToUpload).toEqual([duplicateOne]);
    expect(result.notice).toContain('Skipped duplicate files: report.pdf, photo.png');
  });

  it('surfaces unsupported file types before upload starts', () => {
    const settings = makeSettings();
    const unsupported = createFile('archive.rar', 'application/vnd.rar', 4096);

    const result = buildFileUploadPreflight([unsupported], settings, []);

    expect(result.filesToUpload).toEqual([unsupported]);
    expect(result.notice).toContain('Unsupported file types: archive.rar');
  });
});
