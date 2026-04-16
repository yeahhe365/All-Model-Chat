import { describe, expect, it } from 'vitest';
import {
  buildChatExportFilename,
  buildMessageExportFilenameBase,
  createExportDateMeta,
} from './runtime';

describe('export runtime helpers', () => {
  it('builds session-aware message export filenames', () => {
    expect(
      buildMessageExportFilenameBase({
        messageId: 'message-abcdef',
        markdownContent: 'ignored',
        sessionTitle: 'Roadmap / Notes',
        messageIndex: 2,
      }),
    ).toBe('Roadmap _ Notes_msg_3');
  });

  it('falls back to message content when a session title is not available', () => {
    expect(
      buildMessageExportFilenameBase({
        messageId: 'message-123456',
        markdownContent: 'Hello, export world!',
      }),
    ).toBe('Hello_export_world-123456');
  });

  it('creates stable chat export metadata for filenames and headers', () => {
    const date = new Date('2026-04-16T12:34:56.000Z');

    expect(createExportDateMeta(date)).toEqual({
      dateStr: `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`,
      isoDate: '2026-04-16',
    });

    expect(
      buildChatExportFilename({
        title: 'Weekly Review',
        format: 'html',
        date,
      }),
    ).toBe('chat-Weekly Review-2026-04-16.html');
  });
});
