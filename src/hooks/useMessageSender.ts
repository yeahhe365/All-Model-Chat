
import React, { useCallback } from 'react';
import { AppSettings, ChatMessage, UploadedFile, ChatSettings as IndividualChatSettings, SavedChatSession } from '../types';
import { generateUniqueId, getKeyForRequest, logService, createNewSession } from '../utils/appUtils';
import { DEFAULT_CHAT_SETTINGS } from '../constants/appConstants';
import { useChatStreamHandler } from './message-sender/useChatStreamHandler';
import { useTtsImagenSender } from './message-sender/useTtsImagenSender';
import { useImageEditSender } from './message-sender/useImageEditSender';
import { useCanvasGenerator } from './message-sender/useCanvasGenerator';
import { useStandardChat } from './message-sender/useStandardChat';
import { getModelCapabilities } from '../utils/modelHelpers';
import { useI18n } from '../contexts/I18nContext';
import { getApiKeyErrorTranslationKey } from '../utils/apiUtils';

type SessionsUpdater = (
    updater: (prev: SavedChatSession[]) => SavedChatSession[],
    options?: { persist?: boolean }
) => void;

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
    userScrolledUpRef: React.MutableRefObject<boolean>;
    activeSessionId: string | null;
    setActiveSessionId: (id: string | null) => void;
    activeJobs: React.MutableRefObject<Map<string, AbortController>>;
    updateAndPersistSessions: SessionsUpdater;
    sessionKeyMapRef: React.MutableRefObject<Map<string, string>>;
    language: 'en' | 'zh';
    setSessionLoading: (sessionId: string, isLoading: boolean) => void;
}

export const useMessageSender = (props: MessageSenderProps) => {
    const { t } = useI18n();
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
        userScrolledUpRef,
        activeSessionId,
        setActiveSessionId,
        activeJobs,
        setSessionLoading,
        updateAndPersistSessions,
    } = props;

    const translateApiKeyError = useCallback((error: string) => {
        const translationKey = getApiKeyErrorTranslationKey(error);
        return translationKey ? t(translationKey) : error;
    }, [t]);

    // Initialize Stream Handler Factory
    const { getStreamHandlers } = useChatStreamHandler({
        appSettings,
        updateAndPersistSessions,
        setSessionLoading,
        activeJobs
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

    const { handleTtsImagenMessage } = useTtsImagenSender({ 
        updateAndPersistSessions,
        setSessionLoading,
        activeJobs,
        setActiveSessionId
    });
    
    const { handleImageEditMessage } = useImageEditSender({
        updateAndPersistSessions,
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
        const capabilities = getModelCapabilities(activeModelId);
        const isTtsModel = capabilities.isTtsModel;
        const isImagenModel = capabilities.isRealImagenModel;
        const isImageEditModel = capabilities.isFlashImageModel;
        const isGemini3Image = capabilities.isGemini3ImageModel;

        logService.info(`Sending message with model ${activeModelId}`, { textLength: textToUse.length, fileCount: filesToUse.length, editingId: effectiveEditingId, sessionId: activeSessionId, isContinueMode, isFastMode });

        if (!textToUse.trim() && !isTtsModel && !isImagenModel && !isContinueMode && filesToUse.filter(f => f.uploadState === 'active').length === 0) return;
        if ((isTtsModel || isImagenModel || isImageEditModel || isGemini3Image) && !textToUse.trim()) return;
        if (filesToUse.some(f => f.isProcessing || (f.uploadState !== 'active' && !f.error) )) { 
            logService.warn("Send message blocked: files are still processing.");
            setAppFileError(t('messageSender_waitForFiles')); 
            return; 
        }

        if (isImageEditModel || isGemini3Image) {
            const allowsPdfReferences = activeModelId === 'gemini-3.1-flash-image-preview';
            const hasUnsupportedAttachments = filesToUse.some((file) => {
                if (file.type.startsWith('image/')) return false;
                if (allowsPdfReferences && file.type === 'application/pdf') return false;
                return true;
            });

            if (hasUnsupportedAttachments) {
                logService.warn("Send message blocked: image model received unsupported attachment types.", {
                    activeModelId,
                    attachmentTypes: filesToUse.map((file) => file.type),
                });
                setAppFileError(
                    allowsPdfReferences
                        ? t('messageSender_imageModelSupportsImageAndPdfOnly')
                        : t('messageSender_imageModelSupportsImageOnly')
                );
                return;
            }
        }

        const imageReferenceCount = filesToUse.filter((file) => file.type.startsWith('image/')).length;
        if (isGemini3Image && imageReferenceCount > 14) {
            logService.warn("Send message blocked: Gemini 3 image model reference image limit exceeded.", {
                imageReferenceCount,
                activeModelId,
            });
            setAppFileError(t('messageSender_imageReferenceLimit'));
            return;
        }

        if (isImagenModel && filesToUse.length > 0) {
            logService.warn("Send message blocked: Imagen models do not support file attachments.");
            setAppFileError(t('messageSender_imagenTextOnly'));
            return;
        }
        
        setAppFileError(null);

        if (!activeModelId) { 
            logService.error("Send message failed: No model selected.");
            const errorMsg: ChatMessage = { id: generateUniqueId(), role: 'error', content: t('messageSender_noModelSelected'), timestamp: new Date() };
            const newSession = createNewSession({ ...DEFAULT_CHAT_SETTINGS, ...appSettings }, [errorMsg], t('messageSender_errorSessionTitle'));
            updateAndPersistSessions(p => [newSession, ...p]);
            setActiveSessionId(newSession.id);
            return; 
        }

        const keyResult = getKeyForRequest(appSettings, sessionToUpdate);
        if ('error' in keyResult) {
            logService.error("Send message failed: API Key not configured.");
             const translatedApiError = translateApiKeyError(keyResult.error);
             const errorMsg: ChatMessage = { id: generateUniqueId(), role: 'error', content: translatedApiError, timestamp: new Date() };
             const newSession = createNewSession({ ...DEFAULT_CHAT_SETTINGS, ...appSettings }, [errorMsg], t('messageSender_apiKeyErrorSessionTitle'));
             updateAndPersistSessions(p => [newSession, ...p]);
             setActiveSessionId(newSession.id);
            return;
        }
        const { key: keyToUse, isNewKey } = keyResult;
        const shouldLockKey = isNewKey && filesToUse.some(f => f.fileUri && f.uploadState === 'active');

        const newAbortController = new AbortController();
        const generationId = generateUniqueId();
        
        if (appSettings.isAutoScrollOnSendEnabled) {
            userScrolledUpRef.current = false;
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
        userScrolledUpRef, activeSessionId, setActiveSessionId, updateAndPersistSessions,
        handleTtsImagenMessage, handleImageEditMessage, sendStandardMessage, t, translateApiKeyError
    ]);

    return { handleSendMessage, handleGenerateCanvas };
};
