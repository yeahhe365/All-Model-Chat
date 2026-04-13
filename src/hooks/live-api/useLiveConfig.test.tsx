import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it } from 'vitest';
import { useLiveConfig } from './useLiveConfig';

const renderHook = <T,>(callback: () => T) => {
  const container = document.createElement('div');
  const root = createRoot(container);
  const result: { current: T | null } = { current: null };

  const TestComponent = () => {
    result.current = callback();
    return null;
  };

  act(() => {
    root.render(<TestComponent />);
  });

  return {
    result: result as { current: T },
    unmount: () => {
      act(() => {
        root.unmount();
      });
    },
  };
};

const baseChatSettings = {
  modelId: 'gemini-3.1-flash-live-preview',
  temperature: 1,
  topP: 0.95,
  topK: 64,
  showThoughts: true,
  systemInstruction: '',
  ttsVoice: 'Zephyr',
  thinkingBudget: -1,
  thinkingLevel: 'LOW' as const,
  lockedApiKey: null,
  isGoogleSearchEnabled: false,
  isCodeExecutionEnabled: false,
  isLocalPythonEnabled: false,
  isUrlContextEnabled: false,
  isDeepSearchEnabled: false,
  isRawModeEnabled: false,
  hideThinkingInContext: false,
  safetySettings: [],
  mediaResolution: 'MEDIA_RESOLUTION_UNSPECIFIED' as const,
};

describe('useLiveConfig', () => {
  it('enables session resumption from the first connection', () => {
    const { result, unmount } = renderHook(() =>
      useLiveConfig({
        appSettings: {} as any,
        chatSettings: baseChatSettings as any,
        sessionHandle: null,
      }),
    );

    expect(result.current.liveConfig.sessionResumption).toEqual({});
    unmount();
  });

  it('uses thinkingLevel for Gemini 3.1 Flash Live sessions', () => {
    const { result, unmount } = renderHook(() =>
      useLiveConfig({
        appSettings: {} as any,
        chatSettings: baseChatSettings as any,
        sessionHandle: null,
      }),
    );

    expect(result.current.liveConfig.thinkingConfig).toEqual({
      includeThoughts: true,
      thinkingLevel: 'LOW',
    });
    unmount();
  });

  it('declares client-side function tools when provided', () => {
    const { result, unmount } = renderHook(() =>
      useLiveConfig({
        appSettings: {} as any,
        chatSettings: baseChatSettings as any,
        sessionHandle: null,
        clientFunctions: {
          turn_on_the_lights: {
            declaration: {
              name: 'turn_on_the_lights',
              description: 'Turns on the lights.',
            },
            handler: async () => 'ok',
          },
        } as any,
      }),
    );

    expect(result.current.liveConfig.tools).toContainEqual({
      functionDeclarations: [
        {
          name: 'turn_on_the_lights',
          description: 'Turns on the lights.',
        },
      ],
    });
    unmount();
  });
});
