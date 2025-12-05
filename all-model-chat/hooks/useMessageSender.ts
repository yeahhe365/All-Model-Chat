
import { useCallback, Dispatch, SetStateAction } from 'react';
import { AppSettings, ChatMessage, UploadedFile, ChatSettings as IndividualChatSettings, SavedChatSession } from '../types';
import { generateUniqueId, buildContentParts, createChatHistoryForApi, getKeyForRequest, generateSessionTitle, logService } from '../utils/appUtils';
import { geminiServiceInstance } from '../services/geminiService';
import { DEFAULT_CHAT_SETTINGS } from '../constants/appConstants';
import { useChatStreamHandler } from './useChatStreamHandler';
import { useTtsImagenSender } from './useTtsImagenSender';
import { useImageEditSender } from './useImageEditSender';
import { Chat } from '@google/genai';
import { getApiClient, buildGenerationConfig } from '../services/api/baseApi';

type SessionsUpdater = (updater: (prev: SavedChatSession[]) => SavedChatSession[]) => void;

interface MessageSenderProps {
    appSettings: AppSettings;
    messages: ChatMessage[];
    currentChatSettings: IndividualChatSettings;
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
    chat: Chat | null;
    sessionKeyMapRef: React.MutableRefObject<Map<string, string>>;
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
        setLoadingSessionIds,
        updateAndPersistSessions,
        scrollContainerRef,
        chat,
        sessionKeyMapRef,
    } = props;

    const { getStreamHandlers } = useChatStreamHandler(props);
    const { handleTtsImagenMessage } = useTtsImagenSender({ ...props, setActiveSessionId });
    const { handleImageEditMessage } = useImageEditSender({
        updateAndPersistSessions,
        setLoadingSessionIds,
        activeJobs,
        setActiveSessionId,
    });

    const handleSendMessage = useCallback(async (overrideOptions?: { text?: string; files?: UploadedFile[]; editingId?: string }) => {
        const textToUse = overrideOptions?.text ?? '';
        const filesToUse = overrideOptions?.files ?? selectedFiles;
        const effectiveEditingId = overrideOptions?.editingId ?? editingMessageId;
        
        const sessionToUpdate = currentChatSettings;
        const activeModelId = sessionToUpdate.modelId;
        const isTtsModel = activeModelId.includes('-tts');
        const isImagenModel = activeModelId.includes('imagen');
        // Exclude gemini-3-pro-image-preview from isImageEditModel to force standard chat flow, 
        // unless Quad Images are enabled which we handle via edit route
        const isImageEditModel = (activeModelId.includes('image-preview') || activeModelId.includes('gemini-2.5-flash-image')) && !activeModelId.includes('gemini-3-pro');
        const isGemini3Image = activeModelId === 'gemini-3-pro-image-preview';

        logService.info(`Sending message with model ${activeModelId}`, { textLength: textToUse.length, fileCount: filesToUse.length, editingId: effectiveEditingId, sessionId: activeSessionId });

        if (!textToUse.trim() && !isTtsModel && !isImagenModel && filesToUse.filter(f => f.uploadState === 'active').length === 0) return;
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
            const newSession: SavedChatSession = { id: generateUniqueId(), title: "Error", messages: [errorMsg], settings: { ...DEFAULT_CHAT_SETTINGS, ...appSettings }, timestamp: Date.now() };
            updateAndPersistSessions(p => [newSession, ...p]);
            setActiveSessionId(newSession.id);
            return; 
        }

        const keyResult = getKeyForRequest(appSettings, sessionToUpdate);
        if ('error' in keyResult) {
            logService.error("Send message failed: API Key not configured.");
             const errorMsg: ChatMessage = { id: generateUniqueId(), role: 'error', content: keyResult.error, timestamp: new Date() };
             const newSession: SavedChatSession = { id: generateUniqueId(), title: "API Key Error", messages: [errorMsg], settings: { ...DEFAULT_CHAT_SETTINGS, ...appSettings }, timestamp: Date.now() };
             updateAndPersistSessions(p => [newSession, ...p]);
             setActiveSessionId(newSession.id);
            return;
        }
        const { key: keyToUse, isNewKey } = keyResult;
        const shouldLockKey = isNewKey && filesToUse.some(f => f.fileUri && f.uploadState === 'active');

        const newAbortController = new AbortController();
        const generationId = generateUniqueId();
        const generationStartTime = new Date();
        
        if (appSettings.isAutoScrollOnSendEnabled) {
            userScrolledUp.current = false;
        }
        if (overrideOptions?.files === undefined) setSelectedFiles([]);

        if (isTtsModel || isImagenModel) {
            await handleTtsImagenMessage(keyToUse, activeSessionId, generationId, newAbortController, appSettings, sessionToUpdate, textToUse.trim(), aspectRatio, imageSize, { shouldLockKey });
            if (editingMessageId) {
                setEditingMessageId(null);
            }
            return;
        }
        
        // Use image edit flow for:
        // 1. Explicit image edit models (e.g. flash-image)
        // 2. Gemini 3 Pro Image IF Quad Images are enabled (for parallel generation)
        if (isImageEditModel || (isGemini3Image && appSettings.generateQuadImages)) {
            const editIndex = effectiveEditingId ? messages.findIndex(m => m.id === effectiveEditingId) : -1;
            const historyMessages = editIndex !== -1 ? messages.slice(0, editIndex) : messages;
            await handleImageEditMessage(keyToUse, activeSessionId, historyMessages, generationId, newAbortController, appSettings, sessionToUpdate, textToUse.trim(), filesToUse, effectiveEditingId, aspectRatio, imageSize, { shouldLockKey });
            if (editingMessageId) {
                setEditingMessageId(null);
            }
            return;
        }
        
        const successfullyProcessedFiles = filesToUse.filter(f => f.uploadState === 'active' && !f.error && !f.isProcessing);
        const { contentParts: promptParts, enrichedFiles } = await buildContentParts(textToUse.trim(), successfullyProcessedFiles);
        
        let finalSessionId = activeSessionId;
        
        const userMessageContent: ChatMessage = { id: generateUniqueId(), role: 'user', content: textToUse.trim(), files: enrichedFiles.length ? enrichedFiles : undefined, timestamp: new Date() };
        const modelMessageContent: ChatMessage = { id: generationId, role: 'model', content: '', timestamp: new Date(), isLoading: true, generationStartTime: generationStartTime };

        // Perform a single, atomic state update for adding messages and creating a new session if necessary.
        if (!finalSessionId) { // New Chat
            const newSessionId = generateUniqueId();
            finalSessionId = newSessionId;
            let newSessionSettings = { ...DEFAULT_CHAT_SETTINGS, ...appSettings };
            if (shouldLockKey) newSessionSettings.lockedApiKey = keyToUse;
            
            userMessageContent.cumulativeTotalTokens = 0;
            const newSession: SavedChatSession = { id: newSessionId, title: "New Chat", messages: [userMessageContent, modelMessageContent], timestamp: Date.now(), settings: newSessionSettings };
            updateAndPersistSessions(p => [newSession, ...p.filter(s => s.messages.length > 0)]);
            setActiveSessionId(newSessionId);
        } else { // Existing Chat or Edit
            updateAndPersistSessions(prev => prev.map(s => {
                const isSessionToUpdate = effectiveEditingId ? s.messages.some(m => m.id === effectiveEditingId) : s.id === finalSessionId;
                if (!isSessionToUpdate) return s;

                const editIndex = effectiveEditingId ? s.messages.findIndex(m => m.id === effectiveEditingId) : -1;
                const baseMessages = editIndex !== -1 ? s.messages.slice(0, editIndex) : [...s.messages];
                
                userMessageContent.cumulativeTotalTokens = baseMessages.length > 0 ? (baseMessages[baseMessages.length - 1].cumulativeTotalTokens || 0) : 0;
                const newMessages = [...baseMessages, userMessageContent, modelMessageContent];

                let newTitle = s.title;
                if (s.title === 'New Chat' && !appSettings.isAutoTitleEnabled) {
                    newTitle = generateSessionTitle(newMessages);
                }
                let updatedSettings = s.settings;
                if (shouldLockKey && !s.settings.lockedApiKey) {
                    updatedSettings = { ...s.settings, lockedApiKey: keyToUse };
                }
                return { ...s, messages: newMessages, title: newTitle, settings: updatedSettings };
            }));
        }

        // --- Store Key Affinity for this session ---
        if (finalSessionId) {
            sessionKeyMapRef.current.set(finalSessionId, keyToUse);
        }

        if (editingMessageId) {
            setEditingMessageId(null);
        }
        
        if (promptParts.length === 0) {
             setLoadingSessionIds(prev => { const next = new Set(prev); next.delete(finalSessionId!); return next; });
             activeJobs.current.delete(generationId);
             return; 
        }
        
        // Pass generationStartTime by value to create a closure-safe handler
        const { streamOnError, streamOnComplete, streamOnPart, onThoughtChunk } = getStreamHandlers(finalSessionId!, generationId, newAbortController, generationStartTime, sessionToUpdate);
        
        setLoadingSessionIds(prev => new Set(prev).add(finalSessionId!));
        activeJobs.current.set(generationId, newAbortController);

        // Standard models that support the Chat object
        let chatToUse = chat;

        if (effectiveEditingId) {
            logService.info("Handling message edit: creating temporary chat object for this turn.");
            const baseMessagesForApi = messages.slice(0, messages.findIndex(m => m.id === effectiveEditingId));
            const historyForChat = await createChatHistoryForApi(baseMessagesForApi);
            
            // Fix: Use appSettings prop directly to avoid stale DB state race condition
            const shouldUseProxy = appSettings.useCustomApiConfig && appSettings.useApiProxy;
            const apiProxyUrl = shouldUseProxy ? appSettings.apiProxyUrl : null;
            
            const ai = getApiClient(keyToUse, apiProxyUrl);
            chatToUse = ai.chats.create({
                model: activeModelId,
                history: historyForChat,
                config: buildGenerationConfig(
                    activeModelId, sessionToUpdate.systemInstruction, { temperature: sessionToUpdate.temperature, topP: sessionToUpdate.topP },
                    sessionToUpdate.showThoughts, sessionToUpdate.thinkingBudget,
                    !!sessionToUpdate.isGoogleSearchEnabled, !!sessionToUpdate.isCodeExecutionEnabled, !!sessionToUpdate.isUrlContextEnabled,
                    sessionToUpdate.thinkingLevel,
                    aspectRatio,
                    sessionToUpdate.isDeepSearchEnabled,
                    imageSize,
                    sessionToUpdate.safetySettings
                ),
            });
        }
        
        if (!chatToUse) {
            logService.error("Send message failed: Chat object not initialized.");
            setAppFileError("Chat is not ready, please wait a moment and try again.");
            return;
        }

        if (appSettings.isStreamingEnabled) {
            await geminiServiceInstance.sendMessageStream(chatToUse, promptParts, newAbortController.signal, streamOnPart, onThoughtChunk, streamOnError, streamOnComplete);
        } else { 
            await geminiServiceInstance.sendMessageNonStream(chatToUse, promptParts, newAbortController.signal, streamOnError, (parts, thoughts, usage, grounding, urlContext) => {
                for(const part of parts) streamOnPart(part);
                if(thoughts) onThoughtChunk(thoughts);
                streamOnComplete(usage, grounding, urlContext);
            });
        }
    }, [
        appSettings, currentChatSettings, messages, selectedFiles, setSelectedFiles,
        editingMessageId, setEditingMessageId, setAppFileError, aspectRatio, imageSize,
        userScrolledUp, activeSessionId, setActiveSessionId, activeJobs,
        setLoadingSessionIds, updateAndPersistSessions, getStreamHandlers,
        handleTtsImagenMessage, scrollContainerRef, chat, handleImageEditMessage, sessionKeyMapRef
    ]);

    return { handleSendMessage };
};
