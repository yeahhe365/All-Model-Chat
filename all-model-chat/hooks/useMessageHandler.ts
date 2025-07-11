
import { useCallback, Dispatch, SetStateAction } from 'react';
import { AppSettings, ChatMessage, UploadedFile, ChatSettings as IndividualChatSettings, ChatHistoryItem, SavedChatSession } from '../types';
import { generateUniqueId, buildContentParts, pcmBase64ToWavUrl, createChatHistoryForApi, getKeyForRequest, generateSessionTitle } from '../utils/appUtils';
import { geminiServiceInstance } from '../services/geminiService';
import { Chat, UsageMetadata } from '@google/genai';
import { logService } from '../services/logService';
import { DEFAULT_CHAT_SETTINGS } from '../constants/appConstants';

type CommandedInputSetter = Dispatch<SetStateAction<{ text: string; id: number; } | null>>;
type SessionsUpdater = (updater: (prev: SavedChatSession[]) => SavedChatSession[]) => void;

interface MessageHandlerProps {
    appSettings: AppSettings;
    messages: ChatMessage[];
    isLoading: boolean;
    currentChatSettings: IndividualChatSettings;
    selectedFiles: UploadedFile[];
    setSelectedFiles: (files: UploadedFile[] | ((prev: UploadedFile[]) => UploadedFile[])) => void;
    editingMessageId: string | null;
    setEditingMessageId: (id: string | null) => void;
    setAppFileError: (error: string | null) => void;
    aspectRatio: string;
    userScrolledUp: React.MutableRefObject<boolean>;
    ttsMessageId: string | null;
    setTtsMessageId: (id: string | null) => void;
    activeSessionId: string | null;
    setActiveSessionId: (id: string | null) => void;
    setCommandedInput: CommandedInputSetter;
    activeJobs: React.MutableRefObject<Map<string, AbortController>>;
    loadingSessionIds: Set<string>;
    setLoadingSessionIds: Dispatch<SetStateAction<Set<string>>>;
    updateAndPersistSessions: SessionsUpdater;
}

