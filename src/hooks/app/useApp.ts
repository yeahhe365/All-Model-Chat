import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAppSettings } from '../core/useAppSettings';
import { useChat } from '../chat/useChat';
import { useAppUI } from '../core/useAppUI';
import { useAppEvents } from '../core/useAppEvents';
import { usePictureInPicture } from '../core/usePictureInPicture';
import { getTranslator, applyThemeToDocument, logService } from '../../utils/appUtils';
import { useUIStore } from '../../stores/uiStore';
import {
  DEFAULT_CHAT_SETTINGS,
  DEFAULT_SYSTEM_INSTRUCTION,
} from '../../constants/appConstants';
import {
  isBboxSystemInstruction,
  isCanvasSystemInstruction,
  isHdGuideSystemInstruction,
  loadBboxSystemPrompt,
  loadCanvasSystemPrompt,
  loadHdGuideSystemPrompt,
} from '../../constants/promptHelpers';
import { AppSettings, ChatSettings, ModelOption, SideViewContent } from '../../types';
import { useDataExport } from '../data-management/useDataExport';
import { useDataImport } from '../data-management/useDataImport';
import { useChatSessionExport } from '../data-management/useChatSessionExport';
import { useAppInitialization } from './useAppInitialization';
import { useAppTitle } from './useAppTitle';

const focusChatInput = () => {
  setTimeout(() => {
    const textarea = document.querySelector(
      'textarea[aria-label="Chat message input"]'
    ) as HTMLTextAreaElement | null;
    textarea?.focus();
  }, 50);
};

