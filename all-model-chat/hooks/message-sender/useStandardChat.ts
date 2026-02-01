
import { useCallback } from 'react';
import { generateUniqueId, buildContentParts, getKeyForRequest, performOptimisticSessionUpdate, logService } from '../../utils/appUtils';
import { DEFAULT_CHAT_SETTINGS, MODELS_SUPPORTING_RAW_MODE } from '../../constants/appConstants';
import { UploadedFile, ChatMessage } from '../../types';
import { StandardChatProps } from './types';
import { useSessionUpdate } from './standard/useSessionUpdate';
import { useApiInteraction } from './standard/useApiInteraction';

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

    const { updateSessionState } = useSessionUpdate({
        appSettings,
        updateAndPersistSessions,
        setActiveSessionId,
        setEditingMessageId,
        sessionKeyMapRef
    });

    const { performApiCall } = useApiInteraction({
        appSettings,
        messages,
        getStreamHandlers,
        handleGenerateCanvas,
        setLoadingSessionIds,
        activeJobs
    });

    const sendStandardMessage = useCallback(async (
        textToUse: string, 
        filesToUse: UploadedFile[], 
        effectiveEditingId: string | null, 
        activeModelId: string,
        isContinueMode: boolean = false,
        isFastMode: boolean = false
    ) => {
        // Prepare separate settings objects:
        // 1. settingsForPersistence: Keeps the UI state (e.g. High Thinking) intact.
        // 2. settingsForApi: Applies temporary overrides (e.g. Low Thinking for Fast Mode).
        const settingsForPersistence = { ...currentChatSettings };
        let settingsForApi = { ...currentChatSettings };
        
        // Fast Mode Override logic (Applied only to API settings)
        if (isFastMode) {
            const isGemini3Flash = activeModelId.includes('gemini-3') && activeModelId.includes('flash');
            const targetLevel = isGemini3Flash ? 'MINIMAL' : 'LOW';

            settingsForApi.thinkingLevel = targetLevel;
            settingsForApi.thinkingBudget = 0; 
            logService.info(`Fast Mode activated (One-off): Overriding thinking level to ${targetLevel}.`);
        }

        const keyResult = getKeyForRequest(appSettings, settingsForApi);
        if ('error' in keyResult) {
            logService.error("Send message failed: API Key not configured.");
             const errorMsg: ChatMessage = { id: generateUniqueId(), role: 'error', content: keyResult.error, timestamp: new Date() };
             const newSessionId = generateUniqueId();
             
             updateAndPersistSessions(prev => performOptimisticSessionUpdate(prev, {
                 activeSessionId: null,
                 newSessionId,
                 newMessages: [errorMsg],
                 settings: { ...DEFAULT_CHAT_SETTINGS, ...appSettings },
                 appSettings,
                 title: "API Key Error"
             }));
             setActiveSessionId(newSessionId);
            return;
        }
        const { key: keyToUse, isNewKey } = keyResult;
        const shouldLockKey = isNewKey && filesToUse.some(f => f.fileUri && f.uploadState === 'active');

        const newAbortController = new AbortController();
        
        let generationId: string;
        let generationStartTime: Date;
        
        if (isContinueMode && effectiveEditingId) {
            generationId = effectiveEditingId;
            const targetMsg = messages.find(m => m.id === effectiveEditingId);
            generationStartTime = targetMsg?.generationStartTime || new Date();
        } else {
            generationId = generateUniqueId();
            generationStartTime = new Date();
        }
        
        const successfullyProcessedFiles = filesToUse.filter(f => f.uploadState === 'active' && !f.error && !f.isProcessing);
        
        // Prepare content parts
        const { contentParts: promptParts, enrichedFiles } = await buildContentParts(
            textToUse.trim(), 
            successfullyProcessedFiles,
            activeModelId,
            settingsForApi.mediaResolution
        );
        
        const finalSessionId = activeSessionId || generateUniqueId();
        
        const isRawMode = (settingsForApi.isRawModeEnabled ?? appSettings.isRawModeEnabled) 
            && !isContinueMode 
            && MODELS_SUPPORTING_RAW_MODE.some(m => activeModelId.includes(m));
        
        // Update Session State Optimistically using PERSISTENCE settings
        updateSessionState({
            activeSessionId,
            finalSessionId,
            textToUse,
            enrichedFiles,
            effectiveEditingId,
            generationId,
            generationStartTime,
            isContinueMode,
            isRawMode,
            sessionToUpdate: settingsForPersistence, // Keep original settings in DB/UI
            keyToUse,
            shouldLockKey
        });

        userScrolledUp.current = false;
        
        // Execute API Call using API settings (with Fast Mode override)
        await performApiCall({
            finalSessionId,
            generationId,
            generationStartTime,
            keyToUse,
            activeModelId,
            promptParts,
            effectiveEditingId,
            isContinueMode,
            isRawMode,
            sessionToUpdate: settingsForApi, // Use override for generation
            aspectRatio: aspectRatio,
            imageSize: imageSize,
            newAbortController,
            textToUse,
            enrichedFiles
        });

    }, [
        appSettings, currentChatSettings, messages, aspectRatio, imageSize, activeSessionId, 
        updateAndPersistSessions, setActiveSessionId, userScrolledUp, updateSessionState, performApiCall
    ]);

    return { sendStandardMessage };
};
