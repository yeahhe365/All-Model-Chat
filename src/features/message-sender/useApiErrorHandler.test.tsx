import { act } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { renderHookWithProviders } from '@/test/providerTestUtils';
import { createChatSettings } from '@/test/factories';
import type { SavedChatSession } from '@/types';
import { useApiErrorHandler } from './useApiErrorHandler';

vi.mock('@/services/logService', async () => {
  const { createLogServiceMockModule } = await import('@/test/moduleMockDoubles');

  return createLogServiceMockModule();
});

const createSession = (): SavedChatSession => ({
  id: 'session-1',
  title: 'Session',
  timestamp: 1,
  settings: createChatSettings(),
  messages: [
    {
      id: 'generation-1',
      role: 'model',
      content: '',
      isLoading: true,
      timestamp: new Date('2026-04-21T00:00:00.000Z'),
    },
  ],
});

describe('useApiErrorHandler', () => {
  it('writes generic API errors in the active language when no prefix is supplied', () => {
    const updateAndPersistSessions = vi.fn();
    const { result } = renderHookWithProviders(() => useApiErrorHandler(updateAndPersistSessions), { language: 'zh' });

    act(() => {
      result.current.handleApiError(new Error('boom'), 'session-1', 'generation-1');
    });

    const updater = updateAndPersistSessions.mock.calls[0]?.[0];
    expect(updater).toBeTypeOf('function');

    const finalState = updater([createSession()]);
    expect(finalState[0].messages[0]).toEqual(
      expect.objectContaining({
        role: 'error',
        content: '\n\n[错误：boom]',
        isLoading: false,
      }),
    );
  });

  it('localizes silent API key configuration errors', () => {
    const updateAndPersistSessions = vi.fn();
    const { result } = renderHookWithProviders(() => useApiErrorHandler(updateAndPersistSessions), { language: 'zh' });
    const error = Object.assign(new Error('missing key'), { name: 'SilentError' });

    act(() => {
      result.current.handleApiError(error, 'session-1', 'generation-1');
    });

    const updater = updateAndPersistSessions.mock.calls[0]?.[0];
    const finalState = updater([createSession()]);
    expect(finalState[0].messages[0].content).toBe('\n\n[未在设置中配置 API 密钥。]');
  });

  it('localizes the legacy default Error prefix when callers pass it explicitly', () => {
    const updateAndPersistSessions = vi.fn();
    const { result } = renderHookWithProviders(() => useApiErrorHandler(updateAndPersistSessions), { language: 'zh' });

    act(() => {
      result.current.handleApiError(new Error('boom'), 'session-1', 'generation-1', 'Error');
    });

    const updater = updateAndPersistSessions.mock.calls[0]?.[0];
    const finalState = updater([createSession()]);
    expect(finalState[0].messages[0].content).toBe('\n\n[错误：boom]');
  });
});
