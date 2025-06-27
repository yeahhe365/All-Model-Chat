import { useState, useEffect, useRef, useCallback } from 'react';
import { ChatMessage, ModelOption, ChatHistoryItem, AppSettings, UploadedFile, ContentPart, PreloadedMessage, SavedChatSession, ChatSettings as IndividualChatSettings } from '../types';
import { DEFAULT_CHAT_SETTINGS, PRELOADED_SCENARIO_KEY, CHAT_HISTORY_SESSIONS_KEY, ACTIVE_CHAT_SESSION_ID_KEY } from '../constants/appConstants';
import { ALL_SUPPORTED_MIME_TYPES, SUPPORTED_IMAGE_MIME_TYPES } from '../constants/fileConstants';
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
    const { apiModels, isModelsLoading, modelsLoadingError, setApiModels } = useModels(appSettings);
    
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

            const sessionToSave: SavedChatSession = {
                id: sessionIdToSave,
                title: generateSessionTitle(currentMessages),
                timestamp: Date.now(),
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
                localStorage.setItem(CHAT_HISTORY