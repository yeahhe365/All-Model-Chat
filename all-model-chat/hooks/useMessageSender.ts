import React, { useCallback, Dispatch, SetStateAction } from 'react';
import { AppSettings, ChatMessage, UploadedFile, ChatSettings as IndividualChatSettings, SavedChatSession } from '../types';
import { generateUniqueId, getKeyForRequest, generateSessionTitle, logService, createNewSession } from '../utils/appUtils';
import { DEFAULT_CHAT_SETTINGS } from '../constants/appConstants';
import { useChatStreamHandler } from './message-sender/useChatStreamHandler';
import { useTtsImagenSender } from './message-sender/useTtsImagenSender';
import { useImageEditSender } from './message-sender/useImageEditSender';
import { useCanvasGenerator } from './message-sender/useCanvasGenerator';
import { useStandardChat } from './message-sender/useStandardChat';

type SessionsUpdater = (updater: (prev: SavedChatSession[]) => SavedChatSession[]) => void;

interface MessageSenderProps {
    appSettings: AppSettings;
    currentChatSettings: IndividualChatSettings;
    messages: ChatMessage[];
    selectedFiles: UploadedFile[];
    setSelectedFiles: (files: UploadedFile[] | ((prev: UploadedFile[]) => UploadedFile[])) => void;
    editingMessageId: string | null;
    setEditingMessageId: (id: string | null) => void;
    setAppFileError: (error: string | null) => void;
    aspectRatio: string;
    imageSize?: string;
    userScrolledUp: React.MutableRefObject<boolean>;
    activeSessionId: string | null;
    setActiveSessionId: (id: string | null) => void;
    activeJobs: React.MutableRefObject<Map<string, AbortController>>;
    setLoadingSessionIds: Dispatch<SetStateAction<Set<string>>>;
    updateAndPersistSessions: SessionsUpdater;
    scrollContainerRef: React.RefObject<HTMLDivElement>;
    sessionKeyMapRef: React.MutableRefObject<Map<string, string>>;
    language: 'en' | 'zh';
    setSessionLoading: (sessionId: string, isLoading: boolean) => void;
    broadcast?: any;
}

