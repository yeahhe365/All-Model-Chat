import { act } from 'react';
import type { ComponentProps } from 'react';
import { setupProviderTestRenderer as setupTestRenderer } from '@/test/providerTestUtils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useSettingsStore } from '@/stores/settingsStore';
import { setupStoreStateReset } from '@/test/storeTestUtils';
import type { AppSettings } from '@/types';
import { SERVER_MANAGED_API_KEY } from '@/utils/apiUtils';
import { ApiConfigSection } from './ApiConfigSection';

const { getClientMock, generateContentMock, sendOpenAICompatibleMessageNonStreamMock } = vi.hoisted(() => ({
  getClientMock: vi.fn(),
  generateContentMock: vi.fn(),
  sendOpenAICompatibleMessageNonStreamMock: vi.fn(),
}));

vi.mock('@/hooks/useDevice', () => ({
  useResponsiveValue: vi.fn(() => 18),
}));

vi.mock('@/services/api/apiClient', () => ({
  getClient: getClientMock,
}));

vi.mock('@/services/api/openaiCompatibleApi', () => ({
  sendOpenAICompatibleMessageNonStream: sendOpenAICompatibleMessageNonStreamMock,
}));

vi.mock('@/services/logService', async () => {
  const { createLogServiceMockModule } = await import('@/test/moduleMockDoubles');

  return createLogServiceMockModule();
});

