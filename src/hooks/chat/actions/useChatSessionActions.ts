
import { useCallback } from 'react';
import { ChatSettings as IndividualChatSettings, SavedChatSession, UploadedFile } from '../../../types';
import { cleanupFilePreviewUrls } from '../../../utils/appUtils';

interface UseChatSessionActionsProps {
    activeSessionId: string | null;
    isLoading: boolean;
    updateAndPersistSessions: (updater: (prev: SavedChatSession[]) => SavedChatSession[], options?: { persist?: boolean }) => void;
    setCurrentChatSettings: (updater: (prevSettings: IndividualChatSettings) => IndividualChatSettings) => void;
    setSelectedFiles: (files: UploadedFile[]) => void;
    handleStopGenerating: () => void;
    startNewChat: () => void;
    handleTogglePinSession: (sessionId: string) => void;
}

export const useChatSessionActions = ({
    activeSessionId,
    isLoading,
    updateAndPersistSessions,
    setCurrentChatSettings,
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
        setCurrentChatSettings(prev => ({ ...prev, isGoogleSearchEnabled: !prev.isGoogleSearchEnabled }));
    }, [activeSessionId, isLoading, setCurrentChatSettings, handleStopGenerating]);
    
    const toggleCodeExecution = useCallback(() => {
        if (!activeSessionId) return;
        if (isLoading) handleStopGenerating();
        // Mutually exclusive: Disable Local Python if enabling Server Code Execution
        setCurrentChatSettings(prev => ({ 
            ...prev, 
            isCodeExecutionEnabled: !prev.isCodeExecutionEnabled,
            isLocalPythonEnabled: !prev.isCodeExecutionEnabled ? false : prev.isLocalPythonEnabled
        }));
    }, [activeSessionId, isLoading, setCurrentChatSettings, handleStopGenerating]);

    const toggleLocalPython = useCallback(() => {
        if (!activeSessionId) return;
        if (isLoading) handleStopGenerating();
        // Mutually exclusive: Disable Server Code Execution if enabling Local Python
        setCurrentChatSettings(prev => ({ 
            ...prev, 
            isLocalPythonEnabled: !prev.isLocalPythonEnabled,
            isCodeExecutionEnabled: !prev.isLocalPythonEnabled ? false : prev.isCodeExecutionEnabled
        }));
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

    return {
        handleClearCurrentChat,
        handleTogglePinCurrentSession,
        toggleGoogleSearch,
        toggleCodeExecution,
        toggleLocalPython,
        toggleUrlContext,
        toggleDeepSearch
    };
};
