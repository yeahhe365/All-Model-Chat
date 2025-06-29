import { useCallback } from 'react';
import { AppSettings, ChatMessage, UploadedFile, ChatSettings as IndividualChatSettings, ChatHistoryItem } from '../types';
import { generateUniqueId, buildContentParts, pcmBase64ToWavUrl, createChatHistoryForApi } from '../utils/appUtils';
import { geminiServiceInstance } from '../services/geminiService';
import { Chat, UsageMetadata } from '@google/genai';

interface MessageHandlerProps {
    appSettings: AppSettings;
    messages: ChatMessage[];
    setMessages: (updater: (prev: ChatMessage[]) => ChatMessage[]) => void;
    isLoading: boolean;
    setIsLoading: (loading: boolean) => void;
    chatSession: Chat | null;
    currentChatSettings: IndividualChatSettings;
    inputText: string;
    setInputText: (text: string) => void;
    selectedFiles: UploadedFile[];
    setSelectedFiles: (files: UploadedFile[] | ((prev: UploadedFile[]) => UploadedFile[])) => void;
    editingMessageId: string | null;
    setEditingMessageId: (id: string | null) => void;
    setAppFileError: (error: string | null) => void;
    aspectRatio: string;
    abortControllerRef: React.MutableRefObject<AbortController | null>;
    userScrolledUp: React.MutableRefObject<boolean>;
    ttsMessageId: string | null;
    setTtsMessageId: (id: string | null) => void;
    initializeCurrentChatSession: (settingsToUse: IndividualChatSettings, history?: ChatHistoryItem[]) => Promise<Chat | null>;
    saveCurrentChatSession: (currentMessages: ChatMessage[], currentActiveSessionId: string | null, currentSettingsToSave: IndividualChatSettings) => void;
    activeSessionId: string | null;
}

