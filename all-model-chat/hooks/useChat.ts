import { useState, useEffect, useRef, useCallback } from 'react';
import { ChatMessage, ModelOption, ChatHistoryItem, AppSettings, UploadedFile, ContentPart, PreloadedMessage, SavedChatSession, ChatSettings as IndividualChatSettings } from '../types';
import { DEFAULT_CHAT_SETTINGS, PRELOADED_SCENARIO_KEY, CHAT_HISTORY_SESSIONS_KEY, ACTIVE_CHAT_SESSION_ID_KEY } from '../constants/appConstants';
import { ALL_SUPPORTED_MIME_TYPES, SUPPORTED_IMAGE_MIME_TYPES, SUPPORTED_TEXT_MIME_TYPES } from '../constants/fileConstants';
import { geminiServiceInstance } from '../services/geminiService';
import { Chat, UsageMetadata } from '@google/genai';
import { generateUniqueId, generateSessionTitle, buildContentParts, createChatHistoryForApi, pcmBase64ToWavUrl } from '../utils/appUtils';
import { useModels } from './useModels';

export const useChat = (appSettings: AppSettings) => {
    // Core state
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [chatSession, setChatSession] = useState<Chat | null>(null);
    const [currentChatSettings, setCurrentChatSettings] = useState<IndividualChatSettings>(DEFAULT_CHAT_SETTINGS);
    const [inputText, setInputText] = useState<string>('');
    const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
    const [aspectRatio, setAspectRatio] = useState<string>('16:9');
    
    // File and Drag & Drop state
    const [selectedFiles, setSelectedFiles] = useState<UploadedFile[]>([]);
    const [isAppDraggingOver, setIsAppDraggingOver] = useState<boolean>(false);
    const [appFileError, setAppFileError] = useState<string | null>(null);
    const [isAppProcessingFile, setIsAppProcessingFile] = useState<boolean>(false);
    const [isSwitchingModel, setIsSwitchingModel] = useState<boolean>(false);

    // History and Scenarios state
    const [savedSessions, setSavedSessions] = useState<SavedChatSession[]>([]);
    const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
    const [preloadedMessages, setPreloadedMessages] = useState<PreloadedMessage[]>([]);

    // UI and settings state
    const { isStreamingEnabled } = appSettings;

    // Model fetching via custom hook
    const { isModelsLoading, modelsLoadingError } = useModels(appSettings);
    const apiModels = useModels(appSettings).apiModels;
    
    // Refs for managing UI behavior and async operations
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const userScrolledUp = useRef<boolean>(false);
    const abortControllerRef = useRef<AbortController | null>(null);
    const sessionSaveTimeoutRef = useRef<number | null>(null);

    // Initial data loading
    useEffect(() => {
        try {
            const storedScenario = localStorage.getItem(PRELOADED_SCENARIO_KEY);
            if (storedScenario) setPreloadedMessages(JSON.parse(storedScenario));
        } catch (error) { console.error("Error loading preloaded scenario:", error); }

        try {
            const storedSessions = localStorage.getItem(CHAT_HISTORY_SESSIONS_KEY);
            const sessions: SavedChatSession[] = storedSessions ? JSON.parse(storedSessions) : [];
            sessions.sort((a,b) => b.timestamp - a.timestamp);
            setSavedSessions(sessions);

            const storedActiveId = localStorage.getItem(ACTIVE_CHAT_SESSION_ID_KEY);
            if (storedActiveId && sessions.find(s => s.id === storedActiveId)) {
                loadChatSession(storedActiveId, sessions);
            } else if (sessions.length > 0) {
                loadChatSession(sessions[0].id, sessions);
            } else {
                startNewChat(false);
            }
        } catch (error) {
            console.error("Error loading chat history:", error);
            startNewChat(false);
        }
    }, []);

    // Effect to validate current model against available models
    useEffect(() => {
        if (!isModelsLoading && apiModels.length > 0) {
            const currentModelStillValid = apiModels.some(m => m.id === appSettings.modelId);
            if (!currentModelStillValid) {
                const preferredModelId = apiModels.find(m => m.isPinned)?.id || apiModels[0].id;
                setCurrentChatSettings(prev => ({ ...prev, modelId: preferredModelId }));
            }
        }
    }, [isModelsLoading, apiModels, appSettings.modelId]);

    const saveCurrentChatSession = useCallback((currentMessages: ChatMessage[], currentActiveSessionId: string | null, currentSettingsToSave: IndividualChatSettings) => {
        if (sessionSaveTimeoutRef.current) clearTimeout(sessionSaveTimeoutRef.current);

        sessionSaveTimeoutRef.current = window.setTimeout(() => {
            if (currentMessages.length === 0 && (!currentActiveSessionId || !savedSessions.find(s => s.id === currentActiveSessionId))) {
                const isExistingSession = currentActiveSessionId && savedSessions.find(s => s.id === currentActiveSessionId);
                if (!isExistingSession) {
                    if (activeSessionId && !localStorage.getItem(ACTIVE_CHAT_SESSION_ID_KEY)) {
                        localStorage.removeItem(ACTIVE_CHAT_SESSION_ID_KEY);
                        setActiveSessionId(null);
                    }
                    return;
                }
            }

            let sessionIdToSave = currentActiveSessionId;
            let isNewSessionInHistory = false;

            if (!sessionIdToSave) {
                sessionIdToSave = generateUniqueId();
                isNewSessionInHistory = true;
            }

            const existingSession = savedSessions.find(s => s.id === sessionIdToSave);
            let timestampToUse = Date.now();

            if (existingSession) {
                // Heuristic to check for genuine user activity vs. just loading a session or changing settings.
                // If the number of messages and the ID of the last message are the same,
                // we assume no new message has been added, so we preserve the original timestamp.
                // This prevents re-ordering the history list just by clicking on a session.
                const lastExistingMessageId = existingSession.messages.length > 0 ? existingSession.messages[existingSession.messages.length - 1].id : null;
                const lastCurrentMessageId = currentMessages.length > 0 ? currentMessages[currentMessages.length - 1].id : null;

                if (existingSession.messages.length === currentMessages.length && lastExistingMessageId === lastCurrentMessageId) {
                    timestampToUse = existingSession.timestamp;
                }
            }

            const sessionToSave: SavedChatSession = {
                id: sessionIdToSave,
                title: generateSessionTitle(currentMessages),
                timestamp: timestampToUse,
                messages: currentMessages.map(msg => ({ 
                    ...msg,
                    files: msg.files?.map(f => {
                        const { abortController, ...rest } = f; 
                        return rest;
                    })
                })),
                settings: currentSettingsToSave,
            };

            setSavedSessions(prevSessions => {
                const existingIndex = prevSessions.findIndex(s => s.id === sessionIdToSave);
                let updatedSessions;
                if (existingIndex !== -1) {
                    updatedSessions = [...prevSessions];
                    updatedSessions[existingIndex] = sessionToSave;
                } else {
                    updatedSessions = [sessionToSave, ...prevSessions];
                }
                updatedSessions.sort((a,b) => b.timestamp - a.timestamp);
                localStorage.setItem(CHAT_HISTORY_SESSIONS_KEY, JSON.stringify(updatedSessions));
                return updatedSessions;
            });

            if ((isNewSessionInHistory || !currentActiveSessionId) && sessionIdToSave) {
                 setActiveSessionId(sessionIdToSave);
                 localStorage.setItem(ACTIVE_CHAT_SESSION_ID_KEY, sessionIdToSave);
            }
        }, 500);
    }, [savedSessions, activeSessionId]);

    // Session saving logic
    useEffect(() => {
        if (messages.length > 0 || (activeSessionId && savedSessions.find(s => s.id === activeSessionId))) {
            saveCurrentChatSession(messages, activeSessionId, currentChatSettings);
        } else if (messages.length === 0 && !activeSessionId && localStorage.getItem(ACTIVE_CHAT_SESSION_ID_KEY)) {
            localStorage.removeItem(ACTIVE_CHAT_SESSION_ID_KEY);
        }
    }, [messages, activeSessionId, currentChatSettings, saveCurrentChatSession, savedSessions]);

    // File processing state
    useEffect(() => {
        const anyFileProcessing = selectedFiles.some(file => file.isProcessing);
        setIsAppProcessingFile(anyFileProcessing);
    }, [selectedFiles]);
    
    // Scrolling logic
    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, []);

    const handleScroll = useCallback(() => {
        const container = scrollContainerRef.current;
        if (container) userScrolledUp.current = (container.scrollHeight - container.scrollTop - container.clientHeight) > 100;
    }, []);

    useEffect(() => {
        if (!userScrolledUp.current) scrollToBottom();
    }, [messages, scrollToBottom]);
    
    const initializeCurrentChatSession = useCallback(async (settingsToUse: IndividualChatSettings, history?: ChatHistoryItem[]) => {
        if (!settingsToUse.modelId) {
            const errorContent = 'No model selected. Cannot initialize chat.';
            setMessages(prev => {
                if (prev.length > 0 && prev[prev.length - 1].content === errorContent) return prev;
                return [...prev, { id: generateUniqueId(), role: 'error', content: errorContent, timestamp: new Date() }];
            });
            return null;
        }
        try {
            const newSession = await geminiServiceInstance.initializeChat(
                settingsToUse.modelId, settingsToUse.systemInstruction,
                { temperature: settingsToUse.temperature, topP: settingsToUse.topP },
                settingsToUse.showThoughts, history
            );
            setChatSession(newSession);
            if (!newSession) {
                const errorContent = 'Failed to initialize chat session. Check API Key, network, and selected model.';
                setMessages(prev => {
                    if (prev.length > 0 && prev[prev.length - 1].content === errorContent) return prev;
                    return [...prev, { id: generateUniqueId(), role: 'error', content: errorContent, timestamp: new Date() }];
                });
            }
            return newSession;
        } catch (error) {
            if (error instanceof Error && error.name === 'SilentError') {
                setChatSession(null);
                return null;
            }
            console.error("Error initializing chat session:", error);
            const errorMsg = error instanceof Error ? error.message : String(error);
            const fullErrorContent = `Error initializing chat: ${errorMsg}`;
            setMessages(prev => {
                if (prev.length > 0 && prev[prev.length - 1].content === fullErrorContent) {
                    return prev;
                }
                return [...prev, { id: generateUniqueId(), role: 'error', content: fullErrorContent, timestamp: new Date() }];
            });
            setChatSession(null);
            return null;
        }
    }, []);


    // Chat session re-initialization
    useEffect(() => {
        const reinitializeIfNeeded = async () => {
            const modelId = currentChatSettings.modelId;
            const isTtsModel = modelId.includes('-tts');
            const isImagenModel = modelId.includes('imagen');
            const isVeoModel = modelId.includes('veo-');

            if (isTtsModel || isImagenModel || isVeoModel) {
                setChatSession(null); // No chat session for these models
                setIsSwitchingModel(false);
                return;
            }

            if (!activeSessionId && messages.length === 0) {
                await initializeCurrentChatSession(currentChatSettings, []);
            } else {
                await initializeCurrentChatSession(currentChatSettings, createChatHistoryForApi(messages));
            }
            setIsSwitchingModel(false);
        };
        reinitializeIfNeeded();
    }, [activeSessionId, currentChatSettings.modelId, currentChatSettings.systemInstruction, currentChatSettings.temperature, currentChatSettings.topP]);


    const loadChatSession = useCallback((sessionId: string, allSessions?: SavedChatSession[]) => {
        const sessionsToSearch = allSessions || savedSessions;
        const sessionToLoad = sessionsToSearch.find(s => s.id === sessionId);
        if (sessionToLoad) {
            if (isLoading && abortControllerRef.current) abortControllerRef.current.abort();

            setMessages(sessionToLoad.messages.map(m => ({
                ...m,
                timestamp: new Date(m.timestamp),
                generationStartTime: m.generationStartTime ? new Date(m.generationStartTime) : undefined,
                generationEndTime: m.generationEndTime ? new Date(m.generationEndTime) : undefined,
                cumulativeTotalTokens: m.cumulativeTotalTokens,
            })));
            setCurrentChatSettings(sessionToLoad.settings);
            setActiveSessionId(sessionToLoad.id);
            localStorage.setItem(ACTIVE_CHAT_SESSION_ID_KEY, sessionToLoad.id);
            setInputText('');
            setSelectedFiles([]);
            setEditingMessageId(null);
            userScrolledUp.current = false;
        } else {
            console.warn(`Session ${sessionId} not found. Starting new chat.`);
            startNewChat(false);
        }
    }, [savedSessions, isLoading ]);

    const startNewChat = useCallback((saveCurrent: boolean = true) => {
        if (saveCurrent && activeSessionId && messages.length > 0) {
            saveCurrentChatSession(messages, activeSessionId, currentChatSettings);
        }
        if (isLoading && abortControllerRef.current) abortControllerRef.current.abort();

        setMessages([]);

        const newChatSessionSettings: IndividualChatSettings = {
            modelId: currentChatSettings.modelId, // Keep the currently selected model
            temperature: appSettings.temperature,
            topP: appSettings.topP,
            showThoughts: appSettings.showThoughts,
            systemInstruction: appSettings.systemInstruction,
            ttsVoice: appSettings.ttsVoice,
        };
        setCurrentChatSettings(newChatSessionSettings);

        setActiveSessionId(null);
        localStorage.removeItem(ACTIVE_CHAT_SESSION_ID_KEY);
        setInputText('');
        setSelectedFiles([]);
        setEditingMessageId(null);
        setChatSession(null); 
        userScrolledUp.current = false;
        setTimeout(() => {
            document.querySelector<HTMLTextAreaElement>('textarea[aria-label="Chat message input"]')?.focus();
        }, 0);
    }, [activeSessionId, messages, currentChatSettings, appSettings, isLoading, saveCurrentChatSession]);
    
    const handleClearCurrentChat = useCallback(() => {
        if (isLoading && abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        setMessages([]); 
        setInputText('');
        setSelectedFiles([]);
        setEditingMessageId(null);
        setAppFileError(null);
        userScrolledUp.current = false; 
        
        setTimeout(() => {
            document.querySelector<HTMLTextAreaElement>('textarea[aria-label="Chat message input"]')?.focus();
        }, 0);
    }, [isLoading]);

    const handleSelectModelInHeader = useCallback((modelId: string) => {
        if (isLoading && abortControllerRef.current) abortControllerRef.current.abort();
        if (modelId !== currentChatSettings.modelId) {
            setIsSwitchingModel(true);
            setCurrentChatSettings(prev => ({ ...prev, modelId: modelId }));
        }
        userScrolledUp.current = false;
    }, [isLoading, currentChatSettings.modelId]);
    
    // File Handlers
    const handleProcessAndAddFiles = useCallback(async (files: FileList | File[]) => {
        if (!files || files.length === 0) return;
        setAppFileError(null);
        const filesArray = Array.isArray(files) ? files : Array.from(files);

        const uploadPromises = filesArray.map(async (file) => {
            const fileId = generateUniqueId();
            const controller = new AbortController();

            if (!ALL_SUPPORTED_MIME_TYPES.includes(file.type)) {
                setSelectedFiles(prev => [...prev, { id: fileId, name: file.name, type: file.type, size: file.size, isProcessing: false, progress: 0, error: `Unsupported file type: ${file.type}`, uploadState: 'failed', abortController: controller }]);
                return; 
            }

            const isConsideredText = file.type.startsWith('text/') || SUPPORTED_TEXT_MIME_TYPES.includes(file.type);
            const typeForState = isConsideredText ? 'text/plain' : file.type;
            const mimeTypeForUpload = isConsideredText ? 'text/plain' : file.type;

            const initialFileState: UploadedFile = { id: fileId, name: file.name, type: typeForState, size: file.size, isProcessing: true, progress: 0, rawFile: file, uploadState: 'pending', abortController: controller };
            setSelectedFiles(prev => [...prev, initialFileState]);

            if (SUPPORTED_IMAGE_MIME_TYPES.includes(file.type)) {
                const reader = new FileReader();
                reader.onload = (e) => setSelectedFiles(p => p.map(f => f.id === fileId ? { ...f, dataUrl: e.target?.result as string } : f));
                reader.onerror = () => setSelectedFiles(p => p.map(f => f.id === fileId ? { ...f, error: "Failed to read file for preview." } : f));
                reader.readAsDataURL(file);
            }

            setSelectedFiles(prev => prev.map(f => f.id === fileId ? { ...f, progress: 10, uploadState: 'uploading' } : f));

            try {
                const uploadedFileInfo = await geminiServiceInstance.uploadFile(file, mimeTypeForUpload, file.name, controller.signal);
                setSelectedFiles(prev => prev.map(f => f.id === fileId ? { ...f, isProcessing: false, progress: 100, fileUri: uploadedFileInfo.uri, fileApiName: uploadedFileInfo.name, rawFile: undefined, uploadState: uploadedFileInfo.state === 'ACTIVE' ? 'active' : (uploadedFileInfo.state === 'PROCESSING' ? 'processing_api' : 'failed'), error: uploadedFileInfo.state === 'FAILED' ? 'File API processing failed' : (f.error || undefined), abortController: undefined, } : f));
            } catch (uploadError) {
                if (uploadError instanceof Error && uploadError.name === 'SilentError') {
                    setSelectedFiles(prev => prev.map(f => f.id === fileId ? { ...f, isProcessing: false, error: 'API key not configured', uploadState: 'failed', abortController: undefined } : f));
                    return;
                }
                let errorMsg = `Upload failed: ${uploadError instanceof Error ? uploadError.message : String(uploadError)}`;
                let uploadStateUpdate: UploadedFile['uploadState'] = 'failed';
                if (uploadError instanceof Error && uploadError.name === 'AbortError') {
                    errorMsg = "Upload cancelled by user.";
                    uploadStateUpdate = 'cancelled';
                }
                setSelectedFiles(prev => prev.map(f => f.id === fileId ? { ...f, isProcessing: false, error: errorMsg, rawFile: undefined, uploadState: uploadStateUpdate, abortController: undefined, } : f));
            }
        });
        await Promise.allSettled(uploadPromises);
    }, []);

    const handleCancelFileUpload = useCallback((fileIdToCancel: string) => {
        setSelectedFiles(prevFiles =>
            prevFiles.map(file => {
                if (file.id === fileIdToCancel && file.abortController) {
                    file.abortController.abort();
                    return { ...file, isProcessing: false, error: "Cancelling...", uploadState: 'failed' };
                }
                return file;
            })
        );
    }, []);

    const handleAddFileById = useCallback(async (fileApiId: string) => {
        setAppFileError(null);
        if (!fileApiId || !fileApiId.startsWith('files/')) { setAppFileError('Invalid File ID format.'); return; }
        if (selectedFiles.some(f => f.fileApiName === fileApiId)) { setAppFileError(`File with ID ${fileApiId} is already added.`); return; }

        const tempId = generateUniqueId();
        setSelectedFiles(prev => [...prev, { id: tempId, name: `Loading ${fileApiId}...`, type: 'application/octet-stream', size: 0, isProcessing: true, progress: 50, uploadState: 'processing_api', fileApiName: fileApiId, }]);

        try {
            const fileMetadata = await geminiServiceInstance.getFileMetadata(fileApiId);
            if (fileMetadata) {
                if (!ALL_SUPPORTED_MIME_TYPES.includes(fileMetadata.mimeType)) {
                    setSelectedFiles(prev => prev.map(f => f.id === tempId ? { ...f, name: fileMetadata.displayName || fileApiId, type: fileMetadata.mimeType, size: Number(fileMetadata.sizeBytes) || 0, isProcessing: false, error: `Unsupported file type: ${fileMetadata.mimeType}`, uploadState: 'failed' } : f));
                    return;
                }
                const newFile: UploadedFile = { id: tempId, name: fileMetadata.displayName || fileApiId, type: fileMetadata.mimeType, size: Number(fileMetadata.sizeBytes) || 0, fileUri: fileMetadata.uri, fileApiName: fileMetadata.name, isProcessing: false, progress: 100, uploadState: fileMetadata.state === 'ACTIVE' ? 'active' : 'failed', error: fileMetadata.state === 'FAILED' ? 'File API processing failed' : undefined, };
                setSelectedFiles(prev => prev.map(f => f.id === tempId ? newFile : f));
            } else {
                setAppFileError(`File with ID ${fileApiId} not found or inaccessible.`);
                setSelectedFiles(prev => prev.map(f => f.id === tempId ? { ...f, name: `Not Found: ${fileApiId}`, isProcessing: false, error: 'File not found.', uploadState: 'failed' } : f));
            }
        } catch (error) {
            if (error instanceof Error && error.name === 'SilentError') {
                setAppFileError('API key not configured.');
                setSelectedFiles(prev => prev.map(f => f.id === tempId ? { ...f, name: `Config Error: ${fileApiId}`, isProcessing: false, error: 'API key not configured', uploadState: 'failed' } : f));
                return;
            }
            setAppFileError(`Error fetching file: ${error instanceof Error ? error.message : String(error)}`);
            setSelectedFiles(prev => prev.map(f => f.id === tempId ? { ...f, name: `Error: ${fileApiId}`, isProcessing: false, error: `Fetch error`, uploadState: 'failed' } : f));
        }
    }, [selectedFiles]);

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

        let baseMessagesForThisTurn = [...messages];
        let historyForNewSdkSession: ChatHistoryItem[] | undefined = undefined;
        let needsSdkReinitialization = false;
        let sdkSessionForThisTurn = chatSession;

        if (effectiveEditingId) {
            const editMsgIndex = baseMessagesForThisTurn.findIndex(m => m.id === effectiveEditingId);
            if (editMsgIndex !== -1) {
                baseMessagesForThisTurn = baseMessagesForThisTurn.slice(0, editMsgIndex);
                historyForNewSdkSession = createChatHistoryForApi(baseMessagesForThisTurn);
                setMessages(baseMessagesForThisTurn); 
                needsSdkReinitialization = true;
            }
            if (!overrideOptions) setEditingMessageId(null);
        }

        if (!sdkSessionForThisTurn || needsSdkReinitialization) {
            const newSdkSession = await initializeCurrentChatSession(currentChatSettings, historyForNewSdkSession || createChatHistoryForApi(baseMessagesForThisTurn));
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

        if (!sdkSessionForThisTurn) { setMessages(prev => [...prev, { id: generateUniqueId(), role: 'error', content: 'Chat session unavailable.', timestamp: new Date() }]); setIsLoading(false); return; }

        const successfullyProcessedFiles = filesToUse.filter(f => f.uploadState === 'active' && !f.error && !f.isProcessing);
        const userMessage: ChatMessage = { id: generateUniqueId(), role: 'user', content: textToUse.trim(), files: successfullyProcessedFiles.length ? successfullyProcessedFiles : undefined, timestamp: new Date() };
        const promptParts = buildContentParts(textToUse.trim(), successfullyProcessedFiles);

        if (promptParts.length === 0) { setIsLoading(false); return; }
        
        const lastCumulative = baseMessagesForThisTurn.length > 0 ? (baseMessagesForThisTurn[baseMessagesForThisTurn.length - 1].cumulativeTotalTokens || 0) : 0;
        setMessages(prev => [...prev, { ...userMessage, cumulativeTotalTokens: lastCumulative }]);

        const modelMessageId = generateUniqueId();
        setMessages(prev => [ ...prev, { id: modelMessageId, role: 'model', content: '', thoughts: '', timestamp: new Date(), isLoading: true, generationStartTime: new Date() } ]);

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
        
            // Propagate the new cumulative total to subsequent messages if any
            for (let i = loadingMsgIndex + 1; i < updatedMessages.length; i++) {
                const prevMsgInLoop = updatedMessages[i - 1];
                const turnTotal = updatedMessages[i].totalTokens || 0;
                updatedMessages[i].cumulativeTotalTokens = (prevMsgInLoop.cumulativeTotalTokens || 0) + turnTotal;
            }
        
            return updatedMessages;
        };

        if (isStreamingEnabled) {
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
    }, [isLoading, inputText, selectedFiles, currentChatSettings, messages, chatSession, isStreamingEnabled, initializeCurrentChatSession, saveCurrentChatSession, activeSessionId, editingMessageId, appSettings, aspectRatio ]);
    
    // UI Action Handlers
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

    const handleDeleteChatHistorySession = (sessionId: string) => {
        setSavedSessions(prev => {
            const updated = prev.filter(s => s.id !== sessionId);
            localStorage.setItem(CHAT_HISTORY_SESSIONS_KEY, JSON.stringify(updated));
            return updated;
        });
        if (activeSessionId === sessionId) {
            const nextSessionToLoad = savedSessions.find(s => s.id !== sessionId);
            if (nextSessionToLoad) {
                 loadChatSession(nextSessionToLoad.id);
            } else {
                startNewChat(false);
            }
        }
    };
    
    const handleSavePreloadedScenario = (updatedScenario: PreloadedMessage[]) => { setPreloadedMessages(updatedScenario); localStorage.setItem(PRELOADED_SCENARIO_KEY, JSON.stringify(updatedScenario)); };
    const handleLoadPreloadedScenario = (scenarioToLoad: PreloadedMessage[]) => { startNewChat(true); setMessages(scenarioToLoad.map(pm => ({ ...pm, id: generateUniqueId(), timestamp: new Date() }))); };
    const handleExportPreloadedScenario = (scenarioToExport: PreloadedMessage[]) => { const j = JSON.stringify(scenarioToExport, null, 2); const b = new Blob([j],{type:"application/json"}); const u = URL.createObjectURL(b); const a = document.createElement("a"); a.href=u; a.download="chat-scenario.json"; a.click(); URL.revokeObjectURL(u); };
    const handleImportPreloadedScenario = (file: File): Promise<PreloadedMessage[] | null> => new Promise((resolve) => { const r=new FileReader(); r.onload=(e)=>{try{const p=JSON.parse(e.target?.result as string); if(Array.isArray(p)&&p.every(m=>m.id&&m.role&&typeof m.content==='string')){resolve(p as PreloadedMessage[]);}else{resolve(null);}}catch(err){resolve(null);}}; r.onerror=()=>{resolve(null);}; r.readAsText(file);});
    
    // Drag and Drop handlers
    const handleAppDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); if (e.dataTransfer.types.includes('Files')) setIsAppDraggingOver(true); }, []);
    const handleAppDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); if (isAppProcessingFile) { e.dataTransfer.dropEffect = 'none'; return; } if (e.dataTransfer.types.includes('Files')) { e.dataTransfer.dropEffect = 'copy'; if (!isAppDraggingOver) setIsAppDraggingOver(true); } else e.dataTransfer.dropEffect = 'none'; }, [isAppDraggingOver, isAppProcessingFile]);
    const handleAppDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); if (e.currentTarget.contains(e.relatedTarget as Node)) return; setIsAppDraggingOver(false); }, []);
    const handleAppDrop = useCallback(async (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); setIsAppDraggingOver(false); if (isAppProcessingFile) return; const files = e.dataTransfer.files; if (files?.length) await handleProcessAndAddFiles(files); }, [isAppProcessingFile, handleProcessAndAddFiles]);
    
    return {
        messages,
        setMessages,
        isLoading,
        chatSession,
        currentChatSettings,
        setCurrentChatSettings,
        inputText,
        setInputText,
        selectedFiles,
        setSelectedFiles,
        editingMessageId,
        setEditingMessageId,
        isAppDraggingOver,
        appFileError,
        setAppFileError,
        isAppProcessingFile,
        isSwitchingModel,
        savedSessions,
        setSavedSessions,
        activeSessionId,
        setActiveSessionId,
        apiModels,
        isModelsLoading,
        modelsLoadingError,
        preloadedMessages,
        messagesEndRef,
        scrollContainerRef,
        userScrolledUp,
        abortControllerRef,
        aspectRatio,
        setAspectRatio,
        loadChatSession,
        startNewChat,
        handleClearCurrentChat,
        handleSelectModelInHeader,
        handleProcessAndAddFiles,
        handleSendMessage,
        handleStopGenerating,
        handleEditMessage,
        handleCancelEdit,
        handleDeleteMessage,
        handleRetryMessage,
        handleDeleteChatHistorySession,
        handleSavePreloadedScenario,
        handleLoadPreloadedScenario,
        handleImportPreloadedScenario,
        handleExportPreloadedScenario,
        handleScroll,
        handleAppDragEnter,
        handleAppDragOver,
        handleAppDragLeave,
        handleAppDrop,
        handleCancelFileUpload,
        handleAddFileById,
    };
};