export const useMessageSender = (props: MessageSenderProps) => {
    const {
        appSettings,
        currentChatSettings,
        messages,
        selectedFiles,
        setSelectedFiles,
        editingMessageId,
        setEditingMessageId,
        setAppFileError,
        aspectRatio,
        imageSize,
        userScrolledUp,
        activeSessionId,
        setActiveSessionId,
        activeJobs,
        setSessionLoading,
        updateAndPersistSessions,
        broadcast
    } = props;

    // Initialize Stream Handler Factory
    const { getStreamHandlers } = useChatStreamHandler({
        appSettings,
        updateAndPersistSessions,
        setSessionLoading,
        activeJobs,
        broadcast
    });

    // Initialize Sub-Hooks
    const { handleGenerateCanvas } = useCanvasGenerator({ 
        ...props, 
        getStreamHandlers 
    });

    const { sendStandardMessage } = useStandardChat({
        ...props,
        getStreamHandlers,
        handleGenerateCanvas
    });

    const { handleTtsImagenMessage } = useTtsImagenSender({ ...props, setActiveSessionId });
    const { handleImageEditMessage } = useImageEditSender({
        updateAndPersistSessions,
        setLoadingSessionIds: (v: any) => {}, // Not used, legacy
        setSessionLoading,
        activeJobs,
        setActiveSessionId
    });

    const handleSendMessage = useCallback(async (overrideOptions?: { text?: string; files?: UploadedFile[]; editingId?: string; isContinueMode?: boolean; isFastMode?: boolean }) => {
        const textToUse = overrideOptions?.text ?? '';
        const filesToUse = overrideOptions?.files ?? selectedFiles;
        const effectiveEditingId = overrideOptions?.editingId ?? editingMessageId;
        const isContinueMode = overrideOptions?.isContinueMode ?? false;
        const isFastMode = overrideOptions?.isFastMode ?? false;
        
        const sessionToUpdate = currentChatSettings;
        const activeModelId = sessionToUpdate.modelId;
        const isTtsModel = activeModelId.includes('-tts');
        const isImagenModel = activeModelId.includes('imagen');
        const isImageEditModel = (activeModelId.includes('image-preview') || activeModelId.includes('gemini-2.5-flash-image')) && !activeModelId.includes('gemini-3-pro');
        const isGemini3Image = activeModelId === 'gemini-3-pro-image-preview';

        logService.info(`Sending message with model ${activeModelId}`, { textLength: textToUse.length, fileCount: filesToUse.length, editingId: effectiveEditingId, sessionId: activeSessionId, isContinueMode, isFastMode });

        if (!textToUse.trim() && !isTtsModel && !isImagenModel && !isContinueMode && filesToUse.filter(f => f.uploadState === 'active').length === 0) return;
        if ((isTtsModel || isImagenModel || isImageEditModel || isGemini3Image) && !textToUse.trim()) return;
        if (filesToUse.some(f => f.isProcessing || (f.uploadState !== 'active' && !f.error) )) { 
            logService.warn("Send message blocked: files are still processing.");
            setAppFileError("Wait for files to finish processing."); 
            return; 
        }
        
        setAppFileError(null);

        if (!activeModelId) { 
            logService.error("Send message failed: No model selected.");
            const errorMsg: ChatMessage = { id: generateUniqueId(), role: 'error', content: 'No model selected.', timestamp: new Date() };
            const newSession = createNewSession({ ...DEFAULT_CHAT_SETTINGS, ...appSettings }, [errorMsg], "Error");
            updateAndPersistSessions(p => [newSession, ...p]);
            setActiveSessionId(newSession.id);
            return; 
        }

        const keyResult = getKeyForRequest(appSettings, sessionToUpdate);
        if ('error' in keyResult) {
            logService.error("Send message failed: API Key not configured.");
             const errorMsg: ChatMessage = { id: generateUniqueId(), role: 'error', content: keyResult.error, timestamp: new Date() };
             const newSession = createNewSession({ ...DEFAULT_CHAT_SETTINGS, ...appSettings }, [errorMsg], "API Key Error");
             updateAndPersistSessions(p => [newSession, ...p]);
             setActiveSessionId(newSession.id);
            return;
        }
        const { key: keyToUse, isNewKey } = keyResult;
        const shouldLockKey = isNewKey && filesToUse.some(f => f.fileUri && f.uploadState === 'active');

        const newAbortController = new AbortController();
        const generationId = generateUniqueId();
        
        if (appSettings.isAutoScrollOnSendEnabled) {
            userScrolledUp.current = false;
        }
        if (overrideOptions?.files === undefined) setSelectedFiles([]);

        if (isTtsModel || isImagenModel) {
            await handleTtsImagenMessage(keyToUse, activeSessionId, generationId, newAbortController, appSettings, sessionToUpdate, textToUse.trim(), aspectRatio, imageSize, { shouldLockKey });
            if (editingMessageId) setEditingMessageId(null);
            return;
        }
        
        if (isImageEditModel || (isGemini3Image && appSettings.generateQuadImages)) {
            const editIndex = effectiveEditingId ? messages.findIndex(m => m.id === effectiveEditingId) : -1;
            const historyMessages = editIndex !== -1 ? messages.slice(0, editIndex) : messages;
            await handleImageEditMessage(keyToUse, activeSessionId, historyMessages, generationId, newAbortController, appSettings, sessionToUpdate, textToUse.trim(), filesToUse, effectiveEditingId, aspectRatio, imageSize, { shouldLockKey });
            if (editingMessageId) setEditingMessageId(null);
            return;
        }
        
        await sendStandardMessage(textToUse, filesToUse, effectiveEditingId, activeModelId, isContinueMode, isFastMode);

    }, [
        appSettings, currentChatSettings, messages, selectedFiles, setSelectedFiles,
        editingMessageId, setEditingMessageId, setAppFileError, aspectRatio, imageSize,
        userScrolledUp, activeSessionId, setActiveSessionId, updateAndPersistSessions,
        handleTtsImagenMessage, handleImageEditMessage, sendStandardMessage
    ]);

    return { handleSendMessage, handleGenerateCanvas };
};