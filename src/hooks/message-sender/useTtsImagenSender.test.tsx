import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { handleApiErrorMock, generateImagesMock, performOptimisticSessionUpdateMock, createUploadedFileFromBase64Mock } =
  vi.hoisted(() => ({
    handleApiErrorMock: vi.fn(),
    generateImagesMock: vi.fn(),
    performOptimisticSessionUpdateMock: vi.fn((prev: unknown) => prev),
    createUploadedFileFromBase64Mock: vi.fn((data: string, type: string, name: string) => ({
      id: `${name}-id`,
      name,
      type,
      size: data.length,
    })),
  }));

vi.mock('./useApiErrorHandler', () => ({
  useApiErrorHandler: () => ({
    handleApiError: handleApiErrorMock,
  }),
}));

vi.mock('../../services/geminiService', () => ({
  geminiServiceInstance: {
    generateImages: generateImagesMock,
    generateSpeech: vi.fn(),
  },
}));

vi.mock('../../utils/appUtils', () => ({
  pcmBase64ToWavUrl: vi.fn(() => 'blob:wav-url'),
  showNotification: vi.fn(),
  performOptimisticSessionUpdate: performOptimisticSessionUpdateMock,
  createMessage: (role: 'user' | 'model', content: string, options: Record<string, unknown> = {}) => ({
    id: options.id ?? `${role}-message`,
    role,
    content,
    timestamp: new Date('2026-04-21T00:00:00.000Z'),
    ...options,
  }),
  createUploadedFileFromBase64: createUploadedFileFromBase64Mock,
  generateSessionTitle: vi.fn(() => 'Generated Title'),
  playCompletionSound: vi.fn(),
  generateUniqueId: vi.fn(() => 'generated-session'),
}));

import { useTtsImagenSender } from './useTtsImagenSender';

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
      container.remove();
    },
  };
};

describe('useTtsImagenSender', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    generateImagesMock.mockResolvedValue(['image-1', 'image-2', 'image-3', 'image-4']);
  });

  it('uses a single Imagen request with numberOfImages when quad generation is enabled', async () => {
    const updateAndPersistSessions = vi.fn();
    const setSessionLoading = vi.fn();
    const activeJobs = { current: new Map<string, AbortController>() };
    const setActiveSessionId = vi.fn();

    const { result, unmount } = renderHook(() =>
      useTtsImagenSender({
        updateAndPersistSessions,
        setSessionLoading,
        activeJobs,
        setActiveSessionId,
      }),
    );

    const abortController = new AbortController();

    await act(async () => {
      await result.current.handleTtsImagenMessage(
        'api-key',
        'session-1',
        'generation-1',
        abortController,
        {
          generateQuadImages: true,
          isCompletionSoundEnabled: false,
          isCompletionNotificationEnabled: false,
        } as any,
        {
          modelId: 'imagen-4.0-generate-001',
        } as any,
        'draw a robot skateboard squad',
        '1:1',
        '2K',
        'ALLOW_ADULT',
      );
    });

    expect(generateImagesMock).toHaveBeenCalledTimes(1);
    expect(generateImagesMock).toHaveBeenCalledWith(
      'api-key',
      'imagen-4.0-generate-001',
      'draw a robot skateboard squad',
      '1:1',
      '2K',
      abortController.signal,
      expect.objectContaining({
        numberOfImages: 4,
      }),
    );

    unmount();
  });
});
