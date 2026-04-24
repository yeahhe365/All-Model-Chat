import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../utils/appUtils', () => ({
  logService: { warn: vi.fn(), info: vi.fn(), error: vi.fn(), debug: vi.fn() },
  cleanupFilePreviewUrls: vi.fn(),
}));

import { useChatEffects } from './useChatEffects';

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
    rerender: () => {
      act(() => {
        root.render(<TestComponent />);
      });
    },
    unmount: () => {
      act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
};

const createProps = (overrides: Partial<Parameters<typeof useChatEffects>[0]> = {}) => ({
  activeSessionId: null,
  savedSessions: [],
  selectedFiles: [],
  appFileError: null,
  setAppFileError: vi.fn(),
  isModelsLoading: false,
  apiModels: [],
  activeChat: undefined,
  updateAndPersistSessions: vi.fn(),
  isSwitchingModel: false,
  setIsSwitchingModel: vi.fn(),
  currentChatSettings: {
    modelId: 'gemini-3.1-pro-preview',
  } as any,
  aspectRatio: '1:1',
  setAspectRatio: vi.fn(),
  imageSize: '1K',
  setImageSize: vi.fn(),
  loadInitialData: vi.fn(async () => undefined),
  loadChatSession: vi.fn(),
  startNewChat: vi.fn(),
  ...overrides,
});

describe('useChatEffects', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'ResizeObserver',
      class ResizeObserver {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('switches Nano Banana 2 to Auto aspect ratio on model change', () => {
    const setAspectRatio = vi.fn();
    const props = createProps({
      currentChatSettings: {
        modelId: 'gemini-3-pro-image-preview',
      } as any,
      setAspectRatio,
    });

    const hook = renderHook(() => useChatEffects(props));

    props.currentChatSettings = {
      modelId: 'gemini-3.1-flash-image-preview',
    } as any;

    hook.rerender();

    expect(setAspectRatio).toHaveBeenCalledWith('Auto');
    hook.unmount();
  });

  it('clamps stale image settings when switching from Nano Banana 2 to Imagen', () => {
    const setAspectRatio = vi.fn();
    const setImageSize = vi.fn();
    const props = createProps({
      currentChatSettings: {
        modelId: 'gemini-3.1-flash-image-preview',
      } as any,
      aspectRatio: '1:4',
      imageSize: '4K',
      setAspectRatio,
      setImageSize,
    });

    const hook = renderHook(() => useChatEffects(props));

    props.currentChatSettings = {
      modelId: 'imagen-4.0-generate-001',
    } as any;

    hook.rerender();

    expect(setAspectRatio).toHaveBeenCalledWith('1:1');
    expect(setImageSize).toHaveBeenCalledWith('1K');
    hook.unmount();
  });

  it('resets Auto back to 1:1 when switching away from Banana models', () => {
    const setAspectRatio = vi.fn();
    const props = createProps({
      currentChatSettings: {
        modelId: 'gemini-3.1-flash-image-preview',
      } as any,
      aspectRatio: 'Auto',
      setAspectRatio,
    });

    const hook = renderHook(() => useChatEffects(props));

    props.currentChatSettings = {
      modelId: 'gemini-3.1-pro-preview',
    } as any;

    hook.rerender();

    expect(setAspectRatio).toHaveBeenCalledWith('1:1');
    hook.unmount();
  });

  it('starts a fresh chat when the active session is missing after initial history load', async () => {
    const startNewChat = vi.fn();
    const props = createProps({
      activeSessionId: 'deleted-session',
      savedSessions: [],
      loadInitialData: vi.fn(async () => undefined),
      startNewChat,
    });

    const hook = renderHook(() => useChatEffects(props));

    await act(async () => {
      await Promise.resolve();
    });

    expect(startNewChat).toHaveBeenCalledTimes(1);
    hook.unmount();
  });

  it('does not require model-list fallback props that can silently rewrite session models', () => {
    const props = createProps({
      activeSessionId: 'session-1',
    });

    const hook = renderHook(() => useChatEffects(props));

    expect(props.startNewChat).not.toHaveBeenCalled();
    hook.unmount();
  });
});
