import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAppSettings } from '@/hooks/core/useAppSettings';
import { useChat } from '@/hooks/chat/useChat';
import { useAppUI } from '@/hooks/core/useAppUI';
import { useAppEvents } from '@/hooks/core/useAppEvents';
import { usePictureInPicture } from '@/hooks/core/usePictureInPicture';
import { logService } from '@/services/logService';
import { getTranslator } from '@/i18n/translations';
import { applyThemeToDocument } from '@/utils/uiUtils';
import { useUIStore } from '@/stores/uiStore';
import { type AppSettings, type ChatSettings, type ModelOption, type SideViewContent } from '@/types';
import { isOpenAICompatibleApiActive } from '@/utils/openaiCompatibleMode';
import { useDataExport } from '@/hooks/data-management/useDataExport';
import { useDataImport } from '@/hooks/data-management/useDataImport';
import { useChatSessionExport } from '@/hooks/data-management/useChatSessionExport';
import { useAppInitialization } from './useAppInitialization';
import { useAppTitle } from './useAppTitle';
import { focusChatInput, useAppPromptModes } from './useAppPromptModes';
import { DEFAULT_THINKING_BUDGET } from '@/constants/modelConstants';
import { getModelCapabilities } from '@/utils/modelHelpers';

const buildProviderAwareModels = (apiModels: ModelOption[]): ModelOption[] => {
  return apiModels.map((model) => ({ ...model, apiMode: 'gemini-native' as const }));
};

