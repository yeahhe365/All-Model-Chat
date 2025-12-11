
import { useCallback } from 'react';
import { AppSettings, ChatSettings as IndividualChatSettings, SavedChatSession, UploadedFile, VideoMetadata } from '../types';
import { DEFAULT_CHAT_SETTINGS, THINKING_BUDGET_RANGES } from '../constants/appConstants';
import { getKeyForRequest, logService, createNewSession, cacheModelSettings, getCachedModelSettings } from '../utils/appUtils';
import { geminiServiceInstance } from '../services/geminiService';
import { MediaResolution } from '../types/settings';

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
        // Resolve target settings based on context (Session vs Global)
        const sourceSettings = activeSessionId ? currentChatSettings : appSettings;
        
        // 1. Cache CURRENT model settings before switching
        if (currentChatSettings.modelId) {
            cacheModelSettings(currentChatSettings.modelId, { 
                mediaResolution: currentChatSettings.mediaResolution,
                thinkingBudget: currentChatSettings.thinkingBudget,
                thinkingLevel: currentChatSettings.thinkingLevel
            });
        }

        // 2. Retrieve CACHED settings for NEW model
        const cached = getCachedModelSettings(modelId);

        // 3. Determine new settings
        const newMediaResolution = cached?.mediaResolution ?? sourceSettings.mediaResolution ?? MediaResolution.MEDIA_RESOLUTION_UNSPECIFIED;
        let newThinkingBudget = cached?.thinkingBudget ?? sourceSettings.thinkingBudget;
        const newThinkingLevel = cached?.thinkingLevel ?? sourceSettings.thinkingLevel;

        // Validating range compatibility for the new model (and fallback defaults if not cached)
        const range = THINKING_BUDGET_RANGES[modelId];
        if (range) {
            const isGemini3 = modelId.includes('gemini-3');

            // If we didn't have a cached budget, apply defaults
            if (cached?.thinkingBudget === undefined) {
                if (!isGemini3 && newThinkingBudget !== 0) {
                    // For non-Gemini 3 models (e.g. 2.5), default to MAX budget if reasoning isn't disabled.
                    // This ensures we utilize the full capability of the model by default when switching.
                    newThinkingBudget = range.max;
                }
            }

            // Always clamp budget if set (>0) to ensure validity for this model
            if (newThinkingBudget > 0) {
                if (newThinkingBudget > range.max) newThinkingBudget = range.max;
                if (newThinkingBudget < range.min) newThinkingBudget = range.min;
            }
        }

        const newSettingsPartial: Partial<IndividualChatSettings> = {
            modelId,
            thinkingBudget: newThinkingBudget,
            thinkingLevel: newThinkingLevel,
            mediaResolution: newMediaResolution,
        };

        if (!activeSessionId) {
            const sessionSettings = { ...DEFAULT_CHAT_SETTINGS, ...appSettings, ...newSettingsPartial };
            const newSession = createNewSession(sessionSettings);
            
            updateAndPersistSessions(prev => [newSession, ...prev]);
            setActiveSessionId(newSession.id);
        } else {
            if (isLoading) handleStopGenerating();
            if (modelId !== currentChatSettings.modelId) {
                setIsSwitchingModel(true);
                updateAndPersistSessions(prev => prev.map(s => s.id === activeSessionId ? { ...s, settings: { ...s.settings, ...newSettingsPartial } } : s));
            } else {
                // If model is same but somehow we are updating params (rare here)
                if (currentChatSettings.thinkingBudget !== newThinkingBudget || currentChatSettings.thinkingLevel !== newThinkingLevel) {
                    setCurrentChatSettings(prev => ({
                        ...prev, 
                        thinkingBudget: newThinkingBudget, 
                        thinkingLevel: newThinkingLevel
                    }));
                }
            }
        }
        userScrolledUp.current = false;
    }, [isLoading, currentChatSettings, updateAndPersistSessions, activeSessionId, userScrolledUp, handleStopGenerating, appSettings, setActiveSessionId, setCurrentChatSettings, setIsSwitchingModel]);

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
                            // Resetting lockedApiKey is crucial to allow using new global settings
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
    
        try {
            const modelToUse = appSettings.transcriptionModelId || 'models/gemini-flash-latest';
            const transcribedText = await geminiServiceInstance.transcribeAudio(
                keyResult.key,
                audioFile,
                modelToUse
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

    const handleUpdateMessageFile = useCallback((messageId: string, fileId: string, updates: { videoMetadata?: VideoMetadata, mediaResolution?: MediaResolution }) => {
        if (!activeSessionId) return;
        updateAndPersistSessions(prev => prev.map(s => {
            if (s.id === activeSessionId) {
                return {
                    ...s,
                    messages: s.messages.map(m => {
                        if (m.id === messageId && m.files) {
                            return {
                                ...m,
                                files: m.files.map(f => f.id === fileId ? { ...f, ...updates } : f)
                            };
                        }
                        return m;
                    })
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
        handleUpdateMessageContent,
        handleUpdateMessageFile,
    };
};
