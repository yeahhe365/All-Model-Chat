import { describe, expect, it } from 'vitest';
import type { UploadedFile } from '../../types';
import { buildPendingChatInputSubmission, shouldFlushPendingSubmission } from './pendingSubmissionUtils';

const makeFile = (overrides: Partial<UploadedFile> = {}): UploadedFile => ({
  id: 'file-1',
  name: 'file.png',
  type: 'image/png',
  size: 100,
  uploadState: 'active',
  ...overrides,
});

describe('buildPendingChatInputSubmission', () => {
  it('captures a send snapshot with formatted text and fast mode', () => {
    expect(
      buildPendingChatInputSubmission({
        inputText: 'Explain this image.',
        quotes: ['first line'],
        modelId: 'gemini-3.1-pro-preview',
        isEditing: false,
        editMode: 'resend',
        editingMessageId: null,
        isFastMode: true,
      }),
    ).toEqual({
      kind: 'send',
      textToSend: '> first line\n\nExplain this image.',
      isFastMode: true,
    });
  });

  it('captures an edit snapshot instead of a send snapshot for update mode', () => {
    expect(
      buildPendingChatInputSubmission({
        inputText: 'Revised content',
        quotes: [],
        modelId: 'gemini-3.1-pro-preview',
        isEditing: true,
        editMode: 'update',
        editingMessageId: 'message-1',
        isFastMode: false,
      }),
    ).toEqual({
      kind: 'edit',
      messageId: 'message-1',
      content: 'Revised content',
    });
  });
});

describe('shouldFlushPendingSubmission', () => {
  it('flushes only when a pending submission exists and processing transitions to ready', () => {
    expect(
      shouldFlushPendingSubmission({
        pendingSubmission: {
          kind: 'send',
          textToSend: 'hello',
          isFastMode: false,
        },
        previousFiles: [makeFile({ id: 'processing', isProcessing: true })],
        currentFiles: [makeFile({ id: 'processing', isProcessing: false })],
      }),
    ).toBe(true);
  });

  it('does not flush while any file is still processing', () => {
    expect(
      shouldFlushPendingSubmission({
        pendingSubmission: {
          kind: 'send',
          textToSend: 'hello',
          isFastMode: false,
        },
        previousFiles: [makeFile({ id: 'processing', isProcessing: true })],
        currentFiles: [makeFile({ id: 'processing', isProcessing: true })],
      }),
    ).toBe(false);
  });

  it('does not flush without a pending submission marker', () => {
    expect(
      shouldFlushPendingSubmission({
        pendingSubmission: null,
        previousFiles: [makeFile({ id: 'processing', isProcessing: true })],
        currentFiles: [makeFile({ id: 'processing', isProcessing: false })],
      }),
    ).toBe(false);
  });
});
