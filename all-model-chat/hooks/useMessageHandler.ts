import { useCallback, Dispatch, SetStateAction } from 'react';
import { AppSettings, ChatMessage, UploadedFile, ChatSettings as IndividualChatSettings, ChatHistoryItem } from '../types';
import { generateUniqueId, buildContentParts, pcmBase64ToWavUrl, createChatHistoryForApi, getKeyForRequest } from '../utils/appUtils';
import { geminiServiceInstance } from '../services/geminiService';
import { Chat, UsageMetadata } from '@google/genai';
import { logService } from '../services/logService';

type CommandedInputSetter = Dispatch<SetStateAction<{ text: string; id: number; } | null>>;

interface MessageHandlerProps {
    appSettings: AppSettings;
    messages: ChatMessage[];
    setMessages: (updater: (prev: ChatMessage[]) => ChatMessage[]) => void;
    currentChatSettings: IndividualChatSettings;
    setCurrentChatSettings: (updater: (prev: IndividualChatSettings) => IndividualChatSettings) => void;
    selectedFiles: UploadedFile[];
    setSelectedFiles: (files: UploadedFile[] | ((prev: UploadedFile[]) => UploadedFile[])) => void;
    editingMessageId: string | null;
    setEditingMessageId: (id: string | null) => void;
    setAppFileError: (error: string | null) => void;
    aspectRatio: string;
    userScrolledUp: React.MutableRefObject<boolean>;
    ttsMessageId: string | null;
    setTtsMessageId: (id: string | null) => void;
    saveCurrentChatSession: (currentMessages: ChatMessage[], currentActiveSessionId: string | null, currentSettingsToSave: IndividualChatSettings) => void;
    activeSessionId: string | null;
    setCommandedInput: CommandedInputSetter;
    runningGenerationIds: Set<string>;
    setRunningGenerationIds: Dispatch<SetStateAction<Set<string>>>;
    runningGenerationsRef: React.MutableRefObject<Map<string, AbortController>>;
}

