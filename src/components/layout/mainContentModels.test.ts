import { describe, expect, it, vi } from 'vitest';
import { buildChatAreaInputActions } from './mainContentModels';

describe('buildChatAreaInputActions', () => {
  it('preserves live client functions in the chat-area input actions model', () => {
    const liveClientFunctions = {
      run_local_python: {
        declaration: { name: 'run_local_python', description: 'Runs Python locally.' },
        handler: vi.fn(async () => ({ output: 'ok' })),
      },
    };

    const inputActions = buildChatAreaInputActions({
      onMessageSent: vi.fn(),
      onSendMessage: vi.fn(),
      onStopGenerating: vi.fn(),
      onCancelEdit: vi.fn(),
      onProcessFiles: vi.fn(async () => undefined),
      onAddFileById: vi.fn(async () => undefined),
      onCancelUpload: vi.fn(),
      onTranscribeAudio: vi.fn(async () => null),
      onToggleGoogleSearch: vi.fn(),
      onToggleCodeExecution: vi.fn(),
      onToggleLocalPython: vi.fn(),
      onToggleUrlContext: vi.fn(),
      onToggleDeepSearch: vi.fn(),
      onClearChat: vi.fn(),
      onOpenSettings: vi.fn(),
      onToggleCanvasPrompt: vi.fn(),
      onTogglePinCurrentSession: vi.fn(),
      onRetryLastTurn: vi.fn(),
      onEditLastUserMessage: vi.fn(),
      onToggleQuadImages: vi.fn(),
      setCurrentChatSettings: vi.fn(),
      onAddUserMessage: vi.fn(),
      onLiveTranscript: vi.fn(),
      liveClientFunctions,
      onEditMessageContent: vi.fn(),
      onToggleBBox: vi.fn(),
      onToggleGuide: vi.fn(),
    } as any);

    expect(inputActions.liveClientFunctions).toBe(liveClientFunctions);
    expect(inputActions.onToggleLocalPython).toBeDefined();
  });
});