export const useMessageHandler = ({
    appSettings,
    messages,
    isLoading,
    currentChatSettings,
    selectedFiles,
    setSelectedFiles,
    editingMessageId,
    setEditingMessageId,
    setAppFileError,
    aspectRatio,
    userScrolledUp,
    ttsMessageId,
    setTtsMessageId,
    activeSessionId,
    setActiveSessionId,
    setCommandedInput,
    activeJobs,
    loadingSessionIds,
    setLoadingSessionIds,
    updateAndPersistSessions
}: MessageHandlerProps) => {

    const handleApiError = useCallback((error: unknown, sessionId: string, modelMessageId: string, errorPrefix: string = "Error") => {
        const isAborted = error instanceof Error && (error.name === 'AbortError' || error.message === 'aborted');
        logService.error(`API Error (${errorPrefix}) for message ${modelMessageId} in session ${sessionId}`, { error, isAborted });
        
        if (isAborted) {
            updateAndPersistSessions(prev => prev.map(s => s.id === sessionId ? { ...s, messages: s.messages.map(msg =>
                msg.id === modelMessageId && msg.isLoading
                    ? { ...msg, role: 'model', content: (msg.content || "") + "\n\n[Cancelled by user]", isLoading: false, generationEndTime: new Date() } 
                    : msg
            )}: s));
            return;
        }

        let errorMessage = "An unknown error occurred.";
        if (error instanceof Error) {
            errorMessage = error.name === 'SilentError'
                ? "API key is not configured in settings."
                : `${errorPrefix}: ${error.message}`;
        } else {
            errorMessage = `${errorPrefix}: ${String(error)}`;
        }

        updateAndPersistSessions(prev => prev.map(s => s.id === sessionId ? { ...s, messages: s.messages.map(msg => 
            msg.id === modelMessageId 
                ? { ...msg, role: 'error', content: errorMessage, isLoading: false, generationEndTime: new Date() } 
                : msg
        )}: s));
    }, [updateAndPersistSessions]);


    const handleSendMessage = useCallback(async (overrideOptions?: { text?: string; files?: UploadedFile[]; editingId?: string }) => {
        const textToUse = overrideOptions?.text ?? '';
        const filesToUse = overrideOptions?.files ?? selectedFiles;
        const effectiveEditingId = overrideOptions?.editingId ?? editingMessageId;
        
        let sessionId = activeSessionId;
        let sessionToUpdate: IndividualChatSettings | null = null;
        if (sessionId) {
            // Find the settings for the current session. This is a bit of a hack to get the settings
            // without needing to pass the whole sessions array down.
            updateAndPersistSessions(prev => {
                const found = prev.find(s => s.id === sessionId);
                if(found) sessionToUpdate = found.settings;
                return prev;
            });
        }
        
        if (!sessionToUpdate) {
            sessionToUpdate = { ...DEFAULT_CHAT_SETTINGS, ...appSettings };
        }


        const activeModelId = sessionToUpdate.modelId;
        const isTtsModel = activeModelId.includes('-tts');
        const isImagenModel = activeModelId.includes('imagen');
        
        logService.info(`Sending message with model ${activeModelId}`, { textLength: textToUse.length, fileCount: filesToUse.length, editingId: effectiveEditingId, sessionId: sessionId });

        if (!textToUse.trim() && !isTtsModel && !isImagenModel && filesToUse.filter(f => f.uploadState === 'active').length === 0) return;
        if ((isTtsModel || isImagenModel) && !textToUse.trim()) return;
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

        const hasFileId = filesToUse.some(f => f.fileUri);
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
        const shouldLockKey = isNewKey && hasFileId;

        const newAbortController = new AbortController();

        userScrolledUp.current = false;
        if (overrideOptions?.files === undefined) setSelectedFiles([]);

        // If no active session, create one
        if (!sessionId) {
            const newSessionId = generateUniqueId();
            let newSessionSettings = { ...DEFAULT_CHAT_SETTINGS, ...appSettings };
            if (shouldLockKey) newSessionSettings.lockedApiKey = keyToUse;

            const newTitle = "New Chat"; // Will be updated when message is added
            const newSession: SavedChatSession = {
                id: newSessionId,
                title: newTitle,
                messages: [], // Start with empty messages
                timestamp: Date.now(),
                settings: newSessionSettings,
            };
            updateAndPersistSessions(p => [newSession, ...p]);
            setActiveSessionId(newSessionId);
            sessionId = newSessionId;
        }

        const currentSessionId = sessionId;
        if (!currentSessionId) {
             logService.error("Message send failed: Could not establish a session ID.");
             return;
        }
        
        setLoadingSessionIds(prev => new Set(prev).add(currentSessionId));

        const modelMessageId = generateUniqueId();
        activeJobs.current.set(modelMessageId, newAbortController);

        // --- TTS or Imagen Model Logic (No history needed) ---
        if (isTtsModel || isImagenModel) {
            const userMessage: ChatMessage = { id: generateUniqueId(), role: 'user', content: textToUse.trim(), timestamp: new Date() };
            const modelMessage: ChatMessage = { id: modelMessageId, role: 'model', content: '', timestamp: new Date(), isLoading: true, generationStartTime: new Date() };
            updateAndPersistSessions(prev => prev.map(s => {
                if (s.id !== currentSessionId) return s;
                const newMessages = [...s.messages, userMessage, modelMessage];
                return { ...s, messages: newMessages, title: generateSessionTitle(newMessages) };
            }));

            try {
                if (isTtsModel) {
                    const base64Pcm = await geminiServiceInstance.generateSpeech(keyToUse, activeModelId, textToUse.trim(), sessionToUpdate.ttsVoice, newAbortController.signal);
                    if (newAbortController.signal.aborted) throw new Error("aborted");
                    const wavUrl = pcmBase64ToWavUrl(base64Pcm);
                    updateAndPersistSessions(p => p.map(s => s.id === currentSessionId ? { ...s, messages: s.messages.map(m => m.id === modelMessageId ? { ...m, isLoading: false, content: textToUse.trim(), audioSrc: wavUrl, generationEndTime: new Date() } : m) } : s));
                } else { // Imagen
                    const imageBase64Array = await geminiServiceInstance.generateImages(keyToUse, activeModelId, textToUse.trim(), aspectRatio, newAbortController.signal);
                    if (newAbortController.signal.aborted) throw new Error("aborted");
                    const generatedFiles: UploadedFile[] = imageBase64Array.map((base64Data, index) => ({ id: generateUniqueId(), name: `generated-image-${index + 1}.jpeg`, type: 'image/jpeg', size: base64Data.length, dataUrl: `data:image/jpeg;base64,${base64Data}`, base64Data, uploadState: 'active' }));
                    updateAndPersistSessions(p => p.map(s => s.id === currentSessionId ? { ...s, messages: s.messages.map(m => m.id === modelMessageId ? { ...m, isLoading: false, content: `Generated image for: "${textToUse.trim()}"`, files: generatedFiles, generationEndTime: new Date() } : m) } : s));
                }
            } catch (error) {
                handleApiError(error, currentSessionId, modelMessageId, isTtsModel ? "TTS Error" : "Image Gen Error");
            } finally {
                setLoadingSessionIds(prev => { const next = new Set(prev); next.delete(currentSessionId); return next; });
                activeJobs.current.delete(modelMessageId);
            }
            return;
        }

        // --- Regular Text Generation Logic ---
        
        // Step 1: Prepare data needed for the state update, without async operations.
        const successfullyProcessedFiles = filesToUse.filter(f => f.uploadState === 'active' && !f.error && !f.isProcessing);
        let baseMessages: ChatMessage[] = [];
        let sessionForHistory: SavedChatSession | undefined;

        // Step 2: Update the state synchronously.
        updateAndPersistSessions(prev => {
            sessionForHistory = prev.find(s => s.id === currentSessionId);
            if (!sessionForHistory) return prev;

            const editIndex = effectiveEditingId ? sessionForHistory.messages.findIndex(m => m.id === effectiveEditingId) : -1;
            baseMessages = editIndex !== -1 ? sessionForHistory.messages.slice(0, editIndex) : [...sessionForHistory.messages];
            
            const lastCumulative = baseMessages.length > 0 ? (baseMessages[baseMessages.length - 1].cumulativeTotalTokens || 0) : 0;
            const userMessage: ChatMessage = {
                id: generateUniqueId(),
                role: 'user',
                content: textToUse.trim(),
                files: successfullyProcessedFiles.length ? successfullyProcessedFiles.map(f => ({...f, rawFile: undefined})) : undefined,
                timestamp: new Date(),
                cumulativeTotalTokens: lastCumulative,
            };
            const modelMessage: ChatMessage = {
                id: modelMessageId,
                role: 'model',
                content: '',
                thoughts: '',
                timestamp: new Date(),
                isLoading: true,
                generationStartTime: new Date()
            };

            const newMessages = [...baseMessages, userMessage, modelMessage];
            const updatedSession = { ...sessionForHistory, messages: newMessages, title: generateSessionTitle(newMessages) };
            
            return prev.map(s => s.id === currentSessionId ? updatedSession : s);
        });

        if (effectiveEditingId && !overrideOptions) setEditingMessageId(null);
        
        // Step 3: Now that state is updated, perform async operations to build the API payload.
        const promptParts = await buildContentParts(textToUse.trim(), successfullyProcessedFiles);
        if (promptParts.length === 0) {
             setLoadingSessionIds(prev => { const next = new Set(prev); next.delete(currentSessionId); return next; });
             activeJobs.current.delete(modelMessageId);
             return; 
        }

        const historyForApi = await createChatHistoryForApi(baseMessages);
        const fullHistory: ChatHistoryItem[] = [...historyForApi, { role: 'user', parts: promptParts }];
        
        // Step 4: Make the API call.
        const streamOnError = (error: Error) => {
            handleApiError(error, currentSessionId, modelMessageId);
            setLoadingSessionIds(prev => { const next = new Set(prev); next.delete(currentSessionId); return next; });
            activeJobs.current.delete(modelMessageId);
        };

        const streamOnComplete = (usageMetadata?: UsageMetadata) => {
            updateAndPersistSessions(prev => prev.map(s => {
                if (s.id !== currentSessionId) return s;
                
                const loadingMsgIndex = s.messages.findIndex(m => m.id === modelMessageId);
                if (loadingMsgIndex === -1) return s;

                const loadingMsg = s.messages[loadingMsgIndex];
                const prevUserMsg = s.messages[loadingMsgIndex - 1];
                const prevTotal = prevUserMsg?.cumulativeTotalTokens || 0;
                const turnTokens = usageMetadata?.totalTokenCount || 0;
                const promptTokens = usageMetadata?.promptTokenCount;
                const completionTokens = (promptTokens !== undefined && turnTokens > 0) ? turnTokens - promptTokens : undefined;

                const updatedMessage: ChatMessage = {
                    ...loadingMsg,
                    isLoading: false,
                    content: loadingMsg.content + (newAbortController.signal.aborted ? "\n\n[Stopped by user]" : ""),
                    thoughts: sessionToUpdate.showThoughts ? loadingMsg.thoughts : undefined,
                    generationEndTime: new Date(),
                    promptTokens,
                    completionTokens,
                    totalTokens: turnTokens,
                    cumulativeTotalTokens: prevTotal + turnTokens
                };

                const updatedMessages = [...s.messages];
                updatedMessages[loadingMsgIndex] = updatedMessage;
                
                for (let i = loadingMsgIndex + 1; i < updatedMessages.length; i++) {
                    const prevMsgInLoop = updatedMessages[i - 1];
                    const turnTotal = updatedMessages[i].totalTokens || 0;
                    updatedMessages[i].cumulativeTotalTokens = (prevMsgInLoop.cumulativeTotalTokens || 0) + turnTotal;
                }

                let newSettings = s.settings;
                if(shouldLockKey) newSettings = { ...s.settings, lockedApiKey: keyToUse };

                return {...s, messages: updatedMessages, settings: newSettings};
            }));
            setLoadingSessionIds(prev => { const next = new Set(prev); next.delete(currentSessionId); return next; });
            activeJobs.current.delete(modelMessageId);
        };

        const onChunk = (chunk: string) => {
            updateAndPersistSessions(prev => prev.map(s => s.id === currentSessionId ? { ...s, messages: s.messages.map(msg => msg.id === modelMessageId ? { ...msg, content: msg.content + chunk, isLoading: true } : msg)}: s));
        };
        const onThoughtChunk = (thoughtChunk: string) => {
            updateAndPersistSessions(prev => prev.map(s => s.id === currentSessionId ? { ...s, messages: s.messages.map(msg => msg.id === modelMessageId ? { ...msg, thoughts: (msg.thoughts || '') + thoughtChunk, isLoading: true } : msg)}: s));
        };

        if (appSettings.isStreamingEnabled) {
            await geminiServiceInstance.sendMessageStream(keyToUse, activeModelId, fullHistory, sessionToUpdate.systemInstruction, { temperature: sessionToUpdate.temperature, topP: sessionToUpdate.topP }, sessionToUpdate.showThoughts, sessionToUpdate.thinkingBudget, newAbortController.signal, onChunk, onThoughtChunk, streamOnError, streamOnComplete);
        } else { 
            await geminiServiceInstance.sendMessageNonStream(keyToUse, activeModelId, fullHistory, sessionToUpdate.systemInstruction, { temperature: sessionToUpdate.temperature, topP: sessionToUpdate.topP }, sessionToUpdate.showThoughts, sessionToUpdate.thinkingBudget, newAbortController.signal,
                streamOnError,
                (fullText, thoughtsText, usageMetadata) => {
                    updateAndPersistSessions(prev => prev.map(s => {
                        if (s.id !== currentSessionId) return s;
                        const finalMessage: ChatMessage = { ...s.messages.find(m => m.id === modelMessageId)!, content: fullText, thoughts: thoughtsText, isLoading: false, generationEndTime: new Date() };
                        return {...s, messages: s.messages.map(m => m.id === modelMessageId ? finalMessage : m)};
                    }));
                    streamOnComplete(usageMetadata);
                }
            );
        }
    }, [activeSessionId, selectedFiles, editingMessageId, appSettings, setAppFileError, setSelectedFiles, setEditingMessageId, setActiveSessionId, userScrolledUp, updateAndPersistSessions, setLoadingSessionIds, activeJobs, aspectRatio, handleApiError]);

    const handleTextToSpeech = useCallback(async (messageId: string, text: string) => {
        if (ttsMessageId) return; 

        const keyResult = getKeyForRequest(appSettings, currentChatSettings);
        if ('error' in keyResult) {
            logService.error("TTS failed:", { error: keyResult.error });
            return;
        }
        const { key } = keyResult;
        
        setTtsMessageId(messageId);
        logService.info("Requesting TTS for message", { messageId });
        const modelId = 'models/gemini-2.5-flash-preview-tts';
        const voice = appSettings.ttsVoice;
        const abortController = new AbortController();

        try {
            const base64Pcm = await geminiServiceInstance.generateSpeech(key, modelId, text, voice, abortController.signal);
            const wavUrl = pcmBase64ToWavUrl(base64Pcm);
            
            updateAndPersistSessions(prev => prev.map(s => {
                if(s.messages.some(m => m.id === messageId)) {
                    return {...s, messages: s.messages.map(m => m.id === messageId ? {...m, audioSrc: wavUrl} : m)};
                }
                return s;
            }));

        } catch (error) {
            logService.error("TTS generation failed:", { messageId, error });
        } finally {
            setTtsMessageId(null);
        }
    }, [appSettings, currentChatSettings, ttsMessageId, setTtsMessageId, updateAndPersistSessions]);

    const handleStopGenerating = () => {
        if (!activeSessionId || !isLoading) return;
        logService.warn(`User stopped generation for session: ${activeSessionId}`);
        const activeLoadingMessage = messages.find(m => m.isLoading);
        if (activeLoadingMessage && activeJobs.current.has(activeLoadingMessage.id)) {
            activeJobs.current.get(activeLoadingMessage.id)?.abort();
        }
    };

    const handleEditMessage = (messageId: string) => {
        logService.info("User initiated message edit", { messageId });
        const messageToEdit = messages.find(msg => msg.id === messageId);
        if (messageToEdit?.role === 'user') {
            if (isLoading) handleStopGenerating();
            setCommandedInput({ text: messageToEdit.content, id: Date.now() });
            setSelectedFiles(messageToEdit.files || []);
            setEditingMessageId(messageId);
            setAppFileError(null);
            (document.querySelector('textarea[aria-label="Chat message input"]') as HTMLTextAreaElement)?.focus();
        }
    };

    const handleCancelEdit = () => { 
        logService.info("User cancelled message edit.");
        setCommandedInput({ text: '', id: Date.now() });
        setSelectedFiles([]); 
        setEditingMessageId(null); 
        setAppFileError(null); 
    };

    const handleDeleteMessage = (messageId: string) => {
        if (!activeSessionId) return;
        logService.info("User deleted message", { messageId, sessionId: activeSessionId });

        const messageToDelete = messages.find(msg => msg.id === messageId);
        if (messageToDelete?.isLoading && activeJobs.current.has(messageToDelete.id)) {
             activeJobs.current.get(messageToDelete.id)?.abort();
        }

        updateAndPersistSessions(prev => prev.map(s => 
            s.id === activeSessionId ? { ...s, messages: s.messages.filter(msg => msg.id !== messageId) } : s
        ));

        if (editingMessageId === messageId) handleCancelEdit();
        userScrolledUp.current = false;
    };

    const handleRetryMessage = async (modelMessageIdToRetry: string) => {
        if (!activeSessionId) return;
        logService.info("User retrying message", { modelMessageId: modelMessageIdToRetry, sessionId: activeSessionId });
        
        const modelMessageIndex = messages.findIndex(m => m.id === modelMessageIdToRetry);
        if (modelMessageIndex < 1) return;

        const userMessageToResend = messages[modelMessageIndex - 1];
        if (userMessageToResend.role !== 'user') return;

        if (isLoading) handleStopGenerating();
        
        await handleSendMessage({
            text: userMessageToResend.content,
            files: userMessageToResend.files,
            editingId: userMessageToResend.id,
        });
    };

    return {
        handleSendMessage,
        handleStopGenerating,
        handleEditMessage,
        handleCancelEdit,
        handleDeleteMessage,
        handleRetryMessage,
        handleTextToSpeech,
    };
};
    