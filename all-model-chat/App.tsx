
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChatMessage, ModelOption, ChatHistoryItem, AppSettings, UploadedFile, ContentPart, PreloadedMessage, SavedChatSession, ChatSettings as IndividualChatSettings } from './types';
import { 
    DEFAULT_CHAT_SETTINGS,
    DEFAULT_APP_SETTINGS,
    DEFAULT_IS_STREAMING_ENABLED,
    AVAILABLE_THEMES, 
    ThemeColors,
    SUPPORTED_TEXT_MIME_TYPES,
    SUPPORTED_IMAGE_MIME_TYPES,
    SUPPORTED_VIDEO_MIME_TYPES, 
    SUPPORTED_AUDIO_MIME_TYPES, 
    ALL_SUPPORTED_MIME_TYPES, 
    PRELOADED_SCENARIO_KEY,
    CHAT_HISTORY_SESSIONS_KEY,
    ACTIVE_CHAT_SESSION_ID_KEY,
    CANVAS_ASSISTANT_SYSTEM_PROMPT,
    DEFAULT_SYSTEM_INSTRUCTION, // Added for toggling off canvas prompt
} from './constants';
import { Header } from './components/Header';
import { MessageList } from './components/MessageList';
import { ChatInput } from './components/ChatInput';
import { SettingsModal } from './components/SettingsModal';
import { PreloadedMessagesModal } from './components/PreloadedMessagesModal';
import { HistorySidebar } from './components/HistorySidebar'; // New Import
import { geminiServiceInstance } from './services/geminiService';
import { Chat } from '@google/genai';
import { Paperclip } from 'lucide-react'; 

const STREAMING_ENABLED_KEY = 'chatAppIsStreamingEnabled';
const APP_SETTINGS_KEY = 'chatAppSettings';


const generateUniqueId = () => `chat-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

const generateSessionTitle = (messages: ChatMessage[]): string => {
    const firstUserMessage = messages.find(msg => msg.role === 'user' && msg.content.trim() !== '');
    if (firstUserMessage) {
      return firstUserMessage.content.split(/\s+/).slice(0, 7).join(' ') + (firstUserMessage.content.split(/\s+/).length > 7 ? '...' : '');
    }
    const firstModelMessage = messages.find(msg => msg.role === 'model' && msg.content.trim() !== '');
     if (firstModelMessage) {
      return "Model: " + firstModelMessage.content.split(/\s+/).slice(0, 5).join(' ') + (firstModelMessage.content.split(/\s+/).length > 5 ? '...' : '');
    }
    const firstFile = messages.find(msg => msg.files && msg.files.length > 0)?.files?.[0];
    if (firstFile) {
        return `Chat with ${firstFile.name}`;
    }
    return 'New Chat';
};


// Helper to generate CSS variables string from theme colors
const generateThemeCssVariables = (colors: ThemeColors): string => {
  let css = ':root {\n';
  for (const [key, value] of Object.entries(colors)) {
    const cssVarName = `--theme-${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
    css += `  ${cssVarName}: ${value};\n`;
  }
  css += `  --markdown-code-bg: ${colors.bgCodeBlock || colors.bgInput };\n`;
  css += `  --markdown-code-text: ${colors.textCode};\n`;
  css += `  --markdown-pre-bg: ${colors.bgCodeBlock || colors.bgSecondary};\n`;
  css += `  --markdown-link-text: ${colors.textLink};\n`;
  css += `  --markdown-blockquote-text: ${colors.textTertiary};\n`;
  css += `  --markdown-blockquote-border: ${colors.borderSecondary};\n`;
  css += `  --markdown-hr-bg: ${colors.borderSecondary};\n`;
  css += `  --markdown-table-border: ${colors.borderSecondary};\n`;
  css += '}';
  return css;
};

// Helper function to build ContentPart[] from text and files
const buildContentParts = (text: string, files: UploadedFile[] | undefined): ContentPart[] => {
  const dataParts: ContentPart[] = []; // For images, videos, audio
  const textSegments: string[] = []; // Store individual text pieces (from files and user input)

  if (files) {
    files.forEach(file => {
      if (!file.isProcessing && !file.error) {
        if (file.textContent !== undefined && SUPPORTED_TEXT_MIME_TYPES.includes(file.type)) {
          // Prepend file identifier, then the raw content.
          // Use a single newline to separate this block from previous/next if needed.
          // The joining logic below will handle separation between segments.
          textSegments.push(`--- File: ${file.name} (${file.type}) ---\n${file.textContent}\n--- End of File: ${file.name} ---`);
        } else if (file.base64Data && (SUPPORTED_IMAGE_MIME_TYPES.includes(file.type) || SUPPORTED_VIDEO_MIME_TYPES.includes(file.type) || SUPPORTED_AUDIO_MIME_TYPES.includes(file.type))) {
          dataParts.push({ inlineData: { mimeType: file.type, data: file.base64Data } });
        }
      }
    });
  }

  const userTypedText = text.trim();
  if (userTypedText) {
    // Add user's text as a separate segment.
    // If there were files, it will be naturally separated by \n\n later.
    // If no files, it will be the only text segment.
    textSegments.push(userTypedText);
  }

  // Join all text segments with a double newline.
  // This ensures separation between file contents and user text, or between multiple files.
  // Each file's internal content is preserved.
  const combinedTextForPrompt = textSegments.join('\n\n');
  
  // Final assembly of parts: text part first (if any), then data parts.
  const contentPartsResult: ContentPart[] = [];
  if (combinedTextForPrompt.trim() !== "") { // Check if there's actual text
    contentPartsResult.push({ text: combinedTextForPrompt });
  }
  contentPartsResult.push(...dataParts); // Add data parts regardless
  
  return contentPartsResult;
};


