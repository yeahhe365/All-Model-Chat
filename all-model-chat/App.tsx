

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
    SUPPORTED_PDF_MIME_TYPES, // Added PDF
    ALL_SUPPORTED_MIME_TYPES, 
    PRELOADED_SCENARIO_KEY,
    CHAT_HISTORY_SESSIONS_KEY,
    ACTIVE_CHAT_SESSION_ID_KEY,
    CANVAS_ASSISTANT_SYSTEM_PROMPT,
    DEFAULT_SYSTEM_INSTRUCTION, 
} from './constants';
import { Header } from './components/Header';
import { MessageList } from './components/MessageList';
import { ChatInput } from './components/ChatInput';
import { SettingsModal } from './components/SettingsModal';
import { PreloadedMessagesModal } from './components/PreloadedMessagesModal';
import { HistorySidebar } from './components/HistorySidebar'; 
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

const buildContentParts = (text: string, files: UploadedFile[] | undefined): ContentPart[] => {
  const dataParts: ContentPart[] = []; 
  const textSegments: string[] = []; 

  if (files) {
    files.forEach(file => {
      if (!file.isProcessing && !file.error) {
        if (file.textContent !== undefined && SUPPORTED_TEXT_MIME_TYPES.includes(file.type)) {
          textSegments.push(`--- File: ${file.name} (${file.type}) ---\n${file.textContent}\n--- End of File: ${file.name} ---`);
        } else if (file.base64Data && (SUPPORTED_IMAGE_MIME_TYPES.includes(file.type) || SUPPORTED_VIDEO_MIME_TYPES.includes(file.type) || SUPPORTED_AUDIO_MIME_TYPES.includes(file.type))) {
          dataParts.push({ inlineData: { mimeType: file.type, data: file.base64Data } });
        } else if (file.fileUri && SUPPORTED_PDF_MIME_TYPES.includes(file.type)) { // Handle PDFs using fileUri
          dataParts.push({ fileData: { mimeType: file.type, fileUri: file.fileUri } });
        }
      }
    });
  }

  const userTypedText = text.trim();
  if (userTypedText) {
    textSegments.push(userTypedText);
  }

  const combinedTextForPrompt = textSegments.join('\n\n');
  
  const contentPartsResult: ContentPart[] = [];
  if (combinedTextForPrompt.trim() !== "") { 
    contentPartsResult.push({ text: combinedTextForPrompt });
  }
  contentPartsResult.push(...dataParts); 
  
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

  const saveCurrentChatSession = useCallback((currentMessages: ChatMessage[], currentActiveSessionId: string | null, currentSettingsToSave: IndividualChatSettings) => {
    if (sessionSaveTimeoutRef.current) clearTimeout(sessionSaveTimeoutRef.current);
    
    sessionSaveTimeoutRef.current = window.setTimeout(() => {
        if (currentMessages.length === 0 && (!currentActiveSessionId || !savedSessions.find(s => s.id === currentActiveSessionId))) {
            return; 
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
    }, 500); 
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
    
    const themeVariablesStyleTag = document.getElementById('theme-variables');
    if (themeVariablesStyleTag) {
      themeVariablesStyleTag.innerHTML = generateThemeCssVariables(currentTheme.colors);
    }
    
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
        } else { 
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
  }, [setMessages, setChatSession]); 

  useEffect(() => {
    const fetchAndSetModels = async () => {
      setIsLoading(true); setIsModelsLoading(true); setModelsLoadingError(null);
      
      const pinnedInternalModels: ModelOption[] = [
          { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', isPinned: true },
          // Map "Gemini 2.5 Flash" to the specific preview ID that supports thinkingConfig
          { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', isPinned: true },
          { id: 'gemini-2.5-flash-lite-preview-06-17', name: 'Gemini 2.5 Flash Lite Preview', isPinned: true },
      ];
      // This is the ID for the model that explicitly supports thinking config.
      const explicitFlashPreviewId = 'gemini-2.5-flash';
      
      let modelsFromApi: ModelOption[] = [];
      try { 
          modelsFromApi = await geminiServiceInstance.getAvailableModels(); 
      } catch (error) { 
          setModelsLoadingError(`API model fetch failed: ${error instanceof Error ? error.message : String(error)}. Using fallbacks.`); 
      }
      
      const modelMap = new Map<string, ModelOption>();

      // Add API models first
      modelsFromApi.forEach(model => {
          modelMap.set(model.id, { ...model, isPinned: false }); // Ensure API models are not marked pinned initially
      });

      // Add/override with internally defined pinned models to ensure their names and pinned status are correct
      pinnedInternalModels.forEach(pinnedModel => {
          modelMap.set(pinnedModel.id, pinnedModel);
      });
      
      // Fallback: if gemini-2.5-flash (the one that supports thinking) wasn't in API or pinned models map, add it.
      // This ensures it's available, possibly under a more generic "Preview" name if not aliased.
      if (!modelMap.has(explicitFlashPreviewId)) {
          modelMap.set(explicitFlashPreviewId, { id: explicitFlashPreviewId, name: 'Gemini 2.5 Flash Preview', isPinned: false });
      }

      let finalModels = Array.from(modelMap.values());
      
      finalModels.sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return a.name.localeCompare(b.name);
      });
      
      setApiModels(finalModels);

      const currentModelStillValid = finalModels.some(m => m.id === appSettings.modelId);
      if (!currentModelStillValid && finalModels.length > 0) {
        const preferredModelId = finalModels.find(m => m.isPinned)?.id || finalModels[0].id;
        setAppSettings(prev => ({ ...prev, modelId: preferredModelId }));
        setCurrentChatSettings(prev => ({ ...prev, modelId: preferredModelId })); 
      } else if (finalModels.length === 0 && !modelsLoadingError) {
        setModelsLoadingError('No models available to select.');
      }
      setIsModelsLoading(false); setIsLoading(false);
    };
    fetchAndSetModels();
  }, []); 

   useEffect(() => {
    const reinitializeIfNeeded = async () => {
        if (!activeSessionId && messages.length === 0) {
            await initializeCurrentChatSession(currentChatSettings, []);
        } else {
            // Only reinitialize if settings relevant to the SDK's Chat object have changed.
            // This prevents reinitialization just for `showThoughts` if it's only a UI toggle.
            // However, `showThoughts` can affect `thinkingConfig`, so it *is* relevant.
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
    // messages // Removed `messages` from deps to avoid re-init on every message
              // Re-add if history needs to be passed to SDK strictly on every change affecting it.
              // For now, history is passed when a session is loaded or a new one starts.
              // And when editing a message, history up to that point is rebuilt.
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
      // Re-initialize SDK chat session with loaded history and settings
      initializeCurrentChatSession(sessionToLoad.settings, createChatHistoryForApi(sessionToLoad.messages));
    } else {
      console.warn(`Session ${sessionId} not found. Starting new chat.`);
      startNewChat(false);
    }
  }, [savedSessions, isLoading, initializeCurrentChatSession]); 

  const startNewChat = useCallback((saveCurrent: boolean = true) => {
    if (saveCurrent && activeSessionId && messages.length > 0) {
      saveCurrentChatSession(messages, activeSessionId, currentChatSettings);
    }
    if (isLoading && abortControllerRef.current) abortControllerRef.current.abort();

    setMessages([]);
    
    // For new chat, use the currently selected model from header (currentChatSettings.modelId)
    // and reset other chat-specific settings (temp, topP, system instruction, showThoughts)
    // to the global application defaults.
    const newChatSessionSettings: IndividualChatSettings = {
        modelId: currentChatSettings.modelId, // Preserve model selected in header
        temperature: appSettings.temperature,
        topP: appSettings.topP,
        showThoughts: appSettings.showThoughts,
        systemInstruction: appSettings.systemInstruction,
    };
    setCurrentChatSettings(newChatSessionSettings);
    
    setActiveSessionId(null); 
    localStorage.removeItem(ACTIVE_CHAT_SESSION_ID_KEY);
    setInputText('');
    setSelectedFiles([]);
    setEditingMessageId(null);
    setChatSession(null); // Will be re-initialized by the useEffect watching currentChatSettings
    userScrolledUp.current = false;
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
  
      // Add file to selectedFiles with processing state
      const initialFileState: UploadedFile = { id: fileId, name: file.name, type: file.type, size: file.size, isProcessing: true, progress: 0, rawFile: file, uploadState: 'pending' };
      setSelectedFiles(prev => [...prev, initialFileState]);
  
      if (SUPPORTED_PDF_MIME_TYPES.includes(file.type)) {
        // PDF: Upload to Gemini API
        setSelectedFiles(prev => prev.map(f => f.id === fileId ? { ...f, progress: 10, uploadState: 'uploading' } : f));
        try {
          const uploadedFileInfo = await geminiServiceInstance.uploadFile(file, file.type, file.name);
          // Assuming uploadFile returns an object with uri and name (resource name from API)
          setSelectedFiles(prev => prev.map(f => f.id === fileId ? { 
            ...f, 
            isProcessing: false, 
            progress: 100, 
            fileUri: uploadedFileInfo.uri, 
            fileApiName: uploadedFileInfo.name, 
            rawFile: undefined, // Clear raw file after successful upload
            uploadState: uploadedFileInfo.state === 'ACTIVE' ? 'active' : 'processing_api', // Use state from API if available
            error: undefined 
          } : f));
        } catch (uploadError) {
          console.error(`Error uploading PDF ${file.name}:`, uploadError);
          setSelectedFiles(prev => prev.map(f => f.id === fileId ? { 
            ...f, 
            isProcessing: false, 
            error: `Failed to upload to server: ${uploadError instanceof Error ? uploadError.message : String(uploadError)}`, 
            rawFile: undefined,
            uploadState: 'failed'
          } : f));
        }
      } else {
        // Other types: FileReader (existing logic)
        const reader = new FileReader();
        reader.onprogress = (event) => event.lengthComputable && setSelectedFiles(prev => prev.map(f => f.id === fileId ? { ...f, progress: Math.round((event.loaded / event.total) * 100) } : f));
        reader.onloadend = () => {
          if (typeof reader.result !== 'string') {
            setSelectedFiles(prev => prev.map(f => f.id === fileId ? { ...f, isProcessing: false, error: `Error reading file content.`, rawFile: undefined, uploadState: 'failed' } : f)); return;
          }
          let processedData: Partial<UploadedFile> = {};
          if (SUPPORTED_IMAGE_MIME_TYPES.includes(file.type) || SUPPORTED_VIDEO_MIME_TYPES.includes(file.type) || SUPPORTED_AUDIO_MIME_TYPES.includes(file.type)) {
            processedData.dataUrl = reader.result as string; processedData.base64Data = (reader.result as string).substring((reader.result as string).indexOf(',') + 1);
          } else if (SUPPORTED_TEXT_MIME_TYPES.includes(file.type)) {
            processedData.textContent = reader.result as string;
          }
          setSelectedFiles(prev => prev.map(f => f.id === fileId ? { ...f, ...processedData, isProcessing: false, progress: 100, rawFile: undefined, uploadState: 'active', error: undefined } : f));
        };
        reader.onerror = () => setSelectedFiles(prev => prev.map(f => f.id === fileId ? { ...f, isProcessing: false, error: `Error reading file: ${file.name}`, rawFile: undefined, uploadState: 'failed' } : f));
        
        if (SUPPORTED_IMAGE_MIME_TYPES.includes(file.type) || SUPPORTED_VIDEO_MIME_TYPES.includes(file.type) || SUPPORTED_AUDIO_MIME_TYPES.includes(file.type)) {
          reader.readAsDataURL(file);
        } else if (SUPPORTED_TEXT_MIME_TYPES.includes(file.type)) {
          reader.readAsText(file);
        }
      }
    }
  }, [geminiServiceInstance]); // Added geminiServiceInstance dependency

  const handleAppDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); if (e.dataTransfer.types.includes('Files')) setIsAppDraggingOver(true); }, []);
  const handleAppDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); if (isAppProcessingFile) { e.dataTransfer.dropEffect = 'none'; return; } if (e.dataTransfer.types.includes('Files')) { e.dataTransfer.dropEffect = 'copy'; if (!isAppDraggingOver) setIsAppDraggingOver(true); } else e.dataTransfer.dropEffect = 'none'; }, [isAppDraggingOver, isAppProcessingFile]);
  const handleAppDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); if (e.currentTarget.contains(e.relatedTarget as Node)) return; setIsAppDraggingOver(false); }, []);
  const handleAppDrop = useCallback(async (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); setIsAppDraggingOver(false); if (isAppProcessingFile) return; const files = e.dataTransfer.files; if (files?.length) await handleProcessAndAddFiles(files); }, [isAppProcessingFile, handleProcessAndAddFiles]);

  const handleSendMessage = useCallback(async (overrideOptions?: { text?: string; files?: UploadedFile[]; editingId?: string }) => {
    const textToUse = overrideOptions?.text ?? inputText;
    const filesToUse = overrideOptions?.files ?? selectedFiles;
    const effectiveEditingId = overrideOptions?.editingId ?? editingMessageId;

    if (!textToUse.trim() && filesToUse.filter(f => !f.error && !f.isProcessing && f.uploadState === 'active').length === 0) return;
    if (filesToUse.some(f => f.isProcessing || (f.type === 'application/pdf' && f.uploadState !== 'active' && !f.error) )) { 
        setAppFileError("Some files are still processing or uploading. Please wait."); return; 
    }
    setAppFileError(null); 

    const activeModelId = currentChatSettings.modelId;
    if (!activeModelId) {
       setMessages(prev => [...prev, { id: generateUniqueId(), role: 'error', content: 'Cannot send message: No model selected for this chat.', timestamp: new Date() }]);
       setIsLoading(false); return;
    }
    
    setIsLoading(true); 
    if (isLoading && abortControllerRef.current) abortControllerRef.current.abort(); 
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
            setIsLoading(false); 
            return; 
        }
        sdkSessionForThisTurn = newSdkSession;
    }
    
    if (!sdkSessionForThisTurn) {
      setMessages(prev => [...prev, { id: generateUniqueId() + 'nosess', role: 'error', content: 'Chat session is not available. Cannot send message.', timestamp: new Date() }]);
      setIsLoading(false); return;
    }

    // Filter files to include only successfully processed/uploaded ones for the message
    const successfullyProcessedFiles = filesToUse.filter(f => !f.error && !f.isProcessing && f.uploadState === 'active');
    const userMessage: ChatMessage = { id: generateUniqueId(), role: 'user', content: textToUse.trim(), files: successfullyProcessedFiles.length ? successfullyProcessedFiles : undefined, timestamp: new Date() };
     
    const promptParts = buildContentParts(textToUse.trim(), successfullyProcessedFiles);
    const hasDataParts = promptParts.some(p => p.inlineData || p.fileData); // Check for fileData too
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
      abortControllerRef.current.abort(); 
      setMessages(prev => prev.map(m => m.isLoading ? {...m, isLoading: false, content: (m.content || "") + "\n\n[Stopped for retry]"} : m));
      setIsLoading(false); 
    }
    
    setMessages(prev => prev.slice(0, modelMessageIndex));
    
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
          onSendMessage={() => handleSendMessage()} 
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
