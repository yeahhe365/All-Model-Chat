import { act, type FormEvent } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createChatSettings } from '@/test/factories';
import { renderHook } from '@/test/testUtils';
import { useChatInputSubmission } from './useChatInputSubmission';

const createSubmissionParams = () => {
  const textarea = document.createElement('textarea');

  return {
    activeSessionId: 'session-1',
    currentChatSettings: createChatSettings(),
    selectedFiles: [],
    setSelectedFiles: vi.fn(),
    setAppFileError: vi.fn(),
    uploadFailureMessage: 'Attachment upload failed.',
    isLoading: false,
    isEditing: false,
    editMode: 'resend',
    editingMessageId: null,
    canSend: true,
    canQueueMessageBase: true,
    submissionState: {
      inputText: 'Hello',
      quotes: [],
      ttsContext: '',
      isFullscreen: false,
      clearCurrentDraft: vi.fn(),
      setInputText: vi.fn(),
      setQuotes: vi.fn(),
      setWaitingForUpload: vi.fn(),
      startSendAnimation: vi.fn(),
      stopSendAnimation: vi.fn(),
      exitFullscreen: vi.fn(),
      textareaRef: { current: textarea },
    },
    isNativeAudioModel: false,
    liveAPI: {
      isConnected: false,
      connect: vi.fn(async () => true),
      sendText: vi.fn(async () => true),
      sendContent: vi.fn(async () => true),
    },
    onUpdateMessageContent: vi.fn(),
    setEditingMessageId: vi.fn(),
    onMessageSent: vi.fn(),
    onAddUserMessage: vi.fn(),
    onSendMessage: vi.fn(),
  } satisfies Parameters<typeof useChatInputSubmission>[0];
};

describe('useChatInputSubmission', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('clears the send animation timer when the composer unmounts', () => {
    vi.useFakeTimers();
    const params = createSubmissionParams();
    const { result, unmount } = renderHook(() => useChatInputSubmission(params));

    act(() => {
      result.current.handleSubmit({ preventDefault: vi.fn() } as unknown as FormEvent);
    });

    expect(params.submissionState.startSendAnimation).toHaveBeenCalledTimes(1);

    unmount();

    act(() => {
      vi.advanceTimersByTime(400);
    });

    expect(params.submissionState.stopSendAnimation).not.toHaveBeenCalled();
  });
});