export const useMessageHandler = ({
    appSettings,
    messages,
    setMessages,
    isLoading,
    setIsLoading,
    chatSession,
    currentChatSettings,
    inputText,
    setInputText,
    selectedFiles,
    setSelectedFiles,
    editingMessageId,
    setEditingMessageId,
    setAppFileError,
    aspectRatio,
    abortControllerRef,
    userScrolledUp,
    ttsMessageId,
    setTtsMessageId,
    initializeCurrentChatSession,
    saveCurrentChatSession,
    activeSessionId,
}: MessageHandlerProps) => {

    const handleSendMessage = useCallback(async (overrideOptions?: { text?: string; files?: UploadedFile[]; editingId?: string }) => {
        const textToUse = overrideOptions?.text ?? inputText;
        const filesToUse = overrideOptions?.files ?? selectedFiles;
        const effectiveEditingId = overrideOptions?.editingId ?? editingMessageId;
        const activeModelId = currentChatSettings.modelId;
        const isTtsModel = activeModelId.includes('-tts');
        const isImagenModel = activeModelId.includes('imagen');
        const isVeoModel = activeModelId.includes('veo-');

        if (!textToUse.trim() && !isTtsModel && !isImagenModel && !isVeoModel && filesToUse.filter(f => f.uploadState === 'active').length === 0) return;
        if ((isTtsModel || isImagenModel || isVeoModel) && !textToUse.trim()) return;
        if (filesToUse.some(f => f.isProcessing || (f.uploadState !== 'active' && !f.error) )) { setAppFileError("Wait for files to finish processing."); return; }
        setAppFileError(null);

        if (!activeModelId) { setMessages(prev => [...prev, { id: generateUniqueId(), role: 'error', content: 'No model selected.', timestamp: new Date() }]); setIsLoading(false); return; }

        setIsLoading(true);
        if (abortControllerRef.current) abortControllerRef.current.abort();
        abortControllerRef.current = new AbortController();
        const currentSignal = abortControllerRef.current.signal;
        userScrolledUp.current = false;

        if (!overrideOptions) { setInputText(''); setSelectedFiles([]); }

        // --- Veo Model Logic ---
        if (isVeoModel) {
            const userMessage: ChatMessage = { id: generateUniqueId(), role: 'user', content: textToUse.trim(), timestamp: new Date() };
            const modelMessageId = generateUniqueId();
            
            setMessages(prev => [...prev, userMessage, { id: modelMessageId, role: 'model', content: '', timestamp: new Date(), isLoading: true, generationStartTime: new Date() }]);
            
            try {
                // For Veo 2, duration is 5-8s. We'll use 8s for simplicity for now.
                const duration = 8;
                const generateAudio = false;
                
                const videoUris = await geminiServiceInstance.generateVideo(activeModelId, textToUse.trim(), aspectRatio, duration, generateAudio, currentSignal);

                if (currentSignal.aborted) { throw new Error("aborted"); }

                const generatedFiles: UploadedFile[] = videoUris.map((uri, index) => ({
                    id: generateUniqueId(),
                    name: `generated-video-${index + 1}.mp4`,
                    type: 'video/mp4',
                    size: 0, // Size is unknown from URI
                    dataUrl: uri,
                    uploadState: 'active'
                }));
                
                setMessages(prev => prev.map(msg => msg.id === modelMessageId ? {
                    ...msg,
                    isLoading: false,
                    content: `Generated video for: "${textToUse.trim()}"`,
                    files: generatedFiles,
                    generationEndTime: new Date(),
                } : msg));
                
            } catch (error) {
                if (error instanceof Error && error.name === 'SilentError') {
                    setMessages(prev => prev.map(msg => msg.id === modelMessageId ? { ...msg, role: 'error', content: "API key is not configured in settings.", isLoading: false, generationEndTime: new Date() } : msg));
                } else {
                    const isAborted = error instanceof Error && (error.name === 'AbortError' || error.message === 'aborted');
                    setMessages(prev => prev.map(msg => msg.id === modelMessageId ? {
                        ...msg,
                        role: isAborted ? 'model' : 'error',
                        content: isAborted ? "[Cancelled by user]" : `Video Generation Error: ${error instanceof Error ? error.message : String(error)}`,
                        isLoading: false,
                        generationEndTime: new Date()
                    } : msg));
                }
            } finally {
                setIsLoading(false);
                if (abortControllerRef.current?.signal === currentSignal) abortControllerRef.current = null;
            }
            return;
        }

        // --- TTS Model Logic ---
        if (isTtsModel) {
            const userMessage: ChatMessage = { id: generateUniqueId(), role: 'user', content: textToUse.trim(), timestamp: new Date() };
            const modelMessageId = generateUniqueId();
            
            setMessages(prev => [...prev, userMessage, { id: modelMessageId, role: 'model', content: '', timestamp: new Date(), isLoading: true, generationStartTime: new Date() }]);
            
            try {
                const base64Pcm = await geminiServiceInstance.generateSpeech(activeModelId, textToUse.trim(), currentChatSettings.ttsVoice, currentSignal);
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
                 if (error instanceof Error && error.name === 'SilentError') {
                    setMessages(prev => prev.map(msg => msg.id === modelMessageId ? { ...msg, role: 'error', content: "API key is not configured in settings.", isLoading: false, generationEndTime: new Date() } : msg));
                    setIsLoading(false);
                    if (abortControllerRef.current?.signal === currentSignal) abortControllerRef.current = null;
                    return;
                }
                const isAborted = error instanceof Error && (error.name === 'AbortError' || error.message === 'aborted');
                setMessages(prev => prev.map(msg => msg.id === modelMessageId ? {
                    ...msg,
                    role: isAborted ? 'model' : 'error',
                    content: isAborted ? "[Cancelled by user]" : `TTS Error: ${error instanceof Error ? error.message : String(error)}`,
                    isLoading: false,
                    generationEndTime: new Date()
                } : msg));
            } finally {
                setIsLoading(false);
                if (abortControllerRef.current?.signal === currentSignal) abortControllerRef.current = null;
            }
            return;
        }

        // --- Imagen Model Logic ---
        if (isImagenModel) {
            const userMessage: ChatMessage = { id: generateUniqueId(), role: 'user', content: textToUse.trim(), timestamp: new Date() };
            const modelMessageId = generateUniqueId();
            
            setMessages(prev => [...prev, userMessage, { id: modelMessageId, role: 'model', content: '', timestamp: new Date(), isLoading: true, generationStartTime: new Date() }]);
            
            try {
                const imageBase64Array = await geminiServiceInstance.generateImages(activeModelId, textToUse.trim(), aspectRatio, currentSignal);

                if (currentSignal.aborted) { throw new Error("aborted"); }

                const generatedFiles: UploadedFile[] = imageBase64Array.map((base64Data, index) => {
                    const dataUrl = `data:image/jpeg;base64,${base64Data}`;
                    return {
                        id: generateUniqueId(),
                        name: `generated-image-${index + 1}.jpeg`,
                        type: 'image/jpeg',
                        size: base64Data.length, // approximation
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
                 if (error instanceof Error && error.name === 'SilentError') {
                    setMessages(prev => prev.map(msg => msg.id === modelMessageId ? { ...msg, role: 'error', content: "API key is not configured in settings.", isLoading: false, generationEndTime: new Date() } : msg));
                    setIsLoading(false);
                    if (abortControllerRef.current?.signal === currentSignal) abortControllerRef.current = null;
                    return;
                }
                const isAborted = error instanceof Error && (error.name === 'AbortError' || error.message === 'aborted');
                setMessages(prev => prev.map(msg => msg.id === modelMessageId ? {
                    ...msg,
                    role: isAborted ? 'model' : 'error',
                    content: isAborted ? "[Cancelled by user]" : `Image Generation Error: ${error instanceof Error ? error.message : String(error)}`,
                    isLoading: false,
                    generationEndTime: new Date()
                } : msg));
            } finally {
                setIsLoading(false);
                if (abortControllerRef.current?.signal === currentSignal) abortControllerRef.current = null;
            }
            return;
        }

        // ---- Regular Text Generation Logic ----

        // If editing, find the point to slice the history.
        const editIndex = effectiveEditingId ? messages.findIndex(m => m.id === effectiveEditingId) : -1;
        const baseMessages = editIndex !== -1 ? messages.slice(0, editIndex) : [...messages];

        // Create the new user message to be sent.
        const successfullyProcessedFiles = filesToUse.filter(f => f.uploadState === 'active' && !f.error && !f.isProcessing);
        const userMessage: ChatMessage = { id: generateUniqueId(), role: 'user', content: textToUse.trim(), files: successfullyProcessedFiles.length ? successfullyProcessedFiles : undefined, timestamp: new Date() };
        const promptParts = buildContentParts(textToUse.trim(), successfullyProcessedFiles);

        if (promptParts.length === 0) { setIsLoading(false); return; }

        // Clean up editing state after use.
        if (effectiveEditingId && !overrideOptions) setEditingMessageId(null);

        // Re-initialize the chat session if necessary (e.g., history was sliced for editing).
        let sdkSessionForThisTurn = chatSession;
        if (editIndex !== -1 || !sdkSessionForThisTurn) {
            const historyForApi = createChatHistoryForApi(baseMessages);
            const newSdkSession = await initializeCurrentChatSession(currentChatSettings, historyForApi);
            if (!newSdkSession) {
                const errorMsg = appSettings.useCustomApiConfig && (!appSettings.apiKey || !appSettings.apiKey.trim())
                    ? 'API key is not configured in settings. Please add a valid key to send messages.'
                    : 'Chat session unavailable. Check API key and network.';
                setMessages(prev => [...prev, { id: generateUniqueId(), role: 'error', content: errorMsg, timestamp: new Date() }]);
                setIsLoading(false);
                return;
            }
            sdkSessionForThisTurn = newSdkSession;
        }

        if (!sdkSessionForThisTurn) {
            setMessages(prev => [...prev, { id: generateUniqueId(), role: 'error', content: 'Chat session unavailable.', timestamp: new Date() }]);
            setIsLoading(false);
            return;
        }

        // Update UI state with base messages, new user message, and a loading indicator for the model.
        const lastCumulative = baseMessages.length > 0 ? (baseMessages[baseMessages.length - 1].cumulativeTotalTokens || 0) : 0;
        const modelMessageId = generateUniqueId();
        setMessages([
            ...baseMessages,
            { ...userMessage, cumulativeTotalTokens: lastCumulative },
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
            const completionTokens = usageMeta?.candidatesTokenCount;
        
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

        if (appSettings.isStreamingEnabled) {
            await geminiServiceInstance.sendMessageStream(sdkSessionForThisTurn, activeModelId, promptParts, currentSignal,
                (chunk) => setMessages(prev => prev.map(msg => msg.id === modelMessageId ? { ...msg, content: msg.content + chunk, isLoading: true } : msg)),
                (thoughtChunk) => setMessages(prev => prev.map(msg => msg.id === modelMessageId ? { ...msg, thoughts: (msg.thoughts || '') + thoughtChunk, isLoading: true } : msg)),
                (error) => { setMessages(prev => prev.map(msg => msg.id === modelMessageId ? { ...msg, role: 'error', content: `Error: ${error.message}`, isLoading: false, generationEndTime: new Date() } : msg)); setIsLoading(false); if (abortControllerRef.current?.signal === currentSignal) abortControllerRef.current = null; },
                (usageMetadata) => {
                    setMessages(prev => {
                        const loadingMsg = prev.find(m => m.id === modelMessageId);
                        const finalMsgs = processModelMessageCompletion(prev, modelMessageId, loadingMsg?.content || "", loadingMsg?.thoughts, usageMetadata, currentSignal.aborted);
                        saveCurrentChatSession(finalMsgs, activeSessionId, currentChatSettings);
                        return finalMsgs;
                    });
                    setIsLoading(false); if (abortControllerRef.current?.signal === currentSignal) abortControllerRef.current = null;
                }
            );
        } else { 
            await geminiServiceInstance.sendMessageNonStream(sdkSessionForThisTurn, activeModelId, promptParts, currentSignal,
                (error) => { setMessages(prev => prev.map(msg => msg.id === modelMessageId ? { ...msg, role: 'error', content: `Error: ${error.message}`, isLoading: false, generationEndTime: new Date() } : msg)); setIsLoading(false); if (abortControllerRef.current?.signal === currentSignal) abortControllerRef.current = null; },
                (fullText, thoughtsText, usageMetadata) => {
                    setMessages(prev => {
                        const finalMsgs = processModelMessageCompletion(prev, modelMessageId, fullText, thoughtsText, usageMetadata, currentSignal.aborted);
                        saveCurrentChatSession(finalMsgs, activeSessionId, currentChatSettings);
                        return finalMsgs;
                    });
                    setIsLoading(false); if (abortControllerRef.current?.signal === currentSignal) abortControllerRef.current = null;
                }
            );
        }
    }, [isLoading, inputText, selectedFiles, currentChatSettings, messages, chatSession, appSettings.isStreamingEnabled, initializeCurrentChatSession, saveCurrentChatSession, activeSessionId, editingMessageId, appSettings, aspectRatio, setMessages, setIsLoading, setInputText, setSelectedFiles, setEditingMessageId, setAppFileError, userScrolledUp, abortControllerRef ]);

    const handleTextToSpeech = useCallback(async (messageId: string, text: string) => {
        if (ttsMessageId) return; // Prevent multiple TTS requests at once

        setTtsMessageId(messageId);
        // User requested Gemini 2.5 Flash TTS
        const modelId = 'models/gemini-2.5-flash-preview-tts';
        const voice = appSettings.ttsVoice;
        const abortController = new AbortController();

        try {
            const base64Pcm = await geminiServiceInstance.generateSpeech(modelId, text, voice, abortController.signal);
            const wavUrl = pcmBase64ToWavUrl(base64Pcm);
            
            setMessages(prev => prev.map(msg => 
                msg.id === messageId 
                    ? { ...msg, audioSrc: wavUrl } 
                    : msg
            ));

        } catch (error) {
            console.error("TTS generation failed:", error);
            // Optionally add error feedback to the user here
        } finally {
            setTtsMessageId(null);
        }
    }, [appSettings.ttsVoice, setMessages, setTtsMessageId, ttsMessageId]);

    const handleStopGenerating = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort(); 
            setIsLoading(false);
            setMessages(prev => prev.map(msg => msg.isLoading ? { ...msg, content: (msg.content||"") + "\n\n[Stopped by user]", isLoading: false, generationEndTime: new Date() } : msg));
        }
    };

    const handleEditMessage = (messageId: string) => {
        const messageToEdit = messages.find(msg => msg.id === messageId);
        if (messageToEdit?.role === 'user') {
            if (isLoading) handleStopGenerating();
            setInputText(messageToEdit.content);
            setSelectedFiles(messageToEdit.files || []);
            setEditingMessageId(messageId);
            setAppFileError(null);
            (document.querySelector('textarea[aria-label="Chat message input"]') as HTMLTextAreaElement)?.focus();
        }
    };

    const handleCancelEdit = () => { setInputText(''); setSelectedFiles([]); setEditingMessageId(null); setAppFileError(null); };

    const handleDeleteMessage = (messageId: string) => {
        if (messages.find(msg => msg.id === messageId)?.isLoading) handleStopGenerating();
        setMessages(prev => prev.filter(msg => msg.id !== messageId));
        if (editingMessageId === messageId) handleCancelEdit();
        userScrolledUp.current = false;
    };

    const handleRetryMessage = async (modelMessageIdToRetry: string) => {
        const modelMessageIndex = messages.findIndex(m => m.id === modelMessageIdToRetry);
        if (modelMessageIndex < 1) return;
        const userMessageToResend = messages[modelMessageIndex - 1];
        if (userMessageToResend.role !== 'user') return;
        if (isLoading) handleStopGenerating();
        setMessages(prev => prev.slice(0, modelMessageIndex - 1));
        await handleSendMessage({ text: userMessageToResend.content, files: userMessageToResend.files });
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