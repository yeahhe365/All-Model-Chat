import { readFileSync } from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';
import {
  chatInputStateReducer,
  createSetChatInputFlagAction,
  createToggleChatInputFullscreenAction,
  getChatInputMode,
  initialChatInputMachineState,
  selectIsChatInputProcessing,
} from './chatInputStateMachine';

describe('chatInputStateMachine', () => {
  it('starts in a non-blocking composer state', () => {
    expect(initialChatInputMachineState).toEqual({
      isTranslating: false,
      isAnimatingSend: false,
      isAddingById: false,
      isAddingByUrl: false,
      isWaitingForUpload: false,
      isFullscreen: false,
    });
  });

  it('updates boolean flags through reducer actions', () => {
    const translating = chatInputStateReducer(initialChatInputMachineState, {
      type: 'setFlag',
      flag: 'isTranslating',
      value: true,
    });
    const animating = chatInputStateReducer(translating, {
      type: 'setFlag',
      flag: 'isAnimatingSend',
      value: (previous) => !previous,
    });

    expect(translating.isTranslating).toBe(true);
    expect(animating.isAnimatingSend).toBe(true);
  });

  it('toggles fullscreen without changing other flags', () => {
    const nextState = chatInputStateReducer(
      {
        ...initialChatInputMachineState,
        isTranslating: true,
      },
      { type: 'toggleFullscreen' },
    );

    expect(nextState.isFullscreen).toBe(true);
    expect(nextState.isTranslating).toBe(true);
  });

  it('creates reducer actions for boolean flag call sites', () => {
    const waitingAction = createSetChatInputFlagAction('isWaitingForUpload', true);
    const toggleAction = createToggleChatInputFullscreenAction();

    const waitingState = chatInputStateReducer(initialChatInputMachineState, waitingAction);
    const fullscreenState = chatInputStateReducer(waitingState, toggleAction);

    expect(waitingState.isWaitingForUpload).toBe(true);
    expect(fullscreenState.isWaitingForUpload).toBe(true);
    expect(fullscreenState.isFullscreen).toBe(true);
  });

  it('detects processing from local and external blockers', () => {
    expect(
      selectIsChatInputProcessing({
        state: { ...initialChatInputMachineState, isWaitingForUpload: true },
        isProcessingFile: false,
        isConverting: false,
      }),
    ).toBe(true);

    expect(
      selectIsChatInputProcessing({
        state: initialChatInputMachineState,
        isProcessingFile: true,
        isConverting: false,
      }),
    ).toBe(true);

    expect(
      selectIsChatInputProcessing({
        state: initialChatInputMachineState,
        isProcessingFile: false,
        isConverting: false,
      }),
    ).toBe(false);
  });

  it('selects composer modes by stable priority', () => {
    const base = {
      state: initialChatInputMachineState,
      isEditing: false,
      hasActiveQueuedSubmission: false,
      canQueueMessage: false,
      isNativeAudioModel: false,
      liveStatus: {
        isConnected: false,
        isReconnecting: false,
        error: null,
      },
      isProcessingFile: false,
      isConverting: false,
    };

    expect(getChatInputMode(base)).toBe('idle');
    expect(getChatInputMode({ ...base, canQueueMessage: true })).toBe('queuing');
    expect(getChatInputMode({ ...base, hasActiveQueuedSubmission: true })).toBe('queuing');
    expect(getChatInputMode({ ...base, isEditing: true, canQueueMessage: true })).toBe('editing');
    expect(
      getChatInputMode({
        ...base,
        isEditing: true,
        isNativeAudioModel: true,
        liveStatus: { isConnected: true, isReconnecting: false, error: null },
      }),
    ).toBe('live');
    expect(
      getChatInputMode({
        ...base,
        state: { ...initialChatInputMachineState, isAddingById: true },
        isNativeAudioModel: true,
        liveStatus: { isConnected: true, isReconnecting: false, error: null },
      }),
    ).toBe('processing');
  });

  it('keeps reducer flags behind explicit chat input actions', () => {
    const source = readFileSync(path.resolve(__dirname, './useChatInputState.ts'), 'utf8');

    expect(source).not.toContain('setIsTranslating');
    expect(source).not.toContain('setIsAnimatingSend');
    expect(source).not.toContain('setIsAddingById');
    expect(source).not.toContain('setIsAddingByUrl');
    expect(source).not.toContain('setIsWaitingForUpload');
    expect(source).not.toContain('setIsFullscreen');
    expect(source).toContain('setTranslating');
    expect(source).toContain('setAddingById');
    expect(source).toContain('setWaitingForUpload');
    expect(source).toContain('startSendAnimation');
    expect(source).toContain('stopSendAnimation');
    expect(source).toContain('exitFullscreen');
  });
});
