
import { useEffect, useRef, useState } from 'react';
import { UploadedFile, SavedChatSession, ChatSettings, ModelOption } from '../../types';
import { logService } from '../../services/logService';
import { cleanupFilePreviewUrls } from '../../utils/fileHelpers';
import { getModelCapabilities, normalizeAspectRatioForModel, normalizeImageSizeForModel } from '../../utils/modelHelpers';

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
    imageSize: string;
    setImageSize: (value: string) => void;
    loadInitialData: () => Promise<void>;
    loadChatSession: (id: string) => void;
    startNewChat: () => void;
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
    imageSize,
    setImageSize,
    loadInitialData,
    loadChatSession,
    startNewChat
}: UseChatEffectsProps) => {
    const [hasLoadedInitialData, setHasLoadedInitialData] = useState(false);

    // 1. Initial Data Load
    useEffect(() => {
        const loadData = async () => {
            try {
                await loadInitialData();
            } finally {
                setHasLoadedInitialData(true);
            }
        };
        void loadData();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps
    
    // 2. Session Validation
    // This effect ensures that if the activeSessionId points to a session that doesn't exist in savedSessions
    // (e.g. deleted), we switch to another valid session or new chat.
    useEffect(() => {
        if (hasLoadedInitialData && activeSessionId && !savedSessions.find(s => s.id === activeSessionId)) {
            logService.warn(`Active session ${activeSessionId} is no longer available. Switching sessions.`);
            const sortedSessions = [...savedSessions].sort((a,b) => b.timestamp - a.timestamp);
            const nextSession = sortedSessions[0];
            if (nextSession) {
                loadChatSession(nextSession.id);
            } else {
                startNewChat();
            }
        }
    }, [savedSessions, activeSessionId, hasLoadedInitialData, loadChatSession, startNewChat]);

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
        return undefined;
    }, [isSwitchingModel, setIsSwitchingModel]);

    // 8. Auto-set Aspect Ratio
    const prevModelIdRef = useRef(currentChatSettings.modelId);
    useEffect(() => {
        if (prevModelIdRef.current !== currentChatSettings.modelId) {
            const modelId = currentChatSettings.modelId;
            const capabilities = getModelCapabilities(modelId);
            const isBananaModel = capabilities.isFlashImageModel || capabilities.isGemini3ImageModel;

            if (capabilities.supportedAspectRatios?.length) {
                const preferredAspectRatio = isBananaModel ? 'Auto' : aspectRatio;
                const normalizedAspectRatio = normalizeAspectRatioForModel(modelId, preferredAspectRatio);

                if (normalizedAspectRatio && normalizedAspectRatio !== aspectRatio) {
                    setAspectRatio(normalizedAspectRatio);
                }
            } else if (aspectRatio === 'Auto') {
                setAspectRatio('1:1');
            }

            const normalizedImageSize = normalizeImageSizeForModel(modelId, imageSize);
            if (normalizedImageSize && normalizedImageSize !== imageSize) {
                setImageSize(normalizedImageSize);
            }

            prevModelIdRef.current = modelId;
        }
    }, [currentChatSettings.modelId, aspectRatio, imageSize, setAspectRatio, setImageSize]);
};
