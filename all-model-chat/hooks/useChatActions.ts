
import { useCallback } from 'react';
import { AppSettings, ChatSettings as IndividualChatSettings, SavedChatSession, UploadedFile } from '../types';
import { DEFAULT_CHAT_SETTINGS, THINKING_BUDGET_RANGES } from '../constants/appConstants';
import { getKeyForRequest, logService, generateUniqueId, getActiveApiConfig } from '../utils/appUtils';
import { geminiServiceInstance } from '../services/geminiService';

interface UseChatActionsProps {
    appSettings: AppSettings;
    activeSessionId: string | null;
    isLoading: boolean;
    currentChatSettings: IndividualChatSettings;
    selectedFiles: UploadedFile[];
    
    // State Setters
    setActiveSessionId: (id: string | null) => void;
    setIsSwitchingModel: (switching: boolean) => void;
    setAppFileError: (error: string | null) => void;
    setCurrentChatSettings: (updater: (prevSettings: IndividualChatSettings) => IndividualChatSettings) => void;
    setSelectedFiles: (files: UploadedFile[]) => void;
    
    // Functional Dependencies
    updateAndPersistSessions: (updater: (prev: SavedChatSession[]) => SavedChatSession[], options?: { persist?: boolean }) => void;
    handleStopGenerating: (options?: { silent?: boolean }) => void;
    startNewChat: () => void;
    handleTogglePinSession: (sessionId: string) => void;
    userScrolledUp: React.MutableRefObject<boolean>;
}