export const useMessageHandler = ({
    appSettings,
    messages,
    setMessages,
    currentChatSettings,
    setCurrentChatSettings,
    selectedFiles,
    setSelectedFiles,
    editingMessageId,
    setEditingMessageId,
    setAppFileError,
    aspectRatio,
    userScrolledUp,
    ttsMessageId,
    setTtsMessageId,
    saveCurrentChatSession,
    activeSessionId,
    setCommandedInput,
    runningGenerationIds,
    setRunningGenerationIds,
    runningGenerationsRef,
}: MessageHandlerProps) => {

    const handleApiError = useCallback((error: unknown, modelMessageId: string, errorPrefix: string = "Error") => {
        const isAborted = error instanceof Error && (error.name === 'AbortError' || error.message === 'aborted');
        logService.error(`API Error (${errorPrefix}) for message ${modelMessageId}`, { error, isAborted });
        if (isAborted) {
            setMessages(prev => prev.map(msg => 
                msg.id === modelMessageId && msg.isLoading
                    ? { ...msg, role: 'model', content: (msg.content || "") + "\n\n[Cancelled by user]", isLoading: false, generationEndTime: new Date() } 
                    : msg
            ));
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

        setMessages(prev => prev.map(msg => 
            msg.id === modelMessageId 
                ? { ...msg, role: 'error', content: errorMessage, isLoading: false, generationEndTime: new Date() } 
                : msg
        ));
    }, [setMessages]);


    const handleSendMessage = useCallback(async (overrideOptions?: { text?: string; files?: UploadedFile[]; editingId?: string }) => {
        const textToUse = overrideOptions?.text ?? '';
        const filesToUse = overrideOptions?.files ?? selectedFiles;
        const effectiveEditingId = overrideOptions?.editingId ?? editingMessageId;
        const activeModelId = currentChatSettings.modelId;
        const isTtsModel = activeModelId.includes('-tts');
        const isImagenModel = activeModelId.includes('imagen');
        
        logService.info(`Sending message with model ${activeModelId}`, { textLength: textToUse.length, fileCount: filesToUse.length, editingId: effectiveEditingId });

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
            setMessages(prev => [...prev, { id: generateUniqueId(), role: 'error', content: 'No model selected.', timestamp: new Date() }]); 
            return; 
        }

        const hasFileId = filesToUse.some(f => f.fileUri);
        const keyResult = getKeyForRequest(appSettings, currentChatSettings);
        if ('error' in keyResult) {
            logService.error("Send message failed: API Key not configured.");
            setMessages(prev => [...prev, { id: generateUniqueId(), role: 'error', content: keyResult.error, timestamp: new Date() }]);
            return;
        }
        const { key: keyToUse, isNewKey } = keyResult;
        const shouldLockKey = isNewKey && hasFileId;

        const controller = new AbortController();
        const currentSignal = controller.signal;
        userScrolledUp.current = false;
        
        if (overrideOptions?.files === undefined) {
            setSelectedFiles([]);
        }

        const modelMessageId = generateUniqueId();
        runningGenerationsRef.current.set(modelMessageId, controller);
        setRunningGenerationIds(prev => new Set(prev).add(modelMessageId));

        const cleanup = () => {
            runningGenerationsRef.current.delete(modelMessageId);
            setRunningGenerationIds(prev => {
                const next = new Set(prev);
                next.delete(modelMessageId);
                return next;
            });
        };

        // --- TTS Model Logic ---
        if (isTtsModel) {
            logService.info("Handling TTS model request.");
            const userMessage: ChatMessage = { id: generateUniqueId(), role: 'user', content: textToUse.trim(), timestamp: new Date() };
            setMessages(prev => [...prev, userMessage, { id: modelMessageId, role: 'model', content: '', timestamp: new Date(), isLoading: true, generationStartTime: new Date() }]);
            
            try {
                const base64Pcm = await geminiServiceInstance.generateSpeech(keyToUse, activeModelId, textToUse.trim(), currentChatSettings.ttsVoice, currentSignal);
                if (currentSignal.aborted) { throw new Error("aborted"); }
                
                const wavUrl = pcmBase64ToWavUrl(base64Pcm);
                
                setMessages(prev => prev.map(msg => msg.id === modelMessageId ? {
                    ...msg,
                    isLoading: false,
                    content: textToUse.trim(),
                    audioSrc: wavUrl,
                    generationEndTime: new Date(),
                } : msg));
                
            } catch (error) {
                handleApiError(error, modelMessageId, "TTS Error");
            } finally {
                cleanup();
            }
            return;
        }

        // --- Imagen Model Logic ---
        if (isImagenModel) {
            logService.info("Handling Imagen model request.");
            const userMessage: ChatMessage = { id: generateUniqueId(), role: 'user', content: textToUse.trim(), timestamp: new Date() };
            setMessages(prev => [...prev, userMessage, { id: modelMessageId, role: 'model', content: '', timestamp: new Date(), isLoading: true, generationStartTime: new Date() }]);
            
            try {
                const imageBase64Array = await geminiServiceInstance.generateImages(keyToUse, activeModelId, textToUse.trim(), aspectRatio, currentSignal);
                if (currentSignal.aborted) { throw new Error("aborted"); }

                const generatedFiles: UploadedFile[] = imageBase64Array.map((base64Data, index) => {
                    const dataUrl = `data:image/jpeg;base64,${base64Data}`;
                    return {
                        id: generateUniqueId(),
                        name: `generated-image-${index + 1}.jpeg`,
                        type: 'image/jpeg',
                        size: base64Data.length,
                        dataUrl,
                        base64Data,
                        uploadState: 'active'
                    };
                });
                
                setMessages(prev => prev.map(msg => msg.id === modelMessageId ? {
                    ...msg,
                    isLoading: false,
                    content: `Generated image for: "${textToUse.trim()}"`,
                    files: generatedFiles,
                    generationEndTime: new Date(),
                } : msg));
                
            } catch (error) {
                handleApiError(error, modelMessageId, "Image Generation Error");
            } finally {
                cleanup();
            }
            return;
        }

        // ---- Regular Text Generation Logic ----
        logService.info("Handling standard text generation request.");
        const editIndex = effectiveEditingId ? messages.findIndex(m => m.id === effectiveEditingId) : -1;
        const baseMessages = editIndex !== -1 ? messages.slice(0, editIndex) : [...messages];
        const successfullyProcessedFiles = filesToUse.filter(f => f.uploadState === 'active' && !f.error && !f.isProcessing);
        const promptParts = buildContentParts(textToUse.trim(), successfullyProcessedFiles);
        if (promptParts.length === 0) { cleanup(); return; }

        const historyForApi = createChatHistoryForApi(baseMessages);
        const fullHistory: ChatHistoryItem[] = [...historyForApi, { role: 'user', parts: promptParts }];
        if (effectiveEditingId && !overrideOptions) setEditingMessageId(null);

        const lastCumulative = baseMessages.length > 0 ? (baseMessages[baseMessages.length - 1].cumulativeTotalTokens || 0) : 0;
        const userMessage: ChatMessage = { id: generateUniqueId(), role: 'user', content: textToUse.trim(), files: successfullyProcessedFiles.length ? successfullyProcessedFiles : undefined, timestamp: new Date(), cumulativeTotalTokens: lastCumulative };
        
        setMessages(() => [
            ...baseMessages,
            userMessage,
            { id: modelMessageId, role: 'model', content: '', thoughts: '', timestamp: new Date(), isLoading: true, generationStartTime: new Date() }
        ]);

        const processModelMessageCompletion = (prevMsgs: ChatMessage[], modelId: string, finalContent: string, finalThoughts: string | undefined, usageMeta?: UsageMetadata, isAborted?: boolean) => {
            const loadingMsgIndex = prevMsgs.findIndex(m => m.id === modelId);
            if (loadingMsgIndex === -1) return prevMsgs;
            const loadingMsg = prevMsgs[loadingMsgIndex];
            const prevUserMsg = prevMsgs[loadingMsgIndex - 1];
            const prevTotal = prevUserMsg?.cumulativeTotalTokens || 0;
            const turnTokens = usageMeta?.totalTokenCount || 0;
            const promptTokens = usageMeta?.promptTokenCount;
            const completionTokens = (promptTokens !== undefined) ? turnTokens - promptTokens : undefined;
            const updatedMessages = [...prevMsgs];
            updatedMessages[loadingMsgIndex] = {
                ...loadingMsg,
                isLoading: false,
                content: finalContent + (isAborted ? "\n\n[Stopped by user]" : ""),
                thoughts: currentChatSettings.showThoughts ? finalThoughts : loadingMsg.thoughts,
                generationEndTime: new Date(),
                promptTokens,
                completionTokens,
                totalTokens: turnTokens,
                cumulativeTotalTokens: prevTotal + turnTokens
            };
            for (let i = loadingMsgIndex + 1; i < updatedMessages.length; i++) {
                const prevMsgInLoop = updatedMessages[i - 1];
                const turnTotal = updatedMessages[i].totalTokens || 0;
                updatedMessages[i].cumulativeTotalTokens = (prevMsgInLoop.cumulativeTotalTokens || 0) + turnTotal;
            }
            return updatedMessages;
        };
        
        const handleCompletion = (finalMessages: ChatMessage[]) => {
            let finalSettings = currentChatSettings;
            if (shouldLockKey) {
                logService.info("Locking API key for this session due to file usage.");
                const newSettings = { ...currentChatSettings, lockedApiKey: keyToUse };
                setCurrentChatSettings(() => newSettings);
                finalSettings = newSettings;
            }
            saveCurrentChatSession(finalMessages, activeSessionId, finalSettings);
        }

        const chatSettings = {
            systemInstruction: currentChatSettings.systemInstruction,
            config: { temperature: currentChatSettings.temperature, topP: currentChatSettings.topP },
            showThoughts: currentChatSettings.showThoughts,
            thinkingBudget: currentChatSettings.thinkingBudget,
        };

        const streamOnError = (error: Error) => {
            handleApiError(error, modelMessageId);
            cleanup();
        };

        if (appSettings.isStreamingEnabled) {
            await geminiServiceInstance.sendMessageStream(keyToUse, activeModelId, fullHistory, chatSettings.systemInstruction, chatSettings.config, chatSettings.showThoughts, chatSettings.thinkingBudget, currentSignal,
                (chunk) => setMessages(prev => prev.map(msg => msg.id === modelMessageId ? { ...msg, content: msg.content + chunk, isLoading: true } : msg)),
                (thoughtChunk) => setMessages(prev => prev.map(msg => msg.id === modelMessageId ? { ...msg, thoughts: (msg.thoughts || '') + thoughtChunk, isLoading: true } : msg)),
                streamOnError,
                (usageMetadata) => {
                    setMessages(prev => {
                        const loadingMsg = prev.find(m => m.id === modelMessageId);
                        const finalMsgs = processModelMessageCompletion(prev, modelMessageId, loadingMsg?.content || "", loadingMsg?.thoughts, usageMetadata, currentSignal.aborted);
                        handleCompletion(finalMsgs);
                        return finalMsgs;
                    });
                    cleanup();
                }
            );
        } else { 
            await geminiServiceInstance.sendMessageNonStream(keyToUse, activeModelId, fullHistory, chatSettings.systemInstruction, chatSettings.config, chatSettings.showThoughts, chatSettings.thinkingBudget, currentSignal,
                streamOnError,
                (fullText, thoughtsText, usageMetadata) => {
                    setMessages(prev => {
                        const finalMsgs = processModelMessageCompletion(prev, modelMessageId, fullText, thoughtsText, usageMetadata, currentSignal.aborted);
                        handleCompletion(finalMsgs);
                        return finalMsgs;
                    });
                    cleanup();
                }
            );
        }
    }, [selectedFiles, currentChatSettings, messages, appSettings.isStreamingEnabled, saveCurrentChatSession, activeSessionId, editingMessageId, appSettings, aspectRatio, handleApiError, setMessages, setSelectedFiles, setEditingMessageId, setAppFileError, userScrolledUp, runningGenerationsRef, setRunningGenerationIds, setCurrentChatSettings ]);

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
            
            setMessages(prev => prev.map(msg => 
                msg.id === messageId 
                    ? { ...msg, audioSrc: wavUrl } 
                    : msg
            ));

        } catch (error) {
            logService.error("TTS generation failed:", { messageId, error });
        } finally {
            setTtsMessageId(null);
        }
    }, [appSettings, currentChatSettings, setMessages, setTtsMessageId, ttsMessageId]);

    const handleStopGenerating = () => {
        logService.warn("User stopped generation.");
        runningGenerationsRef.current.forEach(controller => controller.abort());
    };

    const handleEditMessage = (messageId: string) => {
        logService.info("User initiated message edit", { messageId });
        const messageToEdit = messages.find(msg => msg.id === messageId);
        if (messageToEdit?.role === 'user') {
            if (runningGenerationIds.size > 0) handleStopGenerating();
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
        logService.info("User deleted message", { messageId });
        if (messages.find(msg => msg.id === messageId)?.isLoading) handleStopGenerating();
        setMessages(prev => prev.filter(msg => msg.id !== messageId));
        if (editingMessageId === messageId) handleCancelEdit();
        userScrolledUp.current = false;
    };

    const handleRetryMessage = async (modelMessageIdToRetry: string) => {
        logService.info("User retrying message", { modelMessageId: modelMessageIdToRetry });
        const modelMessageIndex = messages.findIndex(m => m.id === modelMessageIdToRetry);
        if (modelMessageIndex < 1) return;

        const userMessageToResend = messages[modelMessageIndex - 1];
        if (userMessageToResend.role !== 'user') return;

        if (runningGenerationIds.size > 0) {
            handleStopGenerating();
        }
        
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