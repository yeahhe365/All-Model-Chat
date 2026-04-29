import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { I18nProvider } from '../../../contexts/I18nContext';
import { useSettingsStore } from '../../../stores/settingsStore';
import type { AppSettings } from '../../../types';
import { SERVER_MANAGED_API_KEY } from '../../../utils/apiUtils';
import { ApiConfigSection } from './ApiConfigSection';

const { getClientMock, generateContentMock, sendOpenAICompatibleMessageNonStreamMock } = vi.hoisted(() => ({
  getClientMock: vi.fn(),
  generateContentMock: vi.fn(),
  sendOpenAICompatibleMessageNonStreamMock: vi.fn(),
}));

vi.mock('../../../hooks/useDevice', () => ({
  useResponsiveValue: vi.fn(() => 18),
}));

vi.mock('../../../services/api/apiClient', () => ({
  getClient: getClientMock,
}));

vi.mock('../../../services/api/openaiCompatibleApi', () => ({
  sendOpenAICompatibleMessageNonStream: sendOpenAICompatibleMessageNonStreamMock,
}));

vi.mock('../../../services/logService', () => ({
  logService: {
    recordApiKeyUsage: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('ApiConfigSection', () => {
  let container: HTMLDivElement;
  let root: Root;
  const initialState = useSettingsStore.getState();
  const settingsFixture: AppSettings = {
    ...initialState.appSettings,
  };

  beforeEach(() => {
    Reflect.set(globalThis, 'IS_REACT_ACT_ENVIRONMENT', true);
    vi.clearAllMocks();
    generateContentMock.mockResolvedValue({});
    sendOpenAICompatibleMessageNonStreamMock.mockResolvedValue(undefined);
    getClientMock.mockReturnValue({
      models: {
        generateContent: generateContentMock,
      },
    });

    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    useSettingsStore.setState(initialState);
  });

  it('allows running connection test in server-managed mode without a browser-held key', async () => {
    await act(async () => {
      useSettingsStore.setState({ language: 'en' });
      root.render(
        <I18nProvider>
          <ApiConfigSection
            useCustomApiConfig
            setUseCustomApiConfig={vi.fn()}
            apiKey={null}
            setApiKey={vi.fn()}
            apiProxyUrl="https://proxy.example.com/v1beta"
            setApiProxyUrl={vi.fn()}
            useApiProxy
            setUseApiProxy={vi.fn()}
            serverManagedApi
            availableModels={[]}
            settings={settingsFixture}
            onUpdate={vi.fn()}
          />
        </I18nProvider>,
      );
    });

    expect(container.textContent).toContain('API & Connections');

    const testButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Test Connection'),
    );

    expect(testButton).toBeDefined();
    expect(testButton?.hasAttribute('disabled')).toBe(false);

    await act(async () => {
      testButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    await vi.waitFor(() => {
      expect(getClientMock).toHaveBeenCalled();
    });
    expect(getClientMock).toHaveBeenCalledWith(SERVER_MANAGED_API_KEY, 'https://proxy.example.com/v1beta');

    await vi.waitFor(() => {
      expect(generateContentMock).toHaveBeenCalledWith({
        model: 'gemini-3-flash-preview',
        contents: 'Hello',
      });
    });
  });

  it('updates translated labels when the global language changes', async () => {
    await act(async () => {
      useSettingsStore.setState({ language: 'en' });
      root.render(
        <I18nProvider>
          <ApiConfigSection
            useCustomApiConfig
            setUseCustomApiConfig={vi.fn()}
            apiKey={null}
            setApiKey={vi.fn()}
            apiProxyUrl={null}
            setApiProxyUrl={vi.fn()}
            useApiProxy={false}
            setUseApiProxy={vi.fn()}
            serverManagedApi={false}
            availableModels={[]}
            settings={settingsFixture}
            onUpdate={vi.fn()}
          />
        </I18nProvider>,
      );
    });

    expect(container.textContent).toContain('API & Connections');
    expect(container.textContent).toContain('Test Connection');
    expect(container.textContent).toContain('File Transfer Method');
    expect(container.textContent).toContain('API Mode');
    expect(container.textContent).toContain('Gemini Native');
    expect(container.textContent).toContain('OpenAI Compatible');

    act(() => {
      useSettingsStore.setState({ language: 'zh' });
    });

    expect(container.textContent).toContain('API 与连接');
    expect(container.textContent).toContain('测试连通性');
    expect(container.textContent).toContain('文件传输方式');
    expect(container.textContent).toContain('API 模式');
  });

  it('renders API mode choices as one segmented control surface', async () => {
    await act(async () => {
      useSettingsStore.setState({ language: 'en' });
      root.render(
        <I18nProvider>
          <ApiConfigSection
            useCustomApiConfig
            setUseCustomApiConfig={vi.fn()}
            apiKey={null}
            setApiKey={vi.fn()}
            apiProxyUrl={null}
            setApiProxyUrl={vi.fn()}
            useApiProxy={false}
            setUseApiProxy={vi.fn()}
            serverManagedApi={false}
            availableModels={[]}
            settings={settingsFixture}
            onUpdate={vi.fn()}
          />
        </I18nProvider>,
      );
    });

    const modeControl = container.querySelector('[role="group"][aria-label="API Mode"]');
    const modeButtons = Array.from(modeControl?.querySelectorAll('button') ?? []);

    expect(modeControl).not.toBeNull();
    expect(modeControl!.className).toContain('border');
    expect(modeControl!.className).toContain('rounded-lg');
    expect(modeButtons).toHaveLength(2);
    expect(modeButtons[0].className.split(/\s+/)).not.toContain('border');
    expect(modeButtons[1].className.split(/\s+/)).not.toContain('border');
  });

  it('tests the OpenAI-compatible endpoint when that global API mode is selected', async () => {
    await act(async () => {
      useSettingsStore.setState({ language: 'en' });
      root.render(
        <I18nProvider>
          <ApiConfigSection
            useCustomApiConfig
            setUseCustomApiConfig={vi.fn()}
            apiKey="openai-compatible-key"
            setApiKey={vi.fn()}
            apiProxyUrl={null}
            setApiProxyUrl={vi.fn()}
            useApiProxy={false}
            setUseApiProxy={vi.fn()}
            serverManagedApi={false}
            availableModels={[]}
            settings={{
              ...settingsFixture,
              apiMode: 'openai-compatible',
              openaiCompatibleBaseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
            }}
            onUpdate={vi.fn()}
          />
        </I18nProvider>,
      );
    });

    const testButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Test Connection'),
    );

    await act(async () => {
      testButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(getClientMock).not.toHaveBeenCalled();
    expect(sendOpenAICompatibleMessageNonStreamMock).toHaveBeenCalledWith(
      'openai-compatible-key',
      'gemini-3-flash-preview',
      [],
      [{ text: 'Hello' }],
      {
        baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
        temperature: 0,
      },
      expect.any(AbortSignal),
      expect.any(Function),
      expect.any(Function),
    );
  });

  it('explains that Live uses the browser API key directly without token endpoint settings', async () => {
    await act(async () => {
      useSettingsStore.setState({ language: 'en' });
      root.render(
        <I18nProvider>
          <ApiConfigSection
            useCustomApiConfig
            setUseCustomApiConfig={vi.fn()}
            apiKey="browser-key"
            setApiKey={vi.fn()}
            apiProxyUrl={null}
            setApiProxyUrl={vi.fn()}
            useApiProxy={false}
            setUseApiProxy={vi.fn()}
            serverManagedApi={false}
            availableModels={[]}
            settings={settingsFixture}
            onUpdate={vi.fn()}
          />
        </I18nProvider>,
      );
    });

    expect(container.textContent).toContain('Live connects from this browser');
    expect(container.textContent).toContain('uses your browser API key directly');
    expect(container.textContent).not.toContain('/api/live-token');
    expect(container.textContent).not.toContain('Advanced Live Settings');
    expect(container.querySelector('#live-token-endpoint-input')).toBeNull();
  });
});