export const useApp = () => {
  const { appSettings, setAppSettings, currentTheme, language } = useAppSettings();
  const t = useMemo(() => getTranslator(language), [language]);

  useAppInitialization();

  const chatState = useChat(appSettings, setAppSettings, language);
  const {
    activeChat,
    activeSessionId,
    apiModels,
    currentChatSettings,
    handleSaveAllScenarios,
    handleSelectModelInHeader,
    handleSendMessage,
    handleStopGenerating,
    isLoading,
    isSwitchingModel,
    messages,
    savedGroups,
    savedScenarios,
    scrollContainerRef,
    setCommandedInput,
    setCurrentChatSettings,
    startNewChat,
    updateAndPersistGroups,
    updateAndPersistSessions,
  } = chatState;
  const uiState = useAppUI();
  const setIsHistorySidebarOpenTransient = useUIStore((state) => state.setIsHistorySidebarOpenTransient);
  const setIsLogViewerOpen = useUIStore((state) => state.setIsLogViewerOpen);

  const [sidePanelContent, setSidePanelContent] = useState<SideViewContent | null>(null);

  const handleOpenSidePanel = useCallback(
    (content: SideViewContent) => {
      setSidePanelContent(content);
      if (window.innerWidth < 1280) {
        setIsHistorySidebarOpenTransient(false);
      }
    },
    [setIsHistorySidebarOpenTransient],
  );

  const handleCloseSidePanel = useCallback(() => {
    setSidePanelContent(null);
  }, []);

  const pipState = usePictureInPicture(uiState.isHistorySidebarOpen, setIsHistorySidebarOpenTransient);

  useEffect(() => {
    if (pipState.pipWindow?.document) {
      applyThemeToDocument(pipState.pipWindow.document, currentTheme, appSettings);
    }
  }, [pipState.pipWindow, currentTheme, appSettings]);

  const providerAwareModels = useMemo(() => buildProviderAwareModels(apiModels), [apiModels]);

  const eventsState = useAppEvents({
    appSettings,
    setAppSettings,
    startNewChat,
    currentChatSettings,
    availableModels: providerAwareModels,
    handleSelectModelInHeader,
    setIsLogViewerOpen,
    onTogglePip: pipState.togglePip,
    isPipSupported: pipState.isPipSupported,
    pipWindow: pipState.pipWindow,
    isLoading,
    onStopGenerating: handleStopGenerating,
  });

  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportStatus, setExportStatus] = useState<'idle' | 'exporting'>('idle');

  const sessionTitle = activeChat?.title === 'New Chat' ? t('newChat') : activeChat?.title || t('newChat');

  useAppTitle({
    isLoading,
    messages,
    language,
    sessionTitle,
  });

  const dataExport = useDataExport({
    appSettings,
    savedGroups,
    savedScenarios,
    t,
  });

  const dataImport = useDataImport({
    setAppSettings,
    updateAndPersistSessions,
    updateAndPersistGroups,
    savedScenarios,
    handleSaveAllScenarios,
    t,
  });

  const { exportChatLogic } = useChatSessionExport({
    activeChat,
    scrollContainerRef,
    currentTheme,
    language,
    t,
  });

  const handleExportChat = useCallback(
    async (format: 'png' | 'html' | 'txt' | 'json') => {
      if (!activeChat) {
        return;
      }

      setExportStatus('exporting');
      try {
        const didExport = await exportChatLogic(format);
        if (didExport === false) {
          return;
        }
        setIsExportModalOpen(false);
      } catch (error) {
        logService.error(`Chat export failed (format: ${format})`, { error });
        alert(
          t('export_failed_with_message').replace('{message}', error instanceof Error ? error.message : String(error)),
        );
      } finally {
        setExportStatus('idle');
      }
    },
    [activeChat, exportChatLogic, t],
  );

  const handleSaveSettings = useCallback(
    (newSettings: AppSettings) => {
      setAppSettings(newSettings);
    },
    [setAppSettings],
  );

  const handleSaveCurrentChatSettings = useCallback(
    (newSettings: ChatSettings) => {
      if (!activeSessionId) {
        return;
      }

      if (newSettings.modelId !== currentChatSettings.modelId) {
        handleSelectModelInHeader(newSettings.modelId);
      }

      setCurrentChatSettings((prevChatSettings) => ({
        ...prevChatSettings,
        ...newSettings,
        lockedApiKey: null,
      }));
    },
    [activeSessionId, currentChatSettings.modelId, handleSelectModelInHeader, setCurrentChatSettings],
  );

  const {
    handleLoadLiveArtifactsPromptAndSave,
    handleToggleBBoxMode,
    handleToggleGuideMode,
    handleSuggestionClick,
    isLiveArtifactsPromptActive,
    isLiveArtifactsPromptBusy,
  } = useAppPromptModes({
    appSettings,
    setAppSettings,
    activeChat,
    activeSessionId,
    currentChatSettings,
    language,
    setCurrentChatSettings,
    handleSendMessage,
    setCommandedInput,
  });

  const handleSetThinkingLevel = useCallback(
    (level: 'MINIMAL' | 'LOW' | 'MEDIUM' | 'HIGH') => {
      const activeModelId = currentChatSettings.modelId || appSettings.modelId;
      const shouldUseThinkingPresets = getModelCapabilities(activeModelId).supportsThinkingLevel;

      setAppSettings((prev) => ({
        ...prev,
        thinkingLevel: level,
        ...(shouldUseThinkingPresets ? { thinkingBudget: DEFAULT_THINKING_BUDGET } : {}),
      }));
      if (activeSessionId) {
        setCurrentChatSettings((prev) => ({
          ...prev,
          thinkingLevel: level,
          ...(shouldUseThinkingPresets ? { thinkingBudget: DEFAULT_THINKING_BUDGET } : {}),
        }));
      }
      focusChatInput();
    },
    [activeSessionId, appSettings.modelId, currentChatSettings.modelId, setAppSettings, setCurrentChatSettings],
  );

  const getCurrentModelDisplayName = useCallback(() => {
    const isOpenAICompatibleMode = isOpenAICompatibleApiActive({
      apiMode: appSettings.apiMode,
      isOpenAICompatibleApiEnabled: appSettings.isOpenAICompatibleApiEnabled,
    });
    const modelIdToDisplay = isOpenAICompatibleMode
      ? appSettings.openaiCompatibleModelId
      : currentChatSettings.modelId || appSettings.modelId;
    const availableModels = isOpenAICompatibleMode ? appSettings.openaiCompatibleModels : apiModels;

    if (isSwitchingModel) {
      return t('appSwitchingModel');
    }

    const model = availableModels.find((candidate: ModelOption) => candidate.id === modelIdToDisplay);
    if (model) {
      return model.name;
    }

    if (modelIdToDisplay) {
      const shortName = modelIdToDisplay.split('/').pop() || modelIdToDisplay;
      if (shortName.toLowerCase().startsWith('gpt-')) {
        return shortName.replace(/^gpt/i, 'GPT');
      }

      const normalizedName = shortName.replace('gemini-', 'Gemini ');
      return normalizedName
        .split('-')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
        .replace(' Preview ', ' Preview ');
    }

    return availableModels.length === 0 ? t('appNoModelsAvailable') : t('appNoModelSelected');
  }, [
    apiModels,
    appSettings.apiMode,
    appSettings.isOpenAICompatibleApiEnabled,
    appSettings.modelId,
    appSettings.openaiCompatibleModelId,
    appSettings.openaiCompatibleModels,
    currentChatSettings.modelId,
    isSwitchingModel,
    t,
  ]);

  return {
    appSettings,
    setAppSettings,
    currentTheme,
    language,
    t,
    chatState,
    uiState,
    pipState,
    eventsState,
    sidePanelContent,
    handleOpenSidePanel,
    handleCloseSidePanel,
    isExportModalOpen,
    setIsExportModalOpen,
    exportStatus,
    handleExportChat,
    activeChat,
    sessionTitle,
    handleSaveSettings,
    handleSaveCurrentChatSettings,
    handleLoadLiveArtifactsPromptAndSave,
    handleToggleBBoxMode,
    handleToggleGuideMode,
    handleSuggestionClick,
    isLiveArtifactsPromptActive,
    isLiveArtifactsPromptBusy,
    handleSetThinkingLevel,
    getCurrentModelDisplayName,
    handleExportAllScenarios: dataExport.handleExportAllScenarios,
    handleImportAllScenarios: dataImport.handleImportAllScenarios,
  };
};

export type AppViewModel = ReturnType<typeof useApp>;
