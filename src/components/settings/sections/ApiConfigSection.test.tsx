import { act } from 'react';
import { setupTestRenderer } from '@/test/testUtils';
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

vi.mock('../../../services/logService', async () => {
  const { createLogServiceMockModule } = await import('../../../test/moduleMockDoubles');

  return createLogServiceMockModule();
});

describe('ApiConfigSection', () => {
  const renderer = setupTestRenderer();
  const initialState = useSettingsStore.getState();
  const settingsFixture: AppSettings = {
    ...initialState.appSettings,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    generateContentMock.mockResolvedValue({});
    sendOpenAICompatibleMessageNonStreamMock.mockResolvedValue(undefined);
    getClientMock.mockReturnValue({
      models: {
        generateContent: generateContentMock,
      },
    });
  });

  afterEach(() => {
    useSettingsStore.setState(initialState);
  });

  it('allows running connection test in server-managed mode without a browser-held key', async () => {
    await act(async () => {
      useSettingsStore.setState({ language: 'en' });
      renderer.root.render(
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

    expect(renderer.container.textContent).not.toContain('API & Connections');

    const testButton = Array.from(renderer.container.querySelectorAll('button')).find((button) =>
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
      renderer.root.render(
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

    expect(renderer.container.textContent).not.toContain('API & Connections');
    expect(renderer.container.textContent).toContain('Test Connection');
    expect(renderer.container.textContent).toContain('File Transfer Method');
    expect(renderer.container.textContent).not.toContain('API Mode');
    expect(renderer.container.textContent).toContain('Gemini Native');
    expect(renderer.container.textContent).toContain('OpenAI Compatible');

    act(() => {
      useSettingsStore.setState({ language: 'zh' });
    });

    expect(renderer.container.textContent).not.toContain('API 与连接');
    expect(renderer.container.textContent).toContain('测试连通性');
    expect(renderer.container.textContent).toContain('文件传输方式');
    expect(renderer.container.textContent).not.toContain('API 模式');
  });

  it('renders API mode choices as one segmented control surface', async () => {
    await act(async () => {
      useSettingsStore.setState({ language: 'en' });
      renderer.root.render(
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

    const modeControl = renderer.container.querySelector('[role="group"][aria-label="API Mode"]');
    const modeButtons = Array.from(modeControl?.querySelectorAll('button') ?? []);

    expect(modeControl).not.toBeNull();
    expect(modeControl!.className).toContain('border');
    expect(modeControl!.className).toContain('rounded-lg');
    expect(modeButtons).toHaveLength(2);
    expect(modeButtons[0].className.split(/\s+/)).not.toContain('border');
    expect(modeButtons[1].className.split(/\s+/)).not.toContain('border');
  });

  it('tests the OpenAI-compatible endpoint with the isolated OpenAI key when that global API mode is selected', async () => {
    await act(async () => {
      useSettingsStore.setState({ language: 'en' });
      renderer.root.render(
        <I18nProvider>
          <ApiConfigSection
            useCustomApiConfig
            setUseCustomApiConfig={vi.fn()}
            apiKey="gemini-key"
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
              openaiCompatibleApiKey: 'openai-compatible-key',
              openaiCompatibleBaseUrl: 'https://api.openai.com/v1',
              openaiCompatibleModelId: 'gpt-5.5',
            }}
            onUpdate={vi.fn()}
          />
        </I18nProvider>,
      );
    });

    const testButton = Array.from(renderer.container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Test Connection'),
    );

    await act(async () => {
      testButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(getClientMock).not.toHaveBeenCalled();
    expect(sendOpenAICompatibleMessageNonStreamMock).toHaveBeenCalledWith(
      'openai-compatible-key',
      'gpt-5.5',
      [],
      [{ text: 'Hello' }],
      {
        baseUrl: 'https://api.openai.com/v1',
        temperature: 0,
      },
      expect.any(AbortSignal),
      expect.any(Function),
      expect.any(Function),
    );
  });

  it('edits the OpenAI-compatible API key without overwriting the Gemini API key', async () => {
    const setApiKey = vi.fn();
    const onUpdate = vi.fn();

    await act(async () => {
      useSettingsStore.setState({ language: 'en' });
      renderer.root.render(
        <I18nProvider>
          <ApiConfigSection
            useCustomApiConfig
            setUseCustomApiConfig={vi.fn()}
            apiKey="gemini-key"
            setApiKey={setApiKey}
            apiProxyUrl={null}
            setApiProxyUrl={vi.fn()}
            useApiProxy={false}
            setUseApiProxy={vi.fn()}
            serverManagedApi={false}
            availableModels={[]}
            settings={{
              ...settingsFixture,
              apiMode: 'openai-compatible',
              openaiCompatibleApiKey: null,
              openaiCompatibleBaseUrl: 'https://api.openai.com/v1',
            }}
            onUpdate={onUpdate}
          />
        </I18nProvider>,
      );
    });

    const apiKeyInput = renderer.container.querySelector('#api-key-input') as HTMLTextAreaElement | null;
    expect(apiKeyInput).not.toBeNull();

    await act(async () => {
      const descriptor = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value');
      descriptor?.set?.call(apiKeyInput, 'sk-openai');
      apiKeyInput!.dispatchEvent(new Event('input', { bubbles: true }));
      apiKeyInput!.dispatchEvent(new Event('change', { bubbles: true }));
    });

    expect(setApiKey).not.toHaveBeenCalled();
    expect(onUpdate).toHaveBeenCalledWith('openaiCompatibleApiKey', 'sk-openai');
  });

  it('explains that Live uses the browser API key directly without token endpoint settings', async () => {
    await act(async () => {
      useSettingsStore.setState({ language: 'en' });
      renderer.root.render(
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

    expect(renderer.container.textContent).toContain('Live connects from this browser');
    expect(renderer.container.textContent).toContain('uses your browser API key directly');
    expect(renderer.container.textContent).not.toContain('/api/live-token');
    expect(renderer.container.textContent).not.toContain('Advanced Live Settings');
    expect(renderer.container.querySelector('#live-token-endpoint-input')).toBeNull();
  });
});
