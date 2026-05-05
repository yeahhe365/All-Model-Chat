import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockGetRuntimeConfigAppSettingsOverrides } = vi.hoisted(() => ({
  mockGetRuntimeConfigAppSettingsOverrides: vi.fn(() => ({})),
}));

vi.mock('../../utils/db', async () => {
  const { createMockDbService } = await import('../../test/serviceTestDoubles');

  return { dbService: createMockDbService() };
});

vi.mock('../../services/logService', async () => {
  const { createMockLogService } = await import('../../test/serviceTestDoubles');

  return { logService: createMockLogService() };
});

vi.mock('../../runtime/runtimeConfig', () => ({
  getRuntimeConfigAppSettingsOverrides: mockGetRuntimeConfigAppSettingsOverrides,
}));

import { DEFAULT_APP_SETTINGS } from '../../constants/appConstants';
import { useSettingsStore } from '../settingsStore';
import { dbService } from '../../utils/db';

describe('settingsStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetRuntimeConfigAppSettingsOverrides.mockReturnValue({});
    useSettingsStore.setState({
      appSettings: DEFAULT_APP_SETTINGS,
      currentTheme: { id: 'pearl', name: 'Pearl', colors: {} } as any,
      language: 'en',
      isSettingsLoaded: false,
      pendingPreloadSettingsOverrides: null,
    });
  });

  describe('setAppSettings', () => {
    it('updates appSettings with new object', () => {
      useSettingsStore.getState().setAppSettings({
        ...useSettingsStore.getState().appSettings,
        temperature: 0.5,
      });
      expect(useSettingsStore.getState().appSettings.temperature).toBe(0.5);
    });

    it('updates appSettings with updater function', () => {
      useSettingsStore.getState().setAppSettings((prev) => ({
        ...prev,
        topP: 0.8,
      }));
      expect(useSettingsStore.getState().appSettings.topP).toBe(0.8);
    });

    it('resolves theme when themeId changes to onyx', () => {
      useSettingsStore.getState().setAppSettings((prev) => ({
        ...prev,
        themeId: 'onyx',
      }));
      expect(useSettingsStore.getState().currentTheme.id).toBe('onyx');
    });

    it('resolves language when language changes to zh', () => {
      useSettingsStore.getState().setAppSettings((prev) => ({
        ...prev,
        language: 'zh',
      }));
      expect(useSettingsStore.getState().language).toBe('zh');
    });

    it('persists to IndexedDB when settings are loaded', async () => {
      useSettingsStore.setState({ isSettingsLoaded: true });
      useSettingsStore.getState().setAppSettings((prev) => ({
        ...prev,
        temperature: 0.3,
      }));
      await vi.waitFor(() => {
        expect(dbService.setAppSettings).toHaveBeenCalled();
      });
    });

    it('broadcasts settings update after persist', async () => {
      useSettingsStore.setState({ isSettingsLoaded: true });
      useSettingsStore.getState().setAppSettings((prev) => ({
        ...prev,
        temperature: 0.3,
      }));
      await vi.waitFor(() => {
        expect(dbService.setAppSettings).toHaveBeenCalled();
      });
      expect(useSettingsStore.getState().appSettings.temperature).toBe(0.3);
    });

    it('does not persist when settings are not loaded yet', () => {
      useSettingsStore.setState({ isSettingsLoaded: false });
      useSettingsStore.getState().setAppSettings((prev) => ({
        ...prev,
        temperature: 0.3,
      }));
      expect(dbService.setAppSettings).not.toHaveBeenCalled();
    });
  });

  describe('loadSettings', () => {
    it('defaults to Gemini Native API mode with isolated OpenAI-compatible settings', async () => {
      vi.mocked(dbService.getAppSettings).mockResolvedValue(undefined);

      await useSettingsStore.getState().loadSettings();

      const { appSettings } = useSettingsStore.getState();
      expect(appSettings.apiMode).toBe('gemini-native');
      expect(appSettings.apiKey).toBeNull();
      expect(appSettings.openaiCompatibleApiKey).toBeNull();
      expect(appSettings.openaiCompatibleBaseUrl).toBe('https://api.openai.com/v1');
      expect(appSettings.modelId).toBe('gemini-3-flash-preview');
      expect(appSettings.openaiCompatibleModelId).toBe('gpt-5.5');
      expect(appSettings.openaiCompatibleModels).toEqual([
        { id: 'gpt-5.5', name: 'GPT-5.5', isPinned: true },
        { id: 'gpt-5.1', name: 'GPT-5.1', isPinned: true },
        { id: 'gpt-4.1', name: 'GPT-4.1' },
      ]);
    });

    it('provides English as the default input translation target language', async () => {
      vi.mocked(dbService.getAppSettings).mockResolvedValue(undefined);

      await useSettingsStore.getState().loadSettings();

      expect(useSettingsStore.getState().appSettings.translationTargetLanguage).toBe('English');
    });

    it('preserves user edits made before settings finish loading', async () => {
      const canvasPrompt = '<title>Canvas 助手：响应式视觉指南</title>\ncanvas prompt';
      vi.mocked(dbService.getAppSettings).mockResolvedValue({
        temperature: 0.5,
        language: 'zh',
      } as any);

      useSettingsStore.getState().setAppSettings((prev) => ({
        ...prev,
        systemInstruction: canvasPrompt,
      }));

      await useSettingsStore.getState().loadSettings();

      const state = useSettingsStore.getState();
      expect(state.appSettings.temperature).toBe(0.5);
      expect(state.appSettings.language).toBe('zh');
      expect(state.appSettings.systemInstruction).toBe(canvasPrompt);
      await vi.waitFor(() => {
        expect(dbService.setAppSettings).toHaveBeenCalledWith(
          expect.objectContaining({
            temperature: 0.5,
            language: 'zh',
            systemInstruction: canvasPrompt,
          }),
        );
      });
    });

    it('loads settings from DB and merges with defaults', async () => {
      vi.mocked(dbService.getAppSettings).mockResolvedValue({
        temperature: 0.5,
        language: 'zh',
      } as any);
      await useSettingsStore.getState().loadSettings();
      const state = useSettingsStore.getState();
      expect(state.appSettings.temperature).toBe(0.5);
      expect(state.appSettings.language).toBe('zh');
      expect(state.appSettings.topP).toBe(0.95);
      expect(state.isSettingsLoaded).toBe(true);
    });

    it('loads OpenAI-compatible model settings without changing the Gemini model setting', async () => {
      vi.mocked(dbService.getAppSettings).mockResolvedValue({
        modelId: 'gemini-3.1-pro-preview',
        openaiCompatibleModelId: 'openai/custom-gpt',
        openaiCompatibleModels: [{ id: 'openai/custom-gpt', name: 'Custom GPT', isPinned: true }],
      } as any);

      await useSettingsStore.getState().loadSettings();

      const { appSettings } = useSettingsStore.getState();
      expect(appSettings.modelId).toBe('gemini-3.1-pro-preview');
      expect(appSettings.openaiCompatibleModelId).toBe('openai/custom-gpt');
      expect(appSettings.openaiCompatibleModels).toEqual([
        { id: 'openai/custom-gpt', name: 'Custom GPT', isPinned: true },
      ]);
    });

    it('sets isSettingsLoaded when no stored settings', async () => {
      vi.mocked(dbService.getAppSettings).mockResolvedValue(undefined);
      await useSettingsStore.getState().loadSettings();
      expect(useSettingsStore.getState().isSettingsLoaded).toBe(true);
    });

    it('uses runtime-backed defaults when no stored settings exist', async () => {
      mockGetRuntimeConfigAppSettingsOverrides.mockReturnValue({
        serverManagedApi: true,
        useCustomApiConfig: true,
        useApiProxy: true,
        apiProxyUrl: 'https://runtime-proxy.example.com/v1beta',
      });
      useSettingsStore.setState((state) => ({
        ...state,
        appSettings: {
          ...state.appSettings,
          serverManagedApi: false,
          useCustomApiConfig: false,
          useApiProxy: false,
          apiProxyUrl: null,
        },
      }));
      vi.mocked(dbService.getAppSettings).mockResolvedValue(undefined);
      await useSettingsStore.getState().loadSettings();
      const { appSettings } = useSettingsStore.getState();
      expect(appSettings.useCustomApiConfig).toBe(true);
      expect(appSettings.useApiProxy).toBe(true);
      expect(appSettings.apiProxyUrl).toBe('https://runtime-proxy.example.com/v1beta');
      expect(appSettings.serverManagedApi).toBe(true);
    });

    it('handles DB errors gracefully', async () => {
      vi.mocked(dbService.getAppSettings).mockRejectedValue(new Error('DB fail'));
      await useSettingsStore.getState().loadSettings();
      expect(useSettingsStore.getState().isSettingsLoaded).toBe(true);
    });

    it('resolves system language to zh when browser is Chinese', async () => {
      const originalLang = navigator.language;
      Object.defineProperty(navigator, 'language', { value: 'zh-CN', configurable: true });
      vi.mocked(dbService.getAppSettings).mockResolvedValue({ language: 'system' } as any);
      await useSettingsStore.getState().loadSettings();
      expect(useSettingsStore.getState().language).toBe('zh');
      Object.defineProperty(navigator, 'language', { value: originalLang, configurable: true });
    });

    it('preserves stored settings that reference legacy Gemini 2.5 preview models', async () => {
      vi.mocked(dbService.getAppSettings).mockResolvedValue({
        modelId: 'gemini-2.5-flash-preview-09-2025',
        transcriptionModelId: 'gemini-2.5-flash-lite-preview-09-2025',
      } as any);

      await useSettingsStore.getState().loadSettings();

      const state = useSettingsStore.getState();
      expect(state.appSettings.modelId).toBe('gemini-2.5-flash-preview-09-2025');
      expect(state.appSettings.transcriptionModelId).toBe('gemini-2.5-flash-lite-preview-09-2025');
    });
  });

  describe('broadcastSettingsUpdate', () => {
    it('calls broadcastSettingsUpdate', () => {
      expect(() => useSettingsStore.getState().broadcastSettingsUpdate()).not.toThrow();
    });
  });
});
