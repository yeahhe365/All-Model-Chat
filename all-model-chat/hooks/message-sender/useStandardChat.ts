
import { useCallback } from 'react';
import { generateUniqueId, buildContentParts, createChatHistoryForApi, getKeyForRequest, generateSessionTitle, logService, createNewSession, isGemini3Model } from '../../utils/appUtils';
import { geminiServiceInstance } from '../../services/geminiService';
import { DEFAULT_CHAT_SETTINGS, MODELS_SUPPORTING_RAW_MODE } from '../../constants/appConstants';
import { buildGenerationConfig } from '../../services/api/baseApi';
import { isLikelyHtml } from '../../utils/codeUtils';
import { ChatMessage, UploadedFile } from '../../types';
import { StandardChatProps } from './types';

export const useStandardChat = ({
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
    getStreamHandlers,
    sessionKeyMapRef,
    handleGenerateCanvas,
}: StandardChatProps) => {

    const sendStandardMessage = useCallback(async (
        textToUse: string, 
        filesToUse: UploadedFile[], 
        effectiveEditingId: string | null, 
        activeModelId: string,
        isContinueMode: boolean = false,
        isFastMode: boolean = false
    ) => {
        let sessionToUpdate = { ...currentChatSettings };
        
        // Fast Mode Override logic
        if (isFastMode) {
            const isGemini3Flash = activeModelId.includes('gemini-3') && activeModelId.includes('flash');
            const targetLevel = isGemini3Flash ? 'MINIMAL' : 'LOW';

            sessionToUpdate.thinkingLevel = targetLevel;
            // Set budget to 0 to ensure level takes precedence if supported, or disables custom budget
            // For Gemini 3, budget 0 + level LOW/MINIMAL = Low/Minimal Thinking.
            // For others, usually means minimal/off thinking if they don't support level.
            sessionToUpdate.thinkingBudget = 0; 
            logService.info(`Fast Mode activated: Overriding thinking level to ${targetLevel}.`);
        }

        const keyResult = getKeyForRequest(appSettings, sessionToUpdate);
        if ('error' in keyResult) {
            logService.error("Send message failed: API Key not configured.");
             const errorMsg: ChatMessage = { id: generateUniqueId(), role: 'error', content: keyResult.error, timestamp: new Date() };
             const newSession = createNewSession({ ...DEFAULT_CHAT_SETTINGS, ...appSettings }, [errorMsg], "API Key Error");
             updateAndPersistSessions(p => [newSession, ...p]);
             setActiveSessionId(newSession.id);
            return;
        }
        const { key: keyToUse, isNewKey } = keyResult;
        const shouldLockKey = isNewKey && filesToUse.some(f => f.fileUri && f.uploadState === 'active');

        const newAbortController = new AbortController();
        
        let generationId: string;
        let generationStartTime: Date;
        
        if (isContinueMode && effectiveEditingId) {
            // Re-use existing ID for continuity
            generationId = effectiveEditingId;
            // Keep original start time if possible, or reset to now
            const targetMsg = messages.find(m => m.id === effectiveEditingId);
            generationStartTime = targetMsg?.generationStartTime || new Date();
        } else {
            generationId = generateUniqueId();
            generationStartTime = new Date();
        }
        
        const successfullyProcessedFiles = filesToUse.filter(f => f.uploadState === 'active' && !f.error && !f.isProcessing);
        
        // Pass modelId and mediaResolution to buildContentParts for per-part injection
        const { contentParts: promptParts, enrichedFiles } = await buildContentParts(
            textToUse.trim(), 
            successfullyProcessedFiles,
            activeModelId,
            sessionToUpdate.mediaResolution
        );
        
        let finalSessionId = activeSessionId;
        
        // Raw Mode Check
        // Only enable if the toggle is ON AND the current model is in the supported list.
        const isRawMode = (sessionToUpdate.isRawModeEnabled ?? appSettings.isRawModeEnabled) 
            && !isContinueMode 
            && MODELS_SUPPORTING_RAW_MODE.some(m => activeModelId.includes(m));
        
        // Prepare Message Objects
        let userMessageContent: ChatMessage | null = null;
        let modelMessageContent: ChatMessage | null = null;

        if (!isContinueMode) {
            userMessageContent = { id: generateUniqueId(), role: 'user', content: textToUse.trim(), files: enrichedFiles.length ? enrichedFiles : undefined, timestamp: new Date() };
            
            // If Raw CoT is enabled, we initialize the model message content with <thinking>
            const initialContent = isRawMode ? '<thinking>' : '';
            
            modelMessageContent = { id: generationId, role: 'model', content: initialContent, timestamp: new Date(), isLoading: true, generationStartTime: generationStartTime };
        }

        // Perform a single, atomic state update
        if (!finalSessionId) { // New Chat
             if (isContinueMode) {
                 console.error("Cannot continue generation in a new/empty chat.");
                 return;
             }
            let newSessionSettings = { ...DEFAULT_CHAT_SETTINGS, ...appSettings };
            if (shouldLockKey) newSessionSettings.lockedApiKey = keyToUse;
            
            // Safe access as userMessageContent is guaranteed here
            userMessageContent!.cumulativeTotalTokens = 0;
            const newSession = createNewSession(newSessionSettings, [userMessageContent!, modelMessageContent!], "New Chat");
            finalSessionId = newSession.id;
            
            updateAndPersistSessions(p => [newSession, ...p.filter(s => s.messages.length > 0)]);
            setActiveSessionId(newSession.id);
        } else { // Existing Chat (Normal or Continue)
            updateAndPersistSessions(prev => prev.map(s => {
                const isSessionToUpdate = effectiveEditingId ? s.messages.some(m => m.id === effectiveEditingId) : s.id === finalSessionId;
                if (!isSessionToUpdate) return s;

                // Edit Logic (Rewind)
                let baseMessages = [...s.messages];
                if (effectiveEditingId && !isContinueMode) {
                    const editIndex = s.messages.findIndex(m => m.id === effectiveEditingId);
                    if (editIndex !== -1) {
                         baseMessages = s.messages.slice(0, editIndex);
                    }
                }
                
                let newMessages: ChatMessage[];
                if (isContinueMode) {
                    // Update the target model message to loading state
                     newMessages = baseMessages.map(m => 
                         m.id === effectiveEditingId 
                         ? { ...m, isLoading: true, generationEndTime: undefined, stoppedByUser: false } 
                         : m
                     );
                } else {
                    // Append new messages
                    const lastBaseMsg = baseMessages[baseMessages.length - 1];
                    userMessageContent!.cumulativeTotalTokens = lastBaseMsg?.cumulativeTotalTokens || 0;
                    newMessages = [...baseMessages, userMessageContent!, modelMessageContent!];
                }

                let newTitle = s.title;
                if (!isContinueMode && s.title === 'New Chat' && !appSettings.isAutoTitleEnabled) {
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
        
        // Prepare Stateless Chat Params
        let baseMessagesForApi: ChatMessage[] = messages;
        
        // If continue mode, history includes everything UP TO the target message, plus the target message content
        if (isContinueMode && effectiveEditingId) {
            const targetIndex = messages.findIndex(m => m.id === effectiveEditingId);
            if (targetIndex !== -1) {
                baseMessagesForApi = messages.slice(0, targetIndex);
            }
        } else if (effectiveEditingId) {
             // Normal Edit mode (Regenerate from user message)
            const editIndex = messages.findIndex(m => m.id === effectiveEditingId);
            if (editIndex !== -1) {
                baseMessagesForApi = messages.slice(0, editIndex);
            }
        }
        
        let finalRole: 'user' | 'model' = 'user';
        let finalParts = promptParts;

        if (isContinueMode) {
            finalRole = 'model';
            const targetMsg = messages.find(m => m.id === effectiveEditingId);
            const currentContent = targetMsg?.content || '';
            const isG3 = isGemini3Model(activeModelId);

            // To continue generation, we send the *existing* content as the last message in the sequence (role: model).
            // The API sees this as a partial turn and completes it.
            // If content is empty, we must send something valid. 
            // For G3, a thinking tag is a good starter. For others, a space acts as a neutral starter.
            let prefillContent = currentContent;
            if (!prefillContent.trim()) {
                prefillContent = isG3 ? "<thinking>I have finished reasoning</thinking>" : " ";
            }
            finalParts = [{ text: prefillContent }];
            
        } else if (isRawMode) {
            // Raw Mode Logic:
            // 1. Manually inject the new user message into history array passed to API.
            if (userMessageContent) {
                baseMessagesForApi = [...baseMessagesForApi, userMessageContent];
            }
            
            // 2. Set params for pre-filled model turn
            finalRole = 'model';
            finalParts = [{ text: '<thinking>' }];
        } else if (promptParts.length === 0) {
             // Empty user prompt check (standard mode only)
             setLoadingSessionIds(prev => { const next = new Set(prev); next.delete(finalSessionId!); return next; });
             activeJobs.current.delete(generationId);
             return; 
        }
        
        // Create History AFTER modifying baseMessagesForApi (important for Raw Mode)
        // Pass the setting to strip thinking tags if configured
        const shouldStripThinking = sessionToUpdate.hideThinkingInContext ?? appSettings.hideThinkingInContext;
        let historyForChat = await createChatHistoryForApi(baseMessagesForApi, shouldStripThinking);
        
        const config = buildGenerationConfig(
            activeModelId,
            sessionToUpdate.systemInstruction,
            { temperature: sessionToUpdate.temperature, topP: sessionToUpdate.topP },
            sessionToUpdate.showThoughts,
            sessionToUpdate.thinkingBudget,
            !!sessionToUpdate.isGoogleSearchEnabled,
            !!sessionToUpdate.isCodeExecutionEnabled,
            !!sessionToUpdate.isUrlContextEnabled,
            sessionToUpdate.thinkingLevel,
            aspectRatio,
            sessionToUpdate.isDeepSearchEnabled,
            imageSize,
            sessionToUpdate.safetySettings,
            sessionToUpdate.mediaResolution
        );

        // Pass generationStartTime by value to create a closure-safe handler
        const { streamOnError, streamOnComplete, streamOnPart, onThoughtChunk } = getStreamHandlers(
            finalSessionId!, 
            generationId, 
            newAbortController, 
            generationStartTime, 
            sessionToUpdate,
            (msgId, content) => {
                if (!isContinueMode && appSettings.autoCanvasVisualization && content && content.length > 50 && !isLikelyHtml(content)) {
                    const trimmed = content.trim();
                    if (trimmed.startsWith('```') && trimmed.endsWith('```')) return;
                    logService.info("Auto-triggering Canvas visualization for message", { msgId });
                    handleGenerateCanvas(msgId, content);
                }
            }
        );
        
        setLoadingSessionIds(prev => new Set(prev).add(finalSessionId!));
        activeJobs.current.set(generationId, newAbortController);

        if (appSettings.isStreamingEnabled) {
            await geminiServiceInstance.sendMessageStream(
                keyToUse,
                activeModelId,
                historyForChat,
                finalParts,
                config,
                newAbortController.signal,
                streamOnPart,
                onThoughtChunk,
                streamOnError,
                streamOnComplete,
                finalRole 
            );
        } else { 
            await geminiServiceInstance.sendMessageNonStream(
                keyToUse,
                activeModelId,
                historyForChat,
                finalParts,
                config,
                newAbortController.signal,
                streamOnError,
                (parts, thoughts, usage, grounding) => {
                    for(const part of parts) streamOnPart(part);
                    if(thoughts) onThoughtChunk(thoughts);
                    streamOnComplete(usage, grounding);
                }
            );
        }
    }, [
        appSettings, currentChatSettings, messages, editingMessageId, 
        setEditingMessageId, aspectRatio, imageSize, activeSessionId, 
        setActiveSessionId, activeJobs, setLoadingSessionIds, 
        updateAndPersistSessions, getStreamHandlers, handleGenerateCanvas, 
        sessionKeyMapRef
    ]);

    return { sendStandardMessage };
};
