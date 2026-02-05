
import { useCallback, useEffect, useRef } from 'react';
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
    setSessionLoading,
    updateAndPersistSessions,
    getStreamHandlers,
    sessionKeyMapRef,
    handleGenerateCanvas,
    projectContext,
}: StandardChatProps) => {
    const autoContinueAttemptsRef = useRef<Set<string>>(new Set());
    const sendStandardMessageRef = useRef<((
        textToUse: string,
        filesToUse: UploadedFile[],
        effectiveEditingId: string | null,
        activeModelId: string,
        isContinueMode?: boolean,
        isFastMode?: boolean
    ) => Promise<void>) | null>(null);

    const { updateSessionState } = useSessionUpdate({
        appSettings,
        updateAndPersistSessions,
        setActiveSessionId,
        setEditingMessageId,
        sessionKeyMapRef
    });

    const handleAutoContinue = useCallback((params: { generationId: string; activeModelId: string; effectiveEditingId: string | null }) => {
        const { generationId, activeModelId, effectiveEditingId } = params;
        if (autoContinueAttemptsRef.current.has(generationId)) return;
        autoContinueAttemptsRef.current.add(generationId);

        const sender = sendStandardMessageRef.current;
        if (!sender) return;

        setTimeout(() => {
            sender('', [], effectiveEditingId || generationId, activeModelId, true, false);
        }, 0);
    }, []);

    const { performApiCall } = useApiInteraction({
        appSettings,
        messages,
        getStreamHandlers,
        handleGenerateCanvas,
        setSessionLoading,
        activeJobs,
        projectContext,
        onAutoContinue: handleAutoContinue,
    });

    const sendStandardMessage = useCallback(async (
        textToUse: string,
        filesToUse: UploadedFile[],
        effectiveEditingId: string | null,
        activeModelId: string,
        isContinueMode: boolean = false,
        isFastMode: boolean = false
    ) => {
        const settingsForPersistence = { ...currentChatSettings };
        let settingsForApi = { ...currentChatSettings };

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
            sessionToUpdate: settingsForPersistence,
            keyToUse,
            shouldLockKey
        });

        userScrolledUp.current = false;

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
            sessionToUpdate: settingsForApi,
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

    useEffect(() => {
        sendStandardMessageRef.current = sendStandardMessage;
    }, [sendStandardMessage]);

    return { sendStandardMessage };
};
