
import { useCallback } from 'react';
import { AppSettings, ChatSettings as IndividualChatSettings, SavedChatSession, UploadedFile } from '../../../types';
import { cleanupFilePreviewUrls } from '../../../utils/appUtils';

interface UseChatSessionActionsProps {
    activeSessionId: string | null;
    isLoading: boolean;
    currentChatSettings: IndividualChatSettings;
    updateAndPersistSessions: (updater: (prev: SavedChatSession[]) => SavedChatSession[], options?: { persist?: boolean }) => void;
    setCurrentChatSettings: (updater: (prevSettings: IndividualChatSettings) => IndividualChatSettings) => void;
    setAppSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
    setSelectedFiles: (files: UploadedFile[]) => void;
    handleStopGenerating: () => void;
    startNewChat: () => void;
    handleTogglePinSession: (sessionId: string) => void;
}

export const useChatSessionActions = ({
    activeSessionId,
    isLoading,
    currentChatSettings,
    updateAndPersistSessions,
    setCurrentChatSettings,
    setAppSettings,
    setSelectedFiles,
    handleStopGenerating,
    startNewChat,
    handleTogglePinSession
}: UseChatSessionActionsProps) => {

    const handleClearCurrentChat = useCallback(() => {
        if (isLoading) handleStopGenerating();
        if (activeSessionId) {
            updateAndPersistSessions(prev =>
                prev.map(s => {
                    if (s.id === activeSessionId) {
                        // Cleanup files in the cleared session
                        s.messages.forEach(msg => cleanupFilePreviewUrls(msg.files));
                        
                        return {
                            ...s,
                            messages: [],
                            title: "New Chat",
                            // Resetting lockedApiKey is crucial to allow using new global settings
                            settings: { ...s.settings, lockedApiKey: null }
                        };
                    }
                    return s;
                })
            );
            setSelectedFiles([]);
        } else {
            startNewChat();
        }
    }, [isLoading, activeSessionId, handleStopGenerating, updateAndPersistSessions, setSelectedFiles, startNewChat]);

    const handleTogglePinCurrentSession = useCallback(() => {
        if (activeSessionId) {
            handleTogglePinSession(activeSessionId);
        }
    }, [activeSessionId, handleTogglePinSession]);

    const toggleGoogleSearch = useCallback(() => {
        if (!activeSessionId) return;
        if (isLoading) handleStopGenerating();
        const newValue = !currentChatSettings.isGoogleSearchEnabled;
        
        // Update both session and global sticky setting
        setCurrentChatSettings(prev => ({ ...prev, isGoogleSearchEnabled: newValue }));
        setAppSettings(prev => ({ ...prev, isGoogleSearchEnabled: newValue }));
    }, [activeSessionId, isLoading, currentChatSettings.isGoogleSearchEnabled, setCurrentChatSettings, handleStopGenerating, setAppSettings]);
    
    const toggleCodeExecution = useCallback(() => {
        if (!activeSessionId) return;
        if (isLoading) handleStopGenerating();
        const newValue = !currentChatSettings.isCodeExecutionEnabled;
        
        setCurrentChatSettings(prev => ({ ...prev, isCodeExecutionEnabled: newValue }));
        setAppSettings(prev => ({ ...prev, isCodeExecutionEnabled: newValue }));
    }, [activeSessionId, isLoading, currentChatSettings.isCodeExecutionEnabled, setCurrentChatSettings, handleStopGenerating, setAppSettings]);

    const toggleUrlContext = useCallback(() => {
        if (!activeSessionId) return;
        if (isLoading) handleStopGenerating();
        const newValue = !currentChatSettings.isUrlContextEnabled;
        
        setCurrentChatSettings(prev => ({ ...prev, isUrlContextEnabled: newValue }));
        setAppSettings(prev => ({ ...prev, isUrlContextEnabled: newValue }));
    }, [activeSessionId, isLoading, currentChatSettings.isUrlContextEnabled, setCurrentChatSettings, handleStopGenerating, setAppSettings]);

    const toggleDeepSearch = useCallback(() => {
        if (!activeSessionId) return;
        if (isLoading) handleStopGenerating();
        const newValue = !currentChatSettings.isDeepSearchEnabled;
        
        setCurrentChatSettings(prev => ({ ...prev, isDeepSearchEnabled: newValue }));
        setAppSettings(prev => ({ ...prev, isDeepSearchEnabled: newValue }));
    }, [activeSessionId, isLoading, currentChatSettings.isDeepSearchEnabled, setCurrentChatSettings, handleStopGenerating, setAppSettings]);

    return {
        handleClearCurrentChat,
        handleTogglePinCurrentSession,
        toggleGoogleSearch,
        toggleCodeExecution,
        toggleUrlContext,
        toggleDeepSearch
    };
};