describe('ApiConfigSection', () => {
  const renderer = setupTestRenderer();
  setupStoreStateReset();
  const settingsFixture: AppSettings = {
    ...useSettingsStore.getState().appSettings,
  };

  const createApiConfigProps = (
    overrides: Partial<ComponentProps<typeof ApiConfigSection>> = {},
  ): ComponentProps<typeof ApiConfigSection> => ({
    useCustomApiConfig: true,
    setUseCustomApiConfig: vi.fn(),
    apiKey: null,
    setApiKey: vi.fn(),
    apiProxyUrl: null,
    setApiProxyUrl: vi.fn(),
    useApiProxy: false,
    setUseApiProxy: vi.fn(),
    serverManagedApi: false,
    settings: settingsFixture,
    onUpdate: vi.fn(),
    ...overrides,
  });

  const renderApiConfigSection = async (
    overrides: Partial<ComponentProps<typeof ApiConfigSection>> & { language?: 'en' | 'zh' } = {},
  ) => {
    const { language = 'en', ...props } = overrides;

    await act(async () => {
      useSettingsStore.setState({ language });
      renderer.root.render(<ApiConfigSection {...createApiConfigProps(props)} />);
    });
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
    vi.restoreAllMocks();
  });

  it('allows running connection test in server-managed mode without a browser-held key', async () => {
    await renderApiConfigSection({
      apiProxyUrl: 'https://proxy.example.com/v1beta',
      useApiProxy: true,
      serverManagedApi: true,
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
    await renderApiConfigSection();

    expect(renderer.container.textContent).not.toContain('API & Connections');
    expect(renderer.container.textContent).toContain('Test Connection');
    expect(renderer.container.textContent).toContain('File Transfer Method');
    expect(renderer.container.textContent).toContain('API Provider');
    expect(renderer.container.textContent).toContain('Gemini Official API');
    expect(renderer.container.textContent).toContain('OpenAI-Compatible API');

    act(() => {
      useSettingsStore.setState({ language: 'zh' });
    });

    expect(renderer.container.textContent).not.toContain('API 与连接');
    expect(renderer.container.textContent).toContain('测试连通性');
    expect(renderer.container.textContent).toContain('文件传输方式');
    expect(renderer.container.textContent).toContain('API 提供方');
    expect(renderer.container.textContent).toContain('Gemini 官方接口');
    expect(renderer.container.textContent).toContain('OpenAI 兼容接口');
  });

  it('renders a single provider selector and enables OpenAI-compatible mode from it', async () => {
    const onUpdate = vi.fn();

    await renderApiConfigSection({ onUpdate });

    const providerSelector = renderer.container.querySelector('[role="group"][aria-label="API Provider"]');
    const openAIProviderButton = Array.from(renderer.container.querySelectorAll('button')).find(
      (button) => button.textContent?.trim() === 'OpenAI-Compatible API',
    );

    expect(providerSelector).not.toBeNull();
    expect(renderer.container.querySelector('#openai-compatible-api-enabled-toggle')).toBeNull();
    expect(openAIProviderButton).toBeDefined();
    expect(renderer.container.textContent).not.toContain('OpenAI-Compatible API Keys');

    await act(async () => {
      openAIProviderButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onUpdate).toHaveBeenCalledWith('isOpenAICompatibleApiEnabled', true);
    expect(onUpdate).toHaveBeenCalledWith('apiMode', 'openai-compatible');
  });

  it('returns to Gemini provider from the same selector and hides OpenAI-compatible settings', async () => {
    const onUpdate = vi.fn();

    await renderApiConfigSection({
      settings: {
        ...settingsFixture,
        isOpenAICompatibleApiEnabled: true,
        apiMode: 'openai-compatible',
      },
      onUpdate,
    });

    const geminiProviderButton = Array.from(renderer.container.querySelectorAll('button')).find(
      (button) => button.textContent?.trim() === 'Gemini Official API',
    );

    expect(renderer.container.querySelector('#openai-compatible-api-enabled-toggle')).toBeNull();
    expect(geminiProviderButton).toBeDefined();
    expect(renderer.container.textContent).toContain('OpenAI-Compatible API Keys');

    await act(async () => {
      geminiProviderButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onUpdate).toHaveBeenCalledWith('isOpenAICompatibleApiEnabled', false);
    expect(onUpdate).toHaveBeenCalledWith('apiMode', 'gemini-native');
  });

  it('tests the OpenAI-compatible endpoint with the isolated OpenAI key when that global API mode is selected', async () => {
    await renderApiConfigSection({
      apiKey: 'gemini-key',
      settings: {
        ...settingsFixture,
        isOpenAICompatibleApiEnabled: true,
        apiMode: 'openai-compatible',
        openaiCompatibleApiKey: 'openai-compatible-key',
        openaiCompatibleBaseUrl: 'https://api.openai.com/v1',
        openaiCompatibleModelId: 'gpt-5.5',
      },
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

    await renderApiConfigSection({
      apiKey: 'gemini-key',
      setApiKey,
      settings: {
        ...settingsFixture,
        isOpenAICompatibleApiEnabled: true,
        apiMode: 'openai-compatible',
        openaiCompatibleApiKey: null,
        openaiCompatibleBaseUrl: 'https://api.openai.com/v1',
      },
      onUpdate,
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

  it('keeps OpenAI-compatible model ID management out of the API settings screen', async () => {
    await renderApiConfigSection({
      settings: {
        ...settingsFixture,
        isOpenAICompatibleApiEnabled: true,
        apiMode: 'openai-compatible',
        openaiCompatibleModelId: 'gpt-5.5',
        openaiCompatibleModels: [
          { id: 'gpt-5.5', name: 'GPT-5.5', isPinned: true },
          { id: 'gpt-4.1', name: 'GPT-4.1' },
        ],
      },
    });

    expect(renderer.container.textContent).not.toContain('OpenAI-Compatible Model IDs');
    expect(renderer.container.textContent).not.toContain('Fetch Models');
    expect(
      renderer.container.querySelector<HTMLInputElement>('input[data-openai-compatible-model-id-input="true"]'),
    ).toBeNull();
  });

  it('explains that Live uses the browser API key directly without token endpoint settings', async () => {
    await renderApiConfigSection({
      apiKey: 'browser-key',
    });

    expect(renderer.container.textContent).toContain('Live connects from this browser');
    expect(renderer.container.textContent).toContain('uses your browser API key directly');
    expect(renderer.container.textContent).not.toContain('/api/live-token');
    expect(renderer.container.textContent).not.toContain('Advanced Live Settings');
    expect(renderer.container.querySelector('#live-token-endpoint-input')).toBeNull();
  });
});