export const useApp = () => {
  const { appSettings, setAppSettings, currentTheme, language } = useAppSettings();
  const t = useMemo(() => getTranslator(language), [language]);

  useAppInitialization();

  const chatState = useChat(appSettings, setAppSettings, language);
  const {
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
    savedSessions,
    scrollContainerRef,
    setCommandedInput,
    setCurrentChatSettings,
    startNewChat,
    updateAndPersistGroups,
    updateAndPersistSessions,
  } = chatState;
  const uiState = useAppUI();
  const setIsHistorySidebarOpen = useUIStore((state) => state.setIsHistorySidebarOpen);
  const setIsLogViewerOpen = useUIStore((state) => state.setIsLogViewerOpen);

  const [sidePanelContent, setSidePanelContent] = useState<SideViewContent | null>(null);

  const handleOpenSidePanel = useCallback(
    (content: SideViewContent) => {
      setSidePanelContent(content);
      if (window.innerWidth < 1280) {
        setIsHistorySidebarOpen(false);
      }
    },
    [setIsHistorySidebarOpen]
  );

  const handleCloseSidePanel = useCallback(() => {
    setSidePanelContent(null);
  }, []);

  const pipState = usePictureInPicture(setIsHistorySidebarOpen);

  useEffect(() => {
    if (pipState.pipWindow?.document) {
      applyThemeToDocument(pipState.pipWindow.document, currentTheme, appSettings);
    }
  }, [pipState.pipWindow, currentTheme, appSettings]);

  const eventsState = useAppEvents({
    appSettings,
    startNewChat,
    currentChatSettings,
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

  const activeChat = savedSessions.find((session) => session.id === activeSessionId);
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
    [activeChat, exportChatLogic]
  );

  const handleSaveSettings = useCallback(
    (newSettings: AppSettings) => {
      setAppSettings(newSettings);

      if (activeSessionId) {
      setCurrentChatSettings((prevChatSettings) => {
          const sessionOverrides = Object.fromEntries(
            (Object.keys(DEFAULT_CHAT_SETTINGS) as Array<keyof ChatSettings>)
              .filter((key) => key !== 'lockedApiKey' && key in newSettings)
              .map((key) => [key, newSettings[key]])
          ) as Partial<ChatSettings>;

          return {
            ...prevChatSettings,
            ...sessionOverrides,
            lockedApiKey: null,
          };
        });
      }
    },
    [activeSessionId, setAppSettings, setCurrentChatSettings]
  );

  const handleLoadCanvasPromptAndSave = useCallback(async () => {
    const isCurrentlyCanvasPrompt = isCanvasSystemInstruction(currentChatSettings.systemInstruction);
    const newSystemInstruction = isCurrentlyCanvasPrompt
      ? DEFAULT_SYSTEM_INSTRUCTION
      : await loadCanvasSystemPrompt();

    setAppSettings((prev) => ({ ...prev, systemInstruction: newSystemInstruction }));
    if (activeSessionId) {
      setCurrentChatSettings((prev) => ({
        ...prev,
        systemInstruction: newSystemInstruction,
      }));
    }

    focusChatInput();
  }, [activeSessionId, currentChatSettings.systemInstruction, setAppSettings, setCurrentChatSettings]);

  const handleToggleBBoxMode = useCallback(async () => {
    const isCurrentlyBBox = isBboxSystemInstruction(currentChatSettings.systemInstruction);

    if (isCurrentlyBBox) {
      setAppSettings((prev) => ({
        ...prev,
        systemInstruction: DEFAULT_SYSTEM_INSTRUCTION,
        isCodeExecutionEnabled: false,
      }));
      if (activeSessionId) {
        setCurrentChatSettings((prev) => ({
          ...prev,
          systemInstruction: DEFAULT_SYSTEM_INSTRUCTION,
          isCodeExecutionEnabled: false,
        }));
      }
      return;
    }

    const bboxPrompt = await loadBboxSystemPrompt();
    setAppSettings((prev) => ({
      ...prev,
      systemInstruction: bboxPrompt,
      isCodeExecutionEnabled: true,
    }));
    if (activeSessionId) {
      setCurrentChatSettings((prev) => ({
        ...prev,
        systemInstruction: bboxPrompt,
        isCodeExecutionEnabled: true,
      }));
    }
  }, [activeSessionId, currentChatSettings.systemInstruction, setAppSettings, setCurrentChatSettings]);

  const handleToggleGuideMode = useCallback(async () => {
    const isCurrentlyGuide = isHdGuideSystemInstruction(currentChatSettings.systemInstruction);

    if (isCurrentlyGuide) {
      setAppSettings((prev) => ({
        ...prev,
        systemInstruction: DEFAULT_SYSTEM_INSTRUCTION,
        isCodeExecutionEnabled: false,
      }));
      if (activeSessionId) {
        setCurrentChatSettings((prev) => ({
          ...prev,
          systemInstruction: DEFAULT_SYSTEM_INSTRUCTION,
          isCodeExecutionEnabled: false,
        }));
      }
      return;
    }

    const guidePrompt = await loadHdGuideSystemPrompt();
    setAppSettings((prev) => ({
      ...prev,
      systemInstruction: guidePrompt,
      isCodeExecutionEnabled: true,
    }));
    if (activeSessionId) {
      setCurrentChatSettings((prev) => ({
        ...prev,
        systemInstruction: guidePrompt,
        isCodeExecutionEnabled: true,
      }));
    }
  }, [activeSessionId, currentChatSettings.systemInstruction, setAppSettings, setCurrentChatSettings]);

  const handleSuggestionClick = useCallback(
    async (type: 'homepage' | 'organize' | 'follow-up', text: string) => {
      const { isAutoSendOnSuggestionClick } = appSettings;

      if (
        type === 'organize' &&
        !isCanvasSystemInstruction(currentChatSettings.systemInstruction)
      ) {
        const newSystemInstruction = await loadCanvasSystemPrompt();
        setAppSettings((prev) => ({ ...prev, systemInstruction: newSystemInstruction }));
        if (activeSessionId) {
          setCurrentChatSettings((prev) => ({
            ...prev,
            systemInstruction: newSystemInstruction,
          }));
        }
      }

      if (type === 'follow-up' && (isAutoSendOnSuggestionClick ?? true)) {
        handleSendMessage({ text });
        return;
      }

      setCommandedInput({ text: `${text}\n`, id: Date.now() });
      setTimeout(() => {
        const textarea = document.querySelector(
          'textarea[aria-label="Chat message input"]'
        ) as HTMLTextAreaElement | null;
        textarea?.focus();
      }, 0);
    },
    [
      activeSessionId,
      currentChatSettings.systemInstruction,
      handleSendMessage,
      setCommandedInput,
      setAppSettings,
      setCurrentChatSettings,
      appSettings,
    ]
  );

  const handleSetThinkingLevel = useCallback(
    (level: 'MINIMAL' | 'LOW' | 'MEDIUM' | 'HIGH') => {
      setAppSettings((prev) => ({ ...prev, thinkingLevel: level }));
      if (activeSessionId) {
        setCurrentChatSettings((prev) => ({ ...prev, thinkingLevel: level }));
      }
      focusChatInput();
    },
    [activeSessionId, setAppSettings, setCurrentChatSettings]
  );

  const getCurrentModelDisplayName = useCallback(() => {
    const modelIdToDisplay = currentChatSettings.modelId || appSettings.modelId;
    if (isSwitchingModel) {
      return t('appSwitchingModel');
    }

    const model = apiModels.find(
      (candidate: ModelOption) => candidate.id === modelIdToDisplay
    );
    if (model) {
      return model.name;
    }

    if (modelIdToDisplay) {
      const normalizedName =
        modelIdToDisplay.split('/').pop()?.replace('gemini-', 'Gemini ') || modelIdToDisplay;
      return normalizedName
        .split('-')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
        .replace(' Preview ', ' Preview ');
    }

    return apiModels.length === 0
      ? t('appNoModelsAvailable')
      : t('appNoModelSelected');
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
    handleLoadCanvasPromptAndSave,
    handleToggleBBoxMode,
    handleToggleGuideMode,
    handleSuggestionClick,
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
