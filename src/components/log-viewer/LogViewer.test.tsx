import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_APP_SETTINGS, DEFAULT_CHAT_SETTINGS } from '../../constants/appConstants';
import { I18nProvider } from '../../contexts/I18nContext';

const {
  mockGetRecentLogs,
  mockSubscribe,
  mockSubscribeToApiKeys,
  mockSubscribeToTokenUsage,
  mockSubscribeToUsageRefresh,
  mockClearLogs,
} = vi.hoisted(() => ({
  mockGetRecentLogs: vi.fn(),
  mockSubscribe: vi.fn(),
  mockSubscribeToApiKeys: vi.fn(),
  mockSubscribeToTokenUsage: vi.fn(),
  mockSubscribeToUsageRefresh: vi.fn(),
  mockClearLogs: vi.fn(),
}));

vi.mock('../../services/logService', () => ({
  logService: {
    getRecentLogs: mockGetRecentLogs,
    subscribe: mockSubscribe,
    subscribeToApiKeys: mockSubscribeToApiKeys,
    subscribeToTokenUsage: mockSubscribeToTokenUsage,
    subscribeToUsageRefresh: mockSubscribeToUsageRefresh,
    clearLogs: mockClearLogs,
  },
}));

import { LogViewer } from './LogViewer';

const findButton = (label: string) =>
  Array.from(document.body.querySelectorAll('button')).find((button) =>
    button.textContent?.includes(label),
  ) as HTMLButtonElement | undefined;

describe('LogViewer', () => {
  let container: HTMLDivElement;
  let root: Root;
  let emitLiveLogs: ((logs: Array<{ timestamp: Date; level: string; category: string; message: string }>) => void) | null;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    emitLiveLogs = null;

    mockGetRecentLogs.mockResolvedValue([]);
    mockSubscribe.mockImplementation((listener: typeof emitLiveLogs) => {
      emitLiveLogs = listener;
      return () => {};
    });
    mockSubscribeToApiKeys.mockImplementation((listener: (usage: Map<string, number>) => void) => {
      listener(new Map([
        ['key-a', 3],
        ['key-b', 1],
      ]));
      return () => {};
    });
    mockSubscribeToTokenUsage.mockImplementation(
      (listener: (usage: Map<string, { input: number; output: number }>) => void) => {
        listener(new Map([['gemini-3.1-pro-preview', { input: 120, output: 45 }]]));
        return () => {};
      },
    );
    mockSubscribeToUsageRefresh.mockImplementation(() => () => {});
    mockClearLogs.mockResolvedValue(undefined);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    document.body.innerHTML = '';
    vi.clearAllMocks();
  });

  it('groups overview, tokens, and api key stats under the usage tab', () => {
    act(() => {
      root.render(
        <I18nProvider>
          <LogViewer
            isOpen
            onClose={vi.fn()}
            appSettings={{ ...DEFAULT_APP_SETTINGS, useCustomApiConfig: true, apiKey: 'key-a\nkey-b' }}
            currentChatSettings={{ ...DEFAULT_CHAT_SETTINGS, lockedApiKey: 'key-a' }}
          />
        </I18nProvider>,
      );
    });

    expect(findButton('Console')).toBeDefined();
    expect(findButton('Usage')).toBeDefined();

    act(() => {
      findButton('Usage')?.click();
    });

    expect(findButton('Overview')).toBeDefined();
    expect(findButton('Tokens')).toBeDefined();
    expect(findButton('API Keys')).toBeDefined();
  });

  it('can open directly to a requested usage sub-tab', () => {
    act(() => {
      root.render(
        <I18nProvider>
          <LogViewer
            isOpen
            onClose={vi.fn()}
            appSettings={{ ...DEFAULT_APP_SETTINGS, useCustomApiConfig: true, apiKey: 'key-a\nkey-b' }}
            currentChatSettings={{ ...DEFAULT_CHAT_SETTINGS, lockedApiKey: 'key-a' }}
            initialTab="usage"
            initialUsageTab="tokens"
          />
        </I18nProvider>,
      );
    });

    expect(findButton('Overview')).toBeDefined();
    expect(findButton('Tokens')).toBeDefined();
    expect(document.body.textContent).toContain('Token Usage Statistics');
  });

  it('keeps the usage tab active after live logs arrive', () => {
    act(() => {
      root.render(
        <I18nProvider>
          <LogViewer
            isOpen
            onClose={vi.fn()}
            appSettings={{ ...DEFAULT_APP_SETTINGS, useCustomApiConfig: true, apiKey: 'key-a\nkey-b' }}
            currentChatSettings={{ ...DEFAULT_CHAT_SETTINGS, lockedApiKey: 'key-a' }}
          />
        </I18nProvider>,
      );
    });

    act(() => {
      findButton('Usage')?.click();
    });

    expect(findButton('Overview')).toBeDefined();

    act(() => {
      emitLiveLogs?.([
        {
          timestamp: new Date('2026-04-18T13:00:00.000Z'),
          level: 'INFO',
          category: 'SYSTEM',
          message: 'new live log',
        },
      ]);
    });

    expect(findButton('Overview')).toBeDefined();
    expect(document.body.textContent).not.toContain('Search logs...');
  });
});
