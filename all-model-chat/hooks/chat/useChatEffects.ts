
import { useEffect, useRef } from 'react';
import { UploadedFile, SavedChatSession, ChatSettings, ModelOption, ChatMessage } from '../../types';
import { logService, cleanupFilePreviewUrls } from '../../utils/appUtils';

interface UseChatEffectsProps {
    activeSessionId: string | null;
    savedSessions: SavedChatSession[];
    selectedFiles: UploadedFile[];
    appFileError: string | null;
    setAppFileError: React.Dispatch<React.SetStateAction<string | null>>;
    isModelsLoading: boolean;
    apiModels: ModelOption[];
    activeChat: SavedChatSession | undefined;
    updateAndPersistSessions: (updater: (prev: SavedChatSession[]) => SavedChatSession[], options?: { persist?: boolean }) => void;
    isSwitchingModel: boolean;
    setIsSwitchingModel: (value: boolean) => void;
    currentChatSettings: ChatSettings;
    aspectRatio: string;
    setAspectRatio: (value: string) => void;
    loadInitialData: () => Promise<void>;
    loadChatSession: (id: string, sessions: SavedChatSession[]) => void;
    startNewChat: () => void;
    messages: ChatMessage[];
}

export const useChatEffects = ({
    activeSessionId,
    savedSessions,
    selectedFiles,
    appFileError,
    setAppFileError,
    isModelsLoading,
    apiModels,
    activeChat,
    updateAndPersistSessions,
    isSwitchingModel,
    setIsSwitchingModel,
    currentChatSettings,
    aspectRatio,
    setAspectRatio,
    loadInitialData,
    loadChatSession,
    startNewChat,
    messages
}: UseChatEffectsProps) => {

    // 1. Initial Data Load
    useEffect(() => {
        const loadData = async () => await loadInitialData();
        loadData();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps
    
    // 2. Session Validation
    useEffect(() => {
        if (activeSessionId && !savedSessions.find(s => s.id === activeSessionId)) {
            logService.warn(`Active session ${activeSessionId} is no longer available. Switching sessions.`);
            const sortedSessions = [...savedSessions].sort((a,b) => b.timestamp - a.timestamp);
            const nextSession = sortedSessions[0];
            if (nextSession) {
                loadChatSession(nextSession.id, sortedSessions);
            } else {
                startNewChat();
            }
        }
    }, [savedSessions, activeSessionId, loadChatSession, startNewChat]);

    // 3. Online Status Listener
    useEffect(() => {
        const handleOnline = () => {
            setAppFileError(currentError => {
                if (currentError && (currentError.toLowerCase().includes('network') || currentError.toLowerCase().includes('fetch'))) {
                    logService.info('Network restored, clearing file processing error.');
                    return null;
                }
                return currentError;
            });
        };
        window.addEventListener('online', handleOnline);
        return () => window.removeEventListener('online', handleOnline);
    }, [setAppFileError]);

    // 4. File Error Auto-Clear
    useEffect(() => {
        const isFileProcessing = selectedFiles.some(file => file.isProcessing);
        if (appFileError === 'Wait for files to finish processing.' && !isFileProcessing) {
            setAppFileError(null);
        }
    }, [selectedFiles, appFileError, setAppFileError]);

    // 5. Blob URL Cleanup (Optimized)
    // Track sessions ref to allow cleanup on unmount without triggering effect on every render
    const savedSessionsRef = useRef(savedSessions);
    useEffect(() => {
        savedSessionsRef.current = savedSessions;
    }, [savedSessions]);

    // Cleanup on unmount only
    useEffect(() => () => { 
        // Cleanup all file previews when the app unmounts/reloads
        savedSessionsRef.current.forEach(session => {
            session.messages.forEach(msg => {
                cleanupFilePreviewUrls(msg.files);
            });
        });
    }, []);

    // 6. Model Preference Auto-Correction
    useEffect(() => {
        if (!isModelsLoading && apiModels.length > 0 && activeChat && !apiModels.some(m => m.id === activeChat.settings.modelId)) {
            const preferredModelId = apiModels.find(m => m.isPinned)?.id || apiModels[0]?.id;
            if(preferredModelId) {
                updateAndPersistSessions(prev => prev.map(s => s.id === activeSessionId ? {...s, settings: {...s.settings, modelId: preferredModelId }} : s));
            }
        }
    }, [isModelsLoading, apiModels, activeChat, activeSessionId, updateAndPersistSessions]);

    // 7. Reset Switching Model State
    useEffect(() => { 
        if (isSwitchingModel) { 
            const timer = setTimeout(() => setIsSwitchingModel(false), 0); 
            return () => clearTimeout(timer); 
        } 
    }, [isSwitchingModel, setIsSwitchingModel]);

    // 8. Auto-set Aspect Ratio
    const prevModelIdRef = useRef(currentChatSettings.modelId);
    useEffect(() => {
        if (prevModelIdRef.current !== currentChatSettings.modelId) {
            const modelId = currentChatSettings.modelId;
            const isBananaModel = modelId.includes('gemini-2.5-flash-image') || modelId.includes('gemini-3-pro-image');
            
            if (isBananaModel) {
                setAspectRatio('Auto');
            } else if (aspectRatio === 'Auto') {
                setAspectRatio('1:1');
            }
            prevModelIdRef.current = modelId;
        }
    }, [currentChatSettings.modelId, aspectRatio, setAspectRatio]);
};