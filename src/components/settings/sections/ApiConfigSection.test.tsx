import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { I18nProvider } from '../../../contexts/I18nContext';
import { useSettingsStore } from '../../../stores/settingsStore';
import { SERVER_MANAGED_API_KEY } from '../../../utils/apiUtils';
import { ApiConfigSection } from './ApiConfigSection';

const { getClientMock, generateContentMock } = vi.hoisted(() => ({
  getClientMock: vi.fn(),
  generateContentMock: vi.fn(),
}));

vi.mock('../../../hooks/useDevice', () => ({
  useResponsiveValue: vi.fn(() => 18),
}));

vi.mock('../../../services/api/baseApi', () => ({
  getClient: getClientMock,
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

  beforeEach(() => {
    Reflect.set(globalThis, 'IS_REACT_ACT_ENVIRONMENT', true);
    vi.clearAllMocks();
    generateContentMock.mockResolvedValue({});
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
            liveApiEphemeralTokenEndpoint={null}
            setLiveApiEphemeralTokenEndpoint={vi.fn()}
            availableModels={[]}
          />
        </I18nProvider>
      );
    });

    expect(container.textContent).toContain('API & Connections');

    const testButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Test Connection')
    );

    expect(testButton).toBeDefined();
    expect(testButton?.hasAttribute('disabled')).toBe(false);

    await act(async () => {
      testButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    await vi.waitFor(() => {
      expect(getClientMock).toHaveBeenCalled();
    });
    expect(getClientMock).toHaveBeenCalledWith(
      SERVER_MANAGED_API_KEY,
      'https://proxy.example.com/v1beta'
    );

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
            liveApiEphemeralTokenEndpoint={null}
            setLiveApiEphemeralTokenEndpoint={vi.fn()}
            availableModels={[]}
          />
        </I18nProvider>,
      );
    });

    expect(container.textContent).toContain('API & Connections');
    expect(container.textContent).toContain('Test Connection');

    act(() => {
      useSettingsStore.setState({ language: 'zh' });
    });

    expect(container.textContent).toContain('API 与连接');
    expect(container.textContent).toContain('测试连通性');
  });
});
