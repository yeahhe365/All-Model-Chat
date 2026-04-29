import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAppSettings } from '../core/useAppSettings';
import { useChat } from '../chat/useChat';
import { useAppUI } from '../core/useAppUI';
import { useAppEvents } from '../core/useAppEvents';
import { usePictureInPicture } from '../core/usePictureInPicture';
import { logService } from '../../services/logService';
import { getTranslator } from '../../utils/translations';
import { applyThemeToDocument } from '../../utils/uiUtils';
import { useUIStore } from '../../stores/uiStore';
import { AppSettings, ChatSettings, ModelOption, SideViewContent } from '../../types';
import { useDataExport } from '../data-management/useDataExport';
import { useDataImport } from '../data-management/useDataImport';
import { useChatSessionExport } from '../data-management/useChatSessionExport';
import { useAppInitialization } from './useAppInitialization';
import { useAppTitle } from './useAppTitle';
import { useAppPromptModes } from './useAppPromptModes';
import { DEFAULT_THINKING_BUDGET } from '../../constants/modelConstants';
import { getModelCapabilities } from '../../utils/modelHelpers';

const focusChatInput = () => {
  setTimeout(() => {
    const textarea = document.querySelector('textarea[aria-label="Chat message input"]') as HTMLTextAreaElement | null;
    textarea?.focus();
  }, 50);
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

  const eventsState = useAppEvents({
    appSettings,
    startNewChat,
    currentChatSettings,
    availableModels: apiModels,
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

  const sessionTitle = activeChat?.title || t('newChat');

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
        await exportChatLogic(format);
      } catch (error) {
        logService.error(`Chat export failed (format: ${format})`, { error });
        alert(`Export failed: ${error instanceof Error ? error.message : String(error)}`);
      } finally {
        setExportStatus('idle');
        setIsExportModalOpen(false);
      }
    },
    [activeChat, exportChatLogic],
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
    handleLoadCanvasPromptAndSave,
    handleToggleBBoxMode,
    handleToggleGuideMode,
    handleSuggestionClick,
    isCanvasPromptActive,
    isCanvasPromptBusy,
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
    const modelIdToDisplay = currentChatSettings.modelId || appSettings.modelId;
    if (isSwitchingModel) {
      return t('appSwitchingModel');
    }

    const model = apiModels.find((candidate: ModelOption) => candidate.id === modelIdToDisplay);
    if (model) {
      return model.name;
    }

    if (modelIdToDisplay) {
      const normalizedName = modelIdToDisplay.split('/').pop()?.replace('gemini-', 'Gemini ') || modelIdToDisplay;
      return normalizedName
        .split('-')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
        .replace(' Preview ', ' Preview ');
    }

    return apiModels.length === 0 ? t('appNoModelsAvailable') : t('appNoModelSelected');
  }, [apiModels, appSettings.modelId, currentChatSettings.modelId, isSwitchingModel, t]);

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
    handleLoadCanvasPromptAndSave,
    handleToggleBBoxMode,
    handleToggleGuideMode,
    handleSuggestionClick,
    isCanvasPromptActive,
    isCanvasPromptBusy,
    handleSetThinkingLevel,
    getCurrentModelDisplayName,
    handleExportSettings: dataExport.handleExportSettings,
    handleExportHistory: dataExport.handleExportHistory,
    handleExportAllScenarios: dataExport.handleExportAllScenarios,
    handleImportSettings: dataImport.handleImportSettings,
    handleImportHistory: dataImport.handleImportHistory,
    handleImportAllScenarios: dataImport.handleImportAllScenarios,
  };
};

export type AppViewModel = ReturnType<typeof useApp>;
