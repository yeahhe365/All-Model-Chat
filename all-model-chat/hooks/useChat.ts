import { useEffect, useCallback, useRef, useState, useMemo } from 'react';
import { AppSettings, ChatMessage, ChatSettings as IndividualChatSettings, SavedChatSession, UploadedFile } from '../types';
import { DEFAULT_CHAT_SETTINGS } from '../constants/appConstants';
import { useModels } from './useModels';
import { useChatHistory } from './useChatHistory';
import { useFileHandling } from './useFileHandling';
import { usePreloadedScenarios } from './usePreloadedScenarios';
import { useMessageHandler } from './useMessageHandler';
import { applyImageCachePolicy, generateUniqueId } from '../utils/appUtils';
import { CHAT_HISTORY_SESSIONS_KEY } from '../constants/appConstants';

export const useChat = (appSettings: AppSettings) => {
    // 1. Core application state, now managed centrally in the main hook
    const [savedSessions, setSavedSessions] = useState<SavedChatSession[]>([]);
    const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
    const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
    const [commandedInput, setCommandedInput] = useState<{ text: string; id: number; } | null>(null);

    // State for managing concurrent generation jobs
    const [loadingSessionIds, setLoadingSessionIds] = useState(new Set<string>());
    const activeJobs = useRef(new Map<string, AbortController>());
    
    // File state
    const [selectedFiles, setSelectedFiles] = useState<UploadedFile[]>([]);
    const [appFileError, setAppFileError] = useState<string | null>(null);
    const [isAppProcessingFile, setIsAppProcessingFile] = useState<boolean>(false);
    
    // UI state
    const [aspectRatio, setAspectRatio] = useState<string>('1:1');
    const [ttsMessageId, setTtsMessageId] = useState<string | null>(null);
    const [isSwitchingModel, setIsSwitchingModel] = useState<boolean>(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const userScrolledUp = useRef<boolean>(false);
    const [showScrollToBottom, setShowScrollToBottom] = useState<boolean>(false);

    // Wrapper function to persist sessions to localStorage whenever they are updated
    const updateAndPersistSessions = useCallback((updater: (prev: SavedChatSession[]) => SavedChatSession[]) => {
        setSavedSessions(prevSessions => {
            const newSessions = updater(prevSessions);
            const sessionsForStorage = applyImageCachePolicy(newSessions);
            localStorage.setItem(CHAT_HISTORY_SESSIONS_KEY, JSON.stringify(sessionsForStorage));
            return newSessions;
        });
    }, []);

    // 2. Derive active session state from the core state
    const activeChat = useMemo(() => {
        return savedSessions.find(s => s.id === activeSessionId);
    }, [savedSessions, activeSessionId]);

    const messages = useMemo(() => activeChat?.messages || [], [activeChat]);
    const currentChatSettings = useMemo(() => activeChat?.settings || DEFAULT_CHAT_SETTINGS, [activeChat]);
    const isLoading = useMemo(() => loadingSessionIds.has(activeSessionId ?? ''), [loadingSessionIds, activeSessionId]);
    
    // 3. Child hooks for modular logic
    const { apiModels, isModelsLoading, modelsLoadingError } = useModels(appSettings);
    const historyHandler = useChatHistory({
        appSettings,
        setSavedSessions,
        setActiveSessionId,
        setEditingMessageId,
        setCommandedInput,
        setSelectedFiles,
        activeJobs,
        updateAndPersistSessions
    });
    
    const setCurrentChatSettings = useCallback((updater: (prevSettings: IndividualChatSettings) => IndividualChatSettings) => {
        if (!activeSessionId) return;
        updateAndPersistSessions(prevSessions =>
            prevSessions.map(s =>
                s.id === activeSessionId
                    ? { ...s, settings: updater(s.settings) }
                    : s
            )
        );
    }, [activeSessionId, updateAndPersistSessions]);

    const fileHandler = useFileHandling({
        appSettings,
        selectedFiles,
        setSelectedFiles,
        setAppFileError,
        isAppProcessingFile,
        setIsAppProcessingFile,
        currentChatSettings,
        setCurrentChatSettings: setCurrentChatSettings,
    });
    const scenarioHandler = usePreloadedScenarios({ startNewChat: historyHandler.startNewChat, updateAndPersistSessions });
    const messageHandler = useMessageHandler({
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
        updateAndPersistSessions,
    });
    
    // Initial data loading from history
    useEffect(() => {
        historyHandler.loadInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Effect to automatically clear file processing errors if no files are processing.
    useEffect(() => {
        const isFileProcessing = selectedFiles.some(file => file.isProcessing);
        // This specifically targets the bug where an error about a processing file persists
        // after that file has been removed by the user from the list.
        if (appFileError === 'Wait for files to finish processing.' && !isFileProcessing) {
            setAppFileError(null);
        }
    }, [selectedFiles, appFileError, setAppFileError]);

    // Memory management for file previews in messages (using blob URLs)
    const messagesForCleanupRef = useRef<ChatMessage[]>([]);
    useEffect(() => {
        const prevFiles = messagesForCleanupRef.current.flatMap(m => m.files || []);
        const currentFiles = savedSessions.flatMap(s => s.messages).flatMap(m => m.files || []);
        const removedFiles = prevFiles.filter(prevFile => !currentFiles.some(currentFile => currentFile.id === prevFile.id));
        removedFiles.forEach(file => { if (file.dataUrl && file.dataUrl.startsWith('blob:')) URL.revokeObjectURL(file.dataUrl); });
        messagesForCleanupRef.current = savedSessions.flatMap(s => s.messages);
    }, [savedSessions]);
    useEffect(() => () => { messagesForCleanupRef.current.flatMap(m => m.files || []).forEach(file => { if (file.dataUrl?.startsWith('blob:')) URL.revokeObjectURL(file.dataUrl); }); }, []);

    // Scrolling logic
    const scrollToBottom = useCallback(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messagesEndRef]);
    const handleScroll = useCallback(() => {
        const container = scrollContainerRef.current;
        if (container) {
            const isScrolledUp = (container.scrollHeight - container.scrollTop - container.clientHeight) > 100;
            setShowScrollToBottom(isScrolledUp);
            userScrolledUp.current = isScrolledUp;
        }
    }, [scrollContainerRef]);
    useEffect(() => { if (!userScrolledUp.current) scrollToBottom(); }, [messages, scrollToBottom]);

    // Effect to validate current model against available models
    useEffect(() => {
        if (!isModelsLoading && apiModels.length > 0 && activeChat && !apiModels.some(m => m.id === activeChat.settings.modelId)) {
            const preferredModelId = apiModels.find(m => m.isPinned)?.id || apiModels[0]?.id;
            if(preferredModelId) {
                updateAndPersistSessions(prev => prev.map(s => s.id === activeSessionId ? {...s, settings: {...s.settings, modelId: preferredModelId }} : s));
            }
        }
    }, [isModelsLoading, apiModels, activeChat, activeSessionId, updateAndPersistSessions]);
    
    // UI Action Handlers
    const handleSelectModelInHeader = useCallback((modelId: string) => {
        if (!activeSessionId) {
            const newSessionId = generateUniqueId();
            const newSession: SavedChatSession = {
                id: newSessionId,
                title: 'New Chat',
                messages: [],
                timestamp: Date.now(),
                settings: { ...DEFAULT_CHAT_SETTINGS, modelId: modelId },
            };
            updateAndPersistSessions(prev => [newSession, ...prev]);
            setActiveSessionId(newSessionId);
        } else {
            if (isLoading) messageHandler.handleStopGenerating();
            if (modelId !== currentChatSettings.modelId) {
                setIsSwitchingModel(true);
                updateAndPersistSessions(prev => prev.map(s => s.id === activeSessionId ? { ...s, settings: { ...s.settings, modelId } } : s));
            }
        }
        userScrolledUp.current = false;
    }, [isLoading, currentChatSettings.modelId, updateAndPersistSessions, activeSessionId, userScrolledUp, messageHandler]);

    useEffect(() => { if (isSwitchingModel) { const timer = setTimeout(() => setIsSwitchingModel(false), 0); return () => clearTimeout(timer); } }, [isSwitchingModel]);
    
    const handleClearCurrentChat = useCallback(() => {
        if (isLoading) messageHandler.handleStopGenerating();
        if (activeSessionId) historyHandler.handleDeleteChatHistorySession(activeSessionId);
        else historyHandler.startNewChat();
        
    }, [isLoading, activeSessionId, historyHandler, messageHandler]);

    return {
        messages,
        isLoading,
        loadingSessionIds,
        currentChatSettings,
        editingMessageId,
        setEditingMessageId,
        commandedInput,
        setCommandedInput,
        selectedFiles,
        setSelectedFiles,
        appFileError,
        isAppProcessingFile,
        savedSessions,
        activeSessionId,
        apiModels,
        isModelsLoading,
        modelsLoadingError,
        isSwitchingModel,
        messagesEndRef,
        scrollContainerRef,
        savedScenarios: scenarioHandler.savedScenarios,
        isAppDraggingOver: fileHandler.isAppDraggingOver,
        aspectRatio,
        setAspectRatio,
        ttsMessageId,
        loadChatSession: historyHandler.loadChatSession,
        startNewChat: historyHandler.startNewChat,
        handleClearCurrentChat,
        handleSelectModelInHeader,
        handleProcessAndAddFiles: fileHandler.handleProcessAndAddFiles,
        handleSendMessage: messageHandler.handleSendMessage,
        handleStopGenerating: messageHandler.handleStopGenerating,
        handleEditMessage: messageHandler.handleEditMessage,
        handleCancelEdit: messageHandler.handleCancelEdit,
        handleDeleteMessage: messageHandler.handleDeleteMessage,
        handleRetryMessage: messageHandler.handleRetryMessage,
        handleDeleteChatHistorySession: historyHandler.handleDeleteChatHistorySession,
        clearCacheAndReload: historyHandler.clearCacheAndReload,
        handleSaveAllScenarios: scenarioHandler.handleSaveAllScenarios,
        handleLoadPreloadedScenario: scenarioHandler.handleLoadPreloadedScenario,
        handleImportPreloadedScenario: scenarioHandler.handleImportPreloadedScenario,
        handleExportPreloadedScenario: scenarioHandler.handleExportPreloadedScenario,
        handleScroll,
        handleAppDragEnter: fileHandler.handleAppDragEnter,
        handleAppDragOver: fileHandler.handleAppDragOver,
        handleAppDragLeave: fileHandler.handleAppDragLeave,
        handleAppDrop: fileHandler.handleAppDrop,
        handleCancelFileUpload: fileHandler.handleCancelFileUpload,
        handleAddFileById: fileHandler.handleAddFileById,
        handleTextToSpeech: messageHandler.handleTextToSpeech,
        setCurrentChatSettings,
        showScrollToBottom,
        scrollToBottom,
    };
};