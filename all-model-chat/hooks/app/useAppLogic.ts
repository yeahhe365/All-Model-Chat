
import { useState, useEffect, useMemo, useCallback } from 'react';
import { AppSettings, ChatMessage, SideViewContent } from '../../types';
import { CANVAS_SYSTEM_PROMPT, DEFAULT_SYSTEM_INSTRUCTION, BBOX_SYSTEM_PROMPT } from '../../constants/appConstants';
import { useAppSettings } from '../core/useAppSettings';
import { useChat } from '../chat/useChat';
import { useAppUI } from '../core/useAppUI';
import { useAppEvents } from '../core/useAppEvents';
import { usePictureInPicture } from '../core/usePictureInPicture';
import { useDataManagement } from '../useDataManagement';
import { getTranslator, logService, applyThemeToDocument } from '../../utils/appUtils';
import { networkInterceptor } from '../../services/networkInterceptor';

export const useAppLogic = () => {
  const { appSettings, setAppSettings, currentTheme, language } = useAppSettings();
  const t = useMemo(() => getTranslator(language), [language]);

  // Initialize Network Interceptor
  useEffect(() => {
      networkInterceptor.mount();
  }, []);

  // Update Interceptor Configuration when settings change
  useEffect(() => {
      const shouldUseProxy = appSettings.useCustomApiConfig && appSettings.useApiProxy;
      networkInterceptor.configure(!!shouldUseProxy, appSettings.apiProxyUrl);
  }, [appSettings.useCustomApiConfig, appSettings.useApiProxy, appSettings.apiProxyUrl]);

  const chatState = useChat(appSettings, setAppSettings, language);
  
  const uiState = useAppUI();
  const { setIsHistorySidebarOpen } = uiState;
  
  // Side Panel State
  const [sidePanelContent, setSidePanelContent] = useState<SideViewContent | null>(null);
  
  const handleOpenSidePanel = useCallback((content: SideViewContent) => {
      setSidePanelContent(content);
      // Auto-collapse sidebar on smaller screens if opening side panel to save space
      if (window.innerWidth < 1280) {
          setIsHistorySidebarOpen(false);
      }
  }, [setIsHistorySidebarOpen]);

  const handleCloseSidePanel = useCallback(() => {
      setSidePanelContent(null);
  }, []);

  const pipState = usePictureInPicture(uiState.setIsHistorySidebarOpen);

  // Sync styles to PiP window when theme changes
  useEffect(() => {
    if (pipState.pipWindow && pipState.pipWindow.document) {
        applyThemeToDocument(pipState.pipWindow.document, currentTheme, appSettings);
    }
  }, [pipState.pipWindow, currentTheme, appSettings]);

  const eventsState = useAppEvents({
    appSettings,
    startNewChat: chatState.startNewChat,
    handleClearCurrentChat: chatState.handleClearCurrentChat,
    currentChatSettings: chatState.currentChatSettings,
    handleSelectModelInHeader: chatState.handleSelectModelInHeader,
    isSettingsModalOpen: uiState.isSettingsModalOpen,
    isPreloadedMessagesModalOpen: uiState.isPreloadedMessagesModalOpen,
    setIsLogViewerOpen: uiState.setIsLogViewerOpen,
    onTogglePip: pipState.togglePip,
    isPipSupported: pipState.isPipSupported,
    pipWindow: pipState.pipWindow,
    isLoading: chatState.isLoading,
    onStopGenerating: chatState.handleStopGenerating
  });

  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportStatus, setExportStatus] = useState<'idle' | 'exporting'>('idle');
  
  const activeChat = chatState.savedSessions.find(s => s.id === chatState.activeSessionId);
  const sessionTitle = activeChat?.title || t('newChat');

  const dataManagement = useDataManagement({
    appSettings, 
    setAppSettings, 
    savedSessions: chatState.savedSessions, 
    updateAndPersistSessions: chatState.updateAndPersistSessions,
    savedGroups: chatState.savedGroups, 
    updateAndPersistGroups: chatState.updateAndPersistGroups, 
    savedScenarios: chatState.savedScenarios, 
    handleSaveAllScenarios: chatState.handleSaveAllScenarios,
    t, 
    activeChat, 
    scrollContainerRef: chatState.scrollContainerRef, 
    currentTheme, 
    language,
  });

  const handleExportChat = useCallback(async (format: 'png' | 'html' | 'txt' | 'json') => {
    if (!activeChat) return;
    setExportStatus('exporting');
    try {
      await dataManagement.exportChatLogic(format);
    } catch (error) {
        logService.error(`Chat export failed (format: ${format})`, { error });
        alert(`Export failed: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
        setExportStatus('idle');
        setIsExportModalOpen(false);
    }
  }, [activeChat, dataManagement]);

  useEffect(() => {
    logService.info('App initialized.');
  }, []);
  
  const { activeSessionId, setCurrentChatSettings } = chatState;

  const handleSaveSettings = useCallback((newSettings: AppSettings) => {
    setAppSettings(newSettings);
    if (activeSessionId && setCurrentChatSettings) {
      setCurrentChatSettings(prevChatSettings => ({
        ...prevChatSettings,
        modelId: newSettings.modelId,
        temperature: newSettings.temperature,
        topP: newSettings.topP,
        systemInstruction: newSettings.systemInstruction,
        showThoughts: newSettings.showThoughts,
        ttsVoice: newSettings.ttsVoice,
        thinkingBudget: newSettings.thinkingBudget,
        thinkingLevel: newSettings.thinkingLevel,
        lockedApiKey: null,
        mediaResolution: newSettings.mediaResolution,
        safetySettings: newSettings.safetySettings,
      }));
    }
  }, [setAppSettings, activeSessionId, setCurrentChatSettings]);

  const { currentChatSettings } = chatState;

  const handleLoadCanvasPromptAndSave = useCallback(() => {
    const isCurrentlyCanvasPrompt = currentChatSettings.systemInstruction === CANVAS_SYSTEM_PROMPT;
    const newSystemInstruction = isCurrentlyCanvasPrompt ? DEFAULT_SYSTEM_INSTRUCTION : CANVAS_SYSTEM_PROMPT;
    setAppSettings(prev => ({...prev, systemInstruction: newSystemInstruction}));
    if (activeSessionId && setCurrentChatSettings) {
        setCurrentChatSettings(prevSettings => ({ ...prevSettings, systemInstruction: newSystemInstruction }));
    }
    
    // Focus input after toggling canvas mode
    setTimeout(() => {
        const textarea = document.querySelector('textarea[aria-label="Chat message input"]') as HTMLTextAreaElement;
        if (textarea) textarea.focus();
    }, 50);
  }, [currentChatSettings.systemInstruction, setAppSettings, activeSessionId, setCurrentChatSettings]);

  const handleToggleBBoxMode = useCallback(() => {
    const isCurrentlyBBox = currentChatSettings.systemInstruction === BBOX_SYSTEM_PROMPT;
    if (isCurrentlyBBox) {
        setAppSettings(prev => ({...prev, systemInstruction: DEFAULT_SYSTEM_INSTRUCTION, isCodeExecutionEnabled: false}));
        if (activeSessionId && setCurrentChatSettings) {
            setCurrentChatSettings(prev => ({ ...prev, systemInstruction: DEFAULT_SYSTEM_INSTRUCTION, isCodeExecutionEnabled: false }));
        }
    } else {
        setAppSettings(prev => ({...prev, systemInstruction: BBOX_SYSTEM_PROMPT, isCodeExecutionEnabled: true}));
        if (activeSessionId && setCurrentChatSettings) {
            setCurrentChatSettings(prev => ({
                ...prev,
                systemInstruction: BBOX_SYSTEM_PROMPT,
                isCodeExecutionEnabled: true // Force enable code execution
            }));
        }
    }
  }, [currentChatSettings.systemInstruction, setAppSettings, activeSessionId, setCurrentChatSettings]);
  
  const { isAutoSendOnSuggestionClick } = appSettings;
  const { handleSendMessage, setCommandedInput } = chatState;

  const handleSuggestionClick = useCallback((type: 'homepage' | 'organize' | 'follow-up', text: string) => {
    if (type === 'organize') {
        if (currentChatSettings.systemInstruction !== CANVAS_SYSTEM_PROMPT) {
            const newSystemInstruction = CANVAS_SYSTEM_PROMPT;
            setAppSettings(prev => ({...prev, systemInstruction: newSystemInstruction}));
            if (activeSessionId && setCurrentChatSettings) {
                setCurrentChatSettings(prevSettings => ({ ...prevSettings, systemInstruction: newSystemInstruction }));
            }
        }
    }
    if (type === 'follow-up' && (isAutoSendOnSuggestionClick ?? true)) {
        handleSendMessage({ text });
    } else {
        setCommandedInput({ text: text + '\n', id: Date.now() });
        setTimeout(() => {
            const textarea = document.querySelector('textarea[aria-label="Chat message input"]') as HTMLTextAreaElement;
            if (textarea) textarea.focus();
        }, 0);
    }
  }, [currentChatSettings.systemInstruction, isAutoSendOnSuggestionClick, handleSendMessage, setCommandedInput, setAppSettings, activeSessionId, setCurrentChatSettings]);

  const handleSetThinkingLevel = useCallback((level: 'LOW' | 'HIGH') => {
    setAppSettings(prev => ({ ...prev, thinkingLevel: level }));
    if (activeSessionId && setCurrentChatSettings) {
        setCurrentChatSettings(prev => ({ ...prev, thinkingLevel: level }));
    }
  }, [setAppSettings, activeSessionId, setCurrentChatSettings]);

  const { apiModels, isSwitchingModel } = chatState;

  const getCurrentModelDisplayName = useCallback(() => {
    const modelIdToDisplay = currentChatSettings.modelId || appSettings.modelId;
    if (isSwitchingModel) return t('appSwitchingModel');
    const model = apiModels.find(m => m.id === modelIdToDisplay);
    if (model) return model.name;
    if (modelIdToDisplay) { 
        let n = modelIdToDisplay.split('/').pop()?.replace('gemini-','Gemini ') || modelIdToDisplay; 
        return n.split('-').map(w=>w.charAt(0).toUpperCase()+w.slice(1)).join(' ').replace(' Preview ',' Preview ');
    }
    return apiModels.length === 0 ? t('appNoModelsAvailable') : t('appNoModelSelected');
  }, [currentChatSettings.modelId, appSettings.modelId, isSwitchingModel, apiModels, t]);

  return {
    appSettings, setAppSettings, currentTheme, language, t,
    chatState, uiState, pipState, eventsState, dataManagement,
    sidePanelContent, handleOpenSidePanel, handleCloseSidePanel,
    isExportModalOpen, setIsExportModalOpen, exportStatus, handleExportChat,
    activeChat, sessionTitle,
    handleSaveSettings,
    handleLoadCanvasPromptAndSave,
    handleToggleBBoxMode,
    handleSuggestionClick,
    handleSetThinkingLevel,
    getCurrentModelDisplayName
  };
};