const App: React.FC = () => {
  const [appSettings, setAppSettings] = useState<AppSettings>(() => {
    const stored = localStorage.getItem(APP_SETTINGS_KEY);
    return stored ? { ...DEFAULT_APP_SETTINGS, ...JSON.parse(stored) } : DEFAULT_APP_SETTINGS;
  });

  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);
  const [isPreloadedMessagesModalOpen, setIsPreloadedMessagesModalOpen] = useState<boolean>(false); 
  const [isHistorySidebarOpen, setIsHistorySidebarOpen] = useState<boolean>(false);

  const [apiModels, setApiModels] = useState<ModelOption[]>([]);
  const [isStreamingEnabled, setIsStreamingEnabled] = useState<boolean>(() => {
    const storedValue = localStorage.getItem(STREAMING_ENABLED_KEY);
    return storedValue !== null ? JSON.parse(storedValue) : DEFAULT_IS_STREAMING_ENABLED;
  });
  
  const [modelsLoadingError, setModelsLoadingError] = useState<string | null>(null);
  const [isModelsLoading, setIsModelsLoading] = useState<boolean>(false);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false); 
  const [chatSession, setChatSession] = useState<Chat | null>(null);

  // States for active chat properties (derived from appSettings or active session)
  const [currentChatSettings, setCurrentChatSettings] = useState<IndividualChatSettings>(DEFAULT_CHAT_SETTINGS);

  const [inputText, setInputText] = useState<string>('');
  const [selectedFiles, setSelectedFiles] = useState<UploadedFile[]>([]);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  
  const [isAppDraggingOver, setIsAppDraggingOver] = useState<boolean>(false);
  const [appFileError, setAppFileError] = useState<string | null>(null); 
  const [isAppProcessingFile, setIsAppProcessingFile] = useState<boolean>(false); 

  const [preloadedMessages, setPreloadedMessages] = useState<PreloadedMessage[]>([]); 
  const [savedSessions, setSavedSessions] = useState<SavedChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);


  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const userScrolledUp = useRef<boolean>(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const sessionSaveTimeoutRef = useRef<number | null>(null);


  const currentTheme = AVAILABLE_THEMES.find(t => t.id === appSettings.themeId) || AVAILABLE_THEMES.find(t => t.id === DEFAULT_APP_SETTINGS.themeId)!;

  useEffect(() => {
    const anyFileProcessing = selectedFiles.some(file => file.isProcessing);
    setIsAppProcessingFile(anyFileProcessing);
  }, [selectedFiles]);

  useEffect(() => {
    try {
      const storedScenario = localStorage.getItem(PRELOADED_SCENARIO_KEY);
      if (storedScenario) setPreloadedMessages(JSON.parse(storedScenario));
    } catch (error) { console.error("Error loading preloaded scenario:", error); }

    try {
      const storedSessions = localStorage.getItem(CHAT_HISTORY_SESSIONS_KEY);
      const sessions: SavedChatSession[] = storedSessions ? JSON.parse(storedSessions) : [];
      sessions.sort((a,b) => b.timestamp - a.timestamp); // Newest first
      setSavedSessions(sessions);

      const storedActiveId = localStorage.getItem(ACTIVE_CHAT_SESSION_ID_KEY);
      if (storedActiveId && sessions.find(s => s.id === storedActiveId)) {
        loadChatSession(storedActiveId, sessions);
      } else if (sessions.length > 0) {
        loadChatSession(sessions[0].id, sessions); // Load newest if no active ID or invalid
      } else {
        startNewChat(false); // Start a new chat if no history
      }
    } catch (error) { 
      console.error("Error loading chat history:", error); 
      startNewChat(false);
    }
  }, []);

  const saveCurrentChatSession = useCallback((currentMessages: ChatMessage[], currentActiveSessionId: string | null, currentSettingsToSave: IndividualChatSettings) => {
    if (sessionSaveTimeoutRef.current) clearTimeout(sessionSaveTimeoutRef.current);
    
    sessionSaveTimeoutRef.current = window.setTimeout(() => {
        if (currentMessages.length === 0 && (!currentActiveSessionId || !savedSessions.find(s => s.id === currentActiveSessionId))) {
            return; // Don't save empty new chats until first message
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
            messages: currentMessages,
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
        
        if (isNewSessionInHistory && sessionIdToSave) {
             setActiveSessionId(sessionIdToSave);
             localStorage.setItem(ACTIVE_CHAT_SESSION_ID_KEY, sessionIdToSave);
        }
    }, 500); // Debounce saving
  }, [savedSessions]);


  useEffect(() => {
    if (messages.length > 0 || (activeSessionId && savedSessions.find(s => s.id === activeSessionId))) {
        saveCurrentChatSession(messages, activeSessionId, currentChatSettings);
    }
  }, [messages, activeSessionId, currentChatSettings, saveCurrentChatSession, savedSessions]);


  useEffect(() => {
    localStorage.setItem(STREAMING_ENABLED_KEY, JSON.stringify(isStreamingEnabled));
  }, [isStreamingEnabled]);
  
  useEffect(() => {
    localStorage.setItem(APP_SETTINGS_KEY, JSON.stringify(appSettings));
    
    // Apply theme variables
    const themeVariablesStyleTag = document.getElementById('theme-variables');
    if (themeVariablesStyleTag) {
      themeVariablesStyleTag.innerHTML = generateThemeCssVariables(currentTheme.colors);
    }
    
    // Apply theme class to body
    const bodyClassList = document.body.classList;
    AVAILABLE_THEMES.forEach(t => bodyClassList.remove(`theme-${t.id}`));
    bodyClassList.add(`theme-${currentTheme.id}`, 'antialiased');

  }, [appSettings, currentTheme]); 

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

  const createChatHistoryForApi = (msgs: ChatMessage[]): ChatHistoryItem[] => {
    return msgs
      .filter(msg => msg.role === 'user' || msg.role === 'model')
      .map(msg => {
        let apiParts: ContentPart[];
        if (msg.role === 'user') {
          apiParts = buildContentParts(msg.content, msg.files);
        } else { // msg.role === 'model'
          apiParts = [{ text: msg.content || "" }];
        }
        return { role: msg.role as 'user' | 'model', parts: apiParts };
      });
  };

  const initializeCurrentChatSession = useCallback(async (settingsToUse: IndividualChatSettings, history?: ChatHistoryItem[]) => {
    if (!settingsToUse.modelId) {
      setMessages(prev => [...prev, { id: generateUniqueId(), role: 'error', content: 'No model selected. Cannot initialize chat.', timestamp: new Date() }]);
      return null;
    }
    // setIsLoading(true); // Removed: Let caller manage global isLoading if needed for this specific operation
    try {
      const newSession = await geminiServiceInstance.initializeChat(
        settingsToUse.modelId, settingsToUse.systemInstruction, 
        { temperature: settingsToUse.temperature, topP: settingsToUse.topP }, 
        settingsToUse.showThoughts, history
      );
      setChatSession(newSession); 
      if (!newSession) {
         setMessages(prev => [...prev, { id: generateUniqueId(), role: 'error', content: 'Failed to initialize chat session. Check API Key, network, and selected model.', timestamp: new Date() }]);
      }
      return newSession; 
    } catch (error) {
      console.error("Error initializing chat session:", error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      setMessages(prev => [...prev, { id: generateUniqueId(), role: 'error', content: `Error initializing chat: ${errorMsg}`, timestamp: new Date() }]);
      setChatSession(null); 
      return null;
    } 
    // finally { setIsLoading(false); } // Removed
  }, [setMessages, setChatSession]); 

  useEffect(() => {
    const fetchAndSetModels = async () => {
      setIsLoading(true); setIsModelsLoading(true); setModelsLoadingError(null);
      
      const pinnedProModel: ModelOption = { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', isPinned: true };
      const userRequestedPinnedFlashModel: ModelOption = { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', isPinned: true };
      const defaultFlashPreviewModel: ModelOption = { id: 'gemini-2.5-flash-preview-04-17', name: 'Gemini 2.5 Flash Preview', isPinned: false };
      
      let modelsFromApi: ModelOption[] = [];
      try { modelsFromApi = await geminiServiceInstance.getAvailableModels(); } 
      catch (error) { setModelsLoadingError(`API model fetch failed: ${error instanceof Error ? error.message : String(error)}. Using fallbacks.`); }
      
      let combinedModels = modelsFromApi.length > 0 
        ? modelsFromApi.filter(m => 
            m.id !== pinnedProModel.id && 
            m.id !== userRequestedPinnedFlashModel.id &&
            m.id !== defaultFlashPreviewModel.id
          ) 
        : [];
      
      // Add predefined models, pinned ones first. Order of unshift can affect initial list before sort.
      combinedModels.unshift(userRequestedPinnedFlashModel);
      combinedModels.unshift(pinnedProModel);
      
      if (!combinedModels.some(m => m.id === defaultFlashPreviewModel.id)) {
        combinedModels.push(defaultFlashPreviewModel);
      }
      
      const uniqueModelsById = Array.from(new Map(combinedModels.map(model => [model.id, model])).values());
      const sortedForDisplay = [...uniqueModelsById].sort((a, b) => 
        (a.isPinned && !b.isPinned) ? -1 : (!a.isPinned && b.isPinned) ? 1 : a.name.localeCompare(b.name)
      );
      setApiModels(sortedForDisplay);

      const currentModelStillValid = sortedForDisplay.some(m => m.id === appSettings.modelId);
      if (!currentModelStillValid && sortedForDisplay.length > 0) {
        setAppSettings(prev => ({ ...prev, modelId: sortedForDisplay[0].id }));
      } else if (sortedForDisplay.length === 0 && !modelsLoadingError) {
        setModelsLoadingError('No models available to select.');
      }
      setIsModelsLoading(false); setIsLoading(false);
    };
    fetchAndSetModels();
  }, []); 

   useEffect(() => {
    // This effect ensures the SDK's chat session is kept in sync with the current messages and settings.
    // It does not set the global setIsLoading state itself, as its primary role is background synchronization.
    // If this process introduces a user-perceptible delay that needs a global loading indicator,
    // that could be handled with a separate state or by having this effect manage setIsLoading.
    // For now, handleSendMessage will manage the primary user-facing isLoading for sends.
    const reinitializeIfNeeded = async () => {
        if (!activeSessionId && messages.length === 0) {
            await initializeCurrentChatSession(currentChatSettings, []);
        } else {
            // Re-initialize based on current messages and settings.
            // This ensures `chatSession` is current if messages were loaded or settings changed.
            await initializeCurrentChatSession(currentChatSettings, createChatHistoryForApi(messages));
        }
    };
    reinitializeIfNeeded();
  }, [
    activeSessionId, 
    currentChatSettings.modelId, 
    currentChatSettings.systemInstruction, 
    currentChatSettings.temperature, 
    currentChatSettings.topP, 
    currentChatSettings.showThoughts, 
    initializeCurrentChatSession, 
    messages
  ]);


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
      })));
      setCurrentChatSettings(sessionToLoad.settings);
      setActiveSessionId(sessionToLoad.id); 
      localStorage.setItem(ACTIVE_CHAT_SESSION_ID_KEY, sessionToLoad.id);
      setInputText('');
      setSelectedFiles([]);
      setEditingMessageId(null);
      userScrolledUp.current = false;
      // Re-initialization of SDK session will happen via useEffect watching currentChatSettings and messages
    } else {
      console.warn(`Session ${sessionId} not found. Starting new chat.`);
      startNewChat(false);
    }
  }, [savedSessions, isLoading]); 

  const startNewChat = useCallback((saveCurrent: boolean = true) => {
    if (saveCurrent && activeSessionId && messages.length > 0) {
      saveCurrentChatSession(messages, activeSessionId, currentChatSettings);
    }
    if (isLoading && abortControllerRef.current) abortControllerRef.current.abort();

    setMessages([]);
    setCurrentChatSettings(appSettings); 
    setActiveSessionId(null); 
    localStorage.removeItem(ACTIVE_CHAT_SESSION_ID_KEY);
    setInputText('');
    setSelectedFiles([]);
    setEditingMessageId(null);
    setChatSession(null); // Explicitly clear SDK session state
    userScrolledUp.current = false;
    // Re-initialization of SDK session will happen via useEffect watching currentChatSettings and messages (now empty)
  }, [activeSessionId, messages, currentChatSettings, appSettings, isLoading, saveCurrentChatSession]);


  const handleProcessAndAddFiles = useCallback(async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;
    setAppFileError(null); 
    const filesArray = Array.isArray(files) ? files : Array.from(files);

    for (const file of filesArray) {
      const fileId = `${file.name}-${file.size}-${Date.now()}`;
      if (!ALL_SUPPORTED_MIME_TYPES.includes(file.type)) {
        setSelectedFiles(prev => [...prev, { id: fileId, name: file.name, type: file.type, size: file.size, isProcessing: false, progress: 0, error: `Unsupported file type: ${file.type}` }]);
        continue;
      }
      setSelectedFiles(prev => [...prev, { id: fileId, name: file.name, type: file.type, size: file.size, isProcessing: true, progress: 0 }]);
      const reader = new FileReader();
      reader.onprogress = (event) => event.lengthComputable && setSelectedFiles(prev => prev.map(f => f.id === fileId ? { ...f, progress: Math.round((event.loaded / event.total) * 100) } : f));
      reader.onloadend = () => {
        if (typeof reader.result !== 'string') {
          setSelectedFiles(prev => prev.map(f => f.id === fileId ? { ...f, isProcessing: false, error: `Error reading file content.` } : f)); return;
        }
        let processedData: Partial<UploadedFile> = {};
        if (SUPPORTED_IMAGE_MIME_TYPES.includes(file.type) || SUPPORTED_VIDEO_MIME_TYPES.includes(file.type) || SUPPORTED_AUDIO_MIME_TYPES.includes(file.type)) {
          processedData.dataUrl = reader.result as string; processedData.base64Data = (reader.result as string).substring((reader.result as string).indexOf(',') + 1);
        } else if (SUPPORTED_TEXT_MIME_TYPES.includes(file.type)) {
          processedData.textContent = reader.result as string;
        } else {
            setSelectedFiles(prev => prev.map(f => f.id === fileId ? { ...f, isProcessing: false, error: `File type ${file.type} not configured for processing.` } : f)); return;
        }
        setSelectedFiles(prev => prev.map(f => f.id === fileId ? { ...f, ...processedData, isProcessing: false, progress: 100 } : f));
      };
      reader.onerror = () => setSelectedFiles(prev => prev.map(f => f.id === fileId ? { ...f, isProcessing: false, error: `Error reading file: ${file.name}` } : f));
      if (SUPPORTED_IMAGE_MIME_TYPES.includes(file.type) || SUPPORTED_VIDEO_MIME_TYPES.includes(file.type) || SUPPORTED_AUDIO_MIME_TYPES.includes(file.type)) reader.readAsDataURL(file);
      else if (SUPPORTED_TEXT_MIME_TYPES.includes(file.type)) reader.readAsText(file);
    }
  }, []);

  const handleAppDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); if (e.dataTransfer.types.includes('Files')) setIsAppDraggingOver(true); }, []);
  const handleAppDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); if (isAppProcessingFile) { e.dataTransfer.dropEffect = 'none'; return; } if (e.dataTransfer.types.includes('Files')) { e.dataTransfer.dropEffect = 'copy'; if (!isAppDraggingOver) setIsAppDraggingOver(true); } else e.dataTransfer.dropEffect = 'none'; }, [isAppDraggingOver, isAppProcessingFile]);
  const handleAppDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); if (e.currentTarget.contains(e.relatedTarget as Node)) return; setIsAppDraggingOver(false); }, []);
  const handleAppDrop = useCallback(async (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); setIsAppDraggingOver(false); if (isAppProcessingFile) return; const files = e.dataTransfer.files; if (files?.length) await handleProcessAndAddFiles(files); }, [isAppProcessingFile, handleProcessAndAddFiles]);

  const handleSendMessage = useCallback(async (overrideOptions?: { text?: string; files?: UploadedFile[]; editingId?: string }) => {
    const textToUse = overrideOptions?.text ?? inputText;
    const filesToUse = overrideOptions?.files ?? selectedFiles;
    const effectiveEditingId = overrideOptions?.editingId ?? editingMessageId;

    if (!textToUse.trim() && filesToUse.filter(f => !f.error && !f.isProcessing).length === 0) return;
    if (filesToUse.some(f => f.isProcessing)) { setAppFileError("Some files are still processing."); return; }
    setAppFileError(null); 

    const activeModelId = currentChatSettings.modelId;
    if (!activeModelId) {
       setMessages(prev => [...prev, { id: generateUniqueId(), role: 'error', content: 'Cannot send message: No model selected for this chat.', timestamp: new Date() }]);
       setIsLoading(false); return;
    }
    
    setIsLoading(true); // Set loading true for the entire send operation.
    if (isLoading && abortControllerRef.current) abortControllerRef.current.abort(); // Abort previous if any (isLoading here refers to previous state)
    abortControllerRef.current = new AbortController(); const currentSignal = abortControllerRef.current.signal;
    userScrolledUp.current = false; 
    
    if (!overrideOptions) { 
        setInputText(''); 
        setSelectedFiles([]);
    }
    
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
        if (!overrideOptions) { 
            setEditingMessageId(null);
        }
    }
    
    if (!sdkSessionForThisTurn || needsSdkReinitialization) {
        const newSdkSession = await initializeCurrentChatSession(
            currentChatSettings, 
            historyForNewSdkSession || createChatHistoryForApi(baseMessagesForThisTurn)
        );
        if (!newSdkSession) { 
            // initializeCurrentChatSession already adds error message to `messages`
            setIsLoading(false); 
            return; 
        }
        sdkSessionForThisTurn = newSdkSession;
    }
    
    if (!sdkSessionForThisTurn) {
      setMessages(prev => [...prev, { id: generateUniqueId() + 'nosess', role: 'error', content: 'Chat session is not available. Cannot send message.', timestamp: new Date() }]);
      setIsLoading(false); return;
    }

    const userMessage: ChatMessage = { id: generateUniqueId(), role: 'user', content: textToUse.trim(), files: filesToUse.length ? filesToUse : undefined, timestamp: new Date() };
     
    const promptParts = buildContentParts(textToUse.trim(), filesToUse);
    const hasDataParts = promptParts.some(p => p.inlineData);
    const textContentOfPrompt = promptParts.find(p => p.text !== undefined)?.text ?? "";
    
    const isEmptyPrompt = !hasDataParts && textContentOfPrompt.trim() === "";

    if (isEmptyPrompt) {
        setIsLoading(false); 
        return; 
    }
    
    setMessages(prevMessages => [...prevMessages, userMessage]); 

    const modelMessageId = generateUniqueId();
    setMessages(prev => [ ...prev, { id: modelMessageId, role: 'model', content: '', thoughts: '', timestamp: new Date(), isLoading: true, generationStartTime: new Date() } ]);
    
    if (isStreamingEnabled) {
        await geminiServiceInstance.sendMessageStream(sdkSessionForThisTurn, activeModelId, promptParts, currentSignal,
            (chunk) => setMessages(prev => prev.map(msg => msg.id === modelMessageId ? { ...msg, content: msg.content + chunk, isLoading: true } : msg)),
            (thoughtChunk) => setMessages(prev => prev.map(msg => msg.id === modelMessageId ? { ...msg, thoughts: (msg.thoughts || '') + thoughtChunk, isLoading: true } : msg)),
            (error) => { setMessages(prev => prev.map(msg => msg.id === modelMessageId ? { ...msg, role: 'error', content: `Error: ${error.message}`, isLoading: false, generationEndTime: new Date() } : msg)); setIsLoading(false); if (abortControllerRef.current?.signal === currentSignal) abortControllerRef.current = null; },
            () => { 
                const wasAborted = currentSignal.aborted; 
                setMessages(prev => {
                    const finalMessages = prev.map(msg => { 
                        if (msg.id === modelMessageId && msg.isLoading) { 
                            let c = msg.content; 
                            if (wasAborted && !c.includes("[Stopped by user]")) c = c ? c + "\n\n[Stopped by user]" : "[Stopped by user]"; 
                            return { ...msg, isLoading: false, content: c, generationEndTime: new Date() }; 
                        } 
                        return msg; 
                    });
                    saveCurrentChatSession(finalMessages, activeSessionId, currentChatSettings);
                    return finalMessages;
                }); 
                setIsLoading(false); 
                if (abortControllerRef.current?.signal === currentSignal) abortControllerRef.current = null;
            }
        );
    } else {
        await geminiServiceInstance.sendMessageNonStream(sdkSessionForThisTurn, activeModelId, promptParts, currentSignal,
            (error) => { setMessages(prev => prev.map(msg => msg.id === modelMessageId ? { ...msg, role: 'error', content: `Error: ${error.message}`, isLoading: false, generationEndTime: new Date() } : msg)); setIsLoading(false); if (abortControllerRef.current?.signal === currentSignal) abortControllerRef.current = null; },
            (fullText, thoughtsText) => { 
                const wasAborted = currentSignal.aborted; 
                setMessages(prev => {
                    const finalMessages = prev.map(msg => { 
                        if (msg.id === modelMessageId) { 
                            let c = fullText; 
                            if (wasAborted && !c.includes("[Stopped by user]")) c = c ? c + "\n\n[Stopped by user]" : "[Stopped by user]"; 
                            return { ...msg, content: c, thoughts: currentChatSettings.showThoughts && thoughtsText ? thoughtsText : msg.thoughts, isLoading: false, generationEndTime: new Date() }; 
                        } 
                        return msg; 
                    });
                    saveCurrentChatSession(finalMessages, activeSessionId, currentChatSettings);
                    return finalMessages;
                }); 
                setIsLoading(false); 
                if (abortControllerRef.current?.signal === currentSignal) abortControllerRef.current = null;
            }
        );
    }
  }, [isLoading, inputText, selectedFiles, currentChatSettings, messages, chatSession, isStreamingEnabled, initializeCurrentChatSession, saveCurrentChatSession, activeSessionId, editingMessageId ]);

  const handleStopGenerating = () => {
    if (abortControllerRef.current) {
      const loadingModelMessage = [...messages].reverse().find(m => m.role === 'model' && m.isLoading);
      abortControllerRef.current.abort(); setIsLoading(false); 
      if (loadingModelMessage) {
        setMessages(prev => prev.map(msg => (msg.id === loadingModelMessage.id) ? { ...msg, content: (msg.content||"") + "\n\n[Stopped by user]", isLoading: false, generationEndTime: new Date() } : msg));
      }
    }
  };

  const handleSaveSettings = (newSettings: AppSettings) => { 
    setAppSettings(newSettings); 
    setCurrentChatSettings({
        modelId: newSettings.modelId,
        temperature: newSettings.temperature,
        topP: newSettings.topP,
        showThoughts: newSettings.showThoughts,
        systemInstruction: newSettings.systemInstruction,
    }); 
    setIsSettingsModalOpen(false); userScrolledUp.current = false;
    // SDK session will reinitialize via useEffect watching currentChatSettings
  };

  const handleEditMessage = (messageId: string) => {
    const messageToEdit = messages.find(msg => msg.id === messageId);
    if (messageToEdit?.role === 'user') {
      if (isLoading && abortControllerRef.current) {
        abortControllerRef.current.abort();
        setMessages(prev => prev.map(m => m.isLoading ? {...m, isLoading: false, content: (m.content || "") + "\n\n[Stopped for edit]"} : m));
        setIsLoading(false);
      }
      setInputText(messageToEdit.content); 
      setSelectedFiles((messageToEdit.files || []).map(f => ({ ...f, isProcessing: false, progress: f.error ? 0 : 100, id: f.id || `${f.name}-${f.size}-${Date.now()}` })));
      setEditingMessageId(messageId); setAppFileError(null);
      (document.querySelector('textarea[aria-label="Chat message input"]') as HTMLTextAreaElement)?.focus();
    }
  };

  const handleDeleteMessage = (messageId: string) => {
    const messageToDelete = messages.find(msg => msg.id === messageId);
    if (!messageToDelete) return;
    if (messageToDelete.role === 'model' && messageToDelete.isLoading && abortControllerRef.current) handleStopGenerating(); 
    
    const updatedMessages = messages.filter(msg => msg.id !== messageId);
    setMessages(updatedMessages);

    if (editingMessageId === messageId) { setEditingMessageId(null); setInputText(''); setSelectedFiles([]); setAppFileError(null); }
    
    userScrolledUp.current = false; 
  };
  
  const handleRetryMessage = async (modelMessageIdToRetry: string) => {
    const modelMessageIndex = messages.findIndex(m => m.id === modelMessageIdToRetry);
    
    if (modelMessageIndex === -1) {
      console.error("Cannot retry: Original model message not found.");
      setMessages(prev => [...prev, { id: generateUniqueId(), role: 'error', content: 'Cannot retry this message (original not found).', timestamp: new Date() }]);
      return;
    }
    if (modelMessageIndex === 0) {
      console.error("Cannot retry: No preceding user message found for the model message.");
       setMessages(prev => [...prev, { id: generateUniqueId(), role: 'error', content: 'Cannot retry: No user message found before this.', timestamp: new Date() }]);
      return;
    }

    const userMessageToResend = messages[modelMessageIndex - 1];
    if (userMessageToResend.role !== 'user') {
      console.error("Cannot retry: Preceding message is not from user.");
      setMessages(prev => [...prev, { id: generateUniqueId(), role: 'error', content: 'Cannot retry: Preceding message was not a user message.', timestamp: new Date() }]);
      return;
    }

    if (isLoading && abortControllerRef.current) {
      abortControllerRef.current.abort(); // Abort any ongoing generation
      // Update loading message to indicate stop, do this before setting messages state for retry
      setMessages(prev => prev.map(m => m.isLoading ? {...m, isLoading: false, content: (m.content || "") + "\n\n[Stopped for retry]"} : m));
      setIsLoading(false); 
    }
    
    // Remove the failed model message and any subsequent messages from the UI
    setMessages(prev => prev.slice(0, modelMessageIndex));
    
    // Immediately call handleSendMessage with the user message's details
    // The `editingId` here tells `handleSendMessage` to truncate history *before* this user message ID
    // and then resend this user message.
    await handleSendMessage({
        text: userMessageToResend.content || '',
        files: userMessageToResend.files?.map(f => ({ ...f, isProcessing: false, progress: f.error ? 0 : 100, id: f.id || `${f.name}-${f.size}-${Date.now()}` })) || [],
        editingId: userMessageToResend.id 
    });
  };


  const handleSelectModelInHeader = (modelId: string) => { 
    if (isLoading && abortControllerRef.current) abortControllerRef.current.abort();
    setCurrentChatSettings(prev => ({ ...prev, modelId: modelId })); 
    userScrolledUp.current = false; 
  };

  const handleToggleStreaming = () => setIsStreamingEnabled(prev => !prev);
  const handleToggleHistorySidebar = () => setIsHistorySidebarOpen(prev => !prev);

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

  const handleSavePreloadedScenario = (updatedScenario: PreloadedMessage[]) => { setPreloadedMessages(updatedScenario); try { localStorage.setItem(PRELOADED_SCENARIO_KEY, JSON.stringify(updatedScenario)); } catch (e) { console.error("Error saving preloaded scenario:", e); } };
  const handleLoadPreloadedScenario = (scenarioToLoad: PreloadedMessage[]) => {
    startNewChat(true); 
    const newChatMessages: ChatMessage[] = scenarioToLoad.map(pm => ({ id: generateUniqueId(), role: pm.role, content: pm.content, timestamp: new Date() }));
    setMessages(newChatMessages); 
    setIsPreloadedMessagesModalOpen(false); 
  };
  const handleExportPreloadedScenario = (scenarioToExport: PreloadedMessage[]) => { try { const j = JSON.stringify(scenarioToExport, null, 2); const b = new Blob([j],{type:"application/json"}); const u = URL.createObjectURL(b); const a = document.createElement("a"); a.href=u; a.download="chat-scenario.json"; document.body.appendChild(a);a.click();document.body.removeChild(a);URL.revokeObjectURL(u); } catch (e) { console.error("Error exporting scenario:", e); }};
  const handleImportPreloadedScenario = async (file: File): Promise<PreloadedMessage[] | null> => { return new Promise((resolve) => { const r=new FileReader();r.onload=(e)=>{try{const res=e.target?.result;if(typeof res==='string'){const p=JSON.parse(res);if(Array.isArray(p)&&p.every(m=>m.id&&m.role&&typeof m.content==='string'&&(m.role==='user'||m.role==='model'))){resolve(p as PreloadedMessage[]);}else{console.error("Invalid scenario file format.");resolve(null);}}else{console.error("Failed to read file.");resolve(null);}}catch(err){console.error("Error parsing scenario:",err);resolve(null);}};r.onerror=()=>{console.error("Error reading file.");resolve(null);};r.readAsText(file);});};

  const getCurrentModelDisplayName = () => {
    const modelIdToDisplay = currentChatSettings.modelId || appSettings.modelId;
    if (isModelsLoading && !modelIdToDisplay && apiModels.length === 0) return "Loading models...";
    if (isModelsLoading && modelIdToDisplay && !apiModels.find(m => m.id === modelIdToDisplay)) return "Verifying model...";
    const model = apiModels.find(m => m.id === modelIdToDisplay);
    if (model) return model.name;
    if (modelIdToDisplay) { let n = modelIdToDisplay.split('/').pop()?.replace('gemini-','Gemini ') || modelIdToDisplay; return n.split('-').map(w=>w.charAt(0).toUpperCase()+w.slice(1)).join(' ').replace(' Preview ',' Preview ');}
    return apiModels.length === 0 && !isModelsLoading ? "No models available" : "No model selected";
  };

  const handleLoadCanvasHelperPromptAndSave = () => {
    const isCurrentlyCanvasPrompt = currentChatSettings.systemInstruction === CANVAS_ASSISTANT_SYSTEM_PROMPT;
    const newSystemInstruction = isCurrentlyCanvasPrompt ? DEFAULT_SYSTEM_INSTRUCTION : CANVAS_ASSISTANT_SYSTEM_PROMPT;

    const newAppSettings = {
      ...appSettings,
      systemInstruction: newSystemInstruction,
    };
    setAppSettings(newAppSettings);
    setCurrentChatSettings(prev => ({
      ...prev,
      systemInstruction: newSystemInstruction,
    }));
    userScrolledUp.current = false;
  };
  
  const isCanvasPromptActive = currentChatSettings.systemInstruction === CANVAS_ASSISTANT_SYSTEM_PROMPT;

  return (
    <div className="flex h-screen bg-[var(--theme-bg-secondary)] text-[var(--theme-text-primary)]">
      <HistorySidebar
        isOpen={isHistorySidebarOpen}
        onToggle={handleToggleHistorySidebar}
        sessions={savedSessions}
        activeSessionId={activeSessionId}
        onSelectSession={(id) => loadChatSession(id)}
        onNewChat={() => startNewChat(true)}
        onDeleteSession={handleDeleteChatHistorySession}
        themeColors={currentTheme.colors}
      />
      <div 
        className="flex flex-col flex-grow h-full overflow-hidden relative" 
        onDragEnter={handleAppDragEnter}
        onDragOver={handleAppDragOver}
        onDragLeave={handleAppDragLeave}
        onDrop={handleAppDrop}
      >
        {isAppDraggingOver && (
          <div className="absolute inset-0 bg-[var(--theme-bg-accent)] bg-opacity-20 flex flex-col items-center justify-center pointer-events-none z-50 border-4 border-dashed border-[var(--theme-bg-accent)] rounded-lg m-2">
            <Paperclip size={64} className="text-[var(--theme-bg-accent)] opacity-60 mb-4" />
            <p className="text-2xl font-semibold text-[var(--theme-bg-accent)] opacity-85">Drop files anywhere to upload</p>
          </div>
        )}
        <Header
          onNewChat={() => startNewChat(true)}
          onOpenSettingsModal={() => setIsSettingsModalOpen(true)}
          onOpenScenariosModal={() => setIsPreloadedMessagesModalOpen(true)} 
          onToggleHistorySidebar={handleToggleHistorySidebar}
          isLoading={isLoading} 
          currentModelName={getCurrentModelDisplayName()}
          availableModels={apiModels} 
          selectedModelId={currentChatSettings.modelId || appSettings.modelId} 
          onSelectModel={handleSelectModelInHeader}
          isModelsLoading={isModelsLoading}
          isStreamingEnabled={isStreamingEnabled}
          onToggleStreaming={handleToggleStreaming}
          isHistorySidebarOpen={isHistorySidebarOpen}
          onLoadCanvasPrompt={handleLoadCanvasHelperPromptAndSave}
          isCanvasPromptActive={isCanvasPromptActive}
        />
        {modelsLoadingError && (
          <div className="p-2 bg-[var(--theme-bg-danger)] text-[var(--theme-text-danger)] text-center text-xs flex-shrink-0">{modelsLoadingError}</div>
        )}
        <SettingsModal
          isOpen={isSettingsModalOpen}
          onClose={() => setIsSettingsModalOpen(false)}
          currentSettings={appSettings} 
          availableModels={apiModels} 
          availableThemes={AVAILABLE_THEMES} 
          onSave={handleSaveSettings}
          isModelsLoading={isModelsLoading}
          modelsLoadingError={modelsLoadingError}
        />
        <PreloadedMessagesModal
          isOpen={isPreloadedMessagesModalOpen}
          onClose={() => setIsPreloadedMessagesModalOpen(false)}
          initialMessages={preloadedMessages}
          onSaveScenario={handleSavePreloadedScenario}
          onLoadScenario={handleLoadPreloadedScenario}
          onImportScenario={handleImportPreloadedScenario}
          onExportScenario={handleExportPreloadedScenario}
        />
        <MessageList
          messages={messages}
          messagesEndRef={messagesEndRef}
          scrollContainerRef={scrollContainerRef}
          onScrollContainerScroll={handleScroll}
          onEditMessage={handleEditMessage}
          onDeleteMessage={handleDeleteMessage} 
          onRetryMessage={handleRetryMessage}
          showThoughts={currentChatSettings.showThoughts} 
          themeColors={currentTheme.colors}
          baseFontSize={appSettings.baseFontSize}
        />
        <ChatInput
          inputText={inputText}
          setInputText={setInputText}
          selectedFiles={selectedFiles}
          setSelectedFiles={setSelectedFiles}
          onSendMessage={() => handleSendMessage()} // Default call without overrides
          isLoading={isLoading} 
          isEditing={!!editingMessageId}
          onStopGenerating={handleStopGenerating}
          onProcessFiles={handleProcessAndAddFiles}
          isProcessingFile={isAppProcessingFile} 
          fileError={appFileError}  
        />
      </div>
    </div>
  );
};

export default App;