export const useChatActions = ({
    appSettings,
    activeSessionId,
    isLoading,
    currentChatSettings,
    selectedFiles,
    setActiveSessionId,
    setIsSwitchingModel,
    setAppFileError,
    setCurrentChatSettings,
    setSelectedFiles,
    updateAndPersistSessions,
    handleStopGenerating,
    startNewChat,
    handleTogglePinSession,
    userScrolledUp,
}: UseChatActionsProps) => {

    const handleSelectModelInHeader = useCallback((modelId: string) => {
        const newThinkingBudget = THINKING_BUDGET_RANGES[modelId]
            ? THINKING_BUDGET_RANGES[modelId].max
            : DEFAULT_CHAT_SETTINGS.thinkingBudget;

        const newSettingsPartial: Partial<IndividualChatSettings> = {
            modelId,
            thinkingBudget: newThinkingBudget,
        };

        if (!activeSessionId) {
            const newSessionId = generateUniqueId();
            const newSession: SavedChatSession = {
                id: newSessionId, title: 'New Chat', messages: [], timestamp: Date.now(), settings: { ...DEFAULT_CHAT_SETTINGS, ...appSettings, ...newSettingsPartial },
            };
            updateAndPersistSessions(prev => [newSession, ...prev]);
            setActiveSessionId(newSessionId);
        } else {
            if (isLoading) handleStopGenerating();
            if (modelId !== currentChatSettings.modelId) {
                setIsSwitchingModel(true);
                updateAndPersistSessions(prev => prev.map(s => s.id === activeSessionId ? { ...s, settings: { ...s.settings, ...newSettingsPartial } } : s));
            } else {
                if (currentChatSettings.thinkingBudget !== newThinkingBudget) {
                    setCurrentChatSettings(prev => ({...prev, thinkingBudget: newThinkingBudget}));
                }
            }
        }
        userScrolledUp.current = false;
    }, [isLoading, currentChatSettings.modelId, currentChatSettings.thinkingBudget, updateAndPersistSessions, activeSessionId, userScrolledUp, handleStopGenerating, appSettings, setActiveSessionId, setCurrentChatSettings, setIsSwitchingModel]);

    const handleClearCurrentChat = useCallback(() => {
        if (isLoading) handleStopGenerating();
        if (activeSessionId) {
            updateAndPersistSessions(prev =>
                prev.map(s =>
                    s.id === activeSessionId
                        ? {
                            ...s,
                            messages: [],
                            title: "New Chat",
                            settings: { ...s.settings, lockedApiKey: null }
                          }
                        : s
                )
            );
            setSelectedFiles([]);
        } else {
            startNewChat();
        }
    }, [isLoading, activeSessionId, handleStopGenerating, updateAndPersistSessions, setSelectedFiles, startNewChat]);

    const handleTranscribeAudio = useCallback(async (audioFile: File): Promise<string | null> => {
        logService.info('Starting transcription process...');
        setAppFileError(null);
        
        const keyResult = getKeyForRequest(appSettings, currentChatSettings);
        if ('error' in keyResult) {
            setAppFileError(keyResult.error);
            logService.error('Transcription failed: API key error.', { error: keyResult.error });
            return null;
        }
        
        if (keyResult.isNewKey) {
            const fileRequiresApi = selectedFiles.some(f => f.fileUri);
            if (!fileRequiresApi) {
                logService.info('New API key selected for this session due to transcription.');
                setCurrentChatSettings(prev => ({...prev, lockedApiKey: keyResult.key }));
            }
        }
        
        const { baseUrl } = getActiveApiConfig(appSettings);
    
        try {
            const modelToUse = appSettings.transcriptionModelId || 'models/gemini-flash-latest';
            const transcribedText = await geminiServiceInstance.transcribeAudio(
                keyResult.key,
                audioFile,
                modelToUse,
                baseUrl
            );
            return transcribedText;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
            setAppFileError(`Transcription failed: ${errorMessage}`);
            logService.error('Transcription failed in handler', { error });
            return null;
        }
    }, [appSettings, currentChatSettings, setCurrentChatSettings, setAppFileError, selectedFiles]);

    const toggleGoogleSearch = useCallback(() => {
        if (!activeSessionId) return;
        if (isLoading) handleStopGenerating();
        setCurrentChatSettings(prev => ({ ...prev, isGoogleSearchEnabled: !prev.isGoogleSearchEnabled }));
    }, [activeSessionId, isLoading, setCurrentChatSettings, handleStopGenerating]);
    
    const toggleCodeExecution = useCallback(() => {
        if (!activeSessionId) return;
        if (isLoading) handleStopGenerating();
        setCurrentChatSettings(prev => ({ ...prev, isCodeExecutionEnabled: !prev.isCodeExecutionEnabled }));
    }, [activeSessionId, isLoading, setCurrentChatSettings, handleStopGenerating]);

    const toggleUrlContext = useCallback(() => {
        if (!activeSessionId) return;
        if (isLoading) handleStopGenerating();
        setCurrentChatSettings(prev => ({ ...prev, isUrlContextEnabled: !prev.isUrlContextEnabled }));
    }, [activeSessionId, isLoading, setCurrentChatSettings, handleStopGenerating]);

    const toggleDeepSearch = useCallback(() => {
        if (!activeSessionId) return;
        if (isLoading) handleStopGenerating();
        setCurrentChatSettings(prev => ({ ...prev, isDeepSearchEnabled: !prev.isDeepSearchEnabled }));
    }, [activeSessionId, isLoading, setCurrentChatSettings, handleStopGenerating]);
    
    const handleTogglePinCurrentSession = useCallback(() => {
        if (activeSessionId) {
            handleTogglePinSession(activeSessionId);
        }
    }, [activeSessionId, handleTogglePinSession]);

    const handleUpdateMessageContent = useCallback((messageId: string, newContent: string) => {
        if (!activeSessionId) return;
        logService.info("Tampering message content", { messageId });
        updateAndPersistSessions(prev => prev.map(s => {
            if (s.id === activeSessionId) {
                return {
                    ...s,
                    messages: s.messages.map(m => m.id === messageId ? { ...m, content: newContent } : m)
                };
            }
            return s;
        }));
    }, [activeSessionId, updateAndPersistSessions]);

    return {
        handleSelectModelInHeader,
        handleClearCurrentChat,
        handleTranscribeAudio,
        toggleGoogleSearch,
        toggleCodeExecution,
        toggleUrlContext,
        toggleDeepSearch,
        handleTogglePinCurrentSession,
        handleUpdateMessageContent
    };
};
